"use client";

import { useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

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
      steps.push(`  F${i + 1}: magnitude = ${v.magnitude} N, angle = ${v.angleDeg}°`);
      steps.push(
        `      Fx${i + 1} = ${v.magnitude} cos(${v.angleDeg}°) = ${v.fx.toFixed(3)} N`
      );
      steps.push(
        `      Fy${i + 1} = ${v.magnitude} sin(${v.angleDeg}°) = ${v.fy.toFixed(3)} N`
      );
      sumFx += v.fx;
      sumFy += v.fy;
    });

    steps.push("\nStep 2: Sum of components:");
    steps.push(`  ΣFx = ${sumFx.toFixed(3)} N`);
    steps.push(`  ΣFy = ${sumFy.toFixed(3)} N`);

    const R = Math.hypot(sumFx, sumFy);
    const theta = (Math.atan2(sumFy, sumFx) * 180) / Math.PI;

    steps.push("\nStep 3: Resultant force:");
    steps.push(`  R = sqrt((ΣFx)^2 + (ΣFy)^2) = ${R.toFixed(3)} N`);
    steps.push(`  θ = atan2(ΣFy, ΣFx) = ${theta.toFixed(2)}° CCW from +x axis`);

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
    { magnitude: "", angle: "" },
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
    <div className="bg-gray-50 text-gray-900 min-h-screen">
      {/* Navbar */}
      <Header />

      {/* Title */}
      <div className="text-center my-10">
        <h1 className="text-3xl font-bold">2D Resultant Force Calculator</h1>
      </div>

      {/* Force Setup */}
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-6 space-y-6">
        <h2 className="text-lg font-semibold">Force setup</h2>
        <p className="text-sm text-gray-600">
          Enter the forces, their magnitudes, and directions. Angles are measured from the positive x-axis.
        </p>

        {/* Force inputs */}
        <div className="grid grid-cols-2 gap-4">
          {forces.map((f, i) => (
            <div key={i} className="col-span-2 flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium">Force {i + 1}</label>
                <input
                  type="number"
                  value={f.magnitude}
                  onChange={(e) => handleInputChange(i, "magnitude", e.target.value)}
                  placeholder="Magnitude (N)"
                  className="w-full mt-1 rounded-lg border-gray-300"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium">Angle {i + 1}</label>
                <input
                  type="number"
                  value={f.angle}
                  onChange={(e) => handleInputChange(i, "angle", e.target.value)}
                  placeholder="Angle (deg)"
                  className="w-full mt-1 rounded-lg border-gray-300"
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={calculateResultant}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Calculate
        </button>
      </div>

      {/* Resultant Force */}
      {result && (
        <div className="max-w-xl mx-auto mt-6 bg-white rounded-2xl shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold">Resultant Force</h2>

          <div>
            <label className="block text-sm font-medium">Horizontal component</label>
            <input
              type="text"
              value={`${result.sumFx.toFixed(3)} N`}
              readOnly
              className="w-full mt-1 rounded-lg border-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Vertical component</label>
            <input
              type="text"
              value={`${result.sumFy.toFixed(3)} N`}
              readOnly
              className="w-full mt-1 rounded-lg border-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Magnitude of resultant force</label>
            <input
              type="text"
              value={`${result.R.toFixed(3)} N`}
              readOnly
              className="w-full mt-1 rounded-lg border-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Direction of resultant force</label>
            <input
              type="text"
              value={`${result.theta.toFixed(2)}°`}
              readOnly
              className="w-full mt-1 rounded-lg border-gray-300"
            />
          </div>
        </div>
      )}

      {/* Solution Section */}
      {result && (
        <div className="max-w-xl mx-auto mt-6 bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold mb-2">Step-by-Step Solution</h2>
          <pre className="bg-gray-100 p-3 rounded-lg text-sm whitespace-pre-wrap">
            {result.steps.join("\n")}
          </pre>
        </div>
      )}

      <Footer />
    </div>
  );
}
