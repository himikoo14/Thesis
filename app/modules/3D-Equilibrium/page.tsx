"use client";

import Header from "<Ian>/components/Header";
import Footer from "<Ian>/components/Footer";

import { BlockMath, InlineMath } from "react-katex";
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

export default function ThreeDEquilibrium() {
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
                    3D Equilibrium Problems
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8 text-center">
                    Equilibrium of a Rigid Body in Three Dimensions
                </p>

                {/* Intro Card */}
                <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow p-6 mb-8 border-l-4 border-[#1848a0] relative z-10 text-gray-900 dark:text-gray-200">
                    <p className="mb-2">
                        A body is said to be in{" "}
                        <span className="font-semibold text-[#1848a0]">equilibrium</span> when
                        the resultant of all external forces and the resultant moment acting on
                        it are zero.
                    </p>
                    <p className="mb-3">
                        For a{" "}
                        <span className="font-semibold text-[#1848a0]">
                            Three-Dimensional System
                        </span>
                        , six equilibrium equations must be satisfied:
                    </p>
                    <div className="flex flex-col gap-3">
                        <FormulaBlock
                            label="Force Equations"
                            formula="\sum F_x = 0,\quad \sum F_y = 0,\quad \sum F_z = 0"
                        />
                        <FormulaBlock
                            label="Moment Equations"
                            formula="\sum M_x = 0,\quad \sum M_y = 0,\quad \sum M_z = 0"
                        />
                    </div>
                </div>

                {/* Steps */}
                <div className="w-full max-w-xl">

                    <Step number={1} title="Draw the Free Body Diagram (FBD)">
                        <p>
                            Isolate the body and show all{" "}
                            <span className="font-semibold text-[#1848a0]">
                                external forces and moments
                            </span>{" "}
                            acting in the x, y, and z directions.
                        </p>
                    </Step>

                    <Step number={2} title="Choose a Coordinate System">
                        <p>
                            Define the{" "}
                            <span className="font-semibold text-[#1848a0]">x, y, and z axes</span>.
                            Align axes conveniently along edges, cables, or symmetry when possible.
                        </p>
                    </Step>

                    <Step number={3} title="Express Forces as Vectors">
                        <p>Represent forces using unit vectors in component form:</p>
                        <FormulaBlock
                            label="Force Vector"
                            formula="\mathbf{F} = F_x\,\mathbf{i} + F_y\,\mathbf{j} + F_z\,\mathbf{k}"
                        />
                        <p>
                            For forces along a line, use a{" "}
                            <span className="font-semibold text-[#1848a0]">unit vector</span>{" "}
                            <span className="dark:[&_.katex]:text-white dark:[&_.katex-html]:text-white">
                                <InlineMath>{"\\mathbf{u}"}</InlineMath>
                            </span>:
                        </p>
                        <FormulaBlock
                            label="Force Along a Line"
                            formula="\mathbf{F} = F \cdot \mathbf{u}"
                        />
                    </Step>

                    <Step number={4} title="Compute Moments Using Cross Product">
                        <p>
                            Calculate the moment of each force about the reference point using the
                            cross product:
                        </p>
                        <FormulaBlock
                            label="Moment Formula"
                            formula="\mathbf{M} = \mathbf{r} \times \mathbf{F}"
                        />
                        <p>
                            where{" "}
                            <span className="font-semibold text-[#1848a0] dark:[&_.katex]:text-white dark:[&_.katex-html]:text-white">
                                <InlineMath>{"\\mathbf{r}"}</InlineMath>
                            </span>{" "}
                            is the position vector from the reference point to the point of force
                            application.
                        </p>
                    </Step>

                    <Step number={5} title="Apply Equilibrium Equations">
                        <p>Set the sum of all forces and moments to zero:</p>
                        <div className="grid grid-cols-2 gap-3 mt-1">
                            <FormulaBlock label="Force Equilibrium"  formula="\sum \mathbf{F} = 0" />
                            <FormulaBlock label="Moment Equilibrium" formula="\sum \mathbf{M} = 0" />
                        </div>
                        <p>Expanding into scalar equations:</p>
                        <FormulaBlock
                            label="Six Scalar Equations"
                            formula="\sum F_x = 0,\; \sum F_y = 0,\; \sum F_z = 0 \\ \sum M_x = 0,\; \sum M_y = 0,\; \sum M_z = 0"
                        />
                    </Step>

                    <Step number={6} title="Solve for Unknowns">
                        <p>
                            Solve the system of equations for all unknown{" "}
                            <span className="font-semibold text-[#1848a0]">
                                forces, reactions, or tensions
                            </span>
                            .
                        </p>
                    </Step>

                    <Step number={7} title="Check Results">
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "Verify vector directions and signs",
                                "Ensure unit consistency",
                                "Substitute back into all six equations to confirm equilibrium",
                            ].map((item) => (
                                <li key={item} className="flex items-center gap-2">
                                    <span className="text-[#1848a0] font-bold">{"→"}</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </Step>

                </div>

                {/* Key Notes Card */}
                <div className="w-full max-w-xl mt-2">
                    <div className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4">
                        <span className="text-xl">⚠️</span>
                        <div className="space-y-1">
                            <p className="font-semibold text-gray-900 dark:text-white">Key Notes (Important for Exams)</p>
                            <ul className="list-none space-y-1 mt-1 text-gray-800 dark:text-gray-200">
                                {[
                                    "Six independent equations are available in 3D equilibrium",
                                    "If unknowns exceed six, the system is statically indeterminate",
                                    "Always use a clear 3D Free Body Diagram (FBD)",
                                    "Use position vectors and cross product for moments",
                                ].map((note) => (
                                    <li key={note} className="flex items-start gap-2">
                                        <span className="text-yellow-600 font-bold mt-0.5">{"→"}</span>
                                        {note}
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