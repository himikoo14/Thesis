"use client";

import Header from "<Ian>/components/Header";
import Footer from "<Ian>/components/Footer";

import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormulaBlockProps {
  label: string;
  formula: string;
}

interface StepProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

// ─── Sub-components ──────────────────────────────────────────────────────────



function FormulaBlock({ label, formula }: FormulaBlockProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 my-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
        {label}
      </p>
      <div className="text-[18px]">
        <BlockMath>{formula}</BlockMath>
      </div>
    </div>
  );
}

function Step({ number, title, children }: StepProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#1848a0] text-white flex items-center justify-center font-bold text-[16px]">
          {number}
        </div>
        <h2 className="text-[20px] font-semibold">{title}</h2>
      </div>
      <div className="ml-12 bg-white border border-gray-200 rounded-2xl shadow p-5 text-[18px] space-y-3 relative z-10">
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────


export default function Centroid() {
  return (
    <div className="relative flex flex-col min-h-screen bg-gray-50 text-gray-900 text-[18px]">
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
      linear-gradient(rgba(24,72,160,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(24,72,160,0.03) 1px, transparent 1px)
    `,
          backgroundSize: "40px 40px",
        }}
      />
      <Header />

      <main className="flex-grow flex flex-col items-center px-4 py-10">
        <h1 className="text-[32px] font-bold mb-2 text-center">
          Moment of Inertia of Composite Areas
        </h1>
        <p className="text-gray-500 mb-8 text-center">About the Centroidal Axis</p>

        {/* Intro Card */}
        <div className="w-full max-w-xl bg-white rounded-2xl shadow p-6 mb-8 border-l-4 border-[#1848a0]">
          <p className="mb-2">
            A <span className="font-semibold text-[#1848a0]">Composite Area</span> is
            formed by combining simple parts or shapes such as rectangles, triangles,
            and circles.
          </p>
          <p>
            The <span className="font-semibold text-[#1848a0]">Moment of Inertia</span> of
            a Composite Area is found by algebraically summing the moments of inertia of
            all parts, provided each component is evaluated about the{" "}
            <span className="font-semibold text-[#1848a0]">same axis</span>.
          </p>
        </div>

        {/* Steps */}
        <div className="w-full max-w-xl">

          {/* Step 1 */}
          <Step number={1} title="Divide the Composite Area">
            <p>
              Split the area into simple parts or shapes.
            </p>
            <ul className="list-none space-y-1 mt-1">
              {["Rectangle", "Triangle", "Circle"].map((shape) => (
                <li key={shape} className="flex items-center gap-2">
                  <span className="text-[#1848a0] font-bold">{"→"}</span>
                  {shape}
                </li>
              ))}
            </ul>
          </Step>

          {/* Step 2 */}
          <Step number={2} title="Identify the Location of Centroidal Axis">
            <p>
              For every labeled part, identify the{" "}
              <span className="font-semibold text-[#1848a0]">Area (Aᵢ)</span> and
              determine its centroid{" "}
              <span className="font-semibold text-[#1848a0]">(xᵢ, yᵢ)</span>.
            </p>
            <p>Then compute the overall centroid of the composite:</p>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <FormulaBlock
                label="x-centroid"
                formula="\bar{x} = \frac{\sum A_i x_i}{\sum A_i}"
              />
              <FormulaBlock
                label="y-centroid"
                formula="\bar{y} = \frac{\sum A_i y_i}{\sum A_i}"
              />
            </div>
          </Step>

          {/* Step 3 */}
          <Step number={3} title="Compute Centroidal MOI of Each Shape">
            <p>
              For each shape, compute its{" "}
              <span className="font-semibold text-[#1848a0]">
                centroidal Moment of Inertia
              </span>{" "}
              using standard formulas from reference tables.
            </p>
          </Step>

          {/* Step 4 */}
          <Step number={4} title="Apply Parallel Axis Theorem">
            <p>
              Transfer each shape's MOI to the composite centroidal axis using:
            </p>
            <FormulaBlock
              label="Parallel Axis Theorem"
              formula="I_i = \bar{I}_{c_i} + A_i d^2"
            />
            <p>
              where <span className="font-semibold text-[#1848a0]">d</span> is the
              perpendicular distance between the shape's centroidal axis and the
              reference axis.
            </p>
          </Step>

          {/* Step 5 */}
          <Step number={5} title="Summation of Moment of Inertia">
            <p>Sum all contributions for each axis:</p>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <FormulaBlock
                label="Horizontal Axis"
                formula="I_x = \sum\left(\bar{I}_{c_i} + A_i d_{y_i}^2\right)"
              />
              <FormulaBlock
                label="Vertical Axis"
                formula="I_y = \sum\left(\bar{I}_{c_i} + A_i d_{x_i}^2\right)"
              />
            </div>

            {/* Warning note */}
            <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-2">
              <span className="text-xl">⚠️</span>
              <p>
                If there is a <strong>hole</strong> or cutout in the composite area,{" "}
                <strong>subtract</strong> its moment of inertia value instead of
                adding it.
              </p>
            </div>
          </Step>

        </div>
      </main>

      <Footer />
    </div>
  );
}