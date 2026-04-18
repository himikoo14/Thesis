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

function nodeLabel(index: number) {
  return String.fromCharCode(65 + index);
}

type FBDArrow = {
  angle: number;
  color: string;
  label: string;
  magnitude: number;
  dashed: boolean;
};

function ArrowMarker({ id, color }: { id: string; color: string }) {
  return (
    <marker
      id={id}
      markerWidth="8"
      markerHeight="8"
      refX="6"
      refY="3"
      orient="auto"
    >
      <path d="M0,0 L7,3 L0,6 Z" fill={color} />
    </marker>
  );
}

function JointFBD({
  jointIdx,
  connectedMembers,
  solvedMemberForces,
  members,
  allNodes,
  solution,
  forces,
}: {
  jointIdx: number;
  connectedMembers: number[];
  solvedMemberForces: number[];
  members: any[];
  allNodes: any[];
  solution: any;
  forces: any[];
}) {
  const tol = 1e-6;

  const jointNode = allNodes[jointIdx];
  const jx = parseFloat(jointNode?.x || "0");
  const jy = parseFloat(jointNode?.y || "0");

  const arrows: FBDArrow[] = [];

  connectedMembers.forEach((mIdx) => {
    const mb = members[mIdx];
    const otherIdx = mb.start === jointIdx ? mb.end : mb.start;
    const otherNode = allNodes[otherIdx];

    const ox = parseFloat(otherNode?.x || "0");
    const oy = parseFloat(otherNode?.y || "0");

    const dx = ox - jx;
    const dy = oy - jy;
    const angleToOther = Math.atan2(dy, dx);

    const lbl = `${nodeLabel(mb.start)}${nodeLabel(mb.end)}`;
    const force = solvedMemberForces?.[mIdx];

    arrows.push({
      angle: angleToOther,
      color: force >= 0 ? "#2563eb" : "#dc2626",
      label: `F${lbl}=${Math.abs(force || 0).toFixed(2)} kN`,
      magnitude: Math.abs(force || 1),
      dashed: false,
    });
  });

  const rxn = solution?.reactions?.find((r: any) => r.node === jointIdx);

  if (rxn) {
    if (Math.abs(rxn.x) > tol) {
      arrows.push({
        angle: rxn.x > 0 ? 0 : Math.PI,
        color: "#16a34a",
        label: `R${nodeLabel(jointIdx)}x=${rxn.x.toFixed(2)} kN`,
        magnitude: Math.abs(rxn.x),
        dashed: false,
      });
    }
    if (Math.abs(rxn.y) > tol) {
      arrows.push({
        angle: rxn.y > 0 ? Math.PI / 2 : -Math.PI / 2,
        color: "#16a34a",
        label: `R${nodeLabel(jointIdx)}y=${rxn.y.toFixed(2)} kN`,
        magnitude: Math.abs(rxn.y),
        dashed: false,
      });
    }
  }

  forces
    ?.filter((f: any) => f.Joint === jointIdx)
    .forEach((f: any, i: number) => {
      const mag = parseFloat(f.magnitude || "0");
      const ang = (parseFloat(f.angle || "0") * Math.PI) / 180;
      arrows.push({
        angle: -ang,
        color: "#dc2626",
        label: `P${i + 1}=${mag.toFixed(2)} kN`,
        magnitude: Math.abs(mag),
        dashed: false,
      });
    });

  const maxForce = Math.max(...arrows.map((a) => a.magnitude || 1), 1);

  return (
    <svg
      width={200}
      height={200}
      className="mx-auto rounded-lg border border-gray-200 bg-[#f8fafc]"
    >
      <defs>
        <ArrowMarker id={`a-${jointIdx}`} color="#2563eb" />
        <ArrowMarker id={`b-${jointIdx}`} color="#dc2626" />
        <ArrowMarker id={`c-${jointIdx}`} color="#16a34a" />
      </defs>

      <circle
        cx={100}
        cy={100}
        r={6}
        fill="white"
        stroke="#1e40af"
        strokeWidth={2}
      />

      {arrows.map((arrow, idx) => {
        const len = 32 + (arrow.magnitude / maxForce) * 42;
        const x2 = 100 + Math.cos(arrow.angle) * len;
        const y2 = 100 - Math.sin(arrow.angle) * len;

        const marker =
          arrow.color === "#16a34a"
            ? `c-${jointIdx}`
            : arrow.color === "#dc2626"
            ? `b-${jointIdx}`
            : `a-${jointIdx}`;

        return (
          <g key={idx}>
            <line
              x1={100}
              y1={100}
              x2={x2}
              y2={y2}
              stroke={arrow.color}
              strokeWidth={2}
              markerEnd={`url(#${marker})`}
            />
            <text
              x={x2 + 5}
              y={y2 - 3}
              fontSize={8}
              fill={arrow.color}
              fontWeight="600"
            >
              {arrow.label}
            </text>
          </g>
        );
      })}

      <text
        x={100}
        y={114}
        textAnchor="middle"
        fontSize={11}
        fill="#1e40af"
        fontWeight="700"
      >
        {nodeLabel(jointIdx)}
      </text>
    </svg>
  );
}

function TrussDiagram({
  supports,
  nodes,
  members,
  forces,
  solution,
}: {
  supports: any[];
  nodes: any[];
  members: any[];
  forces: any[];
  solution: any;
}) {
  const allNodes = [
    ...supports.map((s) => ({
      x: parseFloat(s.x || "0"),
      y: parseFloat(s.y || "0"),
    })),
    ...nodes.map((n) => ({
      x: parseFloat(n.x || "0"),
      y: parseFloat(n.y || "0"),
    })),
  ];

  const W = 760;
  const H = 320;
  const PAD = 60;

  const xs = allNodes.map((n) => n.x);
  const ys = allNodes.map((n) => n.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const scale = Math.min(
    (W - PAD * 2) / rangeX,
    (H - PAD * 2) / rangeY
  );

  const offsetX = (W - rangeX * scale) / 2 - minX * scale;
  const offsetY = (H - rangeY * scale) / 2 - minY * scale;

  const sx = (x: number) => x * scale + offsetX;
  const sy = (y: number) => H - (y * scale + offsetY);

  return (
    <div className="rounded-xl border border-[#dbe7ff] bg-white p-3 overflow-hidden">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <marker
            id="forceArrow"
            markerWidth="10"
            markerHeight="10"
            refX="6"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 6 3, 0 6" fill="#dc2626" />
          </marker>
          <marker
            id="reactionArrow"
            markerWidth="10"
            markerHeight="10"
            refX="6"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 6 3, 0 6" fill="#16a34a" />
          </marker>
        </defs>

        {members.map((m: any, i: number) => {
          const start = allNodes[m.start];
          const end = allNodes[m.end];
          if (!start || !end) return null;

          const force = solution?.memberForces?.[i] ?? 0;

          let color = "#6b7280";
          if (Math.abs(force) < 1e-6) color = "#9ca3af";
          else if (force > 0) color = "#2563eb";
          else color = "#dc2626";

          return (
            <g key={i}>
              <line
                x1={sx(start.x)}
                y1={sy(start.y)}
                x2={sx(end.x)}
                y2={sy(end.y)}
                stroke={color}
                strokeWidth="3"
              />
              <text
                x={(sx(start.x) + sx(end.x)) / 2}
                y={(sy(start.y) + sy(end.y)) / 2 - 8}
                textAnchor="middle"
                fontSize="11"
                fill={color}
                fontWeight="bold"
              >
                {nodeLabel(m.start)}
                {nodeLabel(m.end)}
              </text>
            </g>
          );
        })}

        {allNodes.map((n, i) => (
          <g key={i}>
            <circle
              cx={sx(n.x)}
              cy={sy(n.y)}
              r="6"
              fill="white"
              stroke="#1848a0"
              strokeWidth="2"
            />
            <text
              x={sx(n.x)}
              y={sy(n.y) - 12}
              textAnchor="middle"
              fontSize="13"
              fill="#1848a0"
              fontWeight="bold"
            >
              {nodeLabel(i)}
            </text>
          </g>
        ))}

        {forces.map((f: any, i: number) => {
          const joint = allNodes[f.Joint];
          if (!joint) return null;

          const mag = parseFloat(f.magnitude || "0");
          const ang = (parseFloat(f.angle || "0") * Math.PI) / 180;

          const len = 50;
          const ex = sx(joint.x) + len * Math.cos(ang);
          const ey = sy(joint.y) - len * Math.sin(ang);

          return (
            <g key={i}>
              <line
                x1={sx(joint.x)}
                y1={sy(joint.y)}
                x2={ex}
                y2={ey}
                stroke="#dc2626"
                strokeWidth="2.5"
                markerEnd="url(#forceArrow)"
              />
              <text
                x={ex + 8}
                y={ey - 6}
                fontSize="11"
                fill="#dc2626"
                fontWeight="bold"
              >
                {mag} kN
              </text>
            </g>
          );
        })}

        {solution?.reactions?.map((r: any, i: number) => {
          const joint = allNodes[r.node];
          if (!joint) return null;

          const x = sx(joint.x);
          const y = sy(joint.y);

          return (
            <g key={i}>
              {Math.abs(r.x) > 1e-6 && (
                <>
                  <line
                    x1={x - Math.sign(r.x) * 40}
                    y1={y}
                    x2={x}
                    y2={y}
                    stroke="#16a34a"
                    strokeWidth="2.5"
                    markerEnd="url(#reactionArrow)"
                  />
                  <text
                    x={x - Math.sign(r.x) * 50}
                    y={y - 6}
                    fontSize="10"
                    fill="#16a34a"
                    fontWeight="bold"
                  >
                    R{nodeLabel(r.node)}x
                  </text>
                </>
              )}
              {Math.abs(r.y) > 1e-6 && (
                <>
                  <line
                    x1={x}
                    y1={y + Math.sign(r.y) * 40}
                    x2={x}
                    y2={y}
                    stroke="#16a34a"
                    strokeWidth="2.5"
                    markerEnd="url(#reactionArrow)"
                  />
                  <text
                    x={x + 6}
                    y={y + Math.sign(r.y) * 50}
                    fontSize="10"
                    fill="#16a34a"
                    fontWeight="bold"
                  >
                    R{nodeLabel(r.node)}y
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PrintTrussContent() {
  const searchParams = useSearchParams();

  const raw =
    searchParams.get("data") ||
    (typeof window !== "undefined" ? localStorage.getItem("trussPdfData") : null);

  if (!raw) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500" style={{ fontSize: 12 }}>
        No data provided.
      </div>
    );
  }

  const parsed = JSON.parse(decodeURIComponent(raw));

  return (
    <div className="min-h-screen bg-[#f8fafc] py-4 px-4" style={{ fontSize: 12 }}>
      <div className="mx-auto max-w-5xl bg-white rounded-2xl shadow-xl p-5 space-y-4">

        {/* Header */}
        <div className="border-b pb-3">
          <h1 style={{ fontSize: 15 }} className="font-bold text-[#1848a0] leading-tight">
            Truss Analysis
          </h1>
          <p className="text-gray-500 mt-1" style={{ fontSize: 10 }}>
            Generated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Free Body Diagram */}
        <section>
          <h2 style={{ fontSize: 13 }} className="font-semibold text-gray-900 mb-3">
            Free Body Diagram
          </h2>

          <TrussDiagram
            supports={parsed.supports}
            nodes={parsed.nodes}
            members={parsed.members}
            forces={parsed.forces}
            solution={parsed.solution}
          />
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

        {/* Step-by-Step Solution */}
        <section>
          <h2 style={{ fontSize: 13 }} className="font-semibold text-gray-900 mb-3">
            Step-by-Step Solution
          </h2>

          <div className="space-y-3">
            {parsed.solution.lines.map((line: any, i: number) => {
              if (line.kind === "heading") {
                return (
                  <div key={i} style={{ fontSize: 13 }} className="font-bold text-[#1848a0] pt-2">
                    {line.text}
                  </div>
                );
              }

              if (line.kind === "subheading") {
                return (
                  <div key={i} style={{ fontSize: 11 }} className="font-semibold text-gray-800">
                    {line.text}
                  </div>
                );
              }

              if (line.kind === "text" || line.kind === "warn") {
                return (
                  <div
                    key={i}
                    style={{ fontSize: 11 }}
                    className={line.kind === "warn" ? "text-red-600 font-medium" : "text-gray-700"}
                  >
                    {line.text}
                  </div>
                );
              }

              if (line.kind === "eq" || line.kind === "result") {
                return (
                  <div
                    key={i}
                    className="overflow-x-auto rounded-lg bg-gray-50 px-2 py-1"
                    style={{ fontSize: 11 }}
                  >
                    <BlockMath>{sanitizeTeX(line.tex)}</BlockMath>
                  </div>
                );
              }

              if (line.kind === "jointFBD") {
                return (
                  <div key={i} className="rounded-lg border border-[#dbe7ff] bg-white p-3">
                    <div style={{ fontSize: 11 }} className="font-semibold text-[#1848a0] mb-2">
                      Joint {nodeLabel(line.joint)}
                    </div>
                    <JointFBD
                      jointIdx={line.joint}
                      connectedMembers={line.members}
                      solvedMemberForces={parsed.solution.memberForces}
                      members={parsed.members}
                      allNodes={[
                        ...parsed.supports.map((s: any) => ({ x: s.x, y: s.y })),
                        ...parsed.nodes,
                      ]}
                      solution={parsed.solution}
                      forces={parsed.forces}
                    />
                  </div>
                );
              }

              return null;
            })}
          </div>
        </section>

      </div>
    </div>
  );
}

export default function PrintTrussPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-500" style={{ fontSize: 12 }}>
          Loading...
        </div>
      }
    >
      <PrintTrussContent />
    </Suspense>
  );
}