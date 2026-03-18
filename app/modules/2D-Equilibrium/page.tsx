"use client";

import Header from "<Ian>/components/Header";
import Footer from "<Ian>/components/Footer";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StepProps {
    number: number;
    title: string;
    children: React.ReactNode;
}

interface ArrowItemProps {
    label: string;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

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

export default function Equilibrium2D() {
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
                    2D Equilibrium Problems
                </h1>
                <p className="text-gray-500 mb-8 text-center">
                    Procedure for Solving 2D Equilibrium Problems
                </p>

                {/* Intro Card */}
                <div className="w-full max-w-xl bg-white rounded-2xl shadow p-6 mb-8 border-l-4 border-[#1848a0]">
                    <p className="mb-3">
                        A body is said to be in{" "}
                        <span className="font-semibold text-[#1848a0]">
                            equilibrium
                        </span>{" "}
                        when the resultant of all external forces and the resultant moment
                        acting on it are zero.
                    </p>
                    <p className="mb-3">
                        For a{" "}
                        <span className="font-semibold text-[#1848a0]">
                            Two-Dimensional System
                        </span>
                        , three equations must be satisfied:
                    </p>
                    <p>
                        These equations represent the conditions required to maintain{" "}
                        <span className="font-semibold text-[#1848a0]">
                            translational and rotational equilibrium
                        </span>
                        .
                    </p>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic mt-3">
                        ΣFx = 0 &nbsp;&nbsp; ΣFy = 0 &nbsp;&nbsp; ΣM = 0
                    </div>
                </div>

                {/* Steps */}
                <div className="w-full max-w-xl">

                    {/* Step 1 */}
                    <Step number={1} title="Draw the Free Body Diagram (FBD)">
                        <p>
                            Isolate the body from its surroundings and represent all{" "}
                            <span className="font-semibold text-[#1848a0]">
                                external forces and moments
                            </span>{" "}
                            acting on it, including support reactions.
                        </p>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "Sketch the body completely detached from supports",
                                "Show all applied loads and reaction forces",
                                "Include moments where applicable",
                            ].map((item) => (
                                <ArrowItem key={item} label={item} />
                            ))}
                        </ul>
                        {/* Warning note */}
                        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-2">
                            <span className="text-xl">⚠️</span>
                            <p>
                                A clear and complete Free Body Diagram is{" "}
                                <strong>essential</strong> before applying any equilibrium
                                equations.
                            </p>
                        </div>
                    </Step>

                    {/* Step 2 */}
                    <Step number={2} title="Choose Coordinate System">
                        <p>
                            Define the{" "}
                            <span className="font-semibold text-[#1848a0]">x- and y-axes</span>.
                            Align the coordinate system conveniently to simplify analysis.
                        </p>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "Align axes with the direction of most forces when possible",
                                "Use tilted axes for inclined surface problems",
                                "Be consistent with sign convention throughout",
                            ].map((item) => (
                                <ArrowItem key={item} label={item} />
                            ))}
                        </ul>
                    </Step>

                    {/* Step 3 */}
                    <Step number={3} title="Resolve Forces into Components">
                        <p>
                            For each inclined force, decompose it into its{" "}
                            <span className="font-semibold text-[#1848a0]">
                                x- and y-components
                            </span>
                            :
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                            Fx = F cos θ &nbsp;&nbsp;&nbsp; Fy = F sin θ
                        </div>
                        <p>
                            Apply the appropriate{" "}
                            <span className="font-semibold text-[#1848a0]">
                                sign convention
                            </span>{" "}
                            based on the chosen coordinate system.
                        </p>
                    </Step>

                    {/* Step 4 */}
                    <Step number={4} title="Apply Equilibrium Equations">
                        <p>
                            Write out and apply all three equilibrium equations:
                        </p>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "ΣFx = 0  (sum of horizontal forces)",
                                "ΣFy = 0  (sum of vertical forces)",
                                "ΣM = 0   (sum of moments about a point)",
                            ].map((item) => (
                                <ArrowItem key={item} label={item} />
                            ))}
                        </ul>
                        <p>
                            Take moments about a{" "}
                            <span className="font-semibold text-[#1848a0]">
                                convenient point
                            </span>
                            , preferably where unknown forces act, to reduce the number of
                            unknowns in the equation.
                        </p>
                        {/* Warning note */}
                        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-2">
                            <span className="text-xl">⚠️</span>
                            <p>
                                Only <strong>three independent equations</strong> are available
                                in 2D equilibrium. If the number of unknowns exceeds three, the
                                system is <strong>statically indeterminate</strong>.
                            </p>
                        </div>
                    </Step>

                    {/* Step 5 */}
                    <Step number={5} title="Solve for Unknowns">
                        <p>
                            Determine all unknown{" "}
                            <span className="font-semibold text-[#1848a0]">
                                reaction forces
                            </span>{" "}
                            and other required quantities using the equilibrium equations.
                        </p>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "Solve simultaneous equations if needed",
                                "Use substitution or elimination methods",
                                "A negative result means the force acts opposite to assumed direction",
                            ].map((item) => (
                                <ArrowItem key={item} label={item} />
                            ))}
                        </ul>
                    </Step>

                    {/* Step 6 */}
                    <Step number={6} title="Check Results">
                        <p>Verify the results by checking that:</p>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "All units are consistent",
                                "The signs of the computed values are physically meaningful",
                                "The equilibrium equations are satisfied when substituted",
                            ].map((item) => (
                                <ArrowItem key={item} label={item} />
                            ))}
                        </ul>
                    </Step>

                    {/* Key Notes Card */}
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-yellow-400 text-white flex items-center justify-center font-bold text-[16px]">
                                📝
                            </div>
                            <h2 className="text-[20px] font-semibold">Key Notes (Important for Exams)</h2>
                        </div>
                        <div className="ml-12 bg-white border border-gray-200 rounded-2xl shadow p-5 text-[18px] space-y-3">
                            <ul className="list-none space-y-2">
                                {[
                                    "Only three independent equations are available in 2D equilibrium",
                                    "If the number of unknowns exceeds three, the system is statically indeterminate",
                                    "A clear and complete Free Body Diagram (FBD) is essential",
                                    "Selecting an appropriate moment point simplifies calculations",
                                ].map((note) => (
                                    <ArrowItem key={note} label={note} />
                                ))}
                            </ul>
                        </div>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
}