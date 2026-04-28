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
  // FIX: dark mode KaTeX text
  return <div ref={ref} className="my-0.5 overflow-x-auto dark:[&_.katex]:text-white dark:[&_.katex-html]:text-white" />;
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
  customMOI?: { Ix: number; Iy: number; shapes: { dx: number; dy: number; Ix: number; Iy: number }[] };
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
    <div className="leading-relaxed">
      {lines.map((line, idx) => {
        switch (line.kind) {
          case "heading":
            // FIX: was hardcoded color "#1848a0"
            return <p key={idx} className="font-bold text-[16px] text-[#1848a0] dark:text-blue-400 mt-4 mb-0.5">{line.text}</p>;
          case "subheading":
            // FIX: was hardcoded color "#374151"
            return <p key={idx} className="font-semibold text-[14px] text-gray-700 dark:text-gray-300 mt-2.5 mb-0.5">{line.text}</p>;
          case "text":
            // FIX: was hardcoded color "#555"
            return <p key={idx} className="text-gray-600 dark:text-gray-400 my-0.5 text-[14px]">{line.text}</p>;
          case "eq":
            return <KTX key={idx} tex={line.tex} />;
          case "result":
            // FIX: was hardcoded bg "#f0f4ff" with blue left border
            return (
              <div key={idx} className="bg-blue-50 dark:bg-blue-900/30 border-l-[3px] border-[#1848a0] dark:border-blue-500 rounded-[6px] px-3 py-1 my-1">
                <KTX tex={line.tex} />
              </div>
            );
          case "spacer":
            return <div key={idx} className="h-2" />;
          default:
            return null;
        }
      })}
    </div>
  );
}

/* ===================== HELPERS ===================== */
const fmtS = (n: number, _d = 4) => {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(2);
};

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

  const H  = (text: string) => lines.push({ kind: "heading", text });
  const SH = (text: string) => lines.push({ kind: "subheading", text });
  const T  = (text: string) => lines.push({ kind: "text", text });
  const E  = (tex: string)  => lines.push({ kind: "eq", tex });
  const R  = (tex: string)  => lines.push({ kind: "result", tex });
  const SP = ()             => lines.push({ kind: "spacer" });

  H("Step 1: Individual Shape Properties");
  if (computed.step1?.length > 0) {
    computed.step1.forEach((shape: any, i: number) => {
      const sign = shape.hollow === "Hollow" ? "-" : "+";
      SH(`Shape ${i + 1}${shape.hollow === "Hollow" ? " (Hollow — subtracted)" : " (Solid)"}`);
      E(`A_{${i + 1}} = ${sign}${fmtS(Math.abs(shape.area), 4)} \\text{ units}^2`);
      E(`\\bar{x}_{${i + 1}} = ${fmtS(shape.cx, 4)}, \\quad \\bar{y}_{${i + 1}} = ${fmtS(shape.cy, 4)}`);
      E(`I_{x,${i + 1}} = ${shape.Ix_formula ?? `${fmtS(shape.Ix_own, 4)}`} = ${fmtS(shape.Ix_own, 4)} \\text{ units}^4`);
      E(`I_{y,${i + 1}} = ${shape.Iy_formula ?? `${fmtS(shape.Iy_own, 4)}`} = ${fmtS(shape.Iy_own, 4)} \\text{ units}^4`);
      SP();
    });
  } else {
    T("No shape data available.");
  }

  if (axisType === "Centroidal") {
    H("Step 2: Composite Centroid");
    const aTerms  = computed.step1?.map((sh: any) => sh.hollow === "Hollow" ? `(-${fmtS(Math.abs(sh.area), 3)})` : fmtS(sh.area, 3)).join(" + ") || "0";
    const axTerms = computed.step1?.map((sh: any) => sh.hollow === "Hollow" ? `(-${fmtS(Math.abs(sh.area), 3)})(${fmtS(sh.cx, 3)})` : `(${fmtS(sh.area, 3)})(${fmtS(sh.cx, 3)})`).join(" + ") || "0";
    const ayTerms = computed.step1?.map((sh: any) => sh.hollow === "Hollow" ? `(-${fmtS(Math.abs(sh.area), 3)})(${fmtS(sh.cy, 3)})` : `(${fmtS(sh.area, 3)})(${fmtS(sh.cy, 3)})`).join(" + ") || "0";
    E(`\\Sigma A = ${aTerms} = ${fmtS(totalArea, 4)} \\text{ units}^2`);
    E(`\\bar{X} = \\dfrac{\\Sigma A_i \\bar{x}_i}{\\Sigma A} = \\dfrac{${axTerms}}{${fmtS(totalArea, 3)}} = ${fmtS(centroidX, 4)}`);
    E(`\\bar{Y} = \\dfrac{\\Sigma A_i \\bar{y}_i}{\\Sigma A} = \\dfrac{${ayTerms}}{${fmtS(totalArea, 3)}} = ${fmtS(centroidY, 4)}`);
    SP();

    H("Step 3: Parallel Axis Theorem");
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
        const hollow = sh.hollow === "Hollow";
        const dIxOwn = hollow ? `-${fmtS(sh.Ix_own ?? 0, 4)}` : fmtS(sh.Ix_own ?? 0, 4);
        const dIyOwn = hollow ? `-${fmtS(sh.Iy_own ?? 0, 4)}` : fmtS(sh.Iy_own ?? 0, 4);
        const dA = hollow ? `-${fmtS(Math.abs(A), 3)}` : fmtS(Math.abs(A), 3);
        E(`I_{x,${i + 1}}' = ${dIxOwn} + (${dA})(${fmtS(dy, 4)})^2 = ${fmtS(sh.Ix_transferred ?? sh.Ix_own ?? 0, 4)}`);
        E(`I_{y,${i + 1}}' = ${dIyOwn} + (${dA})(${fmtS(dx, 4)})^2 = ${fmtS(sh.Iy_transferred ?? sh.Iy_own ?? 0, 4)}`);
        SP();
      });
    }

    H("Step 4: Composite MOI About Centroidal Axis");
    const IxTerms = computed.step3.map((sh: any) => fmtS(sh.Ix_transferred ?? sh.Ix_own ?? 0, 4)).join(" + ");
    const IyTerms = computed.step3.map((sh: any) => fmtS(sh.Iy_transferred ?? sh.Iy_own ?? 0, 4)).join(" + ");
    E(`I_{x,\\text{centroid}} = \\Sigma I_{x,i}' = ${IxTerms} = ${fmtS(IxC, 4)} \\text{ units}^4`);
    E(`I_{y,\\text{centroid}} = \\Sigma I_{y,i}' = ${IyTerms} = ${fmtS(IyC, 4)} \\text{ units}^4`);
    SP();
  }

  if (axisType === "Custom" && computed.customMOI) {
    H(`Step 2: Parallel Axis Theorem`);
    E(`I_{x} = \\Sigma\\left(I_{x,i} + A_i \\, d_{y,i}^2\\right), \\quad I_{y} = \\Sigma\\left(I_{y,i} + A_i \\, d_{x,i}^2\\right)`);
    SP();
    computed.customMOI.shapes.forEach((sh: any, i: number) => {
      const s1 = computed.step1[i];
      SH(`Shape ${i + 1}`);
      E(`d_{x,${i + 1}} = \\bar{x}_{${i + 1}} - x_{\\text{axis}} = ${fmtS(s1.cx)} - ${fmtS(Number(axisX))} = ${fmtS(sh.dx)}`);
      E(`d_{y,${i + 1}} = \\bar{y}_{${i + 1}} - y_{\\text{axis}} = ${fmtS(s1.cy)} - ${fmtS(Number(axisY))} = ${fmtS(sh.dy)}`);
      const isHollow = s1.hollow === "Hollow";
      const dispIxOwn = isHollow ? `-${fmtS(s1.Ix_own)}` : fmtS(s1.Ix_own);
      const dispIyOwn = isHollow ? `-${fmtS(s1.Iy_own)}` : fmtS(s1.Iy_own);
      const dispA = isHollow ? `-${fmtS(Math.abs(s1.area))}` : fmtS(Math.abs(s1.area));
      E(`I_{x,${i + 1}}' = ${dispIxOwn} + (${dispA})(${fmtS(sh.dy)})^2 = ${fmtS(sh.Ix)}`);
      E(`I_{y,${i + 1}}' = ${dispIyOwn} + (${dispA})(${fmtS(sh.dx)})^2 = ${fmtS(sh.Iy)}`);
      SP();
    });
    H("Step 3: Composite MOI About Custom Axis");
    const IxTerms = computed.customMOI.shapes.map((sh: any) => fmtS(sh.Ix)).join(" + ");
    const IyTerms = computed.customMOI.shapes.map((sh: any) => fmtS(sh.Iy)).join(" + ");
    E(`I_{x} = ${IxTerms} = ${fmtS(computed.customMOI.Ix)} \\text{ units}^4`);
    E(`I_{y} = ${IyTerms} = ${fmtS(computed.customMOI.Iy)} \\text{ units}^4`);
    SP();
  }

  H("Final Result");
  if (axisType === "Custom" && computed.customMOI) {
    R(`I_x = ${fmtS(computed.customMOI.Ix, 4)} \\text{ units}^4`);
    R(`I_y = ${fmtS(computed.customMOI.Iy, 4)} \\text{ units}^4`);
  } else {
    R(`\\bar{X} = ${fmtS(centroidX, 4)}, \\quad \\bar{Y} = ${fmtS(centroidY, 4)}`);
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
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");

  const off = status === "generating";
  const labels: Record<typeof status, string> = {
    idle: "⬇ Download Solution as PDF",
    generating: "⏳ Opening print view…",
    done: "✅ Done!",
    error: "❌ Export failed — try again",
  };

  const formatNumber = (num: number) => Number(num.toFixed(3));

  const calculateResultant = () => {
    const orderedShapes = shapes.map(shape => {
      if (shape.type !== "Polygon") return shape;
      return { ...shape, nodes: orderNodesBySides(shape.nodes, shape.sides) };
    });
    const centroidal = computeMOI(orderedShapes) as MOIResult;
    centroidal.centroidMOI = { Ix: centroidal.final.Ix, Iy: centroidal.final.Iy };
    let customMOI: MOIResult["customMOI"] | undefined = undefined;
    if (axisType === "Custom") {
      const shapeMOIInputs = centroidal.step1.map((sh: any) => ({
        Ix: sh.Ix_own, Iy: sh.Iy_own, area: sh.signedArea, centroidX: sh.cx, centroidY: sh.cy,
      }));
      customMOI = computeCustomAxis(shapeMOIInputs, Number(axisX), Number(axisY));
    }
    const finalResult: MOIResult = {
      ...centroidal, customMOI,
      final: axisType === "Custom" && customMOI ? { Ix: customMOI.Ix, Iy: customMOI.Iy } : centroidal.centroidMOI,
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

  // Shared classes
  const cardCls   = "bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700";
  const inputCls  = "w-full rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-1 focus:outline-none text-gray-900 dark:text-white";
  const selectCls = "w-full rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-2 focus:outline-none text-gray-900 dark:text-white";

  return (
    // FIX: added dark:bg-gray-900 dark:text-white
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-900 dark:text-white">
          Moment of Inertia for Composite Shapes Calculator
        </h1>

        <ShapeCanvas shapes={shapes} axisType={axisType} axisX={Number(axisX)} axisY={Number(axisY)} />

        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          <span className="font-semibold">Note:</span> The most lower left point of the composite shape should be at (0,0).
        </p>

        <div className="flex items-start gap-6 flex-wrap">

          {/* ── LEFT COLUMN ── */}
          <div className="flex flex-col w-[300px] shrink-0">

            {/* Reference Axis */}
            <div className={`${cardCls} p-4 relative z-10`}>
              <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Reference Axis</h3>
              <select value={axisType} onChange={e => setAxisType(e.target.value as "Centroidal" | "Custom")} className={selectCls}>
                <option value="Centroidal">Centroidal Axis</option>
                <option value="Custom">Custom Axis</option>
              </select>

              {axisType === "Custom" && (
                <div className="flex flex-col gap-3 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="w-20 dark:text-gray-300">x-Axis</span>
                    <input value={axisX} onChange={e => setAxisX(e.target.value)} placeholder="x" className={inputCls} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-20 dark:text-gray-300">y-Axis</span>
                    <input value={axisY} onChange={e => setAxisY(e.target.value)} placeholder="y" className={inputCls} />
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
              <div className={`${cardCls} mt-6 p-4 relative z-10`}>
                <h3 className="font-semibold mb-3 text-[#1848a0] dark:text-blue-400">Quick Results</h3>
                {[
                  ["Total Area", formatNumber(result.centroid.totalArea)],
                  ["Centroid X̄", formatNumber(result.centroid.centroidX)],
                  ["Centroid Ȳ", formatNumber(result.centroid.centroidY)],
                ].map(([label, val]) => (
                  <p key={label as string} className="text-sm mb-1">
                    <span className="font-medium dark:text-gray-200">{label}:</span>
                    <span className="dark:text-gray-300"> {val as string}</span>
                  </p>
                ))}
                <hr className="my-3 border-gray-200 dark:border-gray-600" />
                <p className="text-sm mb-1"><span className="font-medium dark:text-gray-200">Ix (centroid):</span> <span className="dark:text-gray-300">{formatNumber(result.centroidMOI.Ix)}</span></p>
                <p className="text-sm mb-1"><span className="font-medium dark:text-gray-200">Iy (centroid):</span> <span className="dark:text-gray-300">{formatNumber(result.centroidMOI.Iy)}</span></p>
                {axisType === "Custom" && result.customMOI && (
                  <>
                    <hr className="my-3 border-gray-200 dark:border-gray-600" />
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">About Custom Axis:</p>
                    <p className="text-sm mb-1"><span className="font-medium dark:text-gray-200">Ix:</span> <span className="dark:text-gray-300">{formatNumber(result.customMOI.Ix)}</span></p>
                    <p className="text-sm mb-1"><span className="font-medium dark:text-gray-200">Iy:</span> <span className="dark:text-gray-300">{formatNumber(result.customMOI.Iy)}</span></p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Shape Cards ── */}
          <div className="flex flex-wrap gap-6 flex-1">
            {shapes.map((shape, index) => {
              const isCircular = shape.type !== "Polygon";
              return (
                <div key={index} className={`${cardCls} px-6 py-4 w-[340px] relative z-10`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Shape {index + 1}</h3>
                    <button onClick={() => handleRemoveShape(index)}
                      className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition">–</button>
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
                        className={selectCls}>
                        <option>Hollow</option>
                        <option>Solid</option>
                      </select>

                      {shape.type === "Polygon" && (
                        <div className="space-y-5">
                          <div>
                            <h4 className="font-semibold mb-2 dark:text-white">Vertices</h4>
                            {shape.nodes.map((node, i) => (
                              <div key={i} className="flex items-center gap-2 mb-2">
                                <span className="w-16 text-[14px] dark:text-gray-300">Vertex {getJointLabel(index, i)}</span>
                                <input placeholder="x" value={node.x}
                                  onChange={e => { const copy = [...shapes]; copy[index].nodes[i].x = e.target.value; setShapes(copy); }}
                                  className={inputCls + " w-20"} />
                                <input placeholder="y" value={node.y}
                                  onChange={e => { const copy = [...shapes]; copy[index].nodes[i].y = e.target.value; setShapes(copy); }}
                                  className={inputCls + " w-20"} />
                                <button onClick={() => {
                                  if (shape.nodes.length <= 2) return;
                                  const copy = [...shapes];
                                  copy[index].nodes.splice(i, 1);
                                  copy[index].sides = copy[index].sides.filter(s => s.a !== i && s.b !== i);
                                  setShapes(copy);
                                }} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition">–</button>
                              </div>
                            ))}
                            <button onClick={() => { const copy = [...shapes]; copy[index].nodes.push({ x: "", y: "" }); setShapes(copy); }}
                              className="bg-[#008409] text-white px-3 py-1 rounded-md shadow hover:bg-[#15711b] transition text-[16px]">+ Add Vertex</button>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2 dark:text-white">Sides</h4>
                            {shape.sides.map((side, i) => (
                              <div key={i} className="flex items-center gap-2 mb-2">
                                <span className="w-12 text-[14px] dark:text-gray-300">Side</span>
                                <select value={side.a}
                                  onChange={e => { const copy = [...shapes]; copy[index].sides[i].a = Number(e.target.value); setShapes(copy); }}
                                  className={inputCls + " w-24"}>
                                  {shape.nodes.map((_, j) => <option key={j} value={j}>Vertex {getJointLabel(index, j)}</option>)}
                                </select>
                                <select value={side.b}
                                  onChange={e => { const copy = [...shapes]; copy[index].sides[i].b = Number(e.target.value); setShapes(copy); }}
                                  className={inputCls + " w-24"}>
                                  {shape.nodes.map((_, j) => <option key={j} value={j}>Vertex {getJointLabel(index, j)}</option>)}
                                </select>
                                <button onClick={() => { const copy = [...shapes]; copy[index].sides.splice(i, 1); setShapes(copy); }}
                                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition">–</button>
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

        {/* ══ SOLUTION DISPLAY ══ */}
        {result && stepLines.length > 0 && (
          // FIX: replaced hardcoded bg-white with dark-aware classes
          <div className={`${cardCls} mt-10 relative z-10`}>
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-[15px] font-semibold text-gray-800 dark:text-white tracking-wide">Step-by-Step Solution</h3>
            </div>
            <div className="px-6 py-5">
              <button
                onClick={() => {
                  setStatus("generating");
                  const payload = { lines: stepLines, resultRows, shapes };
                  const encoded = encodeURIComponent(JSON.stringify(payload));
                  window.open(`/print/moi?data=${encoded}`, "_blank");
                  setStatus("done");
                  setTimeout(() => setStatus("idle"), 2500);
                }}
                disabled={off}
                className={`w-full mb-4 py-3 rounded-xl font-semibold text-white transition ${off ? "cursor-not-allowed bg-[#1848a0]/60" : "bg-[#1848a0] hover:bg-[#163d8a]"}`}
              >
                {labels[status]}
              </button>
              <MOIStepRenderer lines={stepLines} />
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}