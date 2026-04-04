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

export default function MethodOfJoints() {
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
                    Truss: Method of Joints
                </h1>
                <p className="text-gray-500 mb-8 text-center">
                    Truss Analysis using the Method of Joints
                </p>

                {/* Intro Card */}
                <div className="w-full max-w-xl bg-white rounded-2xl shadow p-6 mb-8 border-l-4 border-[#1848a0] relative z-10">
                    <p className="mb-3">
                        The{" "}
                        <span className="font-semibold text-[#1848a0]">
                            Method of Joints
                        </span>{" "}
                        is used to determine the forces in each member of a truss by
                        applying equilibrium equations at each joint.
                    </p>
                    <p className="mb-3">
                        Each joint is treated as a{" "}
                        <span className="font-semibold text-[#1848a0]">
                            concurrent force system
                        </span>
                        , where only two equilibrium equations apply:
                    </p>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                        ΣFx = 0 &nbsp;&nbsp; ΣFy = 0
                    </div>
                </div>

                {/* Steps */}
                <div className="w-full max-w-xl">

                    {/* Step 1 */}
                    <Step number={1} title="Determine Support Reactions">
                        <p>
                            Analyze the entire truss as a{" "}
                            <span className="font-semibold text-[#1848a0]">
                                single rigid body
                            </span>{" "}
                            and determine all support reactions using the equilibrium
                            equations:
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                            ΣFx = 0 &nbsp;&nbsp; ΣFy = 0 &nbsp;&nbsp; ΣM = 0
                        </div>
                        {/* Warning note */}
                        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-2">
                            <span className="text-xl">⚠️</span>
                            <p>
                                Always compute support reactions <strong>first</strong> before
                                analyzing individual joints.
                            </p>
                        </div>
                    </Step>

                    {/* Step 2 */}
                    <Step number={2} title="Select a Suitable Joint">
                        <p>
                            Select a joint where there are at most{" "}
                            <span className="font-semibold text-[#1848a0]">
                                two unknown member forces
                            </span>
                            .
                        </p>
                        <p>
                            This allows the joint to be solved directly using only two
                            equilibrium equations.
                        </p>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "Start at a support joint where reactions are already known",
                                "Never start at a joint with more than two unknowns",
                                "Work systematically from joint to joint",
                            ].map((item) => (
                                <ArrowItem key={item} label={item} />
                            ))}
                        </ul>
                    </Step>

                    {/* Step 3 */}
                    <Step number={3} title="Draw the Free Body Diagram (FBD) of the Joint">
                        <p>
                            Isolate the selected joint and draw its{" "}
                            <span className="font-semibold text-[#1848a0]">
                                Free Body Diagram (FBD)
                            </span>
                            .
                        </p>
                        <p>
                            Include all member forces connected to the joint and any external
                            loads or support reactions acting on it.
                        </p>
                        {/* Warning note */}
                        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-2">
                            <span className="text-xl">⚠️</span>
                            <p>
                                Assume all member forces are in{" "}
                                <strong>tension</strong> — drawn pulling away from the joint.
                                A negative result later indicates compression.
                            </p>
                        </div>
                    </Step>

                    {/* Step 4 */}
                    <Step number={4} title="Resolve Forces into Components">
                        <p>
                            Resolve all inclined member forces into{" "}
                            <span className="font-semibold text-[#1848a0]">
                                horizontal and vertical components
                            </span>
                            :
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                            Fx = F cos θ &nbsp;&nbsp;&nbsp; Fy = F sin θ
                        </div>
                        <p>
                            This makes it possible to apply the equilibrium equations in the
                            x- and y-directions.
                        </p>
                    </Step>

                    {/* Step 5 */}
                    <Step number={5} title="Apply Equilibrium Equations at the Joint">
                        <p>
                            Apply the equilibrium equations at the joint and solve for the{" "}
                            <span className="font-semibold text-[#1848a0]">
                                unknown member forces
                            </span>
                            :
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                            ΣFx = 0 &nbsp;&nbsp; ΣFy = 0
                        </div>
                    </Step>

                    {/* Step 6 */}
                    <Step number={6} title="Move to the Next Joint">
                        <p>
                            Move to an{" "}
                            <span className="font-semibold text-[#1848a0]">
                                adjacent joint
                            </span>{" "}
                            where the number of unknowns has been reduced.
                        </p>
                        <p>
                            Use previously solved member forces to continue the analysis.
                        </p>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "Carry solved member forces into the next joint",
                                "Choose the next joint with at most two new unknowns",
                                "Repeat until all member forces are determined",
                            ].map((item) => (
                                <ArrowItem key={item} label={item} />
                            ))}
                        </ul>
                    </Step>

                    {/* Step 7 */}
                    <Step number={7} title="Identify Member Nature">
                        <p>
                            Interpret the sign of each solved member force:
                        </p>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "Positive result → Tension (member is being pulled)",
                                "Negative result → Compression (member is being pushed)",
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
                        <div className="ml-12 bg-white border border-gray-200 rounded-2xl shadow p-5 text-[18px] space-y-3 relative z-10">
                            <ul className="list-none space-y-2">
                                {[
                                    "Assume all member forces are in tension (pulling away from the joint)",
                                    "A negative answer indicates the member is in compression",
                                    "Start analysis at a joint with at most two unknowns",
                                    "Only ΣFx = 0 and ΣFy = 0 are used per joint",
                                ].map((note) => (
                                    <ArrowItem key={note} label={note} />
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Common Mistakes Card */}
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-[16px]">
                                ✕
                            </div>
                            <h2 className="text-[20px] font-semibold">Common Mistakes</h2>
                        </div>
                        <div className="ml-12 bg-white border border-gray-200 rounded-2xl shadow p-5 text-[18px] space-y-3 relative z-10">
                            <ul className="list-none space-y-2">
                                {[
                                    "Starting at a joint with more than two unknowns",
                                    "Forgetting to compute support reactions first",
                                    "Incorrect assumption of force direction (not assuming tension)",
                                    "Sign errors in ΣFx and ΣFy",
                                    "Forgetting to resolve inclined forces into components",
                                    "Not using previously solved member forces in the next joint",
                                ].map((mistake) => (
                                    <li key={mistake} className="flex items-center gap-2">
                                        <span className="text-red-500 font-bold">{"→"}</span>
                                        {mistake}
                                    </li>
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