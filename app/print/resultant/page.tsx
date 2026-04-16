"use client";

import { useSearchParams } from "next/navigation";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

export default function PrintResultantPage() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("data");

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
            2D Resultant Force — Step-by-Step Solution
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
            Final Free Body Diagram
          </h2>

          <div className="rounded-3xl border bg-white p-6 flex justify-center break-inside-avoid page-break-inside-avoid">
            <svg
              width="320"
              height="320"
              className="rounded-2xl border bg-white shadow"
            >
              <g transform="translate(160,160)">
                <line x1={-140} y1={0} x2={140} y2={0} stroke="#cfcfcf" strokeWidth="1" />
                <line x1={0} y1={-140} x2={0} y2={140} stroke="#cfcfcf" strokeWidth="1" />

                {(() => {
                  const vectors = parsed.forces
                    .map((f: { magnitude: string; angle: string }) => {
                      const m = parseFloat(f.magnitude);
                      const a = parseFloat(f.angle);

                      if (isNaN(m) || isNaN(a)) return null;

                      const rad = (a * Math.PI) / 180;

                      return {
                        x: m * Math.cos(rad),
                        y: m * Math.sin(rad),
                      };
                    })
                    .filter(Boolean);

                  const resultant = {
                    x: parsed.result.sumFx,
                    y: parsed.result.sumFy,
                  };

                  const magnitudes = [
                    ...vectors.map((v: any) => Math.hypot(v.x, v.y)),
                    Math.hypot(resultant.x, resultant.y),
                  ];

                  const maxMag = Math.max(1, ...magnitudes);
                  const scale = 90 / maxMag;

                  return (
                    <>
                      {vectors.map((v: any, i: number) => {
                        const x = v.x * scale;
                        const y = -v.y * scale;

                        return (
                          <g key={i}>
                            <line
                              x1={0}
                              y1={0}
                              x2={x}
                              y2={y}
                              stroke="#1848a0"
                              strokeWidth="3"
                              markerEnd="url(#arrowForce)"
                            />
                            <text
                              x={x + 8}
                              y={y - 8}
                              fontSize="16"
                              fill="#1848a0"
                              fontWeight="bold"
                            >
                              F{i + 1}
                            </text>
                          </g>
                        );
                      })}

                      <line
                        x1={0}
                        y1={0}
                        x2={resultant.x * scale}
                        y2={-resultant.y * scale}
                        stroke="#009900"
                        strokeWidth="4"
                        markerEnd="url(#arrowResultant)"
                      />

                      <text
                        x={resultant.x * scale + 10}
                        y={-resultant.y * scale - 10}
                        fontSize="18"
                        fill="#009900"
                        fontWeight="bold"
                      >
                        R
                      </text>
                    </>
                  );
                })()}

                <defs>
                  <marker
                    id="arrowForce"
                    markerWidth="10"
                    markerHeight="10"
                    refX="6"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 6 3, 0 6" fill="#1848a0" />
                  </marker>

                  <marker
                    id="arrowResultant"
                    markerWidth="12"
                    markerHeight="12"
                    refX="7"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 7 3, 0 6" fill="#009900" />
                  </marker>
                </defs>
              </g>
            </svg>
          </div>
        </section>

      </div>
    </div>
  );
}