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

/* ===================== SVG FBD Component (draggable only) ===================== */
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
    newForces[dragIndex] = {
      ...newForces[dragIndex],
      angle: newAngle.toFixed(3),
    };

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
              x1={0}
              y1={0}
              x2={x}
              y2={y}
              stroke="#1848a0"
              strokeWidth="3"
              markerEnd="url(#arrow)"
              className="cursor-pointer"
              onMouseDown={() => setDragIndex(i)}
            />
          );
        })}

        <defs>
          <marker
            id="arrow"
            markerWidth="10"
            markerHeight="10"
            refX="5"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 6 3, 0 6" fill="#1848a0" />
          </marker>
        </defs>
      </g>
    </svg>
  );
}

/* ===================== MAIN COMPONENT ===================== */
export default function Equilibrium() {
  const [forces, setForces] = useState<ForceInput[]>([
    { magnitude: "", angle: "", magnitudeUnknown: false, angleUnknown: false },
  ]);
  const [solution, setSolution] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"concurrent" | "nonconcurrent">("concurrent");

  const toggleUnknown = (index: number, field: "magnitude" | "angle") => {
    const newForces = [...forces];

    if (field === "magnitude") {
      newForces[index].magnitudeUnknown = !newForces[index].magnitudeUnknown;
    } else {
      newForces[index].angleUnknown = !newForces[index].angleUnknown;
    }

    setForces(newForces);
  };
  const calculateResultant = () => {
    const numericForces = forces
      .map((f) => ({
        magnitude: parseFloat(f.magnitude),
        angle: parseFloat(f.angle),
      }))
      .filter((f) => !isNaN(f.magnitude) && !isNaN(f.angle));

    if (numericForces.length === 0) return;

    const result = computeEquilibrant(numericForces);

    setSolution(result); // ✅ store result in state
  };

  const handleInputChange = (
    index: number,
    field: "magnitude" | "angle",
    value: string
  ) => {
    const newForces = [...forces];
    newForces[index][field] = value;
    setForces(newForces);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 text-[18px]">
      <Header />

      <main className="flex-grow flex flex-col items-center px-4 pt-8 pb-10">
        {/* Tabs */}
        <div className="flex justify-center mb-6 gap-4">

          <button
            onClick={() => setActiveTab("concurrent")}
            className={`px-5 py-2 rounded-lg font-semibold ${activeTab === "concurrent"
                ? "bg-[#1848a0] text-white"
                : "bg-gray-200"
              }`}
          >
            Concurrent Force System
          </button>

          <button
            onClick={() => setActiveTab("nonconcurrent")}
            className={`px-5 py-2 rounded-lg font-semibold ${activeTab === "nonconcurrent"
                ? "bg-[#1848a0] text-white"
                : "bg-gray-200"
              }`}
          >
            Non-Concurrent Force System
          </button>

        </div>

        {activeTab === "concurrent" && (
          <>
        <h1 className="text-3xl font-bold text-center mb-2">
          Beam Calculator
        </h1>


            <div className="mb-8">
              <h2 className="text-[20px] font-semibold text-center mb-2">
                Free Body Diagram
              </h2>
              <FBD forces={forces} setForces={setForces} />
            </div>

            <div className="w-full max-w-xl bg-white rounded-2xl shadow p-6 space-y-6">
              <h2 className="text-[20px] font-semibold">Force setup</h2>

              {forces.map((f, i) => (
                <div key={i} className="flex gap-4 items-end">


                  {/* FORCE INPUT */}
                  <div className="flex-1">
                    <label className="block font-medium">
                      Force {i + 1} (kN)
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        value={f.magnitude}
                        onChange={(e) =>
                          handleInputChange(i, "magnitude", e.target.value)
                        }
                        className="w-full rounded-xl border border-gray-300 p-3 pr-14"
                      />

                      <button
                        type="button"
                        onClick={() => toggleUnknown(i, "magnitude")}
                        className={`absolute right-2 top-1/2 -translate-y-1/2
     w-9 h-9 rounded-xl border
     text-lg font-semibold transition duration-200
     ${f.magnitudeUnknown
                            ? "bg-[#1848a0] text-white border-[#1848a0]"
                            : "bg-white text-[#1848a0] border-gray-300 hover:bg-blue-50"
                          }`}
                      >
                        ?
                      </button>
                    </div>
                  </div>

                  {/* ANGLE INPUT */}
                  <div className="flex-1">
                    <label className="block font-medium">
                      Angle {i + 1} (°)
                    </label>

                    <div className="relative mt-1">
                      <input
                        type="number"
                        value={f.angle}
                        onChange={(e) =>
                          handleInputChange(i, "angle", e.target.value)
                        }
                        className="w-full rounded-xl border border-gray-300 p-3 pr-12"
                      />

                      <button
                        type="button"
                        onClick={() => toggleUnknown(i, "angle")}
                        className={`absolute right-2 top-1/2 -translate-y-1/2
     w-9 h-9 rounded-xl border
     text-lg font-semibold transition duration-200
     ${f.angleUnknown
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
                      onClick={() =>
                        setForces(forces.filter((_, idx) => idx !== i))
                      }
                      className="px-3 py-1 bg-red-500 text-white rounded-lg 
           hover:bg-red-600 transition duration-200"
                    >
                      –
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={() =>
                  setForces([...forces, { magnitude: "", angle: "" }])
                }
                className="w-full bg-[#008409] text-white py-3 rounded-lg 
           hover:bg-[#15711b] transition duration-200"
              >
                + Add Force
              </button>

              <button
                onClick={calculateResultant}
                className="w-full bg-[#1848a0] text-white py-3 rounded-lg 
           hover:bg-[#163d8a] transition duration-200 text-[18px]"
              >
                Calculate
              </button>
            </div>

            {solution && (
              <div className="mt-6 bg-gray-50 p-4 rounded-xl border">
                <h3 className="font-semibold mb-2">Step-by-Step Solution</h3>

                {solution.steps?.map((step: string, index: number) => (
                  <div key={index} className="mb-3">
                    {step.includes("\\begin") ? (
                      <BlockMath>{step}</BlockMath>) : (
                      <p>{step}</p>
                    )}
                  </div>
                ))}

                <div className="mt-3 font-semibold">
                  Resultant Magnitude: {solution.resultantMagnitude.toFixed(3)} kN
                </div>
                <div>
                  Resultant Angle: {solution.resultantAngle.toFixed(3)}°
                </div>

                <div className="mt-3 font-semibold">
                  Equilibrant Magnitude: {solution.equilibrantMagnitude.toFixed(3)} kN
                </div>
                <div>
                  Equilibrant Angle: {solution.equilibrantAngle.toFixed(3)}°
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
