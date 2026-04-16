"use client";

import { useSearchParams } from "next/navigation";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

function CoordinateFBD({
  points,
  forces,
}: {
  points: any[];
  forces: any[];
}) {
  return (
    <div
      className="break-inside-avoid page-break-inside-avoid"
      style={{
        width: "100%",
        borderRadius: 16,
        border: "1px solid #dee2e6",
        background: "#f8f9fa",
        overflow: "hidden",
        padding: 16,
      }}
    >
      <svg width="100%" height="360" viewBox="0 0 700 360">
        <defs>
          <marker
            id="coordArrow"
            markerWidth="10"
            markerHeight="10"
            refX="6"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 6 3, 0 6" fill="#f4a261" />
          </marker>
        </defs>

        <line x1="100" y1="280" x2="320" y2="280" stroke="#cccccc" strokeWidth="2" />
        <line x1="100" y1="280" x2="100" y2="70" stroke="#cccccc" strokeWidth="2" />
        <line x1="100" y1="280" x2="200" y2="200" stroke="#cccccc" strokeWidth="2" />

        <text x="330" y="285" fontSize="16" fill="#999">X</text>
        <text x="90" y="60" fontSize="16" fill="#999">Z</text>
        <text x="210" y="195" fontSize="16" fill="#999">Y</text>

        {points.map((p: any, i: number) => {
          const x = 100 + (parseFloat(p.x) || 0) * 25;
          const y =
            280 -
            (parseFloat(p.z) || 0) * 25 -
            (parseFloat(p.y) || 0) * 10;

          return (
            <g key={i}>
              <circle cx={x} cy={y} r="6" fill="#1848a0" />
              <text
                x={x + 10}
                y={y - 10}
                fontSize="15"
                fill="#1848a0"
                fontWeight="bold"
              >
                {p.label}
              </text>
            </g>
          );
        })}

        {forces.map((f: any, i: number) => {
          const from = points[f.from];
          const to = points[f.to];

          if (!from || !to) return null;

          const x1 = 100 + (parseFloat(from.x) || 0) * 25;
          const y1 =
            280 -
            (parseFloat(from.z) || 0) * 25 -
            (parseFloat(from.y) || 0) * 10;

          const x2 = 100 + (parseFloat(to.x) || 0) * 25;
          const y2 =
            280 -
            (parseFloat(to.z) || 0) * 25 -
            (parseFloat(to.y) || 0) * 10;

          return (
            <g key={i}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#f4a261"
                strokeWidth="4"
                markerEnd="url(#coordArrow)"
              />
              <text
                x={(x1 + x2) / 2 + 8}
                y={(y1 + y2) / 2 - 8}
                fontSize="14"
                fill="#f4a261"
                fontWeight="bold"
              >
                F{i + 1}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function PrintCoordinatePage() {
  const searchParams = useSearchParams();

  const raw =
    searchParams.get("data") ||
    localStorage.getItem("coordinatePdfData");

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
            3D Cartesian Vector Method
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
            Coordinates of Points
          </h2>

          <div className="overflow-hidden rounded-2xl border border-[#dbe7ff]">
            <table className="w-full text-left">
              <thead className="bg-[#1848a0] text-white">
                <tr>
                  <th className="px-4 py-3">Point</th>
                  <th className="px-4 py-3">X</th>
                  <th className="px-4 py-3">Y</th>
                  <th className="px-4 py-3">Z</th>
                </tr>
              </thead>
              <tbody>
                {parsed.points.map((p: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-3 font-semibold">{p.label}</td>
                    <td className="px-4 py-3">{p.x}</td>
                    <td className="px-4 py-3">{p.y}</td>
                    <td className="px-4 py-3">{p.z}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="break-inside-avoid page-break-inside-avoid">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Final Free Body Diagram
          </h2>

          <CoordinateFBD
            points={parsed.points}
            forces={parsed.forces}
          />
        </section>
      </div>
    </div>
  );
}