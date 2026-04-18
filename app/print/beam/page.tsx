"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

function sanitizeTeX(tex: string): string {
  return tex.replace(
    /(_\{[^}]+\})_([a-zA-Z])/g,
    (_match: string, sub: string, axis: string) => {
      const inner = sub.slice(2, -1);
      return `_{{${inner}}${axis}}`;
    }
  );
}

function BeamDiagram({
  beamLength,
  supports,
  pointLoads,
  distributedLoads,
}: {
  beamLength: string;
  supports: any[];
  pointLoads: any[];
  distributedLoads: any[];
}) {
  const L = parseFloat(beamLength);
  if (!L || L <= 0) return null;

  const W = 760;
  const H = 200;
  const padL = 60;
  const padR = 60;
  const beamY = 120;
  const beamH = 14;
  const drawW = W - padL - padR;
  const scale = drawW / L;
  const toX = (m: number) => padL + m * scale;

  const allMags = [
    ...pointLoads.map((p) => Math.abs(parseFloat(p.magnitude) || 0)),
    ...distributedLoads.map((d) =>
      Math.max(
        Math.abs(parseFloat(d.startMag) || 0),
        Math.abs(parseFloat(d.endMag) || 0)
      )
    ),
  ];

  const maxMag = Math.max(1, ...allMags);
  const arrowH = (mag: number) =>
    Math.max(10, (Math.abs(mag) / maxMag) * 55);

  return (
    <div className="rounded-2xl border border-[#dbe7ff] bg-white p-3 overflow-hidden">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        <rect
          x={padL}
          y={beamY}
          width={drawW}
          height={beamH}
          fill="#d1d5db"
          stroke="#374151"
          strokeWidth="2"
          rx="2"
        />

        {distributedLoads.map((d, i) => {
          const xs = parseFloat(d.start);
          const xe = parseFloat(d.end);
          const ws = parseFloat(d.startMag);
          const we = parseFloat(d.endMag);

          if (isNaN(xs) || isNaN(xe) || isNaN(ws) || isNaN(we) || xe <= xs)
            return null;

          const x1 = toX(xs);
          const x2 = toX(xe);
          const hs = arrowH(ws);
          const he = arrowH(we);

          return (
            <g key={i}>
              <line
                x1={x1}
                y1={beamY - hs}
                x2={x2}
                y2={beamY - he}
                stroke="#1848a0"
                strokeWidth="2"
              />

              {Array.from({ length: 8 }).map((_, j) => {
                const t = j / 7;
                const lx = x1 + t * (x2 - x1);
                const ly = beamY - hs + t * ((beamY - he) - (beamY - hs));

                return (
                  <g key={j}>
                    <line
                      x1={lx}
                      y1={ly}
                      x2={lx}
                      y2={beamY}
                      stroke="#1848a0"
                      strokeWidth="1.5"
                    />
                    <polygon
                      points={`${lx - 4},${beamY - 6} ${lx + 4},${beamY - 6} ${lx},${beamY}`}
                      fill="#1848a0"
                    />
                  </g>
                );
              })}

              <text
                x={(x1 + x2) / 2}
                y={Math.min(beamY - hs, beamY - he) - 6}
                textAnchor="middle"
                fontSize="11"
                fill="#1848a0"
                fontWeight="bold"
              >
                {ws === we ? `${ws} kN/m` : `${ws} → ${we} kN/m`}
              </text>
            </g>
          );
        })}

        {pointLoads.map((p, i) => {
          const mag = parseFloat(p.magnitude);
          const loc = parseFloat(p.location);

          if (isNaN(mag) || isNaN(loc)) return null;

          const x = toX(loc);
          const h = arrowH(mag);

          return (
            <g key={i}>
              <line
                x1={x}
                y1={beamY - h}
                x2={x}
                y2={beamY - 8}
                stroke="#059669"
                strokeWidth="2.5"
              />
              <polygon
                points={`${x - 5},${beamY - 8} ${x + 5},${beamY - 8} ${x},${beamY}`}
                fill="#059669"
              />
              <text
                x={x}
                y={beamY - h - 6}
                textAnchor="middle"
                fontSize="11"
                fill="#059669"
                fontWeight="bold"
              >
                {mag} kN
              </text>
            </g>
          );
        })}

        {supports.map((s, i) => {
          const loc = parseFloat(s.location);
          if (isNaN(loc)) return null;

          const x = toX(loc);
          const y = beamY + beamH;

          return (
            <g key={i}>
              {s.type === "Pinned" ? (
                <>
                  <polygon
                    points={`${x},${y} ${x - 12},${y + 18} ${x + 12},${y + 18}`}
                    fill="#6b7280"
                    stroke="#374151"
                    strokeWidth="1"
                  />
                  <line
                    x1={x - 14}
                    y1={y + 18}
                    x2={x + 14}
                    y2={y + 18}
                    stroke="#374151"
                    strokeWidth="2"
                  />
                </>
              ) : (
                <>
                  <polygon
                    points={`${x},${y} ${x - 12},${y + 18} ${x + 12},${y + 18}`}
                    fill="#9ca3af"
                    stroke="#6b7280"
                    strokeWidth="1"
                  />
                  <circle cx={x - 7} cy={y + 21} r={3} fill="none" stroke="#6b7280" />
                  <circle cx={x} cy={y + 21} r={3} fill="none" stroke="#6b7280" />
                  <circle cx={x + 7} cy={y + 21} r={3} fill="none" stroke="#6b7280" />
                </>
              )}

              <text
                x={x}
                y={y + 34}
                textAnchor="middle"
                fontSize="10"
                fill="#374151"
              >
                {loc} m
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PrintBeamContent() {
  const searchParams = useSearchParams();

  const raw =
    searchParams.get("data") ||
    (typeof window !== "undefined" ? localStorage.getItem("beamPdfData") : null);

  if (!raw) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        No data provided.
      </div>
    );
  }

  const parsed = JSON.parse(decodeURIComponent(raw));

  return (
    <div className="min-h-screen bg-[#f8fafc] py-4 px-6" style={{ fontSize: "12px" }}>
      <div className="mx-auto max-w-5xl bg-white rounded-3xl shadow-xl p-5 space-y-4">
        <div className="border-b pb-4">
          <h1 style={{ fontSize: "15px" }} className="font-bold text-[#1848a0]">
            Beam Analysis
          </h1>
          <p style={{ fontSize: "11px" }} className="text-gray-500 mt-1">
            Generated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <section>
          <h2 style={{ fontSize: "13px" }} className="font-semibold text-gray-900 mb-3">
            Free Body Diagram
          </h2>

          <BeamDiagram
            beamLength={parsed.beamLength}
            supports={parsed.supports}
            pointLoads={parsed.pointLoads}
            distributedLoads={parsed.distributedLoads}
          />
        </section>

        <section>
          <h2 style={{ fontSize: "13px" }} className="font-semibold text-gray-900 mb-3">
            Results Summary
          </h2>

          <div className="grid gap-2">
            {parsed.resultRows.map(
              (row: { label: string; value: string }, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-[#f8fbff] border border-[#dbe7ff] px-4 py-2"
                >
                  <span style={{ fontSize: "11px" }} className="font-medium text-gray-700">
                    {row.label}
                  </span>
                  <span style={{ fontSize: "11px" }} className="font-bold text-[#1848a0]">
                    {row.value}
                  </span>
                </div>
              )
            )}
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: "13px" }} className="font-semibold text-gray-900 mb-3">
            Step-by-Step Solution
          </h2>

          <div className="space-y-3">
            {parsed.steps.map((step: string, i: number) => {
              const s = step.trim();

              if (s.startsWith("Step")) {
                return (
                  <div
                    key={i}
                    style={{ fontSize: "12px" }}
                    className="font-bold text-[#1848a0] pt-2"
                  >
                    {s}
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
                  className="overflow-x-auto rounded-lg bg-gray-50 px-2 py-1"
                  style={{ fontSize: "11px" }}
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

export default function PrintBeamPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-500">
          Loading...
        </div>
      }
    >
      <PrintBeamContent />
    </Suspense>
  );
}