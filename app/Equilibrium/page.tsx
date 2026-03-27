"use client";

import { useRef, useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { computeEquilibrant } from "../../lib/Equilibriumconc";
import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";
import BeamPage from "../Beam/page";

/* ===================== Types ===================== */
type ForceInput = {
  magnitude: string;
  angle: string;
  magnitudeUnknown?: boolean;
  angleUnknown?: boolean;
};

/* ===================== SVG FBD Component ===================== */
function FBD({
  forces,
  setForces,
}: {
  forces: ForceInput[];
  setForces: (f: ForceInput[]) => void;
}) {
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

  const maxMag = Math.max(1, ...vectors.map((v) => Math.hypot(v.x, v.y)));
  const scale = 80 / maxMag;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragIndex === null || !svgRef.current) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursor = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const x = cursor.x - 150;
    const y = cursor.y - 150;
    const newAngle = (Math.atan2(-y, x) * 180) / Math.PI;
    const newForces = [...forces];
    newForces[dragIndex] = { ...newForces[dragIndex], angle: newAngle.toFixed(3) };
    setForces(newForces);
  };

  return (
    <svg
      ref={svgRef}
      width="300"
      height="300"
      className="border rounded-lg bg-white shadow"
      onMouseMove={handleMouseMove}
      onMouseUp={() => setDragIndex(null)}
      onMouseLeave={() => setDragIndex(null)}
    >
      <g transform="translate(150,150)">
        <line x1={-140} y1={0} x2={140} y2={0} stroke="gray" strokeWidth="1" />
        <line x1={0} y1={-140} x2={0} y2={140} stroke="gray" strokeWidth="1" />
        {vectors.map((v, i) => {
          const x = v.x * scale;
          const y = -v.y * scale;
          return (
            <line
              key={i}
              x1={0} y1={0} x2={x} y2={y}
              stroke="#1848a0" strokeWidth="3"
              markerEnd="url(#arrow)"
              className="cursor-pointer"
              onMouseDown={() => setDragIndex(i)}
            />
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

/* ===================== Solver Helpers ===================== */

/** Sum of Fx and Fy for all known forces */
function sumKnown(forces: ForceInput[], skipIndex: number) {
  let sumX = 0, sumY = 0;
  forces.forEach((f, i) => {
    if (i === skipIndex) return;
    const m = parseFloat(f.magnitude);
    const a = parseFloat(f.angle);
    if (isNaN(m) || isNaN(a)) return;
    const rad = (a * Math.PI) / 180;
    sumX += m * Math.cos(rad);
    sumY += m * Math.sin(rad);
  });
  return { sumX, sumY };
}

function solveUnknowns(forces: ForceInput[]): {
  solvedForces: { magnitude: number; angle: number }[];
  steps: string[];
  unknownIndex: number;
  unknownField: "magnitude" | "angle" | null;
} | null {
  // Find unknowns
  const magUnknownIdx = forces.findIndex((f) => f.magnitudeUnknown);
  const angUnknownIdx = forces.findIndex((f) => f.angleUnknown);

  const steps: string[] = [];

  // Case 1: One magnitude unknown (angle is known for that force)
  if (
    magUnknownIdx !== -1 &&
    angUnknownIdx === -1 &&
    !forces[magUnknownIdx].angleUnknown
  ) {
    const unknownAngle = parseFloat(forces[magUnknownIdx].angle);
    if (isNaN(unknownAngle)) {
      steps.push(`❌ Force ${magUnknownIdx + 1}: angle must be provided when magnitude is unknown.`);
      return null;
    }

    const { sumX, sumY } = sumKnown(forces, magUnknownIdx);
    const rad = (unknownAngle * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    // For equilibrium: sumX + F*cosA = 0 and sumY + F*sinA = 0
    // F = -sumX/cosA  OR  F = -sumY/sinA  (use whichever avoids division by ~0)
    let F: number;
    if (Math.abs(cosA) >= Math.abs(sinA)) {
      F = -sumX / cosA;
      steps.push(`Solving for unknown magnitude of Force ${magUnknownIdx + 1}:`);
      steps.push(`\\sum F_x = 0 \\Rightarrow ${sumX.toFixed(3)} + F_{${magUnknownIdx + 1}} \\cdot \\cos(${unknownAngle}°) = 0`);
      steps.push(`F_{${magUnknownIdx + 1}} = \\frac{-${sumX.toFixed(3)}}{\\cos(${unknownAngle}°)} = ${F.toFixed(3)}\\ \\text{kN}`);
    } else {
      F = -sumY / sinA;
      steps.push(`Solving for unknown magnitude of Force ${magUnknownIdx + 1}:`);
      steps.push(`\\sum F_y = 0 \\Rightarrow ${sumY.toFixed(3)} + F_{${magUnknownIdx + 1}} \\cdot \\sin(${unknownAngle}°) = 0`);
      steps.push(`F_{${magUnknownIdx + 1}} = \\frac{-${sumY.toFixed(3)}}{\\sin(${unknownAngle}°)} = ${F.toFixed(3)}\\ \\text{kN}`);
    }

    const solvedForces = forces.map((f, i) => {
      if (i === magUnknownIdx) return { magnitude: Math.abs(F), angle: F < 0 ? unknownAngle + 180 : unknownAngle };
      return { magnitude: parseFloat(f.magnitude), angle: parseFloat(f.angle) };
    });

    return { solvedForces, steps, unknownIndex: magUnknownIdx, unknownField: "magnitude" };
  }

  // Case 2: One angle unknown (magnitude is known for that force)
  if (
    angUnknownIdx !== -1 &&
    magUnknownIdx === -1 &&
    !forces[angUnknownIdx].magnitudeUnknown
  ) {
    const unknownMag = parseFloat(forces[angUnknownIdx].magnitude);
    if (isNaN(unknownMag)) {
      steps.push(`❌ Force ${angUnknownIdx + 1}: magnitude must be provided when angle is unknown.`);
      return null;
    }

    const { sumX, sumY } = sumKnown(forces, angUnknownIdx);

    // For equilibrium: sumX + F*cosA = 0 and sumY + F*sinA = 0
    // cosA = -sumX/F,  sinA = -sumY/F
    const cosA = -sumX / unknownMag;
    const sinA = -sumY / unknownMag;

    if (Math.abs(cosA) > 1.0001 || Math.abs(sinA) > 1.0001) {
      steps.push(`❌ No valid angle solution exists for Force ${angUnknownIdx + 1} with magnitude ${unknownMag} kN.`);
      steps.push(`The required components (cosθ=${cosA.toFixed(3)}, sinθ=${sinA.toFixed(3)}) exceed unit circle bounds.`);
      return null;
    }

    const angle = (Math.atan2(sinA, cosA) * 180) / Math.PI;

    steps.push(`Solving for unknown angle of Force ${angUnknownIdx + 1}:`);
    steps.push(`\\sum F_x = 0 \\Rightarrow ${sumX.toFixed(3)} + ${unknownMag} \\cdot \\cos\\theta = 0 \\Rightarrow \\cos\\theta = ${cosA.toFixed(4)}`);
    steps.push(`\\sum F_y = 0 \\Rightarrow ${sumY.toFixed(3)} + ${unknownMag} \\cdot \\sin\\theta = 0 \\Rightarrow \\sin\\theta = ${sinA.toFixed(4)}`);
    steps.push(`\\theta = \\arctan\\!\\left(\\frac{${sinA.toFixed(4)}}{${cosA.toFixed(4)}}\\right) = ${angle.toFixed(3)}°`);

    const solvedForces = forces.map((f, i) => {
      if (i === angUnknownIdx) return { magnitude: unknownMag, angle };
      return { magnitude: parseFloat(f.magnitude), angle: parseFloat(f.angle) };
    });

    return { solvedForces, steps, unknownIndex: angUnknownIdx, unknownField: "angle" };
  }

  // Case 3: Both magnitude and angle unknown for the SAME force (2 equations, 2 unknowns — solvable!)
  if (
    magUnknownIdx !== -1 &&
    angUnknownIdx !== -1 &&
    magUnknownIdx === angUnknownIdx
  ) {
    const { sumX, sumY } = sumKnown(forces, magUnknownIdx);
    const Fx = -sumX;
    const Fy = -sumY;
    const F = Math.hypot(Fx, Fy);
    const angle = (Math.atan2(Fy, Fx) * 180) / Math.PI;

    steps.push(`Solving for unknown magnitude AND angle of Force ${magUnknownIdx + 1}:`);
    steps.push(`\\sum F_x = 0 \\Rightarrow F_{${magUnknownIdx + 1}x} = -${sumX.toFixed(3)} = ${Fx.toFixed(3)}\\ \\text{kN}`);
    steps.push(`\\sum F_y = 0 \\Rightarrow F_{${magUnknownIdx + 1}y} = -${sumY.toFixed(3)} = ${Fy.toFixed(3)}\\ \\text{kN}`);
    steps.push(`F_{${magUnknownIdx + 1}} = \\sqrt{(${Fx.toFixed(3)})^2 + (${Fy.toFixed(3)})^2} = ${F.toFixed(3)}\\ \\text{kN}`);
    steps.push(`\\theta = \\arctan\\!\\left(\\frac{${Fy.toFixed(3)}}{${Fx.toFixed(3)}}\\right) = ${angle.toFixed(3)}°`);

    const solvedForces = forces.map((f, i) => {
      if (i === magUnknownIdx) return { magnitude: F, angle };
      return { magnitude: parseFloat(f.magnitude), angle: parseFloat(f.angle) };
    });

    return { solvedForces, steps, unknownIndex: magUnknownIdx, unknownField: null };
  }

  return null; // too many unknowns or unsupported configuration
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
      if (field === "magnitude") {
        return { ...f, magnitudeUnknown: !f.magnitudeUnknown, magnitude: !f.magnitudeUnknown ? "" : f.magnitude };
      } else {
        return { ...f, angleUnknown: !f.angleUnknown, angle: !f.angleUnknown ? "" : f.angle };
      }
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
      // Count total unknowns
      const totalUnknowns = forces.reduce((acc, f) => {
        return acc + (f.magnitudeUnknown ? 1 : 0) + (f.angleUnknown ? 1 : 0);
      }, 0);

      if (totalUnknowns > 2) {
        setError("Too many unknowns. The system can only solve for up to 2 unknowns (1 force with both magnitude and angle unknown, or 1 magnitude + 1 angle on different forces is not yet supported).");
        return;
      }

      const result = solveUnknowns(forces);
      if (!result) {
        setError("Could not solve for the unknowns. Check your inputs.");
        return;
      }

      // Build solution display using solved forces
      const { solvedForces, steps, unknownIndex, unknownField } = result;
      const validSolvedForces = solvedForces.filter(
        (f) => !isNaN(f.magnitude) && !isNaN(f.angle)
      );

      const equilibriumResult = computeEquilibrant(validSolvedForces);

      setSolution({
        ...equilibriumResult,
        steps: [...steps, ...(equilibriumResult.steps || [])],
        unknownIndex,
        unknownField,
        solvedMagnitude: solvedForces[unknownIndex]?.magnitude,
        solvedAngle: solvedForces[unknownIndex]?.angle,
      });
    } else {
      // All known — normal resultant/equilibrant calculation
      const numericForces = forces
        .map((f) => ({ magnitude: parseFloat(f.magnitude), angle: parseFloat(f.angle) }))
        .filter((f) => !isNaN(f.magnitude) && !isNaN(f.angle));

      if (numericForces.length === 0) {
        setError("Please enter at least one valid force.");
        return;
      }

      const result = computeEquilibrant(numericForces);
      setSolution(result);
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
              <h2 style={{ color: "#1848a0", fontSize: 18, fontWeight: 600, textAlign: "center", marginBottom: 8 }}>
                Real-Time Free Body Diagram
              </h2>
              <p style={{ color: "#888", fontSize: 13, marginTop: 6, textAlign: "center" }}>
                Drag arrows to change angles
              </p>
              
              <FBD forces={forces} setForces={setForces} />
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
                        className={`w-full rounded-xl border p-3 pr-14 ${
                          f.magnitudeUnknown
                            ? "bg-blue-50 border-[#1848a0] text-[#1848a0] font-semibold placeholder-[#1848a0] cursor-not-allowed"
                            : "border-gray-300"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => toggleUnknown(i, "magnitude")}
                        title={f.magnitudeUnknown ? "Clear unknown" : "Mark as unknown"}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl border text-lg font-semibold transition duration-200 ${
                          f.magnitudeUnknown
                            ? "bg-[#1848a0] text-white border-[#1848a0]"
                            : "bg-white text-[#1848a0] border-gray-300 hover:bg-blue-50"
                        }`}
                      >
                        ?
                      </button>
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
                        className={`w-full rounded-xl border p-3 pr-12 ${
                          f.angleUnknown
                            ? "bg-blue-50 border-[#1848a0] text-[#1848a0] font-semibold placeholder-[#1848a0] cursor-not-allowed"
                            : "border-gray-300"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => toggleUnknown(i, "angle")}
                        title={f.angleUnknown ? "Clear unknown" : "Mark as unknown"}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl border text-lg font-semibold transition duration-200 ${
                          f.angleUnknown
                            ? "bg-[#1848a0] text-white border-[#1848a0]"
                            : "bg-white text-[#1848a0] border-gray-300 hover:bg-blue-50"
                        }`}
                      >
                        ?
                      </button>
                    </div>
                  </div>

                  {forces.length > 1 && (
                    <button
                      onClick={() => setForces(forces.filter((_, idx) => idx !== i))}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200"
                    >
                      –
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={() => setForces([...forces, { magnitude: "", angle: "", magnitudeUnknown: false, angleUnknown: false }])}
                className="w-full bg-[#008409] text-white py-3 rounded-lg hover:bg-[#15711b] transition duration-200"
              >
                + Add Force
              </button>

              <button
                onClick={calculateResultant}
                className="w-full bg-[#1848a0] text-white py-3 rounded-lg hover:bg-[#163d8a] transition duration-200 text-[18px]"
              >
                Calculate
              </button>
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
                <h3 className="font-semibold mb-3 text-lg">Step-by-Step Solution</h3>

                {/* Highlight solved unknown */}
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

                {solution.steps?.map((step: string, index: number) => (
                  <div key={index} className="mb-3">
                    {step.startsWith("\\") || step.includes("\\") ? (
                      <BlockMath>{step}</BlockMath>
                    ) : (
                      <p>{step}</p>
                    )}
                  </div>
                ))}

                <div className="mt-4 pt-3 border-t space-y-1">
                  <div className="font-semibold">Resultant: {solution.resultantMagnitude?.toFixed(3)} kN @ {solution.resultantAngle?.toFixed(3)}°</div>
                  <div className="text-gray-600">Equilibrant: {solution.equilibrantMagnitude?.toFixed(3)} kN @ {solution.equilibrantAngle?.toFixed(3)}°</div>
                </div>
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