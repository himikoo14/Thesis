"use client";

import { useSearchParams } from "next/navigation";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

function ResultantFBD3D({
  forces,
  result,
}: {
  forces: any[];
  result: any;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 320,
        background: "#f8f9fa",
        borderRadius: 16,
        border: "1px solid #dee2e6",
        overflow: "hidden",
      }}
      className="break-inside-avoid page-break-inside-avoid"
    >
      {/* SVG code here */}
    </div>
  );
}

export default function PrintResultant3DAzimuthPage() {
    const searchParams = useSearchParams();
    const raw =
        searchParams.get("data") ||
        localStorage.getItem("resultant3dAzimuthPdfData");

    if (!raw) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-500">
                No data provided.
            </div>
        );
    }

    const parsed = JSON.parse(decodeURIComponent(raw));

    return (
        <div className="min-h-screen bg-[#f8fafc] py-10 px-6">
            <div className="mx-auto max-w-4xl bg-white rounded-3xl shadow-xl p-10 space-y-10">
                <div className="border-b pb-6">
                    <h1 className="text-3xl font-bold text-[#1848a0]">
                        3D Resultant Force — Azimuth-Elevation Method
                    </h1>
                    <p className="text-sm text-gray-500 mt-2">
                        Generated: {new Date().toLocaleDateString()}
                    </p>
                </div>

                <section>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                        Step-by-Step Solution
                    </h2>

                    <div className="space-y-6">
                        {parsed.steps.map((step: string, i: number) => {
                            const s = step.trim();

                            if (s.startsWith("Step")) {
                                return (
                                    <div
                                        key={i}
                                        className="text-xl font-bold text-[#1848a0] pt-4"
                                    >
                                        {s}
                                    </div>
                                );
                            }

                            const textMatch = s.match(/^\\text\{(.+?)\}(.*)$/);

                            if (textMatch) {
                                return (
                                    <div key={i} className="space-y-2">
                                        <div className="font-semibold text-lg text-[#1848a0]">
                                            {textMatch[1]}
                                        </div>

                                        {textMatch[2].trim() && (
                                            <div className="overflow-x-auto rounded-xl bg-gray-50 p-4">
                                                <BlockMath>{textMatch[2].trim()}</BlockMath>
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={i}
                                    className="overflow-x-auto rounded-xl bg-gray-50 p-4"
                                >
                                    <BlockMath>{s}</BlockMath>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                        Results Summary
                    </h2>

                    <div className="grid gap-4">
                        {parsed.resultRows.map(
                            (row: { label: string; value: string }, i: number) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between rounded-2xl bg-[#f8fbff] border border-[#dbe7ff] px-5 py-4"
                                >
                                    <span className="font-medium text-gray-700">
                                        {row.label}
                                    </span>
                                    <span className="font-bold text-[#1848a0]">
                                        {row.value}
                                    </span>
                                </div>
                            )
                        )}
                    </div>
                </section>

                <section className="break-inside-avoid page-break-inside-avoid">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                        Force Inputs
                    </h2>

                    <div className="overflow-hidden rounded-2xl border border-[#dbe7ff]">
                        <table className="w-full text-left">
                            <thead className="bg-[#1848a0] text-white">
                                <tr>
                                    <th className="px-4 py-3">Force</th>
                                    <th className="px-4 py-3">Magnitude</th>
                                    <th className="px-4 py-3">Azimuth</th>
                                    <th className="px-4 py-3">Elevation</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsed.forces.map(
                                    (
                                        force: {
                                            magnitude: string;
                                            azimuth: string;
                                            elevation: string;
                                        },
                                        i: number
                                    ) => (
                                        <tr key={i} className="border-t">
                                            <td className="px-4 py-3 font-semibold">F{i + 1}</td>
                                            <td className="px-4 py-3">{force.magnitude} kN</td>
                                            <td className="px-4 py-3">{force.azimuth}°</td>
                                            <td className="px-4 py-3">{force.elevation}°</td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>

                </section>
                <section className="break-inside-avoid page-break-inside-avoid">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                        Final Free Body Diagram
                    </h2>

                    <div className="rounded-3xl border bg-white p-6 flex flex-col items-center break-inside-avoid page-break-inside-avoid">
                        <div className="text-sm text-[#009900] font-semibold mb-2">
                            — Resultant (R)
                        </div>

                        <ResultantFBD3D
                            forces={parsed.forces}
                            result={parsed.result}
                        />

                        <div className="mt-4 text-sm text-gray-600 text-center">
                            <span className="text-[#1848a0] font-semibold">■</span> Input Forces
                            &nbsp;&nbsp;
                            <span className="text-[#009900] font-semibold">■</span> Resultant R
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}