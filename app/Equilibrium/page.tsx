"use client";

import { useRef, useState, useCallback, useEffect, ReactNode } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { computeEquilibrant } from "../../lib/Equilibriumconc";
import "katex/dist/katex.min.css";
import BeamPage from "../Beam/page";

/* ===================== Types ===================== */
type ForceInput = {
  magnitude: string;
  angle: string;
  magnitudeUnknown?: boolean;
  angleUnknown?: boolean;
};

type StepLine =
  | { type: "heading"; text: string }
  | { type: "math"; tex: string }
  | { type: "text"; text: string }
  | { type: "diagram"; label?: string; node: ReactNode };

/* ================================================================
   LEGACY STEPS → StepLine[]
================================================================ */
function fromLegacySteps(steps: string[]): StepLine[] {
  return steps.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("Step")) return { type: "heading", text: trimmed };
    if (!trimmed.includes("\\")) return { type: "text", text: trimmed };
    return { type: "math", tex: trimmed };
  });
}

/* ================================================================
   KATEX INLINE RENDERER
================================================================ */
function useKatexScript() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if ((window as any).katex) { setOk(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css";
    document.head.appendChild(link);
    const scr = document.createElement("script");
    scr.src = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js";
    scr.onload = () => setOk(true);
    document.head.appendChild(scr);
  }, []);
  return ok;
}

function KTX({ tex }: { tex: string }) {
  const el = useRef<HTMLDivElement>(null);
  const katexReady = useKatexScript();
  useEffect(() => {
    if (!el.current || !katexReady) return;
    const katex = (window as any).katex;
    if (!katex) return;
    try { katex.render(tex, el.current, { displayMode: true, throwOnError: false }); }
    catch (_) { if (el.current) el.current.innerText = tex; }
  }, [tex, katexReady]);
  return <div ref={el} style={{ margin: "3px 0", overflowX: "auto" }} />;
}

/* ================================================================
   STEP-BY-STEP SOLUTION RENDERER
================================================================ */
function StepByStepSolution({ steps, title = "Step-by-Step Solution" }: { steps: StepLine[]; title?: string }) {
  return (
    <div className="w-full max-w-xl mt-2">
      {title && <h3 className="font-semibold mb-3 text-lg">{title}</h3>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {steps.map((line, i) => {
          switch (line.type) {
            case "heading":
              return <p key={i} style={{ fontWeight: 600, fontSize: 16, marginTop: 10, marginBottom: 2, color: "#1848a0" }}>{line.text}</p>;
            case "math":
              return <KTX key={i} tex={line.tex} />;
            case "text":
              return <p key={i} style={{ fontSize: 15, color: "#333", margin: "2px 0" }}>{line.text}</p>;
            case "diagram":
              return (
                <div key={i} style={{ marginTop: 12 }}>
                  {line.label && <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{line.label}</p>}
                  <div style={{ display: "flex", justifyContent: "center" }}>{line.node}</div>
                </div>
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}

/* ================================================================
   PDF EXPORT
================================================================ */
declare global {
  interface Window {
    jspdf: { jsPDF: new (opts: Record<string, unknown>) => any };
    katex: any;
  }
}

const JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
const MM_PER_PX = 0.264583;
const RENDER_SCALE = 3;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = () => resolve(); s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function upgradeFracs(tex: string): string {
  if (!tex.includes("\\frac") || tex.includes("\\displaystyle")) return tex;
  return `{\\displaystyle ${tex.replace(/\\tfrac(?=\{)/g, "\\dfrac").replace(/(?<![dt])\\frac(?=\{)/g, "\\dfrac")}}`;
}

async function latexToPng(tex: string): Promise<{ dataUrl: string; wMm: number; hMm: number } | null> {
  const html2canvas = (await import("html2canvas")).default;
  try {
    const processedTex = upgradeFracs(tex);
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position:absolute;left:-9999px;top:0;background:#ffffff;color:#000000;padding:0;margin:0;display:inline-block;";
    const inner = document.createElement("span");
    inner.style.cssText = "display:inline-block;padding:10px 14px;";
    wrapper.appendChild(inner);
    document.body.appendChild(wrapper);
    window.katex.render(processedTex, inner, { displayMode: true, throwOnError: false, output: "html" });
    const targetEl = (inner.querySelector(".katex-html") as HTMLElement) || (inner.querySelector(".katex") as HTMLElement) || inner;
    const innerRect = targetEl.getBoundingClientRect();
    const wrapRect = wrapper.getBoundingClientRect();
    const offsetLeft = innerRect.left - wrapRect.left;
    const canvas = await html2canvas(wrapper, { backgroundColor: "#ffffff", scale: RENDER_SCALE, useCORS: true, logging: false });
    document.body.removeChild(wrapper);
    const PAD = 18, EXTRA_LEFT = -8;
    const sx = Math.max(0, Math.round(offsetLeft * RENDER_SCALE) - PAD - EXTRA_LEFT);
    const sw = Math.round(innerRect.width * RENDER_SCALE) + PAD * 2 + EXTRA_LEFT;
    const cropped = document.createElement("canvas");
    cropped.width = sw; cropped.height = canvas.height;
    const ctx = cropped.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(canvas, sx, 0, sw, canvas.height, 0, 0, sw, canvas.height);
    return { dataUrl: cropped.toDataURL("image/png"), wMm: (cropped.width / RENDER_SCALE) * MM_PER_PX, hMm: (cropped.height / RENDER_SCALE) * MM_PER_PX };
  } catch (e) {
    console.warn("latexToPng failed:", tex, e);
    return null;
  }
}

async function writePDF(p: { steps: string[]; resultRows?: { label: string; value: string }[]; title: string; filename: string }) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210, PH = 297, M = 18, CW = PW - M * 2, MAXY = PH - 22;
  let y = 0;

  const guard = (need: number) => { if (y + need > MAXY) { pdf.addPage(); y = M; } };
  const mathLine = async (tex: string) => {
    const r = await latexToPng(tex);
    if (!r) return;
    const MAX_WIDTH = CW * 0.9;
    let { wMm: width, hMm: height } = r;
    if (width > MAX_WIDTH) { const sc = MAX_WIDTH / width; width *= sc; height *= sc; }
    guard(height + 6);
    pdf.addImage(r.dataUrl, "PNG", (PW - width) / 2, y, width, height);
    y += height + 6;
  };

  pdf.setFillColor(24, 72, 160); pdf.rect(0, 0, PW, 10, "F");
  y = 18;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(14); pdf.setTextColor(24, 72, 160);
  pdf.text(p.title, M, y); y += 6;
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(100, 116, 139);
  pdf.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, M, y); y += 5;
  pdf.setDrawColor(220, 228, 245); pdf.setLineWidth(0.4); pdf.line(M, y, PW - M, y); y += 9;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.setTextColor(20, 20, 20);
  pdf.text("Step-by-Step Solution", M, y); y += 10;

  for (const raw of p.steps) {
    const s = raw.trim();
    if (s.startsWith("Step")) {
      guard(10); y += 2;
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(24, 72, 160);
      pdf.text(s, M, y); y += 14; continue;
    }
    if (!s.includes("\\")) {
      guard(8);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(11); pdf.setTextColor(50, 50, 50);
      pdf.text(s, M, y); y += 8; continue;
    }
    await mathLine(s); y += 2;
  }

  if (p.resultRows && p.resultRows.length > 0) {
    guard(20 + p.resultRows.length * 11); y += 4;
    pdf.setDrawColor(220, 228, 245); pdf.setLineWidth(0.4); pdf.line(M, y, PW - M, y); y += 8;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.setTextColor(20, 20, 20);
    pdf.text("Results Summary", M, y); y += 9;
    for (const { label: lbl, value } of p.resultRows) {
      guard(11);
      pdf.setFillColor(245, 248, 255); pdf.roundedRect(M, y - 5, CW, 9, 2, 2, "F");
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(11); pdf.setTextColor(50, 50, 50);
      pdf.text(lbl, M + 4, y);
      pdf.setFont("helvetica", "bold"); pdf.setTextColor(24, 72, 160);
      pdf.text(value, PW - M - 4, y, { align: "right" }); y += 11;
    }
  }

  const total = pdf.internal.getNumberOfPages();
  for (let pg = 1; pg <= total; pg++) {
    pdf.setPage(pg);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(148, 163, 184);
    pdf.text(`Page ${pg} of ${total}`, PW - M, PH - 8, { align: "right" });
    pdf.setFillColor(24, 72, 160); pdf.rect(0, PH - 4, PW, 4, "F");
  }
  pdf.save(p.filename);
}

function PDFExportButton({ steps, resultRows, title, filename }: {
  steps: string[];
  resultRows?: { label: string; value: string }[];
  title: string;
  filename: string;
}) {
  const [libReady, setLibReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");

  useEffect(() => {
    loadScript(JSPDF_URL).then(() => setLibReady(true)).catch(console.error);
  }, []);

  const handleExport = useCallback(async () => {
    if (!libReady || status === "generating") return;
    setStatus("generating");
    try {
      await writePDF({ steps, resultRows, title, filename });
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      console.error("PDF export failed:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [libReady, status, steps, resultRows, title, filename]);

  const off = !libReady || status === "generating";
  const labels: Record<typeof status, string> = {
    idle: "⬇ Download Solution as PDF",
    generating: "⏳ Generating PDF…",
    done: "✅ Downloaded!",
    error: "❌ Export failed — try again",
  };

  return (
    <button
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        width: "100%", padding: "12px 0", border: "none", borderRadius: 10,
        fontSize: 14, fontWeight: 600, transition: "all 0.2s",
        background: "linear-gradient(135deg, #0f2d6b, #1848a0)",
        color: "#fff", boxShadow: "0 4px 14px rgba(24,72,160,0.25)",
        marginBottom: 14, opacity: off ? 0.65 : 1, cursor: off ? "not-allowed" : "pointer",
      }}
      onClick={handleExport}
      disabled={off}
    >
      {labels[status]}
    </button>
  );
}

/* ===================== SVG FBD Component ===================== */
const FORCE_COLORS = ["#1848a0", "#c0392b", "#16a34a", "#9333ea", "#d97706", "#0891b2"];
const UNKNOWN_LENGTH = 75; // fixed pixel length for unknown-magnitude arrows

function FBD({ forces, setForces }: { forces: ForceInput[]; setForces: (f: ForceInput[]) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Build display vectors — unknowns get a fixed length so they still appear
  const vectors = forces.map((f, i) => {
    const magUnknown = !!f.magnitudeUnknown;
    const angUnknown = !!f.angleUnknown;
    const rawMag = parseFloat(f.magnitude);
    const rawAng = parseFloat(f.angle);
    // Need at least an angle to draw (use 0° as fallback only if angle also unknown)
    const angle = isNaN(rawAng) ? 0 : rawAng;
    const hasMag = !magUnknown && !isNaN(rawMag);
    return { mag: hasMag ? rawMag : null, angle, magUnknown, angUnknown, index: i };
  });

  // Scale based only on known magnitudes
  const knownMags = vectors.filter((v) => v.mag !== null).map((v) => v.mag as number);
  const maxMag = Math.max(1, ...knownMags);
  const scale = 80 / maxMag;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragIndex === null || !svgRef.current) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const cursor = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const x = cursor.x - 150, y = cursor.y - 150;
    const newAngle = (Math.atan2(-y, x) * 180) / Math.PI;
    const newForces = [...forces];
    newForces[dragIndex] = { ...newForces[dragIndex], angle: newAngle.toFixed(3) };
    setForces(newForces);
  };

  return (
    <svg
      ref={svgRef}
      width="300" height="300"
      className="border rounded-lg bg-white shadow"
      onMouseMove={handleMouseMove}
      onMouseUp={() => setDragIndex(null)}
      onMouseLeave={() => setDragIndex(null)}
    >
      <defs>
        {FORCE_COLORS.map((color, ci) => (
          <marker key={ci} id={`arrow-${ci}`} markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill={color} />
          </marker>
        ))}
        {FORCE_COLORS.map((color, ci) => (
          <marker key={`d${ci}`} id={`arrow-dash-${ci}`} markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill={color} opacity="0.55" />
          </marker>
        ))}
      </defs>

      <g transform="translate(150,150)">
        {/* Axes */}
        <line x1={-140} y1={0} x2={140} y2={0} stroke="#e2e8f0" strokeWidth="1" />
        <line x1={0} y1={-140} x2={0} y2={140} stroke="#e2e8f0" strokeWidth="1" />
        <text x={143} y={4} fontSize="10" fill="#94a3b8">x</text>
        <text x={3} y={-133} fontSize="10" fill="#94a3b8">y</text>

        {vectors.map((v, i) => {
          const colorIdx = i % FORCE_COLORS.length;
          const color = FORCE_COLORS[colorIdx];
          const rad = (v.angle * Math.PI) / 180;
          const isUnknown = v.magUnknown || (v.mag === null);
          // Pixel length of the arrow
          const len = isUnknown ? UNKNOWN_LENGTH : (v.mag as number) * scale;
          const ex = Math.cos(rad) * len;
          const ey = -Math.sin(rad) * len;

          // Label position: slightly beyond arrow tip
          const labelOffset = 14;
          const lx = Math.cos(rad) * (len + labelOffset);
          const ly = -Math.sin(rad) * (len + labelOffset);

          // Angle arc (only when angle is known)
          const showArc = !v.angUnknown && !isNaN(v.angle);
          const arcR = 28;
          const arcEndX = Math.cos(rad) * arcR;
          const arcEndY = -Math.sin(rad) * arcR;
          const largeArc = v.angle > 180 ? 1 : 0;
          // Angle label midpoint
          const midAng = v.angle / 2;
          const midRad = (midAng * Math.PI) / 180;
          const aLx = Math.cos(midRad) * (arcR + 10);
          const aLy = -Math.sin(midRad) * (arcR + 10);

          return (
            <g key={i} className="cursor-pointer" onMouseDown={() => setDragIndex(i)}>
              {/* Angle arc */}
              {showArc && v.angle !== 0 && (
                <>
                  <path
                    d={`M ${arcR} 0 A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEndX} ${arcEndY}`}
                    fill="none" stroke={color} strokeWidth="1" opacity="0.5"
                  />
                  <text x={aLx} y={aLy} fontSize="9" fill={color} textAnchor="middle" dominantBaseline="middle" opacity="0.8">
                    {Math.round(v.angle * 10) / 10}°
                  </text>
                </>
              )}

              {/* Arrow line */}
              <line
                x1={0} y1={0} x2={ex} y2={ey}
                stroke={color}
                strokeWidth={isUnknown ? 2 : 3}
                strokeDasharray={isUnknown ? "6 3" : undefined}
                opacity={isUnknown ? 0.65 : 1}
                markerEnd={isUnknown ? `url(#arrow-dash-${colorIdx})` : `url(#arrow-${colorIdx})`}
              />

              {/* Force label */}
              <text
                x={lx} y={ly}
                fontSize="11" fontWeight="700"
                fill={color}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {`F${i + 1}`}
                {v.magUnknown ? " (?)" : v.mag !== null ? ` (${Math.round((v.mag as number) * 100) / 100})` : ""}
              </text>
            </g>
          );
        })}

        {/* Origin dot */}
        <circle cx={0} cy={0} r={4} fill="#334155" />
      </g>
    </svg>
  );
}

/* ================================================================
   SOLVER HELPERS
================================================================ */

/** Format a number for display in equations: show sign, fixed decimals */
function fmt(n: number, dec = 4): string {
  return n.toFixed(dec);
}

/** Build a trig term string like "30\cos(0°)" or "F_{3}\cos(150°)" */
function trigTerm(mag: string | number, angle: number, fn: "cos" | "sin"): string {
  const angleStr = `${fmt(angle, 4)}^\\circ`;
  const magStr = typeof mag === "string" ? mag : fmt(mag, 4);
  return `${magStr}\\${fn}(${angleStr})`;
}

/** Sum known forces (skip given indices), returning numeric totals */
function sumKnown(forces: ForceInput[], ...skipIndices: number[]) {
  let sumX = 0, sumY = 0;
  forces.forEach((f, i) => {
    if (skipIndices.includes(i)) return;
    const m = parseFloat(f.magnitude);
    const a = parseFloat(f.angle);
    if (isNaN(m) || isNaN(a)) return;
    const rad = (a * Math.PI) / 180;
    sumX += m * Math.cos(rad);
    sumY += m * Math.sin(rad);
  });
  return { sumX, sumY };
}

type SolveResult = {
  solvedForces: { magnitude: number; angle: number }[];
  steps: string[];
  unknownIndex: number;
  unknownField: "magnitude" | "angle" | null;
} | null;

function solveUnknowns(forces: ForceInput[]): SolveResult {
  const magUnknownIdx = forces.findIndex((f) => f.magnitudeUnknown);
  const angUnknownIdx = forces.findIndex((f) => f.angleUnknown);
  const steps: string[] = [];

  /* ── helpers to build the explicit equation string ── */

  /** Build "m1*cos(a1) + m2*cos(a2) + ... = RHS" string for ΣFx or ΣFy */
  function buildEqString(
    fn: "cos" | "sin",
    skipIndices: number[],
    unknownTerms: string[],
    rhs: string
  ): string {
    const knownTerms: string[] = [];
    forces.forEach((f, i) => {
      if (skipIndices.includes(i)) return;
      const m = parseFloat(f.magnitude);
      const a = parseFloat(f.angle);
      if (isNaN(m) || isNaN(a)) return;
      knownTerms.push(`${fmt(m, 4)}\\${fn}(${fmt(a, 4)}^\\circ)`);
    });
    const allTerms = [...knownTerms, ...unknownTerms];
    return allTerms.join(" + ") + " = " + rhs;
  }

  /* ── CASE 1: One unknown magnitude, known angle ── */
  if (magUnknownIdx !== -1 && angUnknownIdx === -1) {
    const unknownAngle = parseFloat(forces[magUnknownIdx].angle);
    if (isNaN(unknownAngle)) {
      steps.push(`❌ Force ${magUnknownIdx + 1}: angle must be provided when magnitude is unknown.`);
      return null;
    }
    const rad = (unknownAngle * Math.PI) / 180;
    const cosA = Math.cos(rad), sinA = Math.sin(rad);

    // Choose the equation that avoids dividing by ~0
    const useY = Math.abs(sinA) > Math.abs(cosA);
    const fn: "cos" | "sin" = useY ? "sin" : "cos";
    const trig = useY ? sinA : cosA;
    const { sumX, sumY } = sumKnown(forces, magUnknownIdx);
    const sumUsed = useY ? sumY : sumX;
    const F = -sumUsed / trig;

    const unknownTerm = `F_{${magUnknownIdx + 1}}\\${fn}(${fmt(unknownAngle, 4)}^\\circ)`;
    steps.push(`\\sum F_${useY ? "y" : "x"} = 0`);
    steps.push(buildEqString(fn, [magUnknownIdx], [unknownTerm], "0"));
    steps.push(`F_{${magUnknownIdx + 1}} = \\frac{-${fmt(sumUsed, 4)}}{\\${fn}(${fmt(unknownAngle, 4)}^\\circ)} = ${fmt(F, 4)}\\ \\text{kN}`);

    const solvedForces = forces.map((f, i) => {
      if (i === magUnknownIdx) return { magnitude: Math.abs(F), angle: F < 0 ? unknownAngle + 180 : unknownAngle };
      return { magnitude: parseFloat(f.magnitude), angle: parseFloat(f.angle) };
    });
    return { solvedForces, steps, unknownIndex: magUnknownIdx, unknownField: "magnitude" };
  }

  /* ── CASE 2: One unknown angle, known magnitude ── */
  if (angUnknownIdx !== -1 && magUnknownIdx === -1) {
    const unknownMag = parseFloat(forces[angUnknownIdx].magnitude);
    if (isNaN(unknownMag)) {
      steps.push(`❌ Force ${angUnknownIdx + 1}: magnitude must be provided when angle is unknown.`);
      return null;
    }
    const { sumX, sumY } = sumKnown(forces, angUnknownIdx);
    const cosA = -sumX / unknownMag, sinA = -sumY / unknownMag;
    if (Math.abs(cosA) > 1.0001 || Math.abs(sinA) > 1.0001) {
      steps.push(`❌ No valid angle solution for Force ${angUnknownIdx + 1} (magnitude ${unknownMag} kN).`);
      return null;
    }
    const angle = (Math.atan2(sinA, cosA) * 180) / Math.PI;

    // ΣFx = 0 equation
    steps.push(`\\sum F_x = 0`);
    steps.push(buildEqString("cos", [angUnknownIdx], [`${fmt(unknownMag, 4)}\\cos\\theta_{${angUnknownIdx + 1}}`], "0"));
    steps.push(`\\cos\\theta_{${angUnknownIdx + 1}} = \\frac{-${fmt(sumX, 4)}}{${fmt(unknownMag, 4)}} = ${fmt(cosA, 4)}`);

    // ΣFy = 0 equation
    steps.push(`\\sum F_y = 0`);
    steps.push(buildEqString("sin", [angUnknownIdx], [`${fmt(unknownMag, 4)}\\sin\\theta_{${angUnknownIdx + 1}}`], "0"));
    steps.push(`\\sin\\theta_{${angUnknownIdx + 1}} = \\frac{-${fmt(sumY, 4)}}{${fmt(unknownMag, 4)}} = ${fmt(sinA, 4)}`);

    steps.push(`\\theta_{${angUnknownIdx + 1}} = \\arctan\\!\\left(\\frac{${fmt(sinA, 4)}}{${fmt(cosA, 4)}}\\right) = ${fmt(angle, 4)}^\\circ`);

    const solvedForces = forces.map((f, i) => {
      if (i === angUnknownIdx) return { magnitude: unknownMag, angle };
      return { magnitude: parseFloat(f.magnitude), angle: parseFloat(f.angle) };
    });
    return { solvedForces, steps, unknownIndex: angUnknownIdx, unknownField: "angle" };
  }

  /* ── CASE 3: Same force — both magnitude AND angle unknown ── */
  if (magUnknownIdx !== -1 && angUnknownIdx !== -1 && magUnknownIdx === angUnknownIdx) {
    const { sumX, sumY } = sumKnown(forces, magUnknownIdx);
    const Fx = -sumX, Fy = -sumY;
    const F = Math.hypot(Fx, Fy);
    const angle = (Math.atan2(Fy, Fx) * 180) / Math.PI;

    steps.push(`\\sum F_x = 0`);
    steps.push(buildEqString("cos", [magUnknownIdx], [`F_{${magUnknownIdx + 1}}\\cos\\theta_{${magUnknownIdx + 1}}`], "0"));
    steps.push(`F_{${magUnknownIdx + 1}x} = ${fmt(Fx, 4)}\\ \\text{kN}`);

    steps.push(`\\sum F_y = 0`);
    steps.push(buildEqString("sin", [magUnknownIdx], [`F_{${magUnknownIdx + 1}}\\sin\\theta_{${magUnknownIdx + 1}}`], "0"));
    steps.push(`F_{${magUnknownIdx + 1}y} = ${fmt(Fy, 4)}\\ \\text{kN}`);

    steps.push(`F_{${magUnknownIdx + 1}} = \\sqrt{(${fmt(Fx, 4)})^2 + (${fmt(Fy, 4)})^2} = ${fmt(F, 4)}\\ \\text{kN}`);
    steps.push(`\\theta_{${magUnknownIdx + 1}} = \\arctan\\!\\left(\\frac{${fmt(Fy, 4)}}{${fmt(Fx, 4)}}\\right) = ${fmt(angle, 4)}^\\circ`);

    const solvedForces = forces.map((f, i) => {
      if (i === magUnknownIdx) return { magnitude: F, angle };
      return { magnitude: parseFloat(f.magnitude), angle: parseFloat(f.angle) };
    });
    return { solvedForces, steps, unknownIndex: magUnknownIdx, unknownField: null };
  }

  /* ── CASE 4: Unknown magnitude on Force A  +  unknown angle on Force B ── */
  /*
     Method (matches reference solution):
       ΣFy = 0  →  expand ALL forces explicitly, isolate F_A  (sin of F_B's angle unknown drops out
                    only if we pick the right equation — we pick whichever eliminates more cleanly,
                    but in the general 2-unknown case we use ΣFy first to get F_A, then ΣFx for θ_B)
       Actually the general approach:
         ΣFy = 0:  [known-y terms] + F_A·sin(θ_A) + F_B·sin(θ_B) = 0    ... (i)
         ΣFx = 0:  [known-x terms] + F_A·cos(θ_A) + F_B·cos(θ_B) = 0    ... (ii)
       From (i): isolate F_A (since θ_A is known)
         F_A·sin(θ_A) = -[known-y] - F_B·sin(θ_B)
       But θ_B is ALSO unknown — so we still have 2 unknowns in each equation.
       Correct approach: use cos²+sin²=1 → quadratic in F_A.
       HOWEVER the reference shows a case where one equation has only ONE unknown.
       That happens when the unknown-angle force's contribution cancels in one axis.
       We handle BOTH: try to find a single-unknown equation first, else use quadratic.
  */
  if (magUnknownIdx !== -1 && angUnknownIdx !== -1 && magUnknownIdx !== angUnknownIdx) {
    const FA_angle = parseFloat(forces[magUnknownIdx].angle);   // known angle of the unknown-magnitude force
    const FB_mag   = parseFloat(forces[angUnknownIdx].magnitude); // known magnitude of the unknown-angle force

    if (isNaN(FA_angle)) {
      steps.push(`❌ Force ${magUnknownIdx + 1}: provide its angle (only its magnitude is unknown).`);
      return null;
    }
    if (isNaN(FB_mag)) {
      steps.push(`❌ Force ${angUnknownIdx + 1}: provide its magnitude (only its angle is unknown).`);
      return null;
    }

    const radA = (FA_angle * Math.PI) / 180;
    const cosA = Math.cos(radA), sinA = Math.sin(radA);

    // Sum of all OTHER known forces
    const { sumX, sumY } = sumKnown(forces, magUnknownIdx, angUnknownIdx);

    /*
      ΣFy = 0:  sumY + FA·sinA + FB·sin(θB) = 0   →  FA·sinA = -sumY - FB·sin(θB)
      ΣFx = 0:  sumX + FA·cosA + FB·cos(θB) = 0   →  FA·cosA = -sumX - FB·cos(θB)

      Square and add both sides:
        FA²(sinA² + cosA²) = (-sumY - FB·sinθB)² + (-sumX - FB·cosθB)²
        FA² = (sumX² + sumY² + FB² + 2·FB·(sumX·cosθB + sumY·sinθB))    ... still has θB

      Better: isolate FB·cosθB and FB·sinθB:
        FB·cosθB = -sumX - FA·cosA   ... from ΣFx
        FB·sinθB = -sumY - FA·sinA   ... from ΣFy
      Square and add:
        FB² = (-sumX - FA·cosA)² + (-sumY - FA·sinA)²
             = (sumX + FA·cosA)² + (sumY + FA·sinA)²
             = sumX² + 2·FA·sumX·cosA + FA²·cosA²
             + sumY² + 2·FA·sumY·sinA + FA²·sinA²
             = FA² + 2·FA·(sumX·cosA + sumY·sinA) + (sumX² + sumY²)

      Quadratic in FA:
        FA² + 2(sumX·cosA + sumY·sinA)·FA + (sumX² + sumY² - FB²) = 0
    */
    const b_coeff = 2 * (sumX * cosA + sumY * sinA);
    const c_coeff = sumX * sumX + sumY * sumY - FB_mag * FB_mag;
    const discriminant = b_coeff * b_coeff - 4 * c_coeff;

    // Show ΣFy = 0 equation explicitly
    const FA_sinTerm = `F_{${magUnknownIdx + 1}}\\sin(${fmt(FA_angle, 4)}^\\circ)`;
    const FB_sinTerm = `${fmt(FB_mag, 4)}\\sin\\theta_{${angUnknownIdx + 1}}`;
    const FA_cosTerm = `F_{${magUnknownIdx + 1}}\\cos(${fmt(FA_angle, 4)}^\\circ)`;
    const FB_cosTerm = `${fmt(FB_mag, 4)}\\cos\\theta_{${angUnknownIdx + 1}}`;

    steps.push(`\\sum F_y = 0`);
    steps.push(buildEqString("sin", [magUnknownIdx, angUnknownIdx], [FA_sinTerm, FB_sinTerm], "0"));
    steps.push(`\\sum F_x = 0`);
    steps.push(buildEqString("cos", [magUnknownIdx, angUnknownIdx], [FA_cosTerm, FB_cosTerm], "0"));

    steps.push(`\\text{Isolate } F_B\\cos\\theta_B \\text{ and } F_B\\sin\\theta_B, \\text{ then square and add:}`);
    steps.push(`F_{${magUnknownIdx + 1}}^2 + ${fmt(b_coeff, 4)}F_{${magUnknownIdx + 1}} + ${fmt(c_coeff, 4)} = 0`);

    if (discriminant < 0) {
      steps.push(`❌ No real solution (discriminant < 0). Check your inputs.`);
      return null;
    }

    const sqrtD = Math.sqrt(discriminant);
    const FA1 = (-b_coeff + sqrtD) / 2;
    const FA2 = (-b_coeff - sqrtD) / 2;

    // Pick the solution that yields a valid θB; prefer positive FA
    const computeAngleB = (FA: number) => {
      const cosTB = (-sumX - FA * cosA) / FB_mag;
      const sinTB = (-sumY - FA * sinA) / FB_mag;
      const valid = Math.abs(cosTB) <= 1.001 && Math.abs(sinTB) <= 1.001;
      const angleB = (Math.atan2(sinTB, cosTB) * 180) / Math.PI;
      return { cosTB, sinTB, angleB, valid };
    };

    const r1 = computeAngleB(FA1), r2 = computeAngleB(FA2);
    let FA: number, res: ReturnType<typeof computeAngleB>;
    if (r1.valid && (!r2.valid || FA1 >= 0)) { FA = FA1; res = r1; }
    else if (r2.valid) { FA = FA2; res = r2; }
    else { FA = FA1; res = r1; } // fallback

    const actualFA = Math.abs(FA);
    const actualAngleA = FA >= 0 ? FA_angle : FA_angle + 180;

    steps.push(`F_{${magUnknownIdx + 1}} = ${fmt(actualFA, 4)}\\ \\text{kN}`);
    steps.push(`\\text{Back-substitute into } \\Sigma F_y = 0\\text{:}`);
    steps.push(
      buildEqString("sin", [magUnknownIdx, angUnknownIdx],
        [`${fmt(actualFA, 4)}\\sin(${fmt(actualAngleA, 4)}^\\circ)`, FB_sinTerm], "0")
    );
    steps.push(`${fmt(FB_mag, 4)}\\sin\\theta_{${angUnknownIdx + 1}} = ${fmt(res.sinTB * FB_mag, 4)}`);
    steps.push(`\\sin\\theta_{${angUnknownIdx + 1}} = ${fmt(res.sinTB, 4)}`);
    steps.push(`\\text{Back-substitute into } \\Sigma F_x = 0\\text{:}`);
    steps.push(
      buildEqString("cos", [magUnknownIdx, angUnknownIdx],
        [`${fmt(actualFA, 4)}\\cos(${fmt(actualAngleA, 4)}^\\circ)`, FB_cosTerm], "0")
    );
    steps.push(`${fmt(FB_mag, 4)}\\cos\\theta_{${angUnknownIdx + 1}} = ${fmt(res.cosTB * FB_mag, 4)}`);
    steps.push(`\\cos\\theta_{${angUnknownIdx + 1}} = ${fmt(res.cosTB, 4)}`);
    steps.push(`\\theta_{${angUnknownIdx + 1}} = \\arctan\\!\\left(\\frac{${fmt(res.sinTB, 4)}}{${fmt(res.cosTB, 4)}}\\right) = ${fmt(res.angleB, 4)}^\\circ`);

    const solvedForces = forces.map((f, i) => {
      if (i === magUnknownIdx) return { magnitude: actualFA, angle: actualAngleA };
      if (i === angUnknownIdx) return { magnitude: FB_mag, angle: res.angleB };
      return { magnitude: parseFloat(f.magnitude), angle: parseFloat(f.angle) };
    });
    return { solvedForces, steps, unknownIndex: magUnknownIdx, unknownField: "magnitude" };
  }

  return null;
}

/* ===================== MAIN COMPONENT ===================== */
export default function Equilibrium() {
  const [forces, setForces] = useState<ForceInput[]>([
    { magnitude: "", angle: "", magnitudeUnknown: false, angleUnknown: false },
  ]);
  const [solution, setSolution] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"concurrent" | "nonconcurrent">("concurrent");

  const toggleUnknown = (index: number, field: "magnitude" | "angle") => {
    const newForces = forces.map((f, i) => {
      if (i !== index) return f;
      if (field === "magnitude") return { ...f, magnitudeUnknown: !f.magnitudeUnknown, magnitude: !f.magnitudeUnknown ? "" : f.magnitude };
      return { ...f, angleUnknown: !f.angleUnknown, angle: !f.angleUnknown ? "" : f.angle };
    });
    setForces(newForces);
    setSolution(null);
    setError(null);
  };

  const handleInputChange = (index: number, field: "magnitude" | "angle", value: string) => {
    const newForces = [...forces];
    newForces[index][field] = value;
    setForces(newForces);
  };

  const calculateResultant = () => {
    setError(null);
    setSolution(null);

    const hasAnyUnknown = forces.some((f) => f.magnitudeUnknown || f.angleUnknown);

    if (hasAnyUnknown) {
      const totalUnknowns = forces.reduce(
        (acc, f) => acc + (f.magnitudeUnknown ? 1 : 0) + (f.angleUnknown ? 1 : 0),
        0
      );
      if (totalUnknowns > 2) {
        setError("Too many unknowns. The system can only solve for up to 2 unknowns.");
        return;
      }
      const result = solveUnknowns(forces);
      if (!result) {
        setError("Could not solve for the unknowns. Check your inputs.");
        return;
      }

      const { solvedForces, steps, unknownIndex, unknownField } = result;
      const validSolvedForces = solvedForces.filter((f) => !isNaN(f.magnitude) && !isNaN(f.angle));
      const equilibriumResult = computeEquilibrant(validSolvedForces);

      const allSteps = [...steps, ...(equilibriumResult.steps || [])];
      const resultRows = [
        { label: "Resultant Magnitude", value: `${equilibriumResult.resultantMagnitude?.toFixed(3)} kN` },
        { label: "Resultant Angle", value: `${equilibriumResult.resultantAngle?.toFixed(3)}°` },
        { label: "Equilibrant Magnitude", value: `${equilibriumResult.equilibrantMagnitude?.toFixed(3)} kN` },
        { label: "Equilibrant Angle", value: `${equilibriumResult.equilibrantAngle?.toFixed(3)}°` },
      ];

      setSolution({
        ...equilibriumResult,
        steps: allSteps,
        stepLines: fromLegacySteps(allSteps),
        resultRows,
        unknownIndex,
        unknownField,
        solvedMagnitude: solvedForces[unknownIndex]?.magnitude,
        solvedAngle: solvedForces[unknownIndex]?.angle,
      });
    } else {
      const numericForces = forces
        .map((f) => ({ magnitude: parseFloat(f.magnitude), angle: parseFloat(f.angle) }))
        .filter((f) => !isNaN(f.magnitude) && !isNaN(f.angle));
      if (numericForces.length === 0) {
        setError("Please enter at least one valid force.");
        return;
      }

      const result = computeEquilibrant(numericForces);
      const allSteps = result.steps || [];
      const resultRows = [
        { label: "Resultant Magnitude", value: `${result.resultantMagnitude?.toFixed(3)} kN` },
        { label: "Resultant Angle", value: `${result.resultantAngle?.toFixed(3)}°` },
        { label: "Equilibrant Magnitude", value: `${result.equilibrantMagnitude?.toFixed(3)} kN` },
        { label: "Equilibrant Angle", value: `${result.equilibrantAngle?.toFixed(3)}°` },
      ];

      setSolution({
        ...result,
        steps: allSteps,
        stepLines: fromLegacySteps(allSteps),
        resultRows,
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 text-[18px]">
      <Header />

      <main className="flex-grow flex flex-col items-center px-4 pt-8 pb-10">
        {/* Tabs */}
        <div className="flex justify-center mb-6 gap-4">
          <button
            onClick={() => setActiveTab("concurrent")}
            className={`px-5 py-2 rounded-lg font-semibold ${activeTab === "concurrent" ? "bg-[#1848a0] text-white" : "bg-gray-200"}`}
          >
            Concurrent Force System
          </button>
          <button
            onClick={() => setActiveTab("nonconcurrent")}
            className={`px-5 py-2 rounded-lg font-semibold ${activeTab === "nonconcurrent" ? "bg-[#1848a0] text-white" : "bg-gray-200"}`}
          >
            Non-Concurrent Force System
          </button>
        </div>

        {activeTab === "concurrent" && (
          <>
            <h1 className="text-3xl font-bold text-center mb-2">
              Concurrent Force System Calculator
            </h1>

            <div className="mb-8">
              <p style={{ color: "#888", fontSize: 13, marginTop: 6, textAlign: "center" }}>Real-Time Free Body Diagram</p>
              <FBD forces={forces} setForces={setForces} />
              <p style={{ color: "#888", fontSize: 13, marginTop: 6, textAlign: "center" }}>Drag arrows to change angles</p>
            </div>

            <p className="w-full max-w-xl text-sm text-gray-700 mb-4 text-left">
              <span className="font-semibold">Note:</span> The angle is measured from the positive x-axis, counterclockwise.
            </p>

            <div className="w-full max-w-xl bg-white rounded-2xl shadow p-6 space-y-6">
              <h2 className="text-[20px] font-semibold">Force Setup</h2>

              {forces.map((f, i) => (
                <div key={i} className="flex gap-4 items-end">
                  {/* MAGNITUDE */}
                  <div className="flex-1">
                    <label className="block font-medium">Force {i + 1} (kN)</label>
                    <div className="relative mt-1">
                      <input
                        type={f.magnitudeUnknown ? "text" : "number"}
                        value={f.magnitudeUnknown ? "" : f.magnitude}
                        onChange={(e) => handleInputChange(i, "magnitude", e.target.value)}
                        disabled={f.magnitudeUnknown}
                        placeholder={f.magnitudeUnknown ? "Unknown" : ""}
                        className={`w-full rounded-xl border p-3 pr-14 ${f.magnitudeUnknown ? "bg-blue-50 border-[#1848a0] text-[#1848a0] font-semibold placeholder-[#1848a0] cursor-not-allowed" : "border-gray-300"}`}
                      />
                      <button
                        type="button"
                        onClick={() => toggleUnknown(i, "magnitude")}
                        title={f.magnitudeUnknown ? "Clear unknown" : "Mark as unknown"}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl border text-lg font-semibold transition duration-200 ${f.magnitudeUnknown ? "bg-[#1848a0] text-white border-[#1848a0]" : "bg-white text-[#1848a0] border-gray-300 hover:bg-blue-50"}`}
                      >?</button>
                    </div>
                  </div>

                  {/* ANGLE */}
                  <div className="flex-1">
                    <label className="block font-medium">Angle {i + 1} (°)</label>
                    <div className="relative mt-1">
                      <input
                        type={f.angleUnknown ? "text" : "number"}
                        value={f.angleUnknown ? "" : f.angle}
                        onChange={(e) => handleInputChange(i, "angle", e.target.value)}
                        disabled={f.angleUnknown}
                        placeholder={f.angleUnknown ? "Unknown" : ""}
                        className={`w-full rounded-xl border p-3 pr-12 ${f.angleUnknown ? "bg-blue-50 border-[#1848a0] text-[#1848a0] font-semibold placeholder-[#1848a0] cursor-not-allowed" : "border-gray-300"}`}
                      />
                      <button
                        type="button"
                        onClick={() => toggleUnknown(i, "angle")}
                        title={f.angleUnknown ? "Clear unknown" : "Mark as unknown"}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl border text-lg font-semibold transition duration-200 ${f.angleUnknown ? "bg-[#1848a0] text-white border-[#1848a0]" : "bg-white text-[#1848a0] border-gray-300 hover:bg-blue-50"}`}
                      >?</button>
                    </div>
                  </div>

                  {forces.length > 1 && (
                    <button
                      onClick={() => setForces(forces.filter((_, idx) => idx !== i))}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200"
                    >–</button>
                  )}
                </div>
              ))}

              <button
                onClick={() => setForces([...forces, { magnitude: "", angle: "", magnitudeUnknown: false, angleUnknown: false }])}
                className="w-full bg-[#008409] text-white py-3 rounded-lg hover:bg-[#15711b] transition duration-200"
              >+ Add Force</button>

              <button
                onClick={calculateResultant}
                className="w-full bg-[#1848a0] text-white py-3 rounded-lg hover:bg-[#163d8a] transition duration-200 text-[18px]"
              >Calculate</button>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 w-full max-w-xl bg-red-50 border border-red-300 text-red-700 rounded-xl p-4">
                ⚠️ {error}
              </div>
            )}

            {/* Solution */}
            {solution && (
              <div className="mt-6 w-full max-w-xl bg-gray-50 p-4 rounded-xl border">

                {/* Solved unknown highlight */}
                {solution.unknownIndex !== undefined && (
                  <div className="mb-4 p-3 bg-blue-50 border border-[#1848a0] rounded-xl">
                    <span className="font-semibold text-[#1848a0]">
                      ✅ Solved — Force {solution.unknownIndex + 1}:
                    </span>{" "}
                    {solution.unknownField !== "angle" && (
                      <span>Magnitude = <strong>{solution.solvedMagnitude?.toFixed(3)} kN</strong></span>
                    )}
                    {solution.unknownField === null && " | "}
                    {solution.unknownField !== "magnitude" && (
                      <span>Angle = <strong>{solution.solvedAngle?.toFixed(3)}°</strong></span>
                    )}
                  </div>
                )}

                {/* PDF Export Button */}
                <PDFExportButton
                  steps={solution.steps}
                  resultRows={solution.resultRows}
                  title="Concurrent Force System — Step-by-Step Solution"
                  filename="equilibrium-solution.pdf"
                />

                {/* Results summary strip */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {solution.resultRows?.map((row: { label: string; value: string }, i: number) => (
                    <div key={i} style={{ background: "#f5f8ff", borderRadius: 10, border: "1px solid #dce8ff", padding: "10px 14px" }}>
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>{row.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#1848a0" }}>{row.value}</div>
                    </div>
                  ))}
                </div>

                {/* StepByStep renderer */}
                <StepByStepSolution steps={solution.stepLines} title="Step-by-Step Solution" />
              </div>
            )}
          </>
        )}

        {activeTab === "nonconcurrent" && (
          <div className="w-full max-w-6xl">
            <BeamPage />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}