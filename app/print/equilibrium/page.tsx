"use client";

import { useSearchParams } from "next/navigation";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

const FORCE_COLORS = ["#1848a0", "#c0392b", "#16a34a", "#9333ea", "#d97706", "#0891b2"];
const UNKNOWN_LENGTH = 75;

function PrintableFBD({ forces }: { forces: any[] }) {
  const vectors = forces.map((f, i) => {
    const magUnknown = !!f.magnitudeUnknown;
    const angUnknown = !!f.angleUnknown;
    const rawMag = parseFloat(f.magnitude);
    const rawAng = parseFloat(f.angle);
    const angle = isNaN(rawAng) ? 0 : rawAng;
    const hasMag = !magUnknown && !isNaN(rawMag);

    return {
      mag: hasMag ? rawMag : null,
      angle,
      magUnknown,
      angUnknown,
      index: i,
    };
  });

  const knownMags = vectors
    .filter((v) => v.mag !== null)
    .map((v) => v.mag as number);

  const maxMag = Math.max(1, ...knownMags);
  const scale = 80 / maxMag;

  return (
    <div className="rounded-2xl border border-[#dbe7ff] bg-white p-6 flex justify-center break-inside-avoid page-break-inside-avoid">
      <svg width="300" height="300" className="rounded-lg border bg-white shadow">
        <defs>
          {FORCE_COLORS.map((color, ci) => (
            <marker
              key={ci}
              id={`arrow-${ci}`}
              markerWidth="10"
              markerHeight="10"
              refX="6"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 6 3, 0 6" fill={color} />
            </marker>
          ))}
        </defs>

        <g transform="translate(150,150)">
          <line x1={-140} y1={0} x2={140} y2={0} stroke="#e2e8f0" strokeWidth="1" />
          <line x1={0} y1={-140} x2={0} y2={140} stroke="#e2e8f0" strokeWidth="1" />

          <text x={143} y={4} fontSize="10" fill="#94a3b8">x</text>
          <text x={3} y={-133} fontSize="10" fill="#94a3b8">y</text>

          {vectors.map((v, i) => {
            const color = FORCE_COLORS[i % FORCE_COLORS.length];
            const rad = (v.angle * Math.PI) / 180;
            const isUnknown = v.magUnknown || v.mag === null;
            const len = isUnknown ? UNKNOWN_LENGTH : (v.mag as number) * scale;
            const ex = Math.cos(rad) * len;
            const ey = -Math.sin(rad) * len;

            return (
              <g key={i}>
                <line
                  x1={0}
                  y1={0}
                  x2={ex}
                  y2={ey}
                  stroke={color}
                  strokeWidth={isUnknown ? 2 : 3}
                  strokeDasharray={isUnknown ? "6 3" : undefined}
                  opacity={isUnknown ? 0.65 : 1}
                  markerEnd={`url(#arrow-${i % FORCE_COLORS.length})`}
                />
                <text
                  x={ex + 12}
                  y={ey - 12}
                  fontSize="12"
                  fill={color}
                  fontWeight="bold"
                >
                  F{i + 1}
                </text>
              </g>
            );
          })}

          <circle cx={0} cy={0} r={4} fill="#334155" />
        </g>
      </svg>
    </div>
  );
}
function sanitizeTeX(tex: string): string {
  return tex.replace(
    /(_\{[^}]+\})_([a-zA-Z])/g,
    (_match: string, sub: string, axis: string) => {
      const inner = sub.slice(2, -1);
      return `_{{${inner}}${axis}}`;
    }
  );
}

export default function PrintEquilibriumPage() {
  const searchParams = useSearchParams();

  const raw =
    searchParams.get("data") ||
    localStorage.getItem("equilibriumPdfData");

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
            Concurrent Force System
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Generated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {parsed.solvedLabel && (
          <div className="rounded-2xl border border-[#1848a0] bg-blue-50 p-4">
            <span className="font-semibold text-[#1848a0]">Solved: </span>
            <span className="font-bold">{parsed.solvedLabel}</span>
          </div>
        )}

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

          <PrintableFBD forces={parsed.forces} />
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Step-by-Step Solution
          </h2>

          <div className="space-y-6">
            {parsed.steps.map((step: string, i: number) => {
              const s = step.trim();

              if (s.startsWith("Step ") || s.startsWith("\\textbf{")) {
                return (
                  <div
                    key={i}
                    className="text-xl font-bold text-[#1848a0] pt-4"
                  >
                    {s.replace(/^\\textbf\{([\s\S]*)\}$/, "$1")}
                  </div>
                );
              }

              if (!s.includes("\\")) {
                return (
                  <div key={i} className="text-gray-700">
                    {s}
                  </div>
                );
              }

              return (
                <div
                  key={i}
                  className="overflow-x-auto rounded-xl bg-gray-50 p-4"
                >
                  <BlockMath>{sanitizeTeX(s)}</BlockMath>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}