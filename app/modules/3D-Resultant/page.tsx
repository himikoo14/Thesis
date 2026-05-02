"use client";

import Header from "<Ian>/components/Header1";
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
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-400 mb-2">
        {label}
      </p>
      <div className="text-[13px] sm:text-[18px] overflow-x-auto dark:[&_.katex]:text-white dark:[&_.katex-html]:text-white">
        <BlockMath>{formula}</BlockMath>
      </div>
    </div>
  );
}

function ArrowItem({ label }: ArrowItemProps) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-[#008409] font-bold mt-0.5">{"→"}</span>
      <span>{label}</span>
    </li>
  );
}

function Step({ number, title, children }: StepProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#008409] text-white flex items-center justify-center font-bold text-[16px]">
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

export default function ConcurrentForces3D() {
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
          Resultant of Concurrent Forces in 3D
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-center">
          Procedure to Solve for the Resultant Force (3D)
        </p>

        {/* Intro Card */}
        <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow p-6 mb-8 border-l-4 border-[#008409] relative z-10 text-gray-900 dark:text-gray-200">
          <p className="mb-3">
            A{" "}
            <span className="font-semibold text-[#008409]">resultant force</span>{" "}
            is a single force that produces the same external effect as a system
            of forces acting simultaneously on a particle.
          </p>
          <p>
            In{" "}
            <span className="font-semibold text-[#008409]">
              three-dimensional problems
            </span>
            , forces are commonly directed along lines in space and must be
            expressed using{" "}
            <span className="font-semibold text-[#008409]">vector notation</span>{" "}
            before they can be combined.
          </p>
        </div>

        {/* Steps */}
        <div className="w-full max-w-xl">

          <Step number={1} title="Express Points in Cartesian Form">
            <p>
              Identify and write the coordinates of all relevant points in the{" "}
              <span className="font-semibold text-[#008409]">
                Cartesian coordinate system
              </span>
              .
            </p>
            <FormulaBlock
              label="Point Coordinates"
              formula="A(x_1,\, y_1,\, z_1), \quad B(x_2,\, y_2,\, z_2)"
            />
          </Step>

          <Step number={2} title="Determine the Position Vector">
            <p>
              Form the{" "}
              <span className="font-semibold text-[#008409]">position vector</span>{" "}
              from point A to point B by subtracting their coordinates.
            </p>
            <FormulaBlock
              label="Position Vector"
              formula="\vec{r}_{AB} = (x_2 - x_1)\,\hat{i} + (y_2 - y_1)\,\hat{j} + (z_2 - z_1)\,\hat{k}"
            />
            <p className="text-gray-500 dark:text-gray-400 text-[16px]">
              This vector defines the direction of the force.
            </p>
          </Step>

          <Step number={3} title="Compute the Magnitude of the Position Vector">
            <p>
              Determine the{" "}
              <span className="font-semibold text-[#008409]">length</span> of the
              position vector using the three-dimensional distance formula.
            </p>
            <FormulaBlock
              label="Magnitude"
              formula="|\vec{r}_{AB}| = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2 + (z_2 - z_1)^2}"
            />
          </Step>

          <Step number={4} title="Determine the Unit Vector">
            <p>
              Obtain the{" "}
              <span className="font-semibold text-[#008409]">unit vector</span> by
              dividing the position vector by its magnitude.
            </p>
            <FormulaBlock
              label="Unit Vector"
              formula="\hat{u}_{AB} = \frac{\vec{r}_{AB}}{|\vec{r}_{AB}|}"
            />
            <p className="text-gray-500 dark:text-gray-400 text-[16px]">
              The unit vector represents direction only.
            </p>
          </Step>

          <Step number={5} title="Express the Force Vector">
            <p>
              Multiply the{" "}
              <span className="font-semibold text-[#008409]">
                magnitude of the force
              </span>{" "}
              by its unit vector to obtain the force in Cartesian form.
            </p>
            <FormulaBlock label="Force Vector" formula="\vec{F} = F\,\hat{u}" />
          </Step>

          <Step number={6} title="Compute the Resultant Force and its Magnitude">
            <p>
              Add all force vectors{" "}
              <span className="font-semibold text-[#008409]">component-wise</span>{" "}
              to obtain the resultant.
            </p>
            <FormulaBlock label="Resultant Vector" formula="\vec{R} = \sum \vec{F}" />
            <p>The magnitude of the resultant is given by:</p>
            <FormulaBlock
              label="Magnitude"
              formula="R = \sqrt{R_x^2 + R_y^2 + R_z^2}"
            />
          </Step>

          <Step number={7} title="Determine the Coordinate Direction Angles">
            <p>
              Compute the angles between the resultant vector and the coordinate
              axes:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
              <FormulaBlock label="α (alpha)" formula="\cos\alpha = \frac{R_x}{R}" />
              <FormulaBlock label="β (beta)"  formula="\cos\beta = \frac{R_y}{R}" />
              <FormulaBlock label="γ (gamma)" formula="\cos\gamma = \frac{R_z}{R}" />
            </div>
          </Step>

          <Step number={8} title="Express the Final Answer">
            <p>
              Present the resultant in vector form, together with its magnitude
              and direction:
            </p>
            <ul className="list-none space-y-1 mt-1">
              {["Resultant vector", "Magnitude", "Direction angles"].map((item) => (
                <ArrowItem key={item} label={item} />
              ))}
            </ul>

            <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4 mt-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                Example
              </p>
              <div className="space-y-1 text-[13px] sm:text-[16px] overflow-x-auto dark:[&_.katex]:text-white dark:[&_.katex-html]:text-white">                <BlockMath>
                  {"\\vec{R} = 460\\,\\hat{i} - 40\\,\\hat{j} - 1080\\,\\hat{k} \\text{ N}"}
                </BlockMath>
                <BlockMath>
                  {"R = \\sqrt{460^2 + (-40)^2 + (-1080)^2} = 1174.56 \\text{ N}"}
                </BlockMath>
                <BlockMath>
                  {"\\alpha = 66.94^\\circ,\\quad \\beta = 91.95^\\circ,\\quad \\gamma = 156.85^\\circ"}
                </BlockMath>
              </div>
            </div>
          </Step>

        </div>
      </main>

      <Footer />
    </div>
  );
}