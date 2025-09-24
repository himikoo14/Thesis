"use client";

import { useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";

// ------------------ ForceSystem2D Logic in TS ------------------
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
                      &= ${v.fx.toFixed(3)}\\,\\text{kN} \\\\
        F_{y${i + 1}} &= ${v.magnitude}\\sin(${v.angleDeg}^\\circ) \\\\
                      &= ${v.fy.toFixed(3)}\\,\\text{kN}
        \\end{align*}
      `);

      sumFx += v.fx;
      sumFy += v.fy;
    });

    steps.push("Step 2: Sum of components:");
    steps.push(`
      \\begin{align*}
      \\Sigma F_x &= ${sumFx.toFixed(3)}\\,\\text{kN} \\\\
      \\Sigma F_y &= ${sumFy.toFixed(3)}\\,\\text{kN}
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
      \\theta &= \\tan^{-1}\\left(\\tfrac{\\Sigma F_y}{\\Sigma F_x}\\right) \\\\
              &= ${theta.toFixed(2)}^\\circ ${arrow}\\,\\text{from +x axis}
      \\end{align*}
    `);

    return { steps, sumFx, sumFy, R, theta };
  }
}

// ------------------ Types ------------------
type ForceResult = {
  steps: string[];
  sumFx: number;
  sumFy: number;
  R: number;
  theta: number;
};

type ForceInput = {
  magnitude: string;
  angle: string;
};

// ------------------ React Component ------------------
export default function Solver2D() {
  const [forces, setForces] = useState<ForceInput[]>([
    { magnitude: "", angle: "" },
  ]);

  const [result, setResult] = useState<ForceResult | null>(null);

  const handleInputChange = (
    index: number,
    field: "magnitude" | "angle",
    value: string
  ) => {
    const newForces = [...forces];
    newForces[index][field] = value;
    setForces(newForces);
  };

  const calculateResultant = () => {
    const system = new ForceSystem2D();

    forces.forEach((f) => {
      const mag = parseFloat(f.magnitude);
      const ang = parseFloat(f.angle);
      if (!isNaN(mag) && !isNaN(ang)) {
        system.addForce(mag, ang);
      }
    });

    const res = system.stepByStepSolution();
    setResult(res);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 text-[18px]">
      <Header />

      {/* Main content area, centered */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 py-10">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-[24px] md:text-[32px] font-bold">
            2D Resultant Force Calculator
          </h1>
        </div>

        {/* Force Setup */}
        <div className="w-full max-w-xl bg-white rounded-2xl shadow p-6 space-y-6">
          <h2 className="text-[20px] font-semibold">Force setup</h2>
          <p className="text-[18px] text-gray-600">
            Enter the forces, their magnitudes (in kN), and directions. Angles
            are measured from the positive x-axis.
          </p>

          {/* Force Inputs */}
          <div className="grid grid-cols-2 gap-4">
            {forces.map((f, i) => (
              <div key={i} className="col-span-2 flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block font-medium text-[18px]">
                    Force {i + 1} (kN)
                  </label>
                  <input
                    type="number"
                    value={f.magnitude}
                    onChange={(e) =>
                      handleInputChange(i, "magnitude", e.target.value)
                    }
                    placeholder="Magnitude (kN)"
                    className="w-full mt-1 rounded-lg border-gray-300 text-[18px] p-2"
                  />
                </div>
                <div className="flex-1">
                  <label className="block font-medium text-[18px]">
                    Angle {i + 1} (°)
                  </label>
                  <input
                    type="number"
                    value={f.angle}
                    onChange={(e) =>
                      handleInputChange(i, "angle", e.target.value)
                    }
                    placeholder="Angle (deg)"
                    className="w-full mt-1 rounded-lg border-gray-300 text-[18px] p-2"
                  />
                </div>
                {forces.length > 1 && (
                  <button
                    onClick={() =>
                      setForces(forces.filter((_, idx) => idx !== i))
                    }
                    className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-[18px]"
                  >
                    –
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add Force Button */}
          <button
            onClick={() =>
              setForces([...forces, { magnitude: "", angle: "" }])
            }
            className="w-full bg-[#008409] text-white py-3 rounded-lg hover:bg-[#15711b] transition text-[18px]"
          >
            + Add Force
          </button>

          <button
            onClick={calculateResultant}
            className="w-full bg-[#1848a0] text-white py-3 rounded-lg hover:bg-[#163d8a] transition text-[18px]"
          >
            Calculate
          </button>
        </div>

        {/* Resultant Force */}
        {result && (
          <div className="w-full max-w-xl mt-6 bg-white rounded-2xl shadow p-6 space-y-4">
            <h2 className="text-[20px] font-semibold">Resultant Force (kN)</h2>

            <div>
              <label className="block font-medium text-[18px]">
                Horizontal component (Fx)
              </label>
              <input
                type="text"
                value={`${result.sumFx.toFixed(3)} kN`}
                readOnly
                className="w-full mt-1 rounded-lg border-gray-300 text-[18px] p-2"
              />
            </div>

            <div>
              <label className="block font-medium text-[18px]">
                Vertical component (Fy)
              </label>
              <input
                type="text"
                value={`${result.sumFy.toFixed(3)} kN`}
                readOnly
                className="w-full mt-1 rounded-lg border-gray-300 text-[18px] p-2"
              />
            </div>

            <div>
              <label className="block font-medium text-[18px]">
                Magnitude of resultant force (R)
              </label>
              <input
                type="text"
                value={`${result.R.toFixed(3)} kN`}
                readOnly
                className="w-full mt-1 rounded-lg border-gray-300 text-[18px] p-2"
              />
            </div>

            <div>
              <label className="block font-medium text-[18px]">
                Direction of resultant force (θ)
              </label>
              <input
                type="text"
                value={`${result.theta.toFixed(2)}°`}
                readOnly
                className="w-full mt-1 rounded-lg border-gray-300 text-[18px] p-2"
              />
            </div>
          </div>
        )}

        {/* Step-by-Step Solution */}
        {result && (
          <div className="w-full max-w-xl mt-6 bg-white rounded-2xl shadow p-6">
            <h2 className="text-[20px] font-semibold mb-2">
              Step-by-Step Solution
            </h2>
            <div className="space-y-4">
              {result.steps.map((line, i) =>
                line.startsWith("Step") ? (
                  <p key={i} className="font-medium text-[18px]">
                    {line}
                  </p>
                ) : (
                  <div key={i} className="text-[18px]">
                    <BlockMath>{line}</BlockMath>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </main>

 <Footer />
    </div>
  );
}
