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
    label: string;
}

function FormulaBlock({ label, formula }: FormulaBlockProps) {
    return (
        <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4 my-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                {label}
            </p>
            <div className="text-[10px] sm:text-[13px] md:text-[18px] dark:[&_.katex]:text-white dark:[&_.katex-html]:text-white">
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
                <h2 className="text-[20px] font-semibold text-gray-900 dark:text-white">{title}</h2>
            </div>
            <div className="ml-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow p-5 text-[14px] sm:text-[18px] space-y-3 relative z-10 text-gray-900 dark:text-gray-200">
                {children}
            </div>
        </div>
    );
}

export default function Resultant2D() {
    return (
        <div className="relative flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-[14px] sm:text-[18px]">
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
                    Resultant of Coplanar Forces
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8 text-center">
                    Procedure for Solving the Resultant of a Two-Dimensional Force System
                </p>

                {/* Intro Card */}
                <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow p-6 mb-8 border-l-4 border-[#1848a0] relative z-10 text-gray-900 dark:text-gray-200">
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

                    <Step number={2} title="Resolve Each Force into Components">
                        <p>
                            Break every force into{" "}
                            <span className="font-semibold text-[#1848a0]">
                                x and y components
                            </span>
                            . For a force F at angle θ:
                        </p>
                        <FormulaBlock
                            label="Components"
                            formula="F_x = F\cos\theta \qquad F_y = F\sin\theta"
                        />
                        <p>
                            Assign positive or negative signs based on the chosen coordinate
                            system.
                        </p>
                    </Step>

                    <Step number={3} title="Sum the Force Components">
                        <p>
                            Add all{" "}
                            <span className="font-semibold text-[#1848a0]">
                                horizontal and vertical components
                            </span>{" "}
                            separately:
                        </p>
                        <FormulaBlock
                            label="Summation"
                            formula="\Sigma F_x = \sum F\cos\theta \qquad \Sigma F_y = \sum F\sin\theta"
                        />
                    </Step>

                    <Step number={4} title="Compute the Magnitude of the Resultant">
                        <p>
                            Use the{" "}
                            <span className="font-semibold text-[#1848a0]">
                                Pythagorean theorem
                            </span>{" "}
                            to find the magnitude:
                        </p>
                        <FormulaBlock
                            label="Magnitude"
                            formula="R = \sqrt{(\Sigma F_x)^2 + (\Sigma F_y)^2}"
                        />
                    </Step>

                    <Step number={5} title="Determine the Direction of the Resultant">
                        <p>
                            Find the{" "}
                            <span className="font-semibold text-[#1848a0]">
                                angle of the resultant
                            </span>{" "}
                            measured from the positive x-axis:
                        </p>
                        <FormulaBlock
                            label="Direction"
                            formula="\theta_R = \tan^{-1}\!\left(\frac{\Sigma F_y}{\Sigma F_x}\right)"
                        />
                        <div className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4 mt-2">
                            <span className="text-xl">⚠️</span>
                            <p className="text-gray-800 dark:text-gray-200">
                                Always adjust the angle depending on the{" "}
                                <strong>quadrant</strong> of the resultant vector. Use the
                                signs of ΣFx and ΣFy to determine the correct quadrant.
                            </p>
                        </div>
                    </Step>

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
                        <FormulaBlock
                            label="Example"
                            formula="R = 500\,\text{N} \quad \theta = 35°"
                        />
                    </Step>

                </div>
            </main>

            <Footer />
        </div>
    );
}