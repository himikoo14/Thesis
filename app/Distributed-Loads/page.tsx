"use client";

import { useState, useEffect } from "react";
import Header from "<Ian>/components/Header";
import Footer from "<Ian>/components/Footer";
import CircularInputs from "<Ian>/components/CircularInputs";
import ShapeCanvas from "<Ian>/components/ShapeCanvas";
import { computeMOI } from "../../lib/MOIEngine";

/* ===================== KATEX LOADER ===================== */
declare global {
  interface Window { katex: any; }
}

function KaTeX({ math, block = false }: { math: string; block?: boolean }) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    const render = () => {
      if (window.katex) {
        try {
          setHtml(window.katex.renderToString(math, { displayMode: block, throwOnError: false }));
        } catch {
          setHtml(math);
        }
      }
    };

    if (window.katex) {
      render();
    } else {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
      script.onload = render;
      document.head.appendChild(script);
    }
  }, [math, block]);

  if (block) return <div className="overflow-x-auto py-1" dangerouslySetInnerHTML={{ __html: html }} />;
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ================= TYPES ================= */
type XY = { x: string; y: string };
type ShapeType =
  | "Polygon" | "Circle"
  | "Semi-circle-1" | "Semi-circle-2" | "Quarter-circle-1"
  | "Quarter-circle-2" | "Quarter-circle-3" | "Quarter-circle-4";

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
  final: { Ix: number; Iy: number };
};

/* ===================== SOLUTION STEP TYPES ===================== */
type StepLine = { label?: string; latex: string };
type SolutionStep = { title: string; lines: StepLine[] };

/* ===================== HELPERS ===================== */
const fmt = (n: number, d = 4) => Number(n.toFixed(d));
const fmtS = (n: number, d = 4) => n.toFixed(d);

/* ===================== BUILD KATEX STEPS ===================== */
function buildKaTeXSteps(
  computed: MOIResult,
  shapes: ShapeData[],
  axisType: "Centroidal" | "Custom",
  axisX: string,
  axisY: string
): SolutionStep[] {
  const steps: SolutionStep[] = [];

  // ---- Step 1: Individual Shape Properties ----
  const s1: SolutionStep = { title: "Step 1: Individual Shape Properties", lines: [] };
  if (computed.step1 && computed.step1.length > 0) {
    computed.step1.forEach((shape: any, i: number) => {
      const sign = shape.hollow === "Hollow" ? "-" : "+";
      const label = `Shape ${i + 1}${shape.hollow === "Hollow" ? " (Hollow — subtracted)" : " (Solid)"}`;
      s1.lines.push({ label, latex: `A_{${i + 1}} = ${sign}${fmtS(Math.abs(shape.area), 4)} \\text{ units}^2` });
      s1.lines.push({ latex: `\\bar{x}_{${i + 1}} = ${fmtS(shape.cx, 4)}, \\quad \\bar{y}_{${i + 1}} = ${fmtS(shape.cy, 4)}` });
      s1.lines.push({ latex: `I_{x,${i + 1}} = ${fmtS(shape.Ix_own, 4)}, \\quad I_{y,${i + 1}} = ${fmtS(shape.Iy_own, 4)}` });
    });
  } else {
    s1.lines.push({ latex: "\\text{No shape data available.}" });
  }
  steps.push(s1);

  // ---- Step 2: Centroid ----
  const s2: SolutionStep = { title: "Step 2: Composite Centroid", lines: [] };
  const { totalArea, centroidX, centroidY } = computed.centroid;

  const aTerms = computed.step1?.map((sh: any, i: number) =>
    sh.hollow === "Hollow" ? `(-${fmtS(Math.abs(sh.area), 3)})` : fmtS(sh.area, 3)
  ).join(" + ") || "0";

  const axTerms = computed.step1?.map((sh: any, i: number) =>
    sh.hollow === "Hollow"
      ? `(-${fmtS(Math.abs(sh.area), 3)})(${fmtS(sh.cx, 3)})`
      : `(${fmtS(sh.area, 3)})(${fmtS(sh.cx, 3)})`
  ).join(" + ") || "0";

  const ayTerms = computed.step1?.map((sh: any, i: number) =>
    sh.hollow === "Hollow"
      ? `(-${fmtS(Math.abs(sh.area), 3)})(${fmtS(sh.cy, 3)})`
      : `(${fmtS(sh.area, 3)})(${fmtS(sh.cy, 3)})`
  ).join(" + ") || "0";

  s2.lines.push({ label: "Total Area", latex: `\\Sigma A = ${aTerms} = ${fmtS(totalArea, 4)} \\text{ units}^2` });
  s2.lines.push({ label: "Centroid X̄", latex: `\\bar{X} = \\frac{\\Sigma A_i \\bar{x}_i}{\\Sigma A} = \\frac{${axTerms}}{${fmtS(totalArea, 3)}} = ${fmtS(centroidX, 4)}` });
  s2.lines.push({ label: "Centroid Ȳ", latex: `\\bar{Y} = \\frac{\\Sigma A_i \\bar{y}_i}{\\Sigma A} = \\frac{${ayTerms}}{${fmtS(totalArea, 3)}} = ${fmtS(centroidY, 4)}` });
  steps.push(s2);

  // ---- Step 3: Parallel Axis Theorem ----
  const s3: SolutionStep = { title: "Step 3: Parallel Axis Theorem (Transfer to Centroid)", lines: [] };
  s3.lines.push({ latex: `I_{x} = \\Sigma\\left(I_{x,i} + A_i \\, d_{y,i}^2\\right), \\quad I_{y} = \\Sigma\\left(I_{y,i} + A_i \\, d_{x,i}^2\\right)` });

  if (computed.step3 && computed.step3.length > 0) {
    computed.step3.forEach((sh: any, i: number) => {
      const dy = sh.dy ?? (sh.cy - centroidY);
      const dx = sh.dx ?? (sh.cx - centroidX);
      const A = sh.area;
      s3.lines.push({
        label: `Shape ${i + 1}`,
        latex: `d_{x,${i + 1}} = ${fmtS(dx, 4)}, \\; d_{y,${i + 1}} = ${fmtS(dy, 4)}`
      });
      s3.lines.push({
        latex: `I_{x,${i + 1}}' = ${fmtS(sh.Ix_own ?? 0, 4)} + (${fmtS(Math.abs(A), 3)})(${fmtS(dy, 4)})^2 = ${fmtS((sh.Ix_transferred ?? sh.Ix_own ?? 0), 4)}`
      });
      s3.lines.push({
        latex: `I_{y,${i + 1}}' = ${fmtS(sh.Iy_own ?? 0, 4)} + (${fmtS(Math.abs(A), 3)})(${fmtS(dx, 4)})^2 = ${fmtS((sh.Iy_transferred ?? sh.Iy_own ?? 0), 4)}`
      });
    });
  }
  steps.push(s3);

  // ---- Step 4: Composite MOI About Centroid ----
  const s4: SolutionStep = { title: "Step 4: Composite MOI About Centroidal Axis", lines: [] };
  const { Ix: IxC, Iy: IyC } = computed.final;
  s4.lines.push({ label: "Centroidal Ix", latex: `I_{x,\\text{centroid}} = \\Sigma I_{x,i}' = ${fmtS(IxC, 4)} \\text{ units}^4` });
  s4.lines.push({ label: "Centroidal Iy", latex: `I_{y,\\text{centroid}} = \\Sigma I_{y,i}' = ${fmtS(IyC, 4)} \\text{ units}^4` });
  steps.push(s4);

  // ---- Step 5 (optional): Transfer to Custom Axis ----
  if (axisType === "Custom") {
    const customX = Number(axisX);
    const customY = Number(axisY);
    const dx = centroidX - customX;
    const dy = centroidY - customY;
    const IxFinal = IxC + totalArea * dy * dy;
    const IyFinal = IyC + totalArea * dx * dx;

    const s5: SolutionStep = {
      title: `Step 5: Transfer to Custom Axis (${customX}, ${customY})`,
      lines: [],
    };
    s5.lines.push({ latex: `d_x = \\bar{X} - x_{\\text{axis}} = ${fmtS(centroidX, 4)} - ${fmtS(customX, 4)} = ${fmtS(dx, 4)}` });
    s5.lines.push({ latex: `d_y = \\bar{Y} - y_{\\text{axis}} = ${fmtS(centroidY, 4)} - ${fmtS(customY, 4)} = ${fmtS(dy, 4)}` });
    s5.lines.push({ label: "Transfer Ix", latex: `I_x = I_{x,c} + A d_y^2 = ${fmtS(IxC, 4)} + (${fmtS(totalArea, 3)})(${fmtS(dy, 4)})^2 = ${fmtS(IxFinal, 4)}` });
    s5.lines.push({ label: "Transfer Iy", latex: `I_y = I_{y,c} + A d_x^2 = ${fmtS(IyC, 4)} + (${fmtS(totalArea, 3)})(${fmtS(dx, 4)})^2 = ${fmtS(IyFinal, 4)}` });
    steps.push(s5);
  }

  // ---- Final Summary ----
  const sFinal: SolutionStep = { title: "Final Result", lines: [] };
  sFinal.lines.push({ label: "Centroid", latex: `\\bar{X} = ${fmtS(centroidX, 4)}, \\quad \\bar{Y} = ${fmtS(centroidY, 4)}` });
  if (axisType === "Custom") {
    const dx = centroidX - Number(axisX);
    const dy = centroidY - Number(axisY);
    const IxFinal = IxC + totalArea * dy * dy;
    const IyFinal = IyC + totalArea * dx * dx;
    sFinal.lines.push({ label: "Custom Axis Ix", latex: `I_x = ${fmtS(IxFinal, 4)} \\text{ units}^4` });
    sFinal.lines.push({ label: "Custom Axis Iy", latex: `I_y = ${fmtS(IyFinal, 4)} \\text{ units}^4` });
  } else {
    sFinal.lines.push({ label: "Centroidal Ix", latex: `I_x = ${fmtS(IxC, 4)} \\text{ units}^4` });
    sFinal.lines.push({ label: "Centroidal Iy", latex: `I_y = ${fmtS(IyC, 4)} \\text{ units}^4` });
  }
  steps.push(sFinal);

  return steps;
}

/* ===================== COMPONENT ===================== */
export default function DistributedLoadPage() {
  const [axisType, setAxisType] = useState<"Centroidal" | "Custom">("Centroidal");
  const [axisX, setAxisX] = useState("");
  const [axisY, setAxisY] = useState("");

  const [shapes, setShapes] = useState<ShapeData[]>([{
    type: "Polygon", hollow: "Hollow", isOpen: true,
    nodes: [{ x: "", y: "" }, { x: "", y: "" }],
    sides: [{ a: 0, b: 1 }],
    radius: "", x: "", y: "",
  }]);

  const [result, setResult] = useState<any>(null);
  const [katexSteps, setKatexSteps] = useState<SolutionStep[]>([]);

  const formatNumber = (num: number) => {
    const rounded = Number(num.toFixed(3));
    return Number.isInteger(rounded) ? rounded : rounded;
  };

  const calculateResultant = () => {
    const computed = computeMOI(shapes) as MOIResult;
    const Ix_centroid = computed.final.Ix;
    const Iy_centroid = computed.final.Iy;
    let Ix = Ix_centroid;
    let Iy = Iy_centroid;

    if (axisType === "Custom") {
      const customX = Number(axisX);
      const customY = Number(axisY);
      const dx = computed.centroid.centroidX - customX;
      const dy = computed.centroid.centroidY - customY;
      Ix = Ix + computed.centroid.totalArea * dy * dy;
      Iy = Iy + computed.centroid.totalArea * dx * dx;
    }

    const finalResult = {
      ...computed,
      centroidMOI: { Ix: Ix_centroid, Iy: Iy_centroid },
      final: { Ix, Iy },
    };

    setResult(finalResult);
    setKatexSteps(buildKaTeXSteps(finalResult, shapes, axisType, axisX, axisY));
  };

  const handleAddShape = () => setShapes(prev => [...prev, {
    type: "Polygon", hollow: "Hollow", isOpen: true,
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
            <div className="bg-white rounded-xl shadow p-4">
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
              <div className="mt-6 bg-white rounded-xl shadow p-4">
                <h3 className="font-semibold mb-3 text-blue-900">Quick Results</h3>
                <p className="text-sm mb-1"><span className="font-medium">Total Area:</span> {formatNumber(result.centroid.totalArea)}</p>
                <p className="text-sm mb-1"><span className="font-medium">Centroid X̄:</span> {formatNumber(result.centroid.centroidX)}</p>
                <p className="text-sm mb-1"><span className="font-medium">Centroid Ȳ:</span> {formatNumber(result.centroid.centroidY)}</p>
                <hr className="my-3" />
                <p className="text-sm mb-1"><span className="font-medium">Ix (centroid):</span> {formatNumber(result.centroidMOI.Ix)}</p>
                <p className="text-sm mb-1"><span className="font-medium">Iy (centroid):</span> {formatNumber(result.centroidMOI.Iy)}</p>
                {axisType === "Custom" && (
                  <>
                    <hr className="my-3" />
                    <p className="text-sm font-semibold text-gray-700 mb-1">About Custom Axis:</p>
                    <p className="text-sm mb-1"><span className="font-medium">Ix:</span> {formatNumber(result.final.Ix)}</p>
                    <p className="text-sm mb-1"><span className="font-medium">Iy:</span> {formatNumber(result.final.Iy)}</p>
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
                <div key={index} className="bg-white rounded-xl shadow px-6 py-4 w-[340px]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Shape {index + 1}</h3>
                    <button onClick={() => handleRemoveShape(index)}
                      className="w-8 h-8 bg-red-500 text-white rounded-lg font-bold">–</button>
                  </div>

                  <button
                    onClick={() => { const copy = [...shapes]; copy[index].isOpen = !copy[index].isOpen; setShapes(copy); }}
                    className="w-full flex justify-between bg-[#15711b] text-white px-4 py-2 rounded-lg"
                  >
                    Options
                    <span className={`transition-transform ${shape.isOpen ? "rotate-180" : ""}`}>▼</span>
                  </button>

                  {shape.isOpen && (
                    <div className="mt-4 space-y-4">
                      <select value={shape.type}
                        onChange={e => { const copy = [...shapes]; copy[index].type = e.target.value as ShapeType; setShapes(copy); }}
                        className="w-full rounded px-3 py-1">
                        <option value="Polygon">Polygon</option>
                        <option value="Circle">Circle</option>
                        <option value="Semi-circle-1">Semi-circle-1</option>
                        <option value="Semi-circle-2">Semi-circle-2</option>
                        <option value="Semi-circle-3">Semi-circle-3</option>
                        <option value="Semi-circle-4">Semi-circle-4</option>
                        <option value="Quarter-circle-1">Quarter-circle-1</option>
                        <option value="Quarter-circle-2">Quarter-circle-2</option>
                        <option value="Quarter-circle-3">Quarter-circle-3</option>
                        <option value="Quarter-circle-4">Quarter-circle-4</option>
                      </select>

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
                              className="bg-[#15711b] text-white px-3 py-1 rounded">+ Add Joint</button>
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
                            }} className="bg-[#15711b] text-white px-3 py-1 rounded">+ Add Side</button>
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
                        className="w-full bg-[#15711b] text-white py-2 rounded-lg font-semibold">
                        + Add Shape
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ===================== KATEX SOLUTION ===================== */}
        {katexSteps.length > 0 && (
          <div className="mt-10 bg-white rounded-xl shadow border border-gray-100 p-6">
            <h2 className="text-2xl font-bold text-blue-900 mb-6">Step-by-Step Solution</h2>

            {katexSteps.map((step, si) => (
              <div key={si} className="mb-8">
                <h3 className="text-base font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-200">
                  {step.title}
                </h3>
                <div className="space-y-3">
                  {step.lines.map((line, li) => (
                    <div key={li} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                      {line.label && (
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide sm:w-36 shrink-0 pt-1">
                          {line.label}
                        </span>
                      )}
                      <div className="bg-gray-50 rounded-lg px-4 py-2 flex-1 overflow-x-auto">
                        <KaTeX math={line.latex} block />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}