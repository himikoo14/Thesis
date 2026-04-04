"use client";

import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { solveBeam, BeamResult } from "../../lib/beamEngine";

/* ===================== TYPES ===================== */

type Support = { type: "Pinned" | "Roller"; location: string };
type PointLoad = { magnitude: string; location: string };
type DistributedLoad = { start: string; end: string; startMag: string; endMag: string };
type GenericObject = Record<string, any>;

/* ================================================================
   STEP LINE TYPES
================================================================ */
type StepLine =
  | { type: "heading"; text: string }
  | { type: "math"; tex: string }
  | { type: "text"; text: string }
  | { type: "diagram"; label?: string; node: ReactNode };

function fromLegacySteps(steps: string[]): StepLine[] {
  return steps.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("Step")) return { type: "heading", text: trimmed };
    if (!trimmed.includes("\\") || trimmed.includes("kN\\cdot") || trimmed.startsWith("Max")) {
      return { type: "text", text: trimmed.replace(/\\cdotp?/g, "·") };
    }
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
function StepByStepSolution({ steps, title = "Step-by-Step Solution" }: {
  steps: StepLine[];
  title?: string;
}) {
  return (
    <div>
      {title && <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>{title}</h2>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, lineHeight: 1.8 }}>
        {steps.map((line, i) => {
          switch (line.type) {
            case "heading":
              return (
                <p key={i} style={{ fontWeight: 600, fontSize: 16, marginTop: 14, marginBottom: 2, color: "#1848a0" }}>
                  {line.text}
                </p>
              );
            case "math":
              return <KTX key={i} tex={line.tex} />;
            case "text":
              return (
                <p key={i} style={{ fontSize: 15, color: "#333", margin: "2px 0" }}>
                  {line.text}
                </p>
              );
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
      const wrapped = pdf.splitTextToSize(s, CW);
      pdf.text(wrapped, M, y); y += wrapped.length * 6 + 2; continue;
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
        fontSize: 14, fontWeight: 600, fontFamily: "inherit", transition: "all 0.2s",
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

/* ===================== SVG FREE BODY DIAGRAM ===================== */

function BeamFBD({ beamLength, supports, pointLoads, distributedLoads, result }: {
  beamLength: string;
  supports: Support[];
  pointLoads: PointLoad[];
  distributedLoads: DistributedLoad[];
  result: BeamResult | null;
}) {
  const L = parseFloat(beamLength);
  if (!L || L <= 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", width: "100%", textAlign: "center", color: "#9ca3af", fontSize: 14, background: "#ffffff", borderRadius: 12 }}>
        Enter a beam length to see the diagram
      </div>
    );
  }

  const W = 680, H = 260, padL = 60, padR = 60, beamY = 160, beamH = 14;
  const drawW = W - padL - padR;
  const scale = drawW / L;
  const toX = (m: number) => padL + m * scale;

  const allMags = [
    ...pointLoads.map(p => Math.abs(parseFloat(p.magnitude) || 0)),
    ...distributedLoads.map(d => Math.max(Math.abs(parseFloat(d.startMag) || 0), Math.abs(parseFloat(d.endMag) || 0))),
  ];
  const maxMag = Math.max(1, ...allMags);
  const maxArrowH = 60;
  const arrowH = (mag: number) => Math.max(10, (Math.abs(mag) / maxMag) * maxArrowH);
  const maxReaction = result ? Math.max(...result.reactions.map(r => Math.abs(r.vertical))) : 1;
  const reactionArrowH = (v: number) => Math.max(10, (Math.abs(v) / Math.max(maxReaction, 1)) * 50);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <marker id="arrowDown" markerWidth="8" markerHeight="8" refX="4" refY="0" orient="90">
          <polygon points="0,0 8,0 4,8" fill="#1848a0" />
        </marker>
        <marker id="arrowDownGreen" markerWidth="8" markerHeight="8" refX="4" refY="0" orient="90">
          <polygon points="0,0 8,0 4,8" fill="#059669" />
        </marker>
        <marker id="arrowRight" markerWidth="8" markerHeight="8" refX="0" refY="4" orient="auto">
          <polygon points="0,0 0,8 8,4" fill="#9ca3af" />
        </marker>
        <marker id="arrowUp" markerWidth="8" markerHeight="8" refX="4" refY="0" orient="auto">
          <polygon points="0,8 8,8 4,0" fill="#009900" />
        </marker>
      </defs>

      {distributedLoads.map((d, i) => {
        const xs = parseFloat(d.start), xe = parseFloat(d.end);
        const ws = parseFloat(d.startMag), we = parseFloat(d.endMag);
        if (isNaN(xs) || isNaN(xe) || isNaN(ws) || isNaN(we) || xe <= xs) return null;
        const x1 = toX(xs), x2 = toX(xe);
        const hs = arrowH(Math.abs(ws));
        const he = arrowH(Math.abs(we));
        const topYs = beamY - hs;
        const topYe = beamY - he;
        const numLines = Math.max(2, Math.round((x2 - x1) / 18));
        const lines = [];
        for (let j = 0; j <= numLines; j++) {
          const t = j / numLines;
          const lx = x1 + t * (x2 - x1);
          const topY = topYs + t * (topYe - topYs);
          lines.push(
            <g key={j}>
              <line x1={lx} y1={topY} x2={lx} y2={beamY - 6} stroke="#1848a0" strokeWidth="1.5" />
              <polygon points={`${lx - 4},${beamY - 6} ${lx + 4},${beamY - 6} ${lx},${beamY}`} fill="#1848a0" />
            </g>
          );
        }
        return (
          <g key={i}>
            {lines}
            <line x1={x1} y1={topYs} x2={x2} y2={topYe} stroke="#1848a0" strokeWidth="2.5" />
            {ws === we ? (
              <text x={(x1 + x2) / 2} y={Math.min(topYs, topYe) - 6} textAnchor="middle" fontSize="11" fill="#1848a0" fontFamily="monospace">{ws} kN/m</text>
            ) : (
              <>
                <text x={x1} y={topYs - 6} textAnchor="start" fontSize="11" fill="#1848a0" fontFamily="monospace">{ws} kN/m</text>
                <text x={x2} y={topYe - 6} textAnchor="end" fontSize="11" fill="#1848a0" fontFamily="monospace">{we} kN/m</text>
              </>
            )}
          </g>
        );
      })}
      {pointLoads.map((p, i) => {
        const m = parseFloat(p.magnitude), x = parseFloat(p.location);
        if (isNaN(m) || isNaN(x) || m === 0) return null;
        const px = toX(x);

        // Check if this point load overlaps any distributed load
        const overlapDist = distributedLoads.find(d => {
          const xs = parseFloat(d.start), xe = parseFloat(d.end);
          const ws = parseFloat(d.startMag), we = parseFloat(d.endMag);
          if (isNaN(xs) || isNaN(xe) || isNaN(ws) || isNaN(we) || xe <= xs) return false;
          return x >= xs && x <= xe;
        });

        let baseY = beamY;
        if (overlapDist) {
          const ws = parseFloat(overlapDist.startMag), we = parseFloat(overlapDist.endMag);
          baseY = beamY - arrowH(Math.max(Math.abs(ws), Math.abs(we)));
        }

        const h = arrowH(m);
        const labelGap = overlapDist ? 20 : 0; // extra space above dist load top line
        return (
          <g key={i}>
            <line x1={px} y1={baseY - h - labelGap} x2={px} y2={baseY - 7 - labelGap} stroke="#059669" strokeWidth="2.5" />
            <polygon points={`${px - 5},${baseY - 7 - labelGap} ${px + 5},${baseY - 7 - labelGap} ${px},${baseY - labelGap}`} fill="#059669" />
            <text x={px} y={baseY - h - labelGap - 6} textAnchor="middle" fontSize="12" fill="#059669" fontWeight="bold" fontFamily="monospace">{m} kN</text>
          </g>
        );
      })}

      <rect x={padL} y={beamY} width={drawW} height={beamH} fill="#d1d5db" stroke="#374151" strokeWidth="2" rx="2" />
      <line x1={padL} y1={beamY + beamH + 22} x2={padL + drawW} y2={beamY + beamH + 22} stroke="#9ca3af" strokeWidth="1" />
      <line x1={padL} y1={beamY + beamH + 16} x2={padL} y2={beamY + beamH + 28} stroke="#9ca3af" strokeWidth="1.5" />
      <line x1={padL + drawW} y1={beamY + beamH + 16} x2={padL + drawW} y2={beamY + beamH + 28} stroke="#9ca3af" strokeWidth="1.5" />
      <text x={padL + drawW / 2} y={beamY + beamH + 36} textAnchor="middle" fontSize="12" fill="#6b7280" fontFamily="monospace">L = {L} m</text>

      {supports.map((s, i) => {
        const x = parseFloat(s.location);
        if (isNaN(x)) return null;
        const sx = toX(x), sy = beamY + beamH;
        const reaction = result?.reactions.find(r => Math.abs(r.location - x) < 0.01);
        const rv = reaction?.vertical ?? 0;
        const rh = reactionArrowH(rv);
        return (
          <g key={i}>
            {s.type === "Pinned" && (
              <>
                <polygon points={`${sx},${sy} ${sx - 12},${sy + 18} ${sx + 12},${sy + 18}`} fill="#6b7280" stroke="#374151" strokeWidth={1} />
                <line x1={sx - 14} y1={sy + 18} x2={sx + 14} y2={sy + 18} stroke="#374151" strokeWidth={2} />
              </>
            )}
            {s.type === "Roller" && (
              <>
                <polygon points={`${sx},${sy} ${sx - 12},${sy + 18} ${sx + 12},${sy + 18}`} fill="#9ca3af" stroke="#6b7280" strokeWidth={1} />
                <circle cx={sx - 7} cy={sy + 21} r={3} fill="none" stroke="#6b7280" strokeWidth={1.5} />
                <circle cx={sx} cy={sy + 21} r={3} fill="none" stroke="#6b7280" strokeWidth={1.5} />
                <circle cx={sx + 7} cy={sy + 21} r={3} fill="none" stroke="#6b7280" strokeWidth={1.5} />
              </>
            )}
            <text x={sx} y={beamY + beamH + (result ? 18 : 0) + 52} textAnchor="middle" fontSize="11" fill="#374151" fontFamily="monospace">{x} m</text>
          </g>
        );
      })}

      <rect x={padL} y={8} width={10} height={10} fill="#1848a055" stroke="#1848a0" strokeWidth="1" />
      <text x={padL + 14} y={18} fontSize="11" fill="#1848a0" fontFamily="monospace">Applied Load</text>
    </svg>
  );
}

/* ===================== MAIN COMPONENT ===================== */

export default function BeamSolverUI() {
  const [beamLength, setBeamLength] = useState("");
  const [supports, setSupports] = useState<Support[]>([{ type: "Pinned", location: "" }]);
  const [pointLoads, setPointLoads] = useState<PointLoad[]>([{ magnitude: "", location: "" }]);
  const [distributedLoads, setDistributedLoads] = useState<DistributedLoad[]>([{ start: "", end: "", startMag: "", endMag: "" }]);
  const [result, setResult] = useState<BeamResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ---------- STYLES ---------- */
  const inputStyle: React.CSSProperties = { width: "100%", marginTop: 4, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 16, padding: "8px 10px", outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: "#ffffff", boxShadow: "none" };
  const labelStyle: React.CSSProperties = { display: "block", fontWeight: 500, fontSize: 16 };
  const cardStyle: React.CSSProperties = { background: "#ffffff", borderRadius: 16, border: "1px solid #e5e7eb", padding: 24 };
  const greenButtonStyle: React.CSSProperties = { background: "#008409", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 15, cursor: "pointer", fontFamily: "inherit", marginTop: 8 };
  const redButtonStyle: React.CSSProperties = { background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 18, fontFamily: "inherit", alignSelf: "end", marginBottom: 4 };
  const sectionHeadingStyle: React.CSSProperties = { fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 16 };
  const subHeadingStyle: React.CSSProperties = { fontSize: 15, fontWeight: 600, marginTop: 20, marginBottom: 8, color: "#374151" };

  /* ---------- GENERIC HANDLERS ---------- */
  const handleChange = <T extends GenericObject>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, index: number, field: keyof T, value: T[keyof T]) => {
    const n = [...arr]; n[index][field] = value; setArr(n);
  };
  const addItem = <T,>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, template: T) => setArr([...arr, template]);
  const removeItem = <T,>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, index: number) => setArr(arr.filter((_, i) => i !== index));

  /* ---------- CALCULATE ---------- */
  const calculate = () => {
    setError(null);
    try {
      const res = solveBeam({
        beamLength: parseFloat(beamLength),
        supports: supports.map(s => ({ type: s.type, location: parseFloat(s.location) })),
        pointLoads: pointLoads.filter(p => p.magnitude !== "" && p.location !== "").map(p => ({ magnitude: parseFloat(p.magnitude), location: parseFloat(p.location) })),
        distributedLoads: distributedLoads.filter(d => d.start !== "" && d.end !== "" && d.startMag !== "" && d.endMag !== "").map(d => ({ start: parseFloat(d.start), end: parseFloat(d.end), startMag: parseFloat(d.startMag), endMag: parseFloat(d.endMag) })),
      });
      setResult(res);
    } catch (e: any) {
      setError(e.message ?? "An error occurred.");
    }
  };

  /* ---------- RESULT ROWS for PDF / summary ---------- */
  const resultRows = result ? [
    ...result.reactions.map(r => ({ label: `${r.type} at x = ${fmt(r.location)} m`, value: `${fmt(r.vertical)} kN` })),
    { label: "Max Shear Force", value: `${fmt(result.maxShear)} kN` },
    { label: "Max Bending Moment", value: `${fmt(result.maxMoment)} kN·m at x = ${fmt(result.maxMomentLocation)} m` },
  ] : [];

  /* ===================== JSX ===================== */
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "transparent", fontFamily: "Georgia, 'Times New Roman', serif", color: "#111", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 760, padding: "0 16px 40px" }}>

        <h1 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", marginTop: 28, marginBottom: 4 }}>Non-Concurrent Parallel Force System</h1>
        <h2 style={{ fontSize: 18, fontWeight: 600, textAlign: "center", marginBottom: 8 }}>Beam Analysis Calculator</h2>
        <p style={{ color: "#888", fontSize: 13, marginTop: 6, textAlign: "center" }}>Real-Time Free Body Diagram</p>

        {/* FBD */}
        <div style={{ ...cardStyle, marginBottom: 24, padding: 16, border: "1px solid #e5e7eb", minHeight: 200, background: "#ffffff", position: "relative", zIndex: 1 }}>
          <BeamFBD beamLength={beamLength} supports={supports} pointLoads={pointLoads} distributedLoads={distributedLoads} result={result} />
        </div>

        {/* INPUT PANELS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20, position: "relative", zIndex: 1 }}>

          {/* BEAM PROPERTIES */}
          <div style={{ ...cardStyle, background: "#ffffff" }}>
            <h3 style={sectionHeadingStyle}>Beam Properties</h3>
            <label style={labelStyle}>Beam Length</label>
            <input type="number" placeholder="m" value={beamLength} onChange={(e) => { setBeamLength(e.target.value); setResult(null); }} style={inputStyle} />

            <p style={subHeadingStyle}>Supports</p>
            {supports.map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end", marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select value={s.type} onChange={(e) => handleChange(supports, setSupports, i, "type", e.target.value as Support["type"])} style={inputStyle}>
                    <option>Pinned</option>
                    <option>Roller</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Location (m)</label>
                  <input type="number" placeholder="m" value={s.location} onChange={(e) => handleChange(supports, setSupports, i, "location", e.target.value)} style={inputStyle} />
                </div>
                {supports.length > 1 && <button onClick={() => removeItem(supports, setSupports, i)} style={redButtonStyle}>–</button>}
              </div>
            ))}
            <button onClick={() => addItem(supports, setSupports, { type: "Pinned", location: "" })} style={greenButtonStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#15711b")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#008409")}>+ Add Support</button>
          </div>

          {/* LOADS */}
          <div style={{ ...cardStyle, background: "#ffffff" }}>
            <h3 style={sectionHeadingStyle}>Loads</h3>

            <p style={{ ...subHeadingStyle, marginTop: 0 }}>Point Loads</p>
            {pointLoads.map((p, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end", marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>Magnitude (kN)</label>
                  <input type="number" placeholder="kN" value={p.magnitude} onChange={(e) => handleChange(pointLoads, setPointLoads, i, "magnitude", e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Location (m)</label>
                  <input type="number" placeholder="m" value={p.location} onChange={(e) => handleChange(pointLoads, setPointLoads, i, "location", e.target.value)} style={inputStyle} />
                </div>
                {pointLoads.length > 1 && <button onClick={() => removeItem(pointLoads, setPointLoads, i)} style={redButtonStyle}>–</button>}
              </div>
            ))}
            <button onClick={() => addItem(pointLoads, setPointLoads, { magnitude: "", location: "" })} style={greenButtonStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#15711b")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#008409")}>+ Add Point Load</button>

            <p style={subHeadingStyle}>Distributed Loads</p>
            {distributedLoads.map((d, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end", marginBottom: 6 }}>
                  <div>
                    <label style={labelStyle}>Start Position (m)</label>
                    <input type="number" placeholder="m" value={d.start} onChange={(e) => handleChange(distributedLoads, setDistributedLoads, i, "start", e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>End Position (m)</label>
                    <input type="number" placeholder="m" value={d.end} onChange={(e) => handleChange(distributedLoads, setDistributedLoads, i, "end", e.target.value)} style={inputStyle} />
                  </div>
                  {distributedLoads.length > 1 && <button onClick={() => removeItem(distributedLoads, setDistributedLoads, i)} style={redButtonStyle}>–</button>}
                  {distributedLoads.length === 1 && <div />}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={labelStyle}>Start Mag. (kN/m)</label>
                    <input type="number" placeholder="kN/m" value={d.startMag} onChange={(e) => handleChange(distributedLoads, setDistributedLoads, i, "startMag", e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>End Mag. (kN/m)</label>
                    <input type="number" placeholder="kN/m" value={d.endMag} onChange={(e) => handleChange(distributedLoads, setDistributedLoads, i, "endMag", e.target.value)} style={inputStyle} />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => addItem(distributedLoads, setDistributedLoads, { start: "", end: "", startMag: "", endMag: "" })} style={greenButtonStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#15711b")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#008409")}>+ Add Distributed Load</button>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "12px 16px", marginBottom: 16, color: "#991b1b", fontSize: 15 }}>
            ⚠ {error}
          </div>
        )}

        {/* CALCULATE */}
        <button
          onClick={calculate}
          style={{ width: "100%", background: "#1848a0", color: "#fff", border: "none", borderRadius: 8, padding: "14px 0", fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 20 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#163d8a")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#1848a0")}
        >
          Calculate
        </button>

        {/* RESULTS */}
        {result && (
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 14 }}>Reactions</h2>
            {result.reactions.map((r, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <label style={labelStyle}>{r.type} at x = {r.location} m</label>
                <input type="text" readOnly value={`R = ${fmt(r.vertical)} kN`}
                  style={{ ...inputStyle, background: "#f9fafb", color: "#374151" }} />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
              <div>
                <label style={labelStyle}>Max Shear Force</label>
                <input type="text" readOnly value={`${fmt(result.maxShear)} kN`}
                  style={{ ...inputStyle, background: "#f9fafb", color: "#374151" }} />
              </div>
              <div>
                <label style={labelStyle}>Max Bending Moment</label>
                <input type="text" readOnly value={`${fmt(result.maxMoment)} kN·m at x = ${fmt(result.maxMomentLocation)} m`} style={{ ...inputStyle, background: "#f9fafb", color: "#374151" }} />
              </div>
            </div>

            {/* Results summary tiles */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
              {resultRows.map((row, i) => (
                <div key={i} style={{ background: "#f5f8ff", borderRadius: 10, border: "1px solid #dce8ff", padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>{row.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1848a0" }}>{row.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP BY STEP */}
        {result && (
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            {/* PDF export button */}
            <PDFExportButton
              steps={result.steps}
              resultRows={resultRows}
              title="Beam Analysis — Step-by-Step Solution"
              filename="beam-solution.pdf"
            />

            {/* StepByStep renderer */}
            <StepByStepSolution
              steps={fromLegacySteps(result.steps)}
              title="Step-by-Step Solution"
            />
          </div>
        )}

      </div>
    </div>
  );
}

const fmt = (n: number): string => {
  if (Math.abs(n - Math.round(n)) < 1e-9) return Math.round(n).toString();
  return n.toFixed(2);
};

