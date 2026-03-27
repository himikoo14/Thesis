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
                    Resultant of Concurrent Forces in 3D
                </h1>
                <p className="text-gray-500 mb-8 text-center">
                    Procedure for Solving the Resultant Force in 3D
                </p>

                {/* Intro Card */}
                <div className="w-full max-w-xl bg-white rounded-2xl shadow p-6 mb-8 border-l-4 border-[#1848a0]">
                    <p className="mb-3">
                        A{" "}
                        <span className="font-semibold text-[#1848a0]">resultant force</span>{" "}
                        is a single force that produces the same external effect as a system
                        of forces acting simultaneously on a particle.
                    </p>
                    <p className="mb-3">
                        In{" "}
                        <span className="font-semibold text-[#1848a0]">
                            three-dimensional problems
                        </span>
                        , forces are commonly directed along lines in space and must be
                        expressed using vector notation before they can be combined.
                    </p>
                </div>

                {/* Steps */}
                <div className="w-full max-w-xl">

                    {/* Step 1 */}
                    <Step number={1} title="Express Points in Cartesian Form">
                        <p>
                            Identify and write the coordinates of all relevant points in the{" "}
                            <span className="font-semibold text-[#1848a0]">
                                Cartesian coordinate system
                            </span>
                            .
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                            A(x₁, y₁, z₁),&nbsp;&nbsp; B(x₂, y₂, z₂)
                        </div>
                    </Step>

                    {/* Step 2 */}
                    <Step number={2} title="Determine the Position Vector">
                        <p>
                            Form the{" "}
                            <span className="font-semibold text-[#1848a0]">
                                position vector
                            </span>{" "}
                            from point A to point B by subtracting their coordinates.
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                            r&#x20D7;<sub>AB</sub> = (x₂ − x₁)i + (y₂ − y₁)j + (z₂ − z₁)k
                        </div>
                        <p className="text-gray-500 text-[15px]">
                            This vector defines the direction of the force.
                        </p>
                    </Step>

                    {/* Step 3 */}
                    <Step number={3} title="Compute the Magnitude of the Position Vector">
                        <p>
                            Determine the length of the position vector using the{" "}
                            <span className="font-semibold text-[#1848a0]">
                                3D distance formula
                            </span>
                            .
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                            |r&#x20D7;<sub>AB</sub>| = √[ (x₂−x₁)² + (y₂−y₁)² + (z₂−z₁)² ]
                        </div>
                    </Step>

                    {/* Step 4 */}
                    <Step number={4} title="Determine the Unit Vector">
                        <p>
                            Obtain the{" "}
                            <span className="font-semibold text-[#1848a0]">unit vector</span>{" "}
                            by dividing the position vector by its magnitude.
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                            û<sub>AB</sub> = r&#x20D7;<sub>AB</sub> / |r&#x20D7;<sub>AB</sub>|
                        </div>
                        <p className="text-gray-500 text-[15px]">
                            The unit vector represents direction only.
                        </p>
                    </Step>

                    {/* Step 5 */}
                    <Step number={5} title="Express the Force Vector">
                        <p>
                            Multiply the magnitude of the force by its{" "}
                            <span className="font-semibold text-[#1848a0]">unit vector</span>{" "}
                            to obtain the force in Cartesian form.
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                            F&#x20D7; = F · û
                        </div>
                    </Step>

                    {/* Step 6 */}
                    <Step number={6} title="Compute the Resultant Force and its Magnitude">
                        <p>
                            Add all force vectors{" "}
                            <span className="font-semibold text-[#1848a0]">
                                component-wise
                            </span>{" "}
                            to obtain the resultant.
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                            R&#x20D7; = ΣF&#x20D7;
                        </div>
                        <p>The magnitude of the resultant is given by:</p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic">
                            R = √( Rx² + Ry² + Rz² )
                        </div>
                    </Step>

                    {/* Step 7 */}
                    <Step number={7} title="Determine the Coordinate Direction Angles">
                        <p>
                            Compute the{" "}
                            <span className="font-semibold text-[#1848a0]">
                                angles
                            </span>{" "}
                            between the resultant vector and the coordinate axes.
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[15px] text-gray-600 italic space-y-1">
                            <p>cos α = Rx / R</p>
                            <p>cos β = Ry / R</p>
                            <p>cos γ = Rz / R</p>
                        </div>
                    </Step>

                    {/* Step 8 */}
                    <Step number={8} title="Express the Final Answer">
                        <p>
                            Present the resultant in{" "}
                            <span className="font-semibold text-[#1848a0]">vector form</span>
                            , together with its magnitude and direction.
                        </p>
                        <ul className="list-none space-y-1 mt-1">
                            {[
                                "Resultant vector",
                                "Magnitude",
                                "Direction angles",
                            ].map((item) => (
                                <ArrowItem key={item} label={item} />
                            ))}
                        </ul>
                    </Step>

                    {/* Example Card */}
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#1848a0] text-white flex items-center justify-center font-bold text-[16px]">
                                📝
                            </div>
                            <h2 className="text-[20px] font-semibold">Example</h2>
                        </div>
                        <div className="ml-12 bg-white border border-gray-200 rounded-2xl shadow p-5 text-[18px] space-y-3">
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-[15px] text-gray-600 italic space-y-2">
                                <p>R&#x20D7; = 460i − 40j − 1080k N</p>
                                <p>R = √(460² + (−40)² + (−1080)²) = <strong>1174.56 N</strong></p>
                                <p>α = 66.94°,&nbsp; β = 91.95°,&nbsp; γ = 156.85°</p>
                            </div>
                        </div>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
}