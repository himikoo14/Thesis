"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";


function PrintResultantContent() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("data");

  if (!raw) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        No data provided.
      </div>
    );
  }

  const parsed = JSON.parse(decodeURIComponent(raw));
    useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="min-h-screen bg-[#f8fafc] py-4 px-4"
      style={{ fontSize: "12px", lineHeight: "1.5" }}
    >
      <div className="mx-auto max-w-3xl bg-white rounded-xl shadow p-5 space-y-4">

        {/* Header */}
        <div className="border-b pb-3">
          <h1 className="font-bold text-[#1848a0]" style={{ fontSize: "15px" }}>
            2D Resultant Force — Step-by-Step Solution
          </h1>
          <p className="text-gray-400 mt-1" style={{ fontSize: "11px" }}>
            Generated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Steps */}
        <section>
          <h2
            className="font-semibold text-gray-800 mb-2"
            style={{ fontSize: "13px" }}
          >
            Step-by-Step Solution
          </h2>

          <div className="space-y-3">
            {parsed.steps.map((step: string, i: number) => {
              const s = step.trim();

              if (s.startsWith("Step")) {
                return (
                  <div
                    key={i}
                    className="font-bold text-[#1848a0] pt-2"
                    style={{ fontSize: "12px" }}
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
                      className="font-semibold text-[#1848a0]"
                      style={{ fontSize: "11px" }}
                    >
                      {textMatch[1]}
                    </div>
                    {textMatch[2].trim() && (
                      <div
                        className="overflow-x-auto rounded bg-gray-50 px-2 py-1"
                        style={{ fontSize: "11px" }}
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
                  className="overflow-x-auto rounded bg-gray-50 px-3 py-2"
                  style={{ fontSize: "11px" }}
                >
                  <BlockMath>{s}</BlockMath>
                </div>
              );
            })}
          </div>
        </section>

        {/* Results Summary */}
        <section>
          <h2
            className="font-semibold text-gray-800 mb-2"
            style={{ fontSize: "13px" }}
          >
            Results Summary
          </h2>

          <div className="grid gap-2">
            {parsed.resultRows.map(
              (row: { label: string; value: string }, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-[#f8fbff] border border-[#dbe7ff] px-3 py-2"
                  style={{ fontSize: "12px" }}
                >
                  <span className="font-medium text-gray-700">{row.label}</span>
                  <span className="font-bold text-[#1848a0]">{row.value}</span>
                </div>
              )
            )}
          </div>
        </section>

        {/* FBD */}
        <section className="break-inside-avoid">
          <h2
            className="font-semibold text-gray-800 mb-2"
            style={{ fontSize: "13px" }}
          >
            Final Free Body Diagram
          </h2>

          <div className="rounded-xl border bg-white p-2 flex justify-center">
            <svg
              width="200"
              height="200"
              className="rounded-lg border bg-white shadow-sm"
            >
              <g transform="translate(100,100)">
                <line x1={-85} y1={0} x2={85} y2={0} stroke="#cfcfcf" strokeWidth="1" />
                <line x1={0} y1={-85} x2={0} y2={85} stroke="#cfcfcf" strokeWidth="1" />

                {(() => {
                  const vectors = parsed.forces
                    .map((f: { magnitude: string; angle: string }) => {
                      const m = parseFloat(f.magnitude);
                      const a = parseFloat(f.angle);
                      if (isNaN(m) || isNaN(a)) return null;
                      const rad = (a * Math.PI) / 180;
                      return { x: m * Math.cos(rad), y: m * Math.sin(rad) };
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
                  const scale = 55 / maxMag;

                  return (
                    <>
                      {vectors.map((v: any, i: number) => {
                        const x = v.x * scale;
                        const y = -v.y * scale;
                        return (
                          <g key={i}>
                            <line
                              x1={0} y1={0} x2={x} y2={y}
                              stroke="#1848a0" strokeWidth="2"
                              markerEnd="url(#arrowForce)"
                            />
                            <text x={x + 5} y={y - 5} fontSize="10" fill="#1848a0" fontWeight="bold">
                              F{i + 1}
                            </text>
                          </g>
                        );
                      })}

                      <line
                        x1={0} y1={0}
                        x2={resultant.x * scale} y2={-resultant.y * scale}
                        stroke="#009900" strokeWidth="3"
                        markerEnd="url(#arrowResultant)"
                      />
                      <text
                        x={resultant.x * scale + 7}
                        y={-resultant.y * scale - 7}
                        fontSize="11" fill="#009900" fontWeight="bold"
                      >
                        R
                      </text>
                    </>
                  );
                })()}

                <defs>
                  <marker id="arrowForce" markerWidth="8" markerHeight="8" refX="5" refY="2.5" orient="auto">
                    <polygon points="0 0, 5 2.5, 0 5" fill="#1848a0" />
                  </marker>
                  <marker id="arrowResultant" markerWidth="9" markerHeight="9" refX="6" refY="2.5" orient="auto">
                    <polygon points="0 0, 6 2.5, 0 5" fill="#009900" />
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

export default function PrintResultantPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
          Loading...
        </div>
      }
    >
      <PrintResultantContent />
    </Suspense>
  );
}