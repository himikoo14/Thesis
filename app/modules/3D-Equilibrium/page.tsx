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

export default function Equilibrium3D() {
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
                    3D Equilibrium Problems
                </h1>
                <p className="text-gray-500 mb-8 text-center">
                    Procedure for Solving 3D Equilibrium Problems
                </p>

                {/* Intro Card */}
                <div className="w-full max-w-xl bg-white rounded-2xl shadow p-6 mb-8 border-l-4 border-[#1848a0]">
                    <p className="mb-3">
                        A body is said to be in{" "}
                        <span className="font-semibold text-[#1848a0]">equilibrium</span>{" "}
                        when the resultant of all external forces and the resultant moment
                        acting on it are zero.
                    </p>
                    <p className="mb-3">
                        For a{" "}
                        <span className="font-semibold text-[#1848a0]">
                            Three-Dimensional System
                        </span>
                        , six equations must all be satisfied:
                    </p>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                        <p>ΣFx = 0 &nbsp;&nbsp; ΣFy = 0 &nbsp;&nbsp; ΣFz = 0</p>
                        <p className="mt-1">ΣMx = 0 &nbsp;&nbsp; ΣMy = 0 &nbsp;&nbsp; ΣMz = 0</p>
                    </div>
                </div>

                {/* Steps */}
                <div className="w-full max-w-xl">

                    {/* Step 1 */}
                    <Step number={1} title="Draw the Free Body Diagram (FBD)">
                        <p>
                            Isolate the body and show all{" "}
                            <span className="font-semibold text-[#1848a0]">
                                external forces and moments
                            </span>{" "}
                            acting in the x, y, and z directions.
                        </p>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "Sketch the body completely detached from supports",
                                "Show all applied loads and reaction forces in 3D",
                                "Include moments along all three axes where applicable",
                            ].map((item) => (
                                <ArrowItem key={item} label={item} />
                            ))}
                        </ul>
                        {/* Warning note */}
                        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-2">
                            <span className="text-xl">⚠️</span>
                            <p>
                                Always use a clear{" "}
                                <strong>3D Free Body Diagram</strong> before applying any
                                equilibrium equations.
                            </p>
                        </div>
                    </Step>

                    {/* Step 2 */}
                    <Step number={2} title="Choose Coordinate System">
                        <p>
                            Define the{" "}
                            <span className="font-semibold text-[#1848a0]">
                                x, y, and z axes
                            </span>
                            . Align axes conveniently along edges, cables, or symmetry when
                            possible.
                        </p>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "Use a right-hand coordinate system",
                                "Align axes to simplify force components",
                                "Be consistent with sign convention throughout",
                            ].map((item) => (
                                <ArrowItem key={item} label={item} />
                            ))}
                        </ul>
                    </Step>

                    {/* Step 3 */}
                    <Step number={3} title="Express Forces as Vectors">
                        <p>
                            Represent forces using{" "}
                            <span className="font-semibold text-[#1848a0]">
                                unit vectors
                            </span>
                            :
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                            F = Fxi + Fyj + Fzk
                        </div>
                        <p>
                            For forces along a line, use{" "}
                            <span className="font-semibold text-[#1848a0]">
                                direction vectors
                            </span>
                            :
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                            F = F · u &nbsp;&nbsp; (where u is the unit vector)
                        </div>
                    </Step>

                    {/* Step 4 */}
                    <Step number={4} title="Compute Moments Using Cross Product">
                        <p>
                            Calculate moments using the{" "}
                            <span className="font-semibold text-[#1848a0]">
                                cross product
                            </span>
                            :
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                            M = r × F
                        </div>
                        <p>
                            where{" "}
                            <span className="font-semibold text-[#1848a0]">r</span> is the
                            position vector from the reference point to the point of force
                            application.
                        </p>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "Choose a convenient reference point to simplify calculations",
                                "Use the determinant method to evaluate the cross product",
                                "Check the direction using the right-hand rule",
                            ].map((item) => (
                                <ArrowItem key={item} label={item} />
                            ))}
                        </ul>
                    </Step>

                    {/* Step 5 */}
                    <Step number={5} title="Apply Equilibrium Equations">
                        <p>
                            Write out and apply all six equilibrium equations:
                        </p>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "ΣFx = 0  (sum of forces in x-direction)",
                                "ΣFy = 0  (sum of forces in y-direction)",
                                "ΣFz = 0  (sum of forces in z-direction)",
                                "ΣMx = 0  (sum of moments about x-axis)",
                                "ΣMy = 0  (sum of moments about y-axis)",
                                "ΣMz = 0  (sum of moments about z-axis)",
                            ].map((item) => (
                                <ArrowItem key={item} label={item} />
                            ))}
                        </ul>
                        {/* Warning note */}
                        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-2">
                            <span className="text-xl">⚠️</span>
                            <p>
                                Only <strong>six independent equations</strong> are available in
                                3D equilibrium. If the number of unknowns exceeds six, the system
                                is <strong>statically indeterminate</strong>.
                            </p>
                        </div>
                    </Step>

                    {/* Step 6 */}
                    <Step number={6} title="Solve for Unknowns">
                        <p>
                            Solve the system of equations for all unknown{" "}
                            <span className="font-semibold text-[#1848a0]">
                                forces, reactions, or tensions
                            </span>
                            .
                        </p>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "Solve simultaneous equations if needed",
                                "Use substitution or matrix methods",
                                "A negative result means the force acts opposite to assumed direction",
                            ].map((item) => (
                                <ArrowItem key={item} label={item} />
                            ))}
                        </ul>
                    </Step>

                    {/* Step 7 */}
                    <Step number={7} title="Check Results">
                        <p>Verify the results by checking that:</p>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "Vector directions and signs are correct",
                                "All units are consistent",
                                "Substitute back into all six equations to confirm equilibrium",
                            ].map((item) => (
                                <ArrowItem key={item} label={item} />
                            ))}
                        </ul>
                    </Step>

                    {/* Key Notes Card */}
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#1848a0] text-white flex items-center justify-center font-bold text-[16px]">
                                📝
                            </div>
                            <h2 className="text-[20px] font-semibold">Key Notes (Important for Exams)</h2>
                        </div>
                        <div className="ml-12 bg-white border border-gray-200 rounded-2xl shadow p-5 text-[18px] space-y-3">
                            <ul className="list-none space-y-2">
                                {[
                                    "Six independent equations are available in 3D equilibrium",
                                    "If unknowns exceed six, the system is statically indeterminate",
                                    "Always use a clear 3D Free Body Diagram (FBD)",
                                    "Use position vectors and cross product for moments",
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