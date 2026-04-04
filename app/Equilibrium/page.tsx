"use client";

import { useRef, useState, useCallback, useEffect, ReactNode } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import "katex/dist/katex.min.css";
import BeamPage from "../Beam/page";
import { solveEquilibrium2D } from "../../lib/Equilibriumconc";

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
   SANITIZE TEX + STEP RENDERER
================================================================ */
function sanitizeTeX(tex: string): string {
  // Fix double-subscript: F_{1}_x -> F_{{1}x} (KaTeX rejects double subscripts)
  return tex.replace(/(_\{[^}]+\})_([a-zA-Z])/g, (_match: string, sub: string, axis: string) => {
    const inner = sub.slice(2, -1);
    return `_{{${inner}}${axis}}`;
  });
}

function fromLegacySteps(steps: string[]): StepLine[] {
  return steps.map((line) => {
    const trimmed = line.trim();

    // \textbf{...} => heading
    if (trimmed.startsWith("\\textbf{")) {
      const inner = trimmed.replace(/^\\textbf\{([\s\S]*)\}$/, "$1");
      return { type: "heading", text: inner };
    }

    // Plain "Step X: ..." headings
    if (trimmed.startsWith("Step "))
      return { type: "heading", text: trimmed };

    // \textit{...} => render via KaTeX so F_{n} inside renders correctly
    if (trimmed.startsWith("\\textit{")) {
      return { type: "math", tex: sanitizeTeX(trimmed) };
    }

    // No backslash => plain text
    if (!trimmed.includes("\\")) return { type: "text", text: trimmed };

    // Math => sanitize then KaTeX
    return { type: "math", tex: sanitizeTeX(trimmed) };
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
    if (s.startsWith("Step ") || s.startsWith("\\textbf{")) {
      guard(10); y += 2;
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(24, 72, 160);
      pdf.text(s.replace(/^\\textbf\{([\s\S]*)\}$/, "$1"), M, y); y += 14; continue;
    }
    if (s.startsWith("\\textit{")) {
      guard(8);
      const inner = s.replace(/^\\textit\{([\s\S]*)\}$/, "$1");
      pdf.setFont("helvetica", "italic"); pdf.setFontSize(10); pdf.setTextColor(100, 100, 100);
      pdf.text(`ℹ️ ${inner}`, M, y); y += 8; continue;
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
const UNKNOWN_LENGTH = 75;

function FBD({ forces, setForces }: { forces: ForceInput[]; setForces: (f: ForceInput[]) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const vectors = forces.map((f, i) => {
    const magUnknown = !!f.magnitudeUnknown;
    const angUnknown = !!f.angleUnknown;
    const rawMag = parseFloat(f.magnitude);
    const rawAng = parseFloat(f.angle);
    const angle = isNaN(rawAng) ? 0 : rawAng;
    const hasMag = !magUnknown && !isNaN(rawMag);
    return { mag: hasMag ? rawMag : null, angle, magUnknown, angUnknown, index: i };
  });

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
        <line x1={-140} y1={0} x2={140} y2={0} stroke="#e2e8f0" strokeWidth="1" />
        <line x1={0} y1={-140} x2={0} y2={140} stroke="#e2e8f0" strokeWidth="1" />
        <text x={143} y={4} fontSize="10" fill="#94a3b8">x</text>
        <text x={3} y={-133} fontSize="10" fill="#94a3b8">y</text>

        {vectors.map((v, i) => {
          const colorIdx = i % FORCE_COLORS.length;
          const color = FORCE_COLORS[colorIdx];
          const rad = (v.angle * Math.PI) / 180;
          const isUnknown = v.magUnknown || (v.mag === null);
          const len = isUnknown ? UNKNOWN_LENGTH : (v.mag as number) * scale;
          const ex = Math.cos(rad) * len;
          const ey = -Math.sin(rad) * len;
          const labelOffset = 14;
          const lx = Math.cos(rad) * (len + labelOffset);
          const ly = -Math.sin(rad) * (len + labelOffset);
          const showArc = !v.angUnknown && !isNaN(v.angle);
          const arcR = 28;
          const arcEndX = Math.cos(rad) * arcR;
          const arcEndY = -Math.sin(rad) * arcR;
          const largeArc = v.angle > 180 ? 1 : 0;
          const midAng = v.angle / 2;
          const midRad = (midAng * Math.PI) / 180;
          const aLx = Math.cos(midRad) * (arcR + 10);
          const aLy = -Math.sin(midRad) * (arcR + 10);

          return (
            <g key={i} className="cursor-pointer" onMouseDown={() => setDragIndex(i)}>
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
              <line
                x1={0} y1={0} x2={ex} y2={ey}
                stroke={color}
                strokeWidth={isUnknown ? 2 : 3}
                strokeDasharray={isUnknown ? "6 3" : undefined}
                opacity={isUnknown ? 0.65 : 1}
                markerEnd={isUnknown ? `url(#arrow-dash-${colorIdx})` : `url(#arrow-${colorIdx})`}
              />
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

        <circle cx={0} cy={0} r={4} fill="#334155" />
      </g>
    </svg>
  );
}

/* ================================================================
   CALCULATE — all math delegated to solveEquilibrium2D
================================================================ */
function calculate(forces: ForceInput[]): {
  steps: string[];
  stepLines: StepLine[];
  resultRows: { label: string; value: string }[];
  solvedLabel?: string;
} | { error: string } {

  const magUnknownIndices = forces.map((f, i) => f.magnitudeUnknown ? i : -1).filter(i => i !== -1);
  const angUnknownIndices = forces.map((f, i) => f.angleUnknown ? i : -1).filter(i => i !== -1);
  const totalUnknowns = magUnknownIndices.length + angUnknownIndices.length;

  /* ── Validate unknowns ── */
  if (totalUnknowns > 2) {
    return { error: "Too many unknowns. The system can only solve for up to 2 unknowns." };
  }

  /* ── Build known forces list ── */
  const knownForces = forces
    .map((f, i) => ({ f, i }))
    .filter(({ f, i }) => !magUnknownIndices.includes(i) && !angUnknownIndices.includes(i))
    .map(({ f, i }) => {
      const magnitude = parseFloat(f.magnitude);
      const angle = parseFloat(f.angle);
      if (isNaN(magnitude) || isNaN(angle)) return null;
      return { magnitude, angle, label: `F_{${i + 1}}` };
    })
    .filter(Boolean) as { magnitude: number; angle: number; label: string }[];

  /* ── ALL FORCES KNOWN → resultant via single "unknown" at angle 0 with magnitude 0 trick
        OR just sum them directly by passing a dummy unknown resultant ── */
  if (totalUnknowns === 0) {
    if (knownForces.length === 0) {
      return { error: "Please enter at least one valid force." };
    }
    // To compute resultant, we ask for the equilibrant (opposite of resultant),
    // then negate. We use a dummy unknown with no angle constraint by using
    // solveEquilibrium2D with both unknowns being resultant x and y components.
    // Simpler: we call solveEquilibrium2D with one unknown at angle=0 and one at angle=90
    // then reconstruct. But cleanest: delegate by treating resultant computation
    // as "find Fx_result and Fy_result" using 0° and 90° unknowns.
    try {
      const resultX = solveEquilibrium2D(knownForces, [
        { angle: 0, label: "R_x" },
        { angle: 90, label: "R_y" },
      ]);
      // resultX gives -ΣFx and -ΣFy (equilibrant components), negate to get resultant
      const Rx = -resultX.unknowns[0].value;
      const Ry = -resultX.unknowns[1].value;
      const R = Math.hypot(Rx, Ry);
      const angle = (Math.atan2(Ry, Rx) * 180) / Math.PI;

      const resultRows = [
        { label: "Resultant Magnitude", value: `${R.toFixed(3)} kN` },
        { label: "Resultant Angle", value: `${angle.toFixed(3)}°` },
      ];
      const steps = resultX.steps;
      return { steps, stepLines: fromLegacySteps(steps), resultRows };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  /* ── CASE: one unknown magnitude, one unknown angle on SAME force ── */
  if (
    magUnknownIndices.length === 1 &&
    angUnknownIndices.length === 1 &&
    magUnknownIndices[0] === angUnknownIndices[0]
  ) {
    const idx = magUnknownIndices[0];
    // Decompose into two scalar unknowns: Fx and Fy of that force
    try {
      const result = solveEquilibrium2D(knownForces, [
        { angle: 0, label: `F_{${idx + 1}x}` },
        { angle: 90, label: `F_{${idx + 1}y}` },
      ]);
      const Fx = -result.unknowns[0].value;
      const Fy = -result.unknowns[1].value;
      const mag = Math.hypot(Fx, Fy);
      const ang = (Math.atan2(Fy, Fx) * 180) / Math.PI;
      const resultRows = [
        { label: `Force ${idx + 1} Magnitude`, value: `${mag.toFixed(3)} kN` },
        { label: `Force ${idx + 1} Angle`, value: `${ang.toFixed(3)}°` },
      ];
      const steps = result.steps;
      return {
        steps,
        stepLines: fromLegacySteps(steps),
        resultRows,
        solvedLabel: `F${idx + 1}: ${mag.toFixed(3)} kN @ ${ang.toFixed(3)}°`,
      };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  /* ── CASE: one unknown angle only ── */
  if (magUnknownIndices.length === 0 && angUnknownIndices.length === 1) {
    const idx = angUnknownIndices[0];
    const mag = parseFloat(forces[idx].magnitude);
    if (isNaN(mag)) return { error: `Force ${idx + 1}: provide magnitude when angle is unknown.` };

    // Decompose unknown-angle force into Fx = mag*cosθ and Fy = mag*sinθ
    // Treat as two unknowns: Fx_comp and Fy_comp, both free (angles 0 and 90)
    // but constrained by Fx_comp² + Fy_comp² = mag²
    // solveEquilibrium2D handles 2 unknowns at 0° and 90° → gives -ΣFx and -ΣFy
    try {
      const result = solveEquilibrium2D(knownForces, [
        { angle: 0, label: `F_{${idx + 1}x}` },
        { angle: 90, label: `F_{${idx + 1}y}` },
      ]);
      const Fx = -result.unknowns[0].value;
      const Fy = -result.unknowns[1].value;
      // validate against known magnitude
      const computedMag = Math.hypot(Fx, Fy);
      if (Math.abs(computedMag - mag) > 0.01 * mag + 1e-6) {
        return { error: `No valid angle solution for Force ${idx + 1}: magnitude ${mag} kN is inconsistent with equilibrium.` };
      }
      const ang = (Math.atan2(Fy, Fx) * 180) / Math.PI;
      const resultRows = [{ label: `Force ${idx + 1} Angle`, value: `${ang.toFixed(3)}°` }];
      const steps = result.steps;
      return {
        steps,
        stepLines: fromLegacySteps(steps),
        resultRows,
        solvedLabel: `F${idx + 1} angle = ${ang.toFixed(3)}°`,
      };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  /* ── CASE: one or two unknown magnitudes (known angles) ── */
  if (magUnknownIndices.length >= 1 && angUnknownIndices.length === 0) {
    const unknownForces = magUnknownIndices.map((i) => {
      const angle = parseFloat(forces[i].angle);
      if (isNaN(angle)) return null;
      return { angle, label: `F_{${i + 1}}` };
    });

    if (unknownForces.some((u) => u === null)) {
      const missing = magUnknownIndices.find((i) => isNaN(parseFloat(forces[i].angle)));
      return { error: `Force ${missing! + 1}: angle must be provided when magnitude is unknown.` };
    }

    try {
      const result = solveEquilibrium2D(
        knownForces,
        unknownForces as { angle: number; label: string }[]
      );

      const resultRows = magUnknownIndices.map((origIdx, k) => {
        const val = result.unknowns[k].value;
        const mag = Math.abs(val);
        return { label: `Force ${origIdx + 1} Magnitude`, value: `${mag.toFixed(3)} kN` };
      });

      const solvedLabel = magUnknownIndices
        .map((origIdx, k) => `F${origIdx + 1} = ${Math.abs(result.unknowns[k].value).toFixed(3)} kN`)
        .join(" | ");

      return {
        steps: result.steps,
        stepLines: fromLegacySteps(result.steps),
        resultRows,
        solvedLabel,
      };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  /* ── CASE: one unknown magnitude + one unknown angle on DIFFERENT forces ── */
  if (magUnknownIndices.length === 1 && angUnknownIndices.length === 1) {
    const magIdx = magUnknownIndices[0];
    const angIdx = angUnknownIndices[0];
    const magAngle = parseFloat(forces[magIdx].angle);
    const angMag = parseFloat(forces[angIdx].magnitude);

    if (isNaN(magAngle)) return { error: `Force ${magIdx + 1}: provide angle when magnitude is unknown.` };
    if (isNaN(angMag)) return { error: `Force ${angIdx + 1}: provide magnitude when angle is unknown.` };

    // Treat the unknown-angle force as two component unknowns at 0° and 90°,
    // plus the unknown-magnitude force at its known angle.
    // That gives 3 unknowns for 2 equations — over-constrained. Instead, substitute
    // the magnitude constraint Fx² + Fy² = angMag² to eliminate one degree of freedom.
    // We solve using solveEquilibrium2D with the unknown-magnitude force + one axis component
    // of the unknown-angle force. The other component follows from the magnitude constraint.
    // Strategy: use ΣFx and ΣFy directly with 2 unknowns:
    //   unknown1 = F_{magIdx+1} (magnitude unknown, angle known)
    //   unknown2 conceptually split as angMag·cosθ and angMag·sinθ
    // We do this in two sub-solves: assume θ via atan2 after getting both components.
    try {
      // Pass both unknowns: unknown-mag force at its angle, plus x-component of unknown-angle force
      // Then recover y-component from ΣFy after solving.
      const resultFx = solveEquilibrium2D(
        knownForces,
        [
          { angle: magAngle, label: `F_{${magIdx + 1}}` },
          { angle: 0, label: `F_{${angIdx + 1}x}` },
        ]
      );
      // Now get the y residual
      const solvedMag = resultFx.unknowns[0].value;
      const solvedFx = -resultFx.unknowns[1].value;

      // Use ΣFy = 0 to find Fy of the unknown-angle force
      const resultFy = solveEquilibrium2D(
        [
          ...knownForces,
          { magnitude: Math.abs(solvedMag), angle: solvedMag >= 0 ? magAngle : magAngle + 180, label: `F_{${magIdx + 1}}` },
        ],
        [{ angle: 90, label: `F_{${angIdx + 1}y}` }]
      );
      const solvedFy = -resultFy.unknowns[0].value;

      const ang = (Math.atan2(solvedFy, solvedFx) * 180) / Math.PI;
      const actualMag = Math.abs(solvedMag);
      const actualAngle = solvedMag >= 0 ? magAngle : magAngle + 180;

      const resultRows = [
        { label: `Force ${magIdx + 1} Magnitude`, value: `${actualMag.toFixed(3)} kN` },
        { label: `Force ${angIdx + 1} Angle`, value: `${ang.toFixed(3)}°` },
      ];
      const steps = [...resultFx.steps, ...resultFy.steps];
      return {
        steps,
        stepLines: fromLegacySteps(steps),
        resultRows,
        solvedLabel: `F${magIdx + 1} = ${actualMag.toFixed(3)} kN | F${angIdx + 1} angle = ${ang.toFixed(3)}°`,
      };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  return { error: "Unsupported combination of unknowns." };
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

  const handleCalculate = () => {
    setError(null);
    setSolution(null);

    const result = calculate(forces);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    setSolution(result);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 text-[18px]">
      <Header />

      <main className="flex-grow flex flex-col items-center px-4 pt-8 pb-10">
        <div
    className="fixed inset-0 pointer-events-none"
    style={{
        backgroundImage: `radial-gradient(circle, rgba(24,72,160,0.15) 2px, transparent 2px)`,
        backgroundSize: "40px 40px",
    }}
/>
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

            <div className="mb-8 relative z-10">
              <p style={{ color: "#888", fontSize: 13, marginTop: 6, textAlign: "center" }}>Real-Time Free Body Diagram</p>
              <FBD forces={forces} setForces={setForces} />
              <p style={{ color: "#888", fontSize: 13, marginTop: 6, textAlign: "center" }}>Drag arrows to change angles</p>
            </div>

            <p className="w-full max-w-xl text-sm text-gray-700 mb-4 text-left">
              <span className="font-semibold">Note:</span> The angle is measured from the positive x-axis, counterclockwise.
            </p>

            <div className="w-full max-w-xl bg-white rounded-2xl shadow p-6 space-y-6 relative z-10">
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
                onClick={handleCalculate}
                className="w-full bg-[#1848a0] text-white py-3 rounded-lg hover:bg-[#163d8a] transition duration-200 text-[18px]"
              >Calculate</button>
            </div>

            {error && (
              <div className="mt-4 w-full max-w-xl bg-red-50 border border-red-300 text-red-700 rounded-xl p-4">
                ⚠️ {error}
              </div>
            )}

            {solution && (
              <div className="mt-6 w-full max-w-xl bg-gray-50 p-4 rounded-xl border">

                {solution.solvedLabel && (
                  <div className="mb-4 p-3 bg-blue-50 border border-[#1848a0] rounded-xl">
                    <span className="font-semibold text-[#1848a0]">✅ Solved: </span>
                    <strong>{solution.solvedLabel}</strong>
                  </div>
                )}

                <PDFExportButton
                  steps={solution.steps}
                  resultRows={solution.resultRows}
                  title="Concurrent Force System — Step-by-Step Solution"
                  filename="equilibrium-solution.pdf"
                />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {solution.resultRows?.map((row: { label: string; value: string }, i: number) => (
                    <div key={i} style={{ background: "#f5f8ff", borderRadius: 10, border: "1px solid #dce8ff", padding: "10px 14px" }}>
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>{row.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#1848a0" }}>{row.value}</div>
                    </div>
                  ))}
                </div>

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