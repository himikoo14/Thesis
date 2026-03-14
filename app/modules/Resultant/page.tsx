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

interface ArrowItemProps {
  label: string;
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

function ArrowItem({ label }: ArrowItemProps) {
  return (
    <li className="flex items-center gap-2">
      <span className="text-[#1848a0] font-bold">{"→"}</span>
      {label}
    </li>
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
      <div className="ml-12 bg-white border border-gray-200 rounded-2xl shadow p-5 text-[18px] space-y-3">
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ThreeDResultant() {
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
          Resultant of a Three-Dimensional Force System
        </h1>
        <p className="text-gray-500 mb-8 text-center">
          Procedure to Solve for the Resultant Force (3D)
        </p>

        {/* Intro Card */}
        <div className="w-full max-w-xl bg-white rounded-2xl shadow p-6 mb-8 border-l-4 border-[#1848a0]">
          <p className="mb-3">
            A{" "}
            <span className="font-semibold text-[#1848a0]">
              Resultant Force
            </span>{" "}
            is the single force that has the same effect as a system of two or
            more forces acting on a body.
          </p>
          <p>
            For a{" "}
            <span className="font-semibold text-[#1848a0]">
              Three-Dimensional Force System
            </span>
            , the resultant is obtained by resolving each force into its{" "}
            <span className="font-semibold text-[#1848a0]">
              horizontal, vertical, and depth components
            </span>{" "}
            and summing them.
          </p>
        </div>

        {/* Steps */}
        <div className="w-full max-w-xl">

          {/* Step 1 */}
          <Step number={1} title="Draw the Free Body Diagram (FBD)">
            <p>
              Represent the body and show all forces acting on it with their{" "}
              <span className="font-semibold text-[#1848a0]">magnitudes</span>{" "}
              and{" "}
              <span className="font-semibold text-[#1848a0]">directions</span>.
            </p>
          </Step>

          {/* Step 2 */}
          <Step number={2} title="Resolve Each Force into Components">
            <p>
              Break every force into{" "}
              <span className="font-semibold text-[#1848a0]">
                x, y, and z components
              </span>
              .
            </p>
            <FormulaBlock
              label="Force Vector"
              formula="\vec{F} = F_x\,\hat{i} + F_y\,\hat{j} + F_z\,\hat{k}"
            />
            <p>
              Assign{" "}
              <span className="font-semibold text-[#1848a0]">
                positive or negative signs
              </span>{" "}
              based on the chosen coordinate system.
            </p>
          </Step>

          {/* Step 3 */}
          <Step number={3} title="Sum the Force Components">
            <p>Add all force components along each axis:</p>
            <div className="grid grid-cols-3 gap-3 mt-1">
              <FormulaBlock label="x-axis" formula="\sum F_x" />
              <FormulaBlock label="y-axis" formula="\sum F_y" />
              <FormulaBlock label="z-axis" formula="\sum F_z" />
            </div>
          </Step>

          {/* Step 4 */}
          <Step number={4} title="Express the Resultant Vector">
            <p>Combine the summed components:</p>
            <FormulaBlock
              label="Resultant Vector"
              formula="\vec{R} = \left(\sum F_x\right)\hat{i} + \left(\sum F_y\right)\hat{j} + \left(\sum F_z\right)\hat{k}"
            />
          </Step>

          {/* Step 5 */}
          <Step number={5} title="Compute the Magnitude of the Resultant">
            <FormulaBlock
              label="Magnitude"
              formula="R = \sqrt{\left(\sum F_x\right)^2 + \left(\sum F_y\right)^2 + \left(\sum F_z\right)^2}"
            />
          </Step>

          {/* Step 6 */}
          <Step number={6} title="Determine the Direction Angles">
            <p>
              Find the angles between the resultant and the coordinate axes:
            </p>
            <div className="grid grid-cols-3 gap-3 mt-1">
              <FormulaBlock
                label="α (alpha)"
                formula="\alpha = \cos^{-1}\!\left(\frac{\sum F_x}{R}\right)"
              />
              <FormulaBlock
                label="β (beta)"
                formula="\beta = \cos^{-1}\!\left(\frac{\sum F_y}{R}\right)"
              />
              <FormulaBlock
                label="γ (gamma)"
                formula="\gamma = \cos^{-1}\!\left(\frac{\sum F_z}{R}\right)"
              />
            </div>
          </Step>

          {/* Step 7 */}
          <Step number={7} title="Express the Resultant Force">
            <p>Write the final answer including:</p>
            <ul className="list-none space-y-1 mt-1">
              {[
                "Magnitude of the resultant force",
                "Direction angles",
              ].map((item) => (
                <ArrowItem key={item} label={item} />
              ))}
            </ul>

            {/* Example box */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                Example Format
              </p>
              <div className="space-y-1 text-[16px]">
                <BlockMath>{"R = 850 \\text{ N}"}</BlockMath>
                <BlockMath>{`\\alpha = 40^\\circ,\\quad \\beta = 65^\\circ,\\quad \\gamma = 55^\\circ`}</BlockMath>
              </div>
            </div>
          </Step>

        </div>
      </main>

      <Footer />
    </div>
  );
}