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
        height: 220,
        background: "#f8f9fa",
        borderRadius: 12,
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
      <div className="min-h-screen flex items-center justify-center text-gray-500" style={{ fontSize: 12 }}>
        No data provided.
      </div>
    );
  }

  const parsed = JSON.parse(decodeURIComponent(raw));

  return (
    <div
      className="min-h-screen bg-[#f8fafc] py-4 px-4"
      style={{ fontSize: 12 }}
    >
      <div className="mx-auto max-w-4xl bg-white rounded-2xl shadow-xl p-5 space-y-4">

        {/* Header */}
        <div className="border-b pb-3">
          <h1 style={{ fontSize: 15 }} className="font-bold text-[#1848a0] leading-tight">
            3D Resultant Force — Azimuth-Elevation Method
          </h1>
          <p className="text-gray-500 mt-1" style={{ fontSize: 10 }}>
            Generated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Step-by-Step Solution */}
        <section>
          <h2 style={{ fontSize: 13 }} className="font-semibold text-gray-900 mb-3">
            Step-by-Step Solution
          </h2>

          <div className="space-y-3">
            {parsed.steps.map((step: string, i: number) => {
              const s = step.trim();

              if (s.startsWith("Step")) {
                return (
                  <div
                    key={i}
                    style={{ fontSize: 13 }}
                    className="font-bold text-[#1848a0] pt-2"
                  >
                    {s}
                  </div>
                );
              }

              const textMatch = s.match(/^\\text\{(.+?)\}(.*)$/);

              if (textMatch) {
                return (
                  <div key={i} className="space-y-1">
                    <div
                      style={{ fontSize: 11 }}
                      className="font-semibold text-[#1848a0]"
                    >
                      {textMatch[1]}
                    </div>
                    {textMatch[2].trim() && (
                      <div
                        className="overflow-x-auto rounded-lg bg-gray-50 px-2 py-1"
                        style={{ fontSize: 11 }}
                      >
                        <BlockMath>{textMatch[2].trim()}</BlockMath>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={i}
                  className="overflow-x-auto rounded-lg bg-gray-50 px-2 py-1"
                  style={{ fontSize: 11 }}
                >
                  <BlockMath>{s}</BlockMath>
                </div>
              );
            })}
          </div>
        </section>

        {/* Results Summary */}
        <section>
          <h2 style={{ fontSize: 13 }} className="font-semibold text-gray-900 mb-3">
            Results Summary
          </h2>

          <div className="grid gap-2">
            {parsed.resultRows.map(
              (row: { label: string; value: string }, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-[#f8fbff] border border-[#dbe7ff] px-4 py-2"
                >
                  <span className="font-medium text-gray-700" style={{ fontSize: 11 }}>
                    {row.label}
                  </span>
                  <span className="font-bold text-[#1848a0]" style={{ fontSize: 11 }}>
                    {row.value}
                  </span>
                </div>
              )
            )}
          </div>
        </section>

        {/* Force Inputs */}
        <section className="break-inside-avoid page-break-inside-avoid">
          <h2 style={{ fontSize: 13 }} className="font-semibold text-gray-900 mb-3">
            Force Inputs
          </h2>

          <div className="overflow-hidden rounded-xl border border-[#dbe7ff]">
            <table className="w-full text-left" style={{ fontSize: 11 }}>
              <thead className="bg-[#1848a0] text-white">
                <tr>
                  <th className="px-3 py-2">Force</th>
                  <th className="px-3 py-2">Magnitude</th>
                  <th className="px-3 py-2">Azimuth</th>
                  <th className="px-3 py-2">Elevation</th>
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
                      <td className="px-3 py-2 font-semibold">F{i + 1}</td>
                      <td className="px-3 py-2">{force.magnitude} kN</td>
                      <td className="px-3 py-2">{force.azimuth}°</td>
                      <td className="px-3 py-2">{force.elevation}°</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Free Body Diagram */}
        <section className="break-inside-avoid page-break-inside-avoid">
          <h2 style={{ fontSize: 13 }} className="font-semibold text-gray-900 mb-3">
            Final Free Body Diagram
          </h2>

          <div className="rounded-2xl border bg-white p-4 flex flex-col items-center break-inside-avoid page-break-inside-avoid">
            <div style={{ fontSize: 10 }} className="text-[#009900] font-semibold mb-1">
              — Resultant (R)
            </div>

            <ResultantFBD3D
              forces={parsed.forces}
              result={parsed.result}
            />

            <div className="mt-2 text-gray-600 text-center" style={{ fontSize: 10 }}>
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