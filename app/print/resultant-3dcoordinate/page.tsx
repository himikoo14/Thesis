"use client";

import { Suspense, useEffect } from "react";
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
        borderRadius: 12,
        border: "1px solid #dee2e6",
        background: "#f8f9fa",
        overflow: "hidden",
        padding: 10,
      }}
    >
      <svg width="100%" height="260" viewBox="0 0 700 260">
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

        <line x1="100" y1="210" x2="320" y2="210" stroke="#cccccc" strokeWidth="2" />
        <line x1="100" y1="210" x2="100" y2="40" stroke="#cccccc" strokeWidth="2" />
        <line x1="100" y1="210" x2="200" y2="140" stroke="#cccccc" strokeWidth="2" />

        <text x="330" y="215" fontSize="13" fill="#999">X</text>
        <text x="88" y="32" fontSize="13" fill="#999">Z</text>
        <text x="208" y="136" fontSize="13" fill="#999">Y</text>

        {points.map((p: any, i: number) => {
          const x = 100 + (parseFloat(p.x) || 0) * 25;
          const y =
            210 -
            (parseFloat(p.z) || 0) * 25 -
            (parseFloat(p.y) || 0) * 10;

          return (
            <g key={i}>
              <circle cx={x} cy={y} r="5" fill="#1848a0" />
              <text
                x={x + 8}
                y={y - 8}
                fontSize="12"
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
            210 -
            (parseFloat(from.z) || 0) * 25 -
            (parseFloat(from.y) || 0) * 10;

          const x2 = 100 + (parseFloat(to.x) || 0) * 25;
          const y2 =
            210 -
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
                strokeWidth="3"
                markerEnd="url(#coordArrow)"
              />
              <text
                x={(x1 + x2) / 2 + 6}
                y={(y1 + y2) / 2 - 6}
                fontSize="11"
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

function PrintCoordinateContent() {
  const searchParams = useSearchParams();

  const raw =
    searchParams.get("data") ||
    (typeof window !== "undefined" ? localStorage.getItem("coordinatePdfData") : null);

  if (!raw) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500" style={{ fontSize: 12 }}>
        No data provided.
      </div>
    );
  }

  const parsed = JSON.parse(decodeURIComponent(raw));

  useEffect(() => {
    const timer = setTimeout(() => window.print(), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] py-4 px-4" style={{ fontSize: 12 }}>
      <div className="mx-auto max-w-4xl bg-white rounded-2xl shadow-xl p-5 space-y-4">

        {/* Header */}
        <div className="border-b pb-3">
          <h1 style={{ fontSize: 15 }} className="font-bold text-[#1848a0] leading-tight">
            3D Cartesian Vector Method
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

        {/* Coordinates of Points */}
        <section className="break-inside-avoid page-break-inside-avoid">
          <h2 style={{ fontSize: 13 }} className="font-semibold text-gray-900 mb-3">
            Coordinates of Points
          </h2>

          <div className="overflow-hidden rounded-xl border border-[#dbe7ff]">
            <table className="w-full text-left" style={{ fontSize: 11 }}>
              <thead className="bg-[#1848a0] text-white">
                <tr>
                  <th className="px-3 py-2">Point</th>
                  <th className="px-3 py-2">X</th>
                  <th className="px-3 py-2">Y</th>
                  <th className="px-3 py-2">Z</th>
                </tr>
              </thead>
              <tbody>
                {parsed.points.map((p: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 font-semibold">{p.label}</td>
                    <td className="px-3 py-2">{p.x}</td>
                    <td className="px-3 py-2">{p.y}</td>
                    <td className="px-3 py-2">{p.z}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Free Body Diagram */}
        <section className="break-inside-avoid page-break-inside-avoid">
          <h2 style={{ fontSize: 13 }} className="font-semibold text-gray-900 mb-3">
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

export default function PrintCoordinatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-500" style={{ fontSize: 12 }}>
          Loading...
        </div>
      }
    >
      <PrintCoordinateContent />
    </Suspense>
  );
}