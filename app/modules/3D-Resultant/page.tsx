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

export default function Resultant3D() {
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
                    Resultant of a 3D Force System
                </h1>
                <p className="text-gray-500 mb-8 text-center">
                    Procedure for Solving the Resultant of a Three-Dimensional Force System
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
                            Represent the body and show all{" "}
                            <span className="font-semibold text-[#1848a0]">
                                forces
                            </span>{" "}
                            acting on it with their magnitudes and directions.
                        </p>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "Draw each force as a vector with correct orientation",
                                "Label all known magnitudes and angles",
                                "Include all three axes: x, y, and z",
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
                                x, y, and z components
                            </span>{" "}
                            using unit vector notation:
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                            F = Fx i + Fy j + Fz k
                        </div>
                        <p>
                            Assign positive or negative signs based on the chosen coordinate
                            system.
                        </p>
                    </Step>

                    {/* Step 3 */}
                    <Step number={3} title="Sum the Force Components">
                        <p>
                            Add all force components along{" "}
                            <span className="font-semibold text-[#1848a0]">
                                each axis
                            </span>{" "}
                            separately:
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic space-y-1">
                            <p>ΣFx = sum of all x-components</p>
                            <p>ΣFy = sum of all y-components</p>
                            <p>ΣFz = sum of all z-components</p>
                        </div>
                    </Step>

                    {/* Step 4 */}
                    <Step number={4} title="Express the Resultant Vector">
                        <p>
                            Combine the summed components into a single{" "}
                            <span className="font-semibold text-[#1848a0]">
                                resultant vector
                            </span>
                            :
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                            R = (ΣFx) i + (ΣFy) j + (ΣFz) k
                        </div>
                    </Step>

                    {/* Step 5 */}
                    <Step number={5} title="Compute the Magnitude of the Resultant">
                        <p>
                            Calculate the{" "}
                            <span className="font-semibold text-[#1848a0]">
                                magnitude
                            </span>{" "}
                            of the resultant force using:
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                            R = √[ (ΣFx)² + (ΣFy)² + (ΣFz)² ]
                        </div>
                    </Step>

                    {/* Step 6 */}
                    <Step number={6} title="Determine the Direction Angles">
                        <p>
                            Find the{" "}
                            <span className="font-semibold text-[#1848a0]">
                                direction angles
                            </span>{" "}
                            between the resultant and each coordinate axis:
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic space-y-1">
                            <p>α = cos⁻¹ (ΣFx / R)</p>
                            <p>β = cos⁻¹ (ΣFy / R)</p>
                            <p>γ = cos⁻¹ (ΣFz / R)</p>
                        </div>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "α is the angle with the x-axis",
                                "β is the angle with the y-axis",
                                "γ is the angle with the z-axis",
                            ].map((item) => (
                                <ArrowItem key={item} label={item} />
                            ))}
                        </ul>
                    </Step>

                    {/* Step 7 */}
                    <Step number={7} title="Express the Resultant Force">
                        <p>
                            Write the final answer including the{" "}
                            <span className="font-semibold text-[#1848a0]">
                                magnitude
                            </span>{" "}
                            and{" "}
                            <span className="font-semibold text-[#1848a0]">
                                direction angles
                            </span>
                            :
                        </p>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "Magnitude of the resultant force",
                                "Direction angles α, β, and γ",
                            ].map((item) => (
                                <ArrowItem key={item} label={item} />
                            ))}
                        </ul>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic space-y-1">
                            <p className="font-semibold not-italic text-gray-700">Example format:</p>
                            <p>R = 850 N</p>
                            <p>α = 40°, β = 65°, γ = 55°</p>
                        </div>
                    </Step>

                </div>
            </main>

            <Footer />
        </div>
    );
}