"use client";

import Header from "<Ian>/components/Header";
import Footer from "<Ian>/components/Footer";

import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

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
  label: string | React.ReactNode;
}

function FormulaBlock({ label, formula }: FormulaBlockProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4 my-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
        {label}
      </p>
      <div className="text-[18px] dark:[&_.katex]:text-white dark:[&_.katex-html]:text-white">
        <BlockMath>{formula}</BlockMath>
      </div>
    </div>
  );
}

function ArrowItem({ label }: ArrowItemProps) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-[#1848a0] font-bold mt-0.5">{"→"}</span>
      <span>{label}</span>
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
        <h2 className="text-[20px] font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <div className="ml-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow p-5 text-[18px] space-y-3 relative z-10 text-gray-900 dark:text-gray-200">
        {children}
      </div>
    </div>
  );
}

export default function MOICustom() {
  return (
    <div className="relative flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-[18px]">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
    linear-gradient(rgba(24,72,160,0.07) 2px, transparent 2px),
    linear-gradient(90deg, rgba(24,72,160,0.07) 2px, transparent 2px)
`,
          backgroundSize: "80px 80px",
        }}
      />
      <Header />

      <main className="flex-grow flex flex-col items-center px-4 py-10">
        <h1 className="text-[32px] font-bold mb-2 text-center text-gray-900 dark:text-white">
          Moment of Inertia for Composite Areas
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-center">
          About a Custom Reference Axis
        </p>

        {/* Intro Card */}
        <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow p-6 mb-8 border-l-4 border-[#1848a0] relative z-10 text-gray-900 dark:text-gray-200">
          <p className="mb-3">
            A{" "}
            <span className="font-semibold text-[#1848a0]">Composite Area</span>{" "}
            is formed by combining simple parts or shapes such as rectangles,
            triangles, and circles.
          </p>
          <p>
            The{" "}
            <span className="font-semibold text-[#1848a0]">Moment of Inertia</span>{" "}
            of a Composite Area is found by algebraically summing the moments of
            inertia of all parts, provided each component is evaluated about the{" "}
            <span className="font-semibold text-[#1848a0]">same axis</span>.
          </p>
        </div>

        {/* Steps */}
        <div className="w-full max-w-xl">

          <Step number={1} title="Divide the Composite Area">
            <p>
              Split the area into simple parts or shapes and choose a{" "}
              <span className="font-semibold text-[#1848a0]">reference axis</span>.
              Label each part (e.g., A, B, C) as shown.
            </p>
            <ul className="list-none space-y-1 mt-1">
              {["Rectangle", "Triangle", "Circle"].map((shape) => (
                <ArrowItem key={shape} label={shape} />
              ))}
            </ul>
          </Step>

          <Step number={2} title="Determine the Properties of Each Part">
            <p>For every labeled part, identify:</p>
            <ul className="list-none space-y-1 mt-1">
              <ArrowItem
                label={
                  <span className="font-semibold text-[#1848a0]">Area (A)</span>
                }
              />
              <ArrowItem
                label={
                  <>
                    <span className="font-semibold text-[#1848a0]">
                      Centroid location (x&#x1D62;, y&#x1D62;)
                    </span>{" "}
                    measured from the chosen reference axis
                  </>
                }
              />
              <ArrowItem
                label={
                  <>
                    <span className="font-semibold text-[#1848a0]">
                      Centroidal Moment of Inertia (I&#x1D9C;)
                    </span>{" "}
                    using standard formulas
                  </>
                }
              />
            </ul>
          </Step>

          <Step number={3} title="Apply Parallel Axis Theorem">
            <p>
              If the centroidal axis of a part does not coincide with the
              reference axis, shift the centroidal moment of inertia using:
            </p>
            <FormulaBlock
              label="Parallel Axis Theorem"
              formula="I_i = \bar{I}_{c_i} + A_i d^2"
            />
            <p>
              where the distance{" "}
              <span className="font-semibold text-[#1848a0]">d</span> is defined
              as follows:
            </p>
            <ul className="list-none space-y-2 mt-1">
              <ArrowItem
                label={
                  <>
                    For <span className="font-semibold text-[#1848a0]">I&#x2093;</span>:{" "}
                    <span className="font-semibold">d&#x1D62;</span> = vertical distance
                    from the centroid of the part to the{" "}
                    <span className="font-semibold text-[#1848a0]">x-axis</span>
                  </>
                }
              />
              <ArrowItem
                label={
                  <>
                    For <span className="font-semibold text-[#1848a0]">I&#x1D67;</span>:{" "}
                    <span className="font-semibold">d&#x1D62;</span> = horizontal distance
                    from the centroid of the part to the{" "}
                    <span className="font-semibold text-[#1848a0]">y-axis</span>
                  </>
                }
              />
            </ul>
            <div className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4 mt-2">
              <span className="text-xl">⚠️</span>
              <p className="text-gray-800 dark:text-gray-200">
                For <strong>holes</strong> or cutouts, compute{" "}
                <span className="font-semibold">I&#x1D9C;&#x1D62; + A&#x1D62;d²</span>{" "}
                and <strong>subtract</strong> the result instead of adding it.
              </p>
            </div>
          </Step>

          <Step number={4} title="Summation of Moment of Inertia">
            <p>
              The moment of inertia of the composite area about the selected
              reference axis is obtained by algebraically summing the
              contributions of all parts:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              <FormulaBlock
                label="About the x-axis"
                formula="I_x = \sum\!\left(\bar{I}_{c_i} + A_i\, d_{y_i}^2\right)"
              />
              <FormulaBlock
                label="About the y-axis"
                formula="I_y = \sum\!\left(\bar{I}_{c_i} + A_i\, d_{x_i}^2\right)"
              />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-[16px]">
              This summation gives the moment of inertia of the composite area
              about the chosen reference axis.
            </p>
          </Step>

        </div>
      </main>

      <Footer />
    </div>
  );
}