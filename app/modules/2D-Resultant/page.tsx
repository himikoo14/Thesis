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
            <div className="ml-12 bg-white border border-gray-200 rounded-2xl shadow p-5 text-[18px] space-y-3 relative z-10">
                {children}
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Resultant2D() {
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
                    Resultant of Coplanar Forces
                </h1>
                <p className="text-gray-500 mb-8 text-center">
                    Procedure for Solving the Resultant of a Two-Dimensional Force System
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
                            Two-Dimensional Force System
                        </span>
                        , the resultant is obtained by resolving each force into its{" "}
                        <span className="font-semibold text-[#1848a0]">
                            horizontal and vertical components
                        </span>{" "}
                        and summing them.
                    </p>
                </div>

                {/* Steps */}
                <div className="w-full max-w-xl">

                    {/* Step 1 */}
                    <Step number={1} title="Draw the Free Body Diagram (FBD)">
                        <p>
                            Represent the body and show all{" "}
                            <span className="font-semibold text-[#1848a0]">forces</span>{" "}
                            acting on it with their magnitudes and directions.
                        </p>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "Draw each force as a vector with correct orientation",
                                "Label all known magnitudes and angles",
                                "Define the positive x- and y-axes clearly",
                            ].map((item) => (
                                <ArrowItem key={item} label={item} />
                            ))}
                        </ul>
                    </Step>

                    {/* Step 2 */}
                    <Step number={2} title="Resolve Each Force into Components">
                        <p>
                            Break every force into{" "}
                            <span className="font-semibold text-[#1848a0]">
                                x and y components
                            </span>
                            . For a force F at angle θ:
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic space-y-1">
                            <p>Fx = F cos θ</p>
                            <p>Fy = F sin θ</p>
                        </div>
                        <p>
                            Assign positive or negative signs based on the chosen coordinate
                            system.
                        </p>
                    </Step>

                    {/* Step 3 */}
                    <Step number={3} title="Sum the Force Components">
                        <p>
                            Add all{" "}
                            <span className="font-semibold text-[#1848a0]">
                                horizontal and vertical components
                            </span>{" "}
                            separately:
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic space-y-1">
                            <p>ΣFx = sum of all x-components</p>
                            <p>ΣFy = sum of all y-components</p>
                        </div>
                    </Step>

                    {/* Step 4 */}
                    <Step number={4} title="Compute the Magnitude of the Resultant">
                        <p>
                            Use the{" "}
                            <span className="font-semibold text-[#1848a0]">
                                Pythagorean theorem
                            </span>{" "}
                            to find the magnitude:
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                            R = √[ (ΣFx)² + (ΣFy)² ]
                        </div>
                    </Step>

                    {/* Step 5 */}
                    <Step number={5} title="Determine the Direction of the Resultant">
                        <p>
                            Find the{" "}
                            <span className="font-semibold text-[#1848a0]">
                                angle of the resultant
                            </span>{" "}
                            measured from the positive x-axis:
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                            θR = tan⁻¹ (ΣFy / ΣFx)
                        </div>
                        {/* Warning note */}
                        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-2">
                            <span className="text-xl">⚠️</span>
                            <p>
                                Always adjust the angle depending on the{" "}
                                <strong>quadrant</strong> of the resultant vector. Use the
                                signs of ΣFx and ΣFy to determine the correct quadrant.
                            </p>
                        </div>
                    </Step>

                    {/* Step 6 */}
                    <Step number={6} title="Express the Resultant Force">
                        <p>
                            Write the final answer including the{" "}
                            <span className="font-semibold text-[#1848a0]">magnitude</span>{" "}
                            and{" "}
                            <span className="font-semibold text-[#1848a0]">
                                direction angle
                            </span>
                            :
                        </p>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "Magnitude of the resultant force",
                                "Direction angle measured from the positive x-axis",
                            ].map((item) => (
                                <ArrowItem key={item} label={item} />
                            ))}
                        </ul>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic space-y-1">
                            <p className="font-semibold not-italic text-gray-700">Example format:</p>
                            <p>R = 500 N at 35°</p>
                        </div>
                    </Step>

                </div>
            </main>

            <Footer />
        </div>
    );
}