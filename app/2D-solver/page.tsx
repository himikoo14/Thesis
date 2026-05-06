"use client";

import { useRef, useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Solver3D from "../solver/page";
import "katex/dist/katex.min.css";
import { useStepByStepPDF } from "../ToPDF/Page";
import { StepByStepSolution, fromLegacySteps } from "../../components/StepByStep";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

const fmt2 = (v: number): string => {
  if (Math.abs(v - Math.round(v)) < 1e-9) return Math.round(v).toString();
  return v.toFixed(2).replace(/\.?0+$/, "");
};

/* ===================== Force System Logic ===================== */
class ForceSystem2D {
  vectors: { fx: number; fy: number; magnitude: number; angleDeg: number }[];

  constructor() {
    this.vectors = [];
  }

  addForce(magnitude: number, angleDeg: number) {
    const angleRad = (angleDeg * Math.PI) / 180;
    const fx = magnitude * Math.cos(angleRad);
    const fy = magnitude * Math.sin(angleRad);
    this.vectors.push({ fx, fy, magnitude, angleDeg });
  }

  stepByStepSolution() {
    const steps: string[] = [];
    steps.push("Step 1: Resolve each force into components:");

    let sumFx = 0;
    let sumFy = 0;

    this.vectors.forEach((v, i) => {
      steps.push(
        `\\text{Force ${i + 1}: } |F|=${v.magnitude}\\,\\text{kN},\\; \\theta=${v.angleDeg}^\\circ`
      );
      steps.push(`
        \\begin{align*}
        F_{x${i + 1}} &= ${v.magnitude}\\cos(${v.angleDeg}^\\circ) \\\\
                      &= ${fmt2(v.fx)}\\,\\text{kN} \\\\
        F_{y${i + 1}} &= ${v.magnitude}\\sin(${v.angleDeg}^\\circ) \\\\
                      &= ${fmt2(v.fy)}\\,\\text{kN}
        \\end{align*}
      `);
      sumFx += v.fx;
      sumFy += v.fy;
    });

    steps.push("Step 2: Sum of components:");

    const fxTerms = this.vectors.map((_, i) => `F_{x${i + 1}}`).join(" + ");
    const fyTerms = this.vectors.map((_, i) => `F_{y${i + 1}}`).join(" + ");
    const fxNums = this.vectors.map(v => fmt2(v.fx)).join(" + ");
    const fyNums = this.vectors.map(v => fmt2(v.fy)).join(" + ");

    steps.push(`
\\begin{align*}
\\Sigma F_x &= ${fxTerms} \\\\
           &= ${fxNums} \\\\
           &= ${fmt2(sumFx)}\\,\\text{kN} \\\\
\\\\
\\Sigma F_y &= ${fyTerms} \\\\
           &= ${fyNums} \\\\
           &= ${fmt2(sumFy)}\\,\\text{kN}
\\end{align*}
`);

    const R = Math.hypot(sumFx, sumFy);
    const theta = (Math.atan2(sumFy, sumFx) * 180) / Math.PI;
    const arrow = theta >= 0 ? "↺" : "↻";

    steps.push("Step 3: Resultant force:");
    steps.push(`
      \\begin{align*}
      R &= \\sqrt{(\\Sigma F_x)^2 + (\\Sigma F_y)^2} \\\\
        &= ${R.toFixed(3)}\\,\\text{kN} \\\\
\\theta &= \\tan^{-1}\\left(\\frac{{\\Sigma F_y}\\vphantom{F_x}}{{\\Sigma F_x}}\\right) \\\\
              &= ${theta.toFixed(2)}^\\circ ${arrow}\\,\\text{from +x axis}
      \\end{align*}
    `);

    steps.push(`\\text{Resultant magnitude: } R = ${R.toFixed(3)}\\,\\text{kN}`);
    steps.push(`\\text{Resultant angle: } \\theta = ${theta.toFixed(2)}^\\circ`);
    return { steps, sumFx, sumFy, R, theta };
  }
}

/* ===================== Types ===================== */
type ForceInput = { magnitude: string; angle: string };
type ForceResult = { steps: string[]; sumFx: number; sumFy: number; R: number; theta: number };

/* ===================== ResultantFBD ===================== */
function ResultantFBD({
  forces, result, svgRef,
}: {
  forces: ForceInput[];
  result: ForceResult;
  svgRef?: React.RefObject<SVGSVGElement>;
}) {
  const vectors = forces
    .map((f) => {
      const m = parseFloat(f.magnitude);
      const a = parseFloat(f.angle);
      if (isNaN(m) || isNaN(a)) return null;
      const rad = (a * Math.PI) / 180;
      return { x: m * Math.cos(rad), y: m * Math.sin(rad) };
    })
    .filter(Boolean) as { x: number; y: number }[];

  const R = { x: result.sumFx, y: result.sumFy };
  const maxMag = Math.max(1, ...vectors.map(v => Math.hypot(v.x, v.y)), Math.hypot(R.x, R.y));
  const scale = 90 / maxMag;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 300 300"
      className="w-full max-w-[280px] sm:max-w-[300px] border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 shadow mx-auto"
    >
      <g transform="translate(150,150)">
        <line x1={-140} y1={0} x2={140} y2={0} stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <line x1={0} y1={-140} x2={0} y2={140} stroke="currentColor" strokeWidth="1" opacity="0.3" />
        {vectors.map((v, i) => {
          const x = v.x * scale, y = -v.y * scale;
          return (
            <g key={i}>
              <line x1={0} y1={0} x2={x} y2={y} stroke="#1848a0" strokeWidth="3" markerEnd="url(#arrowF)" />
              <text x={x + 6} y={y - 6} fontSize="14" fill="#1848a0" fontWeight="bold">F{i + 1}</text>
            </g>
          );
        })}
        <line x1={0} y1={0} x2={R.x * scale} y2={-R.y * scale} stroke="#009900" strokeWidth="4" markerEnd="url(#arrowR)" />
        <text x={R.x * scale + 8} y={-R.y * scale - 8} fontSize="16" fill="#009900" fontWeight="bold">R</text>
        <defs>
          <marker id="arrowF" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="#1848a0" />
          </marker>
          <marker id="arrowR" markerWidth="12" markerHeight="12" refX="6" refY="3" orient="auto">
            <polygon points="0 0, 7 3, 0 6" fill="#009900" />
          </marker>
        </defs>
      </g>
    </svg>
  );
}

/* ===================== Draggable FBD (live preview) ===================== */
function FBD({ forces, setForces }: { forces: ForceInput[]; setForces: (f: ForceInput[]) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const vectors = forces
    .map((f) => {
      const m = parseFloat(f.magnitude);
      const a = parseFloat(f.angle);
      if (isNaN(m) || isNaN(a)) return null;
      const rad = (a * Math.PI) / 180;
      return { x: m * Math.cos(rad), y: m * Math.sin(rad) };
    })
    .filter(Boolean) as { x: number; y: number }[];

  const maxMag = Math.max(1, ...vectors.map(v => Math.hypot(v.x, v.y)));
  const scale = 80 / maxMag;

  const handleMove = (clientX: number, clientY: number) => {
    if (dragIndex === null) return;
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const cursor = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const newAngle = (Math.atan2(-(cursor.y - 150), cursor.x - 150) * 180) / Math.PI;
    const newForces = [...forces];
    newForces[dragIndex] = { ...newForces[dragIndex], angle: newAngle.toFixed(3) };
    setForces(newForces);
  };

  return (
    // AFTER:
    <svg
      ref={svgRef}
      viewBox="0 0 300 300"
      className="w-full max-w-[280px] sm:max-w-[300px] border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 shadow"
      style={{ touchAction: "none" }}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onTouchMove={(e) => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); }}
      onMouseUp={() => setDragIndex(null)}
      onTouchEnd={() => setDragIndex(null)}
      onMouseLeave={() => setDragIndex(null)}
    >
      <g transform="translate(150,150)">
        <line x1={-140} y1={0} x2={140} y2={0} stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <line x1={0} y1={-140} x2={0} y2={140} stroke="currentColor" strokeWidth="1" opacity="0.3" />
        {vectors.map((v, i) => {
          const x = v.x * scale, y = -v.y * scale;
          const offset = 10;
          return (
            <g key={i}>
              <line x1={0} y1={0} x2={x} y2={y} stroke="#1848a0" strokeWidth="3"
                markerEnd="url(#arrow)" className="cursor-pointer"
                onMouseDown={() => setDragIndex(i)}
                onTouchStart={() => setDragIndex(i)} />
              <text
                x={x + (x / Math.hypot(x, y)) * offset}
                y={y + (y / Math.hypot(x, y)) * offset}
                fontSize="14" fill="currentColor" fontWeight="bold">
                F{i + 1}
              </text>
            </g>
          );
        })}
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="#1848a0" />
          </marker>
        </defs>
      </g>
    </svg>
  );
}

/* ===================== MAIN COMPONENT ===================== */
function Solver2DContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get("tab") as "2d" | "3d") || "2d";
  const setActiveTab = (tab: "2d" | "3d") => router.replace(`?tab=${tab}`, { scroll: false });
  const [forces, setForces] = useState<ForceInput[]>([{ magnitude: "", angle: "" }]);
  const [result, setResult] = useState<ForceResult | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");

  const off = status === "generating";
  const labels: Record<typeof status, string> = {
    idle: "⬇ Download Solution as PDF",
    generating: "⏳ Opening print view…",
    done: "✅ Done!",
    error: "❌ Export failed — try again",
  };

  const fbdRef = useRef<SVGSVGElement>(null);
  const [solutionRef] = useStepByStepPDF({
    title: "2D Resultant Force — Step-by-Step Solution",
    filename: "resultant-2d-solution.pdf",
  });

  const handleInputChange = (index: number, field: "magnitude" | "angle", value: string) => {
    const newForces = [...forces];
    newForces[index][field] = value;
    setForces(newForces);
  };

  const calculateResultant = () => {
    const system = new ForceSystem2D();
    forces.forEach((f) => {
      const mag = parseFloat(f.magnitude);
      const ang = parseFloat(f.angle);
      if (!isNaN(mag) && !isNaN(ang)) system.addForce(mag, ang);
    });
    setResult(system.stepByStepSolution());
  };

  const handleExportPDF = (result: ForceResult) => {
    if (!result) return;
    setStatus("generating");
    const payload = {
      steps: result.steps,
      resultRows: [
        { label: "Horizontal component (Fx)", value: `${fmt2(result.sumFx)} kN` },
        { label: "Vertical component (Fy)", value: `${fmt2(result.sumFy)} kN` },
        { label: "Magnitude (R)", value: `${fmt2(result.R)} kN` },
        { label: "Angle (θ)", value: `${result.theta.toFixed(2)}°` },
      ],
      forces,
      result: { sumFx: result.sumFx, sumFy: result.sumFy, R: result.R, theta: result.theta },
    };
    const encoded = encodeURIComponent(JSON.stringify(payload));
    const win = window.open(`/print/resultant?data=${encoded}`, "_blank");
    if (win) {
      win.addEventListener("load", () => {
        setTimeout(() => { win.print(); setStatus("done"); setTimeout(() => setStatus("idle"), 2500); }, 800);
      });
    } else {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <Header />

      <main className="flex-grow flex flex-col items-center px-3 sm:px-4 py-6 sm:py-10">

        {/* ── TABS ── */}
        <div className="flex justify-center mb-5 gap-2 sm:gap-4 w-full max-w-xl">
          <button onClick={() => setActiveTab("2d")}
            className={`flex-1 sm:flex-none px-3 sm:px-5 py-2 rounded-lg font-semibold text-[15px] sm:text-[17px] transition ${activeTab === "2d" ? "bg-[#1848a0] text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-white"
              }`}>
            2D Resultant
          </button>
          <button onClick={() => setActiveTab("3d")}
            className={`flex-1 sm:flex-none px-3 sm:px-5 py-2 rounded-lg font-semibold text-[15px] sm:text-[17px] transition ${activeTab === "3d" ? "bg-[#1848a0] text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-white"
              }`}>
            3D Resultant
          </button>
        </div>

        {activeTab === "2d" && (
          <>
            <h1 className="text-[22px] sm:text-[28px] font-bold mb-4 sm:mb-6 text-center">
              2D Resultant Force Calculator
            </h1>

            {/* ── Live FBD ── */}
            <div className="mb-6 relative z-10 flex flex-col items-center w-full">
              <p className="text-[12px] sm:text-[13px] text-gray-500 dark:text-gray-400 text-center mb-3">
                Real-Time Free Body Diagram
              </p>
              <FBD forces={forces} setForces={setForces} />
            </div>

            <p className="w-full max-w-xl text-[12px] sm:text-sm text-gray-700 dark:text-gray-300 mb-3 text-left px-1">
              <span className="font-semibold">Note:</span> The angle is measured from the positive x-axis, counterclockwise.
            </p>

            {/* ── Inputs ── */}
            <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6 space-y-4 relative z-10">
              <h2 className="text-[17px] sm:text-[20px] font-semibold">Force setup</h2>

              <div className="space-y-3">
                {forces.map((f, i) => (
                  <div key={i} className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                    {/* Magnitude + Angle side-by-side even on mobile */}
                    <div className="flex gap-2 flex-1">
                      <div className="flex-1">
                        <label className="block font-medium text-[13px] sm:text-[16px] mb-1">
                          Force {i + 1} (kN)
                        </label>
                        <input
                          type="number"
                          value={f.magnitude}
                          onChange={(e) => handleInputChange(i, "magnitude", e.target.value)}
                          placeholder="Magnitude"
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 text-[14px] sm:text-[16px] p-2 bg-white dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block font-medium text-[13px] sm:text-[16px] mb-1">
                          Angle {i + 1} (°)
                        </label>
                        <input
                          type="number"
                          value={f.angle}
                          onChange={(e) => handleInputChange(i, "angle", e.target.value)}
                          placeholder="Angle"
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 text-[14px] sm:text-[16px] p-2 bg-white dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                    {/* Remove button */}
                    {forces.length > 1 && (
                      <div className="flex flex-col">
                        <label className="block font-medium text-[13px] sm:text-[16px] mb-1 invisible">
                          &nbsp;
                        </label>
                        <button
                          onClick={() => setForces(forces.filter((_, idx) => idx !== i))}
                          className="w-full sm:w-auto px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-[13px] sm:text-[15px] transition">
                          –
                        </button>
                      </div>
                    )}

                  </div>
                ))}
              </div>

              <button
                onClick={() => setForces([...forces, { magnitude: "", angle: "" }])}
                className="w-full bg-[#008409] text-white py-2.5 sm:py-3 rounded-lg hover:bg-[#15711b] transition text-[15px] sm:text-[17px]">
                + Add Force
              </button>
              <button
                onClick={calculateResultant}
                className="w-full bg-[#1848a0] text-white py-2.5 sm:py-3 rounded-lg hover:bg-[#163d8a] transition text-[15px] sm:text-[17px]">
                Calculate
              </button>
            </div>

            {/* ── Output card ── */}
            {result && (
              <div ref={solutionRef as React.Ref<HTMLDivElement>} className="w-full max-w-xl bg-transparent dark:text-white">

                <button
                  onClick={() => handleExportPDF(result)}
                  disabled={off}
                  className={`w-full mt-4 rounded-xl px-4 py-2.5 sm:py-3 font-semibold text-white transition text-[14px] sm:text-[16px] ${off ? "cursor-not-allowed bg-[#1848a0]/60" : "bg-[#1848a0] hover:bg-[#163d8a]"
                    }`}>
                  {labels[status]}
                </button>

                {/* Result values — 2-col grid on mobile too since values are short */}
                <div className="mt-4 bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6">
                  <h2 className="text-[16px] sm:text-[20px] font-semibold mb-3 dark:text-white">Resultant Force (kN)</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      ["Horizontal component (Fx)", `${fmt2(result.sumFx)} kN`],
                      ["Vertical component (Fy)", `${fmt2(result.sumFy)} kN`],
                      ["Magnitude (R)", `${result.R.toFixed(3)} kN`],
                      ["Direction (θ)", `${result.theta.toFixed(2)}°`],
                    ].map(([label, val]) => (
                      <div key={label} className="bg-blue-50 dark:bg-gray-700 rounded-xl border border-blue-100 dark:border-gray-600 px-3 py-2.5">
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">{label}</div>
                        <div className="text-[15px] sm:text-[16px] font-bold text-[#1848a0] dark:text-blue-400">{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step-by-Step Solution ── */}
            {result && (
              <div className="w-full max-w-xl mt-4 overflow-x-auto">
                <StepByStepSolution
                  steps={fromLegacySteps(result.steps)}
                  title="Step-by-Step Solution"
                  footer={
                    <div>
                      <p className="font-medium text-[14px] sm:text-[17px] mb-2">
                        Step 4: Final Free Body Diagram (All Forces + Resultant)
                      </p>
                      <ResultantFBD forces={forces} result={result} svgRef={fbdRef} />
                    </div>
                  }
                />
              </div>
            )}
          </>
        )}

        {activeTab === "3d" && <Solver3D />}
      </main>

      <Footer />
    </div>
  );
}
export default function Solver2D() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Solver2DContent />
    </Suspense>
  );
}