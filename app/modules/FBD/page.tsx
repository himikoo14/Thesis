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

export default function FBD() {
    return (
        <div className="relative flex flex-col min-h-screen bg-gray-50 text-gray-900 text-[18px]">
            {/* Background grid */}
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
                <h1 className="text-[32px] font-bold mb-2 text-center">
                    Free Body Diagram of a Particle
                </h1>
                <p className="text-gray-500 mb-8 text-center">
                    Procedure for Creating a Free Body Diagram
                </p>

                {/* Intro Card */}
                <div className="w-full max-w-xl bg-white rounded-2xl shadow p-6 mb-8 border-l-4 border-[#1848a0] relative z-10">
                    <p className="mb-3">
                        A{" "}
                        <span className="font-semibold text-[#1848a0]">
                            Free Body Diagram (FBD)
                        </span>{" "}
                        is a sketch of a body isolated from its surroundings showing all
                        external forces and moments acting on it.
                    </p>
                    <p className="mb-3">
                        The{" "}
                        <span className="font-semibold text-[#1848a0]">Particle</span> is
                        represented by a single point, and all forces acting on it are drawn
                        as vectors originating from that point.
                    </p>
                    <p>
                        It is commonly used in problems involving{" "}
                        <span className="font-semibold text-[#1848a0]">
                            concurrent force systems
                        </span>
                        , cables, and particles in equilibrium.
                    </p>
                </div>

                {/* Steps */}
                <div className="w-full max-w-xl">

                    {/* Step 1 */}
                    <Step number={1} title="Represent the Particle and Establish Reference Axes">
                        <p>
                            Draw a{" "}
                            <span className="font-semibold text-[#1848a0]">single point</span>{" "}
                            to represent the particle and define the{" "}
                            <span className="font-semibold text-[#1848a0]">x- and y-axes</span>.
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                            Example: A force of 450 lb acts on the frame. Construct the free
                            body diagram.
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-1">
                            <div className="flex flex-col items-center gap-2">
                                <img
                                    src="/FBD/figure/image1.png"
                                    alt="Figure 1"
                                    className="w-full h-64 rounded-xl border border-gray-200 object-contain"
                                />
                                <span className="text-[13px] text-gray-400 uppercase tracking-widest font-semibold">Figure 1</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <img
                                    src="/FBD/figure/image2.png"
                                    alt="Figure 2"
                                    className="w-full h-64 rounded-xl border border-gray-200 object-contain"
                                />
                                <span className="text-[13px] text-gray-400 uppercase tracking-widest font-semibold">Figure 2</span>
                            </div>
                        </div>
                    </Step>

                    {/* Step 2 */}
                    <Step number={2} title="Draw the Force Vectors">
                        <p>
                            Represent each force acting on the particle with an{" "}
                            <span className="font-semibold text-[#1848a0]">
                                arrow originating from the point
                            </span>
                            .
                        </p>
                        <div className="flex flex-col items-center gap-2 mt-1">
                            <img
                                src="/FBD/figure/image3.png"
                                alt="Figure 3"
                                    className="w-full h-64 rounded-xl border border-gray-200 object-contain"
                            />
                            <span className="text-[13px] text-gray-400 uppercase tracking-widest font-semibold">Figure 3</span>
                        </div>
                    </Step>

                    {/* Step 3 */}
                    <Step number={3} title="Identify All Forces Acting on the Point">
                        <p>
                            Determine every force applied to the particle, such as:
                        </p>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "Tension in cables",
                                "Applied forces",
                                "Weight",
                                "Reaction forces",
                            ].map((force) => (
                                <ArrowItem key={force} label={force} />
                            ))}
                        </ul>
                    </Step>

                    {/* Step 4 */}
                    <Step number={4} title="Label Forces and Angles">
                        <p>Clearly label:</p>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "Force magnitudes",
                                "Unknown forces",
                                "Angles of inclined forces",
                            ].map((item) => (
                                <ArrowItem key={item} label={item} />
                            ))}
                        </ul>

                        <div className="flex flex-col items-center gap-2 mt-1">
                            <img
                                src="/FBD/figure/image4.png"
                                alt="Figure 4"
                                    className="w-full h-64 rounded-xl border border-gray-200 object-contain"
                            />
                            <span className="text-[13px] text-gray-400 uppercase tracking-widest font-semibold">Figure 4</span>
                        </div>

                        {/* Warning note */}
                        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-2">
                            <span className="text-xl">⚠️</span>
                            <p>
                                Always include <strong>all</strong> forces acting on the
                                particle. Omitting even one will result in an incorrect FBD and
                                erroneous equilibrium analysis.
                            </p>
                        </div>
                    </Step>

                </div>
            </main>

            <Footer />
        </div>
    );
}