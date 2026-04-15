"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import CircularInputs from "../../components/CircularInputs";
import ShapeCanvas from "../../components/ShapeCanvas";
import { computeMOI } from "../../lib/MOIEngine";
import { computeCustomAxis } from "../../lib/MOIcustom";
import ShapeSelectDropdown from "../../components/ShapeSelectDropdown";
import type { ShapeType } from "../../types/shapes";


/* ── KaTeX via CDN ─────────────────────────────────────────────────────────── */
declare global {
  interface Window {
    katex: any;
    jspdf: { jsPDF: new (opts: Record<string, unknown>) => any };
  }
}

function useKatexScript() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (window.katex) { setOk(true); return; }
    if (!document.getElementById("katex-css")) {
      const link = document.createElement("link");
      link.id = "katex-css"; link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
      document.head.appendChild(link);
    }
    if (!document.getElementById("katex-js")) {
      const script = document.createElement("script");
      script.id = "katex-js";
      script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
      script.async = true;
      script.onload = () => setOk(true);
      document.head.appendChild(script);
    } else {
      const t = setInterval(() => { if (window.katex) { setOk(true); clearInterval(t); } }, 80);
    }
  }, []);
  return ok;
}

function KTX({ tex }: { tex: string }) {
  const ref = useCallback((el: HTMLDivElement | null) => {
    if (!el || !window.katex) return;
    try { window.katex.render(tex, el, { displayMode: true, throwOnError: false }); }
    catch { el.innerText = tex; }
  }, [tex]);
  const ready = useKatexScript();
  if (!ready) return null;
  return <div ref={ref} style={{ margin: "3px 0", overflowX: "auto" }} />;
}

/* ===================== TYPES ===================== */
type XY = { x: string; y: string };

type ShapeData = {
  type: ShapeType;
  hollow: "Hollow" | "Solid";
  isOpen: boolean;
  nodes: XY[];
  sides: { a: number; b: number }[];
  radius: string;
  x: string;
  y: string;
};

type MOIResult = {
  step1: any[];
  centroid: { totalArea: number; centroidX: number; centroidY: number };
  step3: any[];
  centroidMOI?: { Ix: number; Iy: number };
  customMOI?: { Ix: number; Iy: number; dx: number; dy: number };
  final: { Ix: number; Iy: number };
};

type StepLine =
  | { kind: "heading"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "text"; text: string }
  | { kind: "eq"; tex: string }
  | { kind: "result"; tex: string }
  | { kind: "spacer" };

/* ===================== STEP RENDERER ===================== */
function MOIStepRenderer({ lines }: { lines: StepLine[] }) {
  return (
    <div style={{ lineHeight: 1.8 }}>
      {lines.map((line, idx) => {
        switch (line.kind) {
          case "heading":
            return (
              <p key={idx} style={{ fontWeight: 700, fontSize: 16, color: "#1848a0", marginTop: 16, marginBottom: 2 }}>
                {line.text}
              </p>
            );
          case "subheading":
            return (
              <p key={idx} style={{ fontWeight: 600, fontSize: 14, color: "#374151", marginTop: 10, marginBottom: 2 }}>
                {line.text}
              </p>
            );
          case "text":
            return (
              <p key={idx} style={{ color: "#555", margin: "2px 0", fontSize: 14 }}>
                {line.text}
              </p>
            );
          case "eq":
            return <KTX key={idx} tex={line.tex} />;
          case "result":
            return (
              <div key={idx} style={{ background: "#f0f4ff", borderLeft: "3px solid #1848a0", borderRadius: 6, padding: "4px 12px", margin: "4px 0" }}>
                <KTX tex={line.tex} />
              </div>
            );
          case "spacer":
            return <div key={idx} style={{ height: 8 }} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

/* ===================== PDF EXPORT ===================== */
const JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
const MM_PER_PX = 0.264583;
const RENDER_SCALE = 3;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = () => resolve(); s.onerror = () => reject(new Error(`Failed: ${src}`));
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
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position:absolute;left:-9999px;top:0;background:#ffffff;color:#000;display:inline-block;";
    const inner = document.createElement("span");
    inner.style.cssText = "display:inline-block;padding:10px 14px;";
    wrapper.appendChild(inner);
    document.body.appendChild(wrapper);
    window.katex.render(upgradeFracs(tex), inner, { displayMode: true, throwOnError: false, output: "html" });
    const targetEl = (inner.querySelector(".katex-html") as HTMLElement) || inner;
    const innerRect = targetEl.getBoundingClientRect();
    const wrapRect = wrapper.getBoundingClientRect();
    const offsetLeft = innerRect.left - wrapRect.left;
    const canvas = await html2canvas(wrapper, { backgroundColor: "#ffffff", scale: RENDER_SCALE, useCORS: true, logging: false });
    document.body.removeChild(wrapper);
    const PAD = 18, EL = -8;
    const sx = Math.max(0, Math.round(offsetLeft * RENDER_SCALE) - PAD - EL);
    const sw = Math.round(innerRect.width * RENDER_SCALE) + PAD * 2 + EL;
    const cropped = document.createElement("canvas");
    cropped.width = sw; cropped.height = canvas.height;
    const ctx = cropped.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(canvas, sx, 0, sw, canvas.height, 0, 0, sw, canvas.height);
    return { dataUrl: cropped.toDataURL("image/png"), wMm: (sw / RENDER_SCALE) * MM_PER_PX, hMm: (canvas.height / RENDER_SCALE) * MM_PER_PX };
  } catch (e) { console.warn("latexToPng:", tex, e); return null; }
}

function flattenForPDF(lines: StepLine[]): string[] {
  return lines.flatMap(line => {
    switch (line.kind) {
      case "heading": return [line.text];
      case "subheading": return [line.text];
      case "text": return [line.text];
      case "eq": return [line.tex];
      case "result": return [line.tex];
      case "spacer": return [];
    }
  });
}

async function writePDF(p: {
  flatSteps: string[];
  resultRows: { label: string; value: string }[];
  title: string;
  filename: string;
}) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210, PH = 297, M = 18, CW = PW - M * 2, MAXY = PH - 22;
  let y = 0;

  const guard = (need: number) => { if (y + need > MAXY) { pdf.addPage(); y = M; } };
  const mathLine = async (tex: string) => {
    const r = await latexToPng(tex);
    if (!r) return;
    const MAX = CW * 0.9;
    let { wMm: w, hMm: h } = r;
    if (w > MAX) { h *= MAX / w; w = MAX; }
    guard(h + 6);
    pdf.addImage(r.dataUrl, "PNG", (PW - w) / 2, y, w, h);
    y += h + 6;
  };

  // Header
  pdf.setFillColor(24, 72, 160); pdf.rect(0, 0, PW, 10, "F");
  y = 18;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(14); pdf.setTextColor(24, 72, 160);
  pdf.text(p.title, M, y); y += 6;
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(100, 116, 139);
  pdf.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, M, y); y += 5;
  pdf.setDrawColor(220, 228, 245); pdf.setLineWidth(0.4); pdf.line(M, y, PW - M, y); y += 9;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.setTextColor(20, 20, 20);
  pdf.text("Step-by-Step Solution", M, y); y += 10;

  for (const raw of p.flatSteps) {
    const s = raw.trim();
    if (!s) continue;
    if (s.startsWith("Step") || s === "Final Result") {
      guard(12); y += 2;
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(24, 72, 160);
      pdf.text(s, M, y); y += 14; continue;
    }
    if (s.includes("\\")) { await mathLine(s); y += 2; continue; }
    guard(8);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.setTextColor(50, 50, 50);
    const wrapped = pdf.splitTextToSize(s, CW);
    pdf.text(wrapped, M, y); y += wrapped.length * 6 + 2;
  }

  if (p.resultRows.length > 0) {
    guard(24 + p.resultRows.length * 11); y += 4;
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

function PDFExportButton({ lines, resultRows, title, filename }: {
  lines: StepLine[];
  resultRows: { label: string; value: string }[];
  title: string;
  filename: string;
}) {
  const [libReady, setLibReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");

  useEffect(() => { loadScript(JSPDF_URL).then(() => setLibReady(true)).catch(console.error); }, []);

  const handleExport = useCallback(async () => {
    if (!libReady || status === "generating") return;
    setStatus("generating");
    try {
      await writePDF({ flatSteps: flattenForPDF(lines), resultRows, title, filename });
      setStatus("done"); setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      console.error(err); setStatus("error"); setTimeout(() => setStatus("idle"), 3000);
    }
  }, [libReady, status, lines, resultRows, title, filename]);

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
      onClick={handleExport} disabled={off}
    >
      {labels[status]}
    </button>
  );
}

/* ===================== HELPERS ===================== */
const fmtS = (n: number, _d = 4) => {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(2);
};

/* ===================== ORDER NODES BY SIDES ===================== */
function orderNodesBySides(nodes: XY[], sides: { a: number; b: number }[]): XY[] {
  if (sides.length === 0) return nodes;
  const adj: Map<number, number[]> = new Map();
  sides.forEach(({ a, b }) => {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push(b);
    adj.get(b)!.push(a);
  });
  const ordered: number[] = [];
  const visited = new Set<number>();
  let current = sides[0].a;
  while (ordered.length < sides.length) {
    ordered.push(current);
    visited.add(current);
    const neighbors = adj.get(current) || [];
    const next = neighbors.find(n => !visited.has(n));
    if (next === undefined) break;
    current = next;
  }
  return ordered.map(i => nodes[i]);
}

/* ===================== BUILD STEP LINES ===================== */
function buildStepLines(computed: MOIResult, axisType: "Centroidal" | "Custom", axisX: string, axisY: string): StepLine[] {
  const lines: StepLine[] = [];
  const { totalArea, centroidX, centroidY } = computed.centroid;
  const { Ix: IxC, Iy: IyC } = computed.centroidMOI!;

  const H = (text: string) => lines.push({ kind: "heading", text });
  const SH = (text: string) => lines.push({ kind: "subheading", text });
  const T = (text: string) => lines.push({ kind: "text", text });
  const E = (tex: string) => lines.push({ kind: "eq", tex });
  const R = (tex: string) => lines.push({ kind: "result", tex });
  const SP = () => lines.push({ kind: "spacer" });

  /* ── Step 1 ── */
  H("Step 1: Individual Shape Properties");
  if (computed.step1?.length > 0) {
    computed.step1.forEach((shape: any, i: number) => {
      const sign = shape.hollow === "Hollow" ? "-" : "+";
      SH(`Shape ${i + 1}${shape.hollow === "Hollow" ? " (Hollow — subtracted)" : " (Solid)"}`);
      E(`A_{${i + 1}} = ${sign}${fmtS(Math.abs(shape.area), 4)} \\text{ units}^2`);
      E(`\\bar{x}_{${i + 1}} = ${fmtS(shape.cx, 4)}, \\quad \\bar{y}_{${i + 1}} = ${fmtS(shape.cy, 4)}`);
      E(`I_{x,${i + 1}} = ${shape.Ix_formula ?? `${fmtS(shape.Ix_own, 4)}`} = ${fmtS(shape.Ix_own, 4)} \\text{ units}^4`);
      E(`I_{y,${i + 1}} = ${shape.Iy_formula ?? `${fmtS(shape.Iy_own, 4)}`} = ${fmtS(shape.Iy_own, 4)} \\text{ units}^4`); SP();
    });
  } else {
    T("No shape data available.");
  }

  /* ── Step 2 ── */
  H("Step 2: Composite Centroid");
  const aTerms = computed.step1?.map((sh: any) => sh.hollow === "Hollow" ? `(-${fmtS(Math.abs(sh.area), 3)})` : fmtS(sh.area, 3)).join(" + ") || "0";
  const axTerms = computed.step1?.map((sh: any) => sh.hollow === "Hollow" ? `(-${fmtS(Math.abs(sh.area), 3)})(${fmtS(sh.cx, 3)})` : `(${fmtS(sh.area, 3)})(${fmtS(sh.cx, 3)})`).join(" + ") || "0";
  const ayTerms = computed.step1?.map((sh: any) => sh.hollow === "Hollow" ? `(-${fmtS(Math.abs(sh.area), 3)})(${fmtS(sh.cy, 3)})` : `(${fmtS(sh.area, 3)})(${fmtS(sh.cy, 3)})`).join(" + ") || "0";
  E(`\\Sigma A = ${aTerms} = ${fmtS(totalArea, 4)} \\text{ units}^2`);
  E(`\\bar{X} = \\dfrac{\\Sigma A_i \\bar{x}_i}{\\Sigma A} = \\dfrac{${axTerms}}{${fmtS(totalArea, 3)}} = ${fmtS(centroidX, 4)}`);
  R(`\\bar{Y} = \\dfrac{\\Sigma A_i \\bar{y}_i}{\\Sigma A} = \\dfrac{${ayTerms}}{${fmtS(totalArea, 3)}} = ${fmtS(centroidY, 4)}`);
  SP();

  /* ── Step 3 ── */
  H("Step 3: Parallel Axis Theorem (Transfer to Centroid)");
  E(`I_{x} = \\Sigma\\left(I_{x,i} + A_i \\, d_{y,i}^2\\right), \\quad I_{y} = \\Sigma\\left(I_{y,i} + A_i \\, d_{x,i}^2\\right)`);
  SP();
  if (computed.step3?.length > 0) {
    computed.step3.forEach((sh: any, i: number) => {
      const dy = sh.dy ?? (sh.cy - centroidY);
      const dx = sh.dx ?? (sh.cx - centroidX);
      const A = sh.area;
      SH(`Shape ${i + 1}`);
      E(`d_{x,${i + 1}} = \\bar{X} - \\bar{x}_{${i + 1}} = ${fmtS(centroidX, 4)} - ${fmtS(sh.cx, 4)} = ${fmtS(dx, 4)}`);
      E(`d_{y,${i + 1}} = \\bar{Y} - \\bar{y}_{${i + 1}} = ${fmtS(centroidY, 4)} - ${fmtS(sh.cy, 4)} = ${fmtS(dy, 4)}`);
      E(`I_{x,${i + 1}}' = ${fmtS(sh.Ix_own ?? 0, 4)} + (${fmtS(Math.abs(A), 3)})(${fmtS(dy, 4)})^2 = ${fmtS(sh.Ix_transferred ?? sh.Ix_own ?? 0, 4)}`);
      E(`I_{y,${i + 1}}' = ${fmtS(sh.Iy_own ?? 0, 4)} + (${fmtS(Math.abs(A), 3)})(${fmtS(dx, 4)})^2 = ${fmtS(sh.Iy_transferred ?? sh.Iy_own ?? 0, 4)}`);
      SP();
    });
  }

  /* ── Step 4 ── */
  H("Step 4: Composite MOI About Centroidal Axis");
  const IxTerms = computed.step3.map((sh: any) => fmtS(sh.Ix_transferred ?? sh.Ix_own ?? 0, 4)).join(" + ");
  const IyTerms = computed.step3.map((sh: any) => fmtS(sh.Iy_transferred ?? sh.Iy_own ?? 0, 4)).join(" + ");
  E(`I_{x,\\text{centroid}} = \\Sigma I_{x,i}' = ${IxTerms} = ${fmtS(IxC, 4)} \\text{ units}^4`);
  R(`I_{y,\\text{centroid}} = \\Sigma I_{y,i}' = ${IyTerms} = ${fmtS(IyC, 4)} \\text{ units}^4`);
  SP();

  /* ── Step 5 (custom axis) — data comes from MOIcustom, no math here ── */
  if (axisType === "Custom" && computed.customMOI) {
    const { Ix: IxF, Iy: IyF, dx, dy } = computed.customMOI;
    const customX = Number(axisX);
    const customY = Number(axisY);
    H(`Step 5: Transfer to Custom Axis (${customX}, ${customY})`);
    E(`d_x = \\bar{X} - x_{\\text{axis}} = ${fmtS(centroidX, 4)} - ${fmtS(customX, 4)} = ${fmtS(dx, 4)}`);
    E(`d_y = \\bar{Y} - y_{\\text{axis}} = ${fmtS(centroidY, 4)} - ${fmtS(customY, 4)} = ${fmtS(dy, 4)}`);
    E(`I_x = I_{x,c} + A d_y^2 = ${fmtS(IxC, 4)} + (${fmtS(totalArea, 3)})(${fmtS(dy, 4)})^2 = ${fmtS(IxF, 4)}`);
    R(`I_y = I_{y,c} + A d_x^2 = ${fmtS(IyC, 4)} + (${fmtS(totalArea, 3)})(${fmtS(dx, 4)})^2 = ${fmtS(IyF, 4)}`);
    SP();
  }

  /* ── Final Result ── */
  H("Final Result");
  R(`\\bar{X} = ${fmtS(centroidX, 4)}, \\quad \\bar{Y} = ${fmtS(centroidY, 4)}`);
  if (axisType === "Custom" && computed.customMOI) {
    R(`I_x = ${fmtS(computed.customMOI.Ix, 4)} \\text{ units}^4`);
    R(`I_y = ${fmtS(computed.customMOI.Iy, 4)} \\text{ units}^4`);
  } else {
    R(`I_x = ${fmtS(IxC, 4)} \\text{ units}^4`);
    R(`I_y = ${fmtS(IyC, 4)} \\text{ units}^4`);
  }

  return lines;
}

/* ===================== COMPONENT ===================== */
export default function DistributedLoadPage() {
  const [axisType, setAxisType] = useState<"Centroidal" | "Custom">("Centroidal");
  const [axisX, setAxisX] = useState("");
  const [axisY, setAxisY] = useState("");

  const [shapes, setShapes] = useState<ShapeData[]>([{
    type: "Polygon", hollow: "Solid", isOpen: true,
    nodes: [{ x: "", y: "" }, { x: "", y: "" }],
    sides: [{ a: 0, b: 1 }],
    radius: "", x: "", y: "",
  }]);

  const [result, setResult] = useState<any>(null);
  const [stepLines, setStepLines] = useState<StepLine[]>([]);

  const formatNumber = (num: number) => Number(num.toFixed(3));

  /* ── All solving delegated to engines ── */
  const calculateResultant = () => {
    const orderedShapes = shapes.map(shape => {
      if (shape.type !== "Polygon") return shape;
      return { ...shape, nodes: orderNodesBySides(shape.nodes, shape.sides) };
    });

    // Step 1–4: centroidal MOI from MOIEngine
    const centroidal = computeMOI(orderedShapes) as MOIResult;
    centroidal.centroidMOI = { Ix: centroidal.final.Ix, Iy: centroidal.final.Iy };

    // Step 5: custom axis from MOIcustom (only if needed)
    let customMOI: MOIResult["customMOI"] | undefined = undefined;
    if (axisType === "Custom") {
      customMOI = computeCustomAxis(
        centroidal.centroidMOI,
        centroidal.centroid.totalArea,
        centroidal.centroid.centroidX,
        centroidal.centroid.centroidY,
        Number(axisX),
        Number(axisY),
      );
    }

    const finalResult: MOIResult = {
      ...centroidal,
      customMOI,
      final: axisType === "Custom" && customMOI
        ? { Ix: customMOI.Ix, Iy: customMOI.Iy }
        : centroidal.centroidMOI,
    };

    setResult(finalResult);
    setStepLines(buildStepLines(finalResult, axisType, axisX, axisY));
  };

  const handleAddShape = () => setShapes(prev => [...prev, {
    type: "Polygon", hollow: "Solid", isOpen: true,
    nodes: [{ x: "", y: "" }, { x: "", y: "" }],
    sides: [{ a: 0, b: 1 }],
    radius: "", x: "", y: "",
  }]);

  const handleRemoveShape = (index: number) => {
    if (shapes.length === 1) return;
    setShapes(prev => prev.filter((_, i) => i !== index));
  };

  const getJointLabel = (shapeIndex: number, nodeIndex: number) => {
    let count = 0;
    for (let i = 0; i < shapeIndex; i++) count += shapes[i].nodes.length;
    let globalIndex = count + nodeIndex + 1;
    let label = "";
    while (globalIndex > 0) {
      const remainder = (globalIndex - 1) % 26;
      label = String.fromCharCode(65 + remainder) + label;
      globalIndex = Math.floor((globalIndex - 1) / 26);
    }
    return label;
  };

  /* ── Result rows for PDF summary ── */
  const resultRows = result ? [
    { label: "Total Area", value: `${formatNumber(result.centroid.totalArea)} units²` },
    { label: "Centroid X̄", value: `${formatNumber(result.centroid.centroidX)}` },
    { label: "Centroid Ȳ", value: `${formatNumber(result.centroid.centroidY)}` },
    { label: "Ix (centroidal)", value: `${formatNumber(result.centroidMOI.Ix)} units⁴` },
    { label: "Iy (centroidal)", value: `${formatNumber(result.centroidMOI.Iy)} units⁴` },
    ...(axisType === "Custom" && result.customMOI ? [
      { label: "Ix (custom axis)", value: `${formatNumber(result.customMOI.Ix)} units⁴` },
      { label: "Iy (custom axis)", value: `${formatNumber(result.customMOI.Iy)} units⁴` },
    ] : []),
  ] : [];

  /* ===================== JSX ===================== */
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 text-gray-900">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Moment of Inertia for Composite Shapes Calculator
        </h1>

        <ShapeCanvas shapes={shapes} />

        <p className="text-sm text-gray-700 mb-4">
          <span className="font-semibold">Note:</span> The most lower left point of the composite shape should be at (0,0).
        </p>

        <div className="flex items-start gap-6 flex-wrap">
          {/* LEFT COLUMN */}
          <div className="flex flex-col w-[300px] shrink-0">

            {/* Reference Axis */}
            <div className="bg-white rounded-xl shadow p-4 relative z-10">
              <h3 className="font-semibold mb-3">Reference Axis</h3>
              <select
                value={axisType}
                onChange={e => setAxisType(e.target.value as "Centroidal" | "Custom")}
                className="w-full rounded bg-white px-3 py-2 mb-4 focus:outline-none"
              >
                <option value="Centroidal">Centroidal Axis</option>
                <option value="Custom">Custom Axis</option>
              </select>

              {axisType === "Custom" && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-20">x-Axis</span>
                    <input value={axisX} onChange={e => setAxisX(e.target.value)} placeholder="x"
                      className="w-full rounded bg-gray-100 px-3 py-1 focus:outline-none" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-20">y-Axis</span>
                    <input value={axisY} onChange={e => setAxisY(e.target.value)} placeholder="y"
                      className="w-full rounded bg-gray-100 px-3 py-1 focus:outline-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Calculate Button */}
            <div className="mt-4">
              <button onClick={calculateResultant}
                className="w-full bg-[#1848a0] text-white py-3 rounded-lg hover:bg-[#163d8a] transition text-[18px]">
                Calculate
              </button>
            </div>

            {/* Quick Results Panel */}
            {result && (
              <div className="mt-6 bg-white rounded-xl shadow p-4 relative z-10">
                <h3 className="font-semibold mb-3 text-blue-900">Quick Results</h3>
                <p className="text-sm mb-1"><span className="font-medium">Total Area:</span> {formatNumber(result.centroid.totalArea)}</p>
                <p className="text-sm mb-1"><span className="font-medium">Centroid X̄:</span> {formatNumber(result.centroid.centroidX)}</p>
                <p className="text-sm mb-1"><span className="font-medium">Centroid Ȳ:</span> {formatNumber(result.centroid.centroidY)}</p>
                <hr className="my-3" />
                <p className="text-sm mb-1"><span className="font-medium">Ix (centroid):</span> {formatNumber(result.centroidMOI.Ix)}</p>
                <p className="text-sm mb-1"><span className="font-medium">Iy (centroid):</span> {formatNumber(result.centroidMOI.Iy)}</p>
                {axisType === "Custom" && result.customMOI && (
                  <>
                    <hr className="my-3" />
                    <p className="text-sm font-semibold text-gray-700 mb-1">About Custom Axis:</p>
                    <p className="text-sm mb-1"><span className="font-medium">Ix:</span> {formatNumber(result.customMOI.Ix)}</p>
                    <p className="text-sm mb-1"><span className="font-medium">Iy:</span> {formatNumber(result.customMOI.Iy)}</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Shape Cards */}
          <div className="flex flex-wrap gap-6 flex-1">
            {shapes.map((shape, index) => {
              const isCircular = shape.type !== "Polygon";
              return (
                <div key={index} className="bg-white rounded-xl shadow px-6 py-4 w-[340px] relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Shape {index + 1}</h3>
                    <button onClick={() => handleRemoveShape(index)}
                      className="w-8 h-8 bg-red-500 text-white rounded-lg font-bold">–</button>
                  </div>

                  <button
                    onClick={() => { const copy = [...shapes]; copy[index].isOpen = !copy[index].isOpen; setShapes(copy); }}
                    className="w-full flex justify-between bg-[#008409] text-white px-4 py-2 rounded-lg hover:bg-[#15711b] transition"
                  >
                    Options
                    <span className={`transition-transform ${shape.isOpen ? "rotate-180" : ""}`}>▼</span>
                  </button>

                  {shape.isOpen && (
                    <div className="mt-4 space-y-4">
                      <ShapeSelectDropdown
                        value={shape.type}
                        onChange={val => { const copy = [...shapes]; copy[index].type = val; setShapes(copy); }}
                      />

                      <select value={shape.hollow}
                        onChange={e => { const copy = [...shapes]; copy[index].hollow = e.target.value as "Hollow" | "Solid"; setShapes(copy); }}
                        className="w-full rounded px-3 py-1">
                        <option>Hollow</option>
                        <option>Solid</option>
                      </select>

                      {shape.type === "Polygon" && (
                        <div className="space-y-5">
                          <div>
                            <h4 className="font-semibold mb-2">Joints</h4>
                            {shape.nodes.map((node, i) => (
                              <div key={i} className="flex items-center gap-2 mb-2">
                                <span className="w-16">Joint {getJointLabel(index, i)}</span>
                                <input placeholder="x" value={node.x}
                                  onChange={e => { const copy = [...shapes]; copy[index].nodes[i].x = e.target.value; setShapes(copy); }}
                                  className="w-20 rounded bg-gray-100 px-2 py-1 focus:outline-none" />
                                <input placeholder="y" value={node.y}
                                  onChange={e => { const copy = [...shapes]; copy[index].nodes[i].y = e.target.value; setShapes(copy); }}
                                  className="w-20 rounded bg-gray-100 px-2 py-1 focus:outline-none" />
                                <button onClick={() => {
                                  if (shape.nodes.length <= 2) return;
                                  const copy = [...shapes];
                                  copy[index].nodes.splice(i, 1);
                                  copy[index].sides = copy[index].sides.filter(s => s.a !== i && s.b !== i);
                                  setShapes(copy);
                                }} className="bg-red-500 text-white px-3 py-1 rounded">–</button>
                              </div>
                            ))}
                            <button onClick={() => { const copy = [...shapes]; copy[index].nodes.push({ x: "", y: "" }); setShapes(copy); }}
                              className="bg-[#008409] text-white px-3 py-1 rounded-md shadow hover:bg-[#15711b] transition text-[16px]">+ Add Joint</button>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2">Sides</h4>
                            {shape.sides.map((side, i) => (
                              <div key={i} className="flex items-center gap-2 mb-2">
                                <span className="w-12">Side</span>
                                <select value={side.a}
                                  onChange={e => { const copy = [...shapes]; copy[index].sides[i].a = Number(e.target.value); setShapes(copy); }}
                                  className="w-24 rounded bg-gray-100 px-2 py-1 focus:outline-none">
                                  {shape.nodes.map((_, j) => <option key={j} value={j}>Joint {getJointLabel(index, j)}</option>)}
                                </select>
                                <select value={side.b}
                                  onChange={e => { const copy = [...shapes]; copy[index].sides[i].b = Number(e.target.value); setShapes(copy); }}
                                  className="w-24 rounded bg-gray-100 px-2 py-1 focus:outline-none">
                                  {shape.nodes.map((_, j) => <option key={j} value={j}>Joint {getJointLabel(index, j)}</option>)}
                                </select>
                                <button onClick={() => { const copy = [...shapes]; copy[index].sides.splice(i, 1); setShapes(copy); }}
                                  className="bg-red-500 text-white px-3 py-1 rounded">–</button>
                              </div>
                            ))}
                            <button onClick={() => {
                              if (shape.nodes.length < 2) return;
                              const copy = [...shapes]; copy[index].sides.push({ a: 0, b: 1 }); setShapes(copy);
                            }} className="bg-[#008409] text-white px-3 py-1 rounded-md shadow hover:bg-[#15711b] transition text-[16px]">+ Add Side</button>
                          </div>
                        </div>
                      )}

                      {isCircular && (
                        <CircularInputs
                          radius={shape.radius} x={shape.x} y={shape.y}
                          onRadiusChange={val => { const copy = [...shapes]; copy[index].radius = val; setShapes(copy); }}
                          onXChange={val => { const copy = [...shapes]; copy[index].x = val; setShapes(copy); }}
                          onYChange={val => { const copy = [...shapes]; copy[index].y = val; setShapes(copy); }}
                        />
                      )}

                      <button onClick={handleAddShape}
                        className="w-full bg-[#008409] text-white py-2 rounded-lg font-semibold hover:bg-[#15711b] transition">
                        + Add Shape
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════ SOLUTION DISPLAY ══════════════ */}
        {result && stepLines.length > 0 && (
          <div className="mt-10 bg-white rounded-xl shadow-sm border border-gray-100 relative z-10">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-[15px] font-semibold text-gray-800 tracking-wide">Step-by-Step Solution</h3>
            </div>
            <div className="px-6 py-5">
              <PDFExportButton
                lines={stepLines}
                resultRows={resultRows}
                title="Moment of Inertia — Step-by-Step Solution"
                filename="moi-solution.pdf"
              />
              <MOIStepRenderer lines={stepLines} />
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}