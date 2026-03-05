"use client";

import { useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import BeamPage from "../Beam/page";

/* ===================== TYPES ===================== */

type Support = {
  x: string;
  y: string;
  type: "Pinned" | "Roller";
};

type Joint = {
  x: string;
  y: string;
};

type Member = {
  start: number; // index in allNodes
  end: number;   // index in allNodes
};

type Force = {
  Joint: number;  // index in allNodes
  magnitude: string;
  angle: string;
};

type GenericObject = Record<string, any>;

/* ===================== COMPONENT ===================== */

export default function TrussSolverUI() {
  const [activeTab, setActiveTab] = useState<"concurrent" | "nonconcurrent">("concurrent");
  /* ---------- STATE ---------- */
  const [supports, setSupports] = useState<Support[]>([
    { x: "", y: "", type: "Pinned" },
    { x: "", y: "", type: "Roller" },
  ]);

  const [nodes, setNodes] = useState<Joint[]>([{ x: "", y: "" }]);
  const [members, setMembers] = useState<Member[]>([{ start: 0, end: 1 }]);
  const [forces, setForces] = useState<Force[]>([{ Joint: 0, magnitude: "", angle: "" }]);
  type Solution = {
    steps: string[];
    memberForces: number[];
    reactions: { x: number; y: number }[];
    displacements: number[]; // <-- added this
  };

  const [solution, setSolution] = useState<Solution | null>(null);

  /* ---------- DERIVED NODES ---------- */
  const allNodes: Joint[] = [...supports.map(s => ({ x: s.x, y: s.y })), ...nodes];

  /* ---------- STYLES ---------- */
  const inputClass = "w-full mt-1 rounded-lg border border-gray-300 text-[18px] p-2 outline-none focus:ring-0";
  const redButtonClass = "w-10 px-2 py-0.5 bg-red-500 text-white rounded-md hover:bg-red-600 text-[20px]";
  const greenButtonClass = "px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-[18px]";

  /* ---------- GENERIC HANDLERS ---------- */
  const handleChange = <T extends GenericObject>(
    arr: T[],
    setArr: React.Dispatch<React.SetStateAction<T[]>>,
    index: number,
    field: keyof T,
    value: T[keyof T]
  ) => {
    const newArr = [...arr];
    newArr[index][field] = value;
    setArr(newArr);
  };

  const addItem = <T,>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, template: T) =>
    setArr([...arr, template]);

  const removeItem = <T,>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, index: number) =>
    setArr(arr.filter((_, i) => i !== index));

  /* ===================== METHOD OF JOINTS SOLVER ===================== */
  /* ===================== METHOD OF JOINTS SOLVER WITH SUPPORT REACTIONS ===================== */
  /* ===================== METHOD OF JOINTS SOLVER WITH STEP-BY-STEP ===================== */
  const solveTruss = () => {
    const numericNodes = allNodes.map(n => ({ x: parseFloat(n.x), y: parseFloat(n.y) }));
    const nMembers = members.length;
    const nJoints = numericNodes.length;

    const memberForces: number[] = Array(nMembers).fill(0);
    const solvedMembers: boolean[] = Array(nMembers).fill(false);

    const jointMembers: number[][] = Array.from({ length: nJoints }, () => []);
    members.forEach((m, idx) => {
      jointMembers[m.start].push(idx);
      jointMembers[m.end].push(idx);
    });

    // ----------------------- Step 1: Calculate Support Reactions -----------------------
    const supportIndices = supports.map((_, i) => i);
    let reactions: { x: number; y: number }[] = numericNodes.map(() => ({ x: 0, y: 0 }));

    if (supports.length === 2) {
      const [i1, i2] = supportIndices;
      const node1 = numericNodes[i1];
      const node2 = numericNodes[i2];

      // vertical reactions using moments
      let Fy2 = 0;
      forces.forEach(f => {
        const mag = parseFloat(f.magnitude) || 0;
        const angle = ((parseFloat(f.angle) || 0) * Math.PI) / 180;
        const Fy = mag * Math.sin(angle);
        const dx = numericNodes[f.Joint].x - node1.x;
        Fy2 += Fy * dx;
      });
      const dxSupport = node2.x - node1.x;
      Fy2 = dxSupport !== 0 ? Fy2 / dxSupport : 0;

      let Fy1 = 0;
      forces.forEach(f => {
        const mag = parseFloat(f.magnitude) || 0;
        const angle = ((parseFloat(f.angle) || 0) * Math.PI) / 180;
        Fy1 += mag * Math.sin(angle);
      });
      Fy1 -= Fy2;

      reactions[i1].y = Fy1;
      reactions[i2].y = Fy2;

      // horizontal reactions (assume first support pinned)
      let FxTotal = 0;
      forces.forEach(f => {
        const mag = parseFloat(f.magnitude) || 0;
        const angle = ((parseFloat(f.angle) || 0) * Math.PI) / 180;
        FxTotal += mag * Math.cos(angle);
      });
      reactions[i1].x = -FxTotal;
    }

    // ----------------------- Step 2: External Forces at Joints -----------------------
    const externalForces: { x: number; y: number }[] = numericNodes.map((_, j) => ({
      x: reactions[j]?.x || 0,
      y: reactions[j]?.y || 0,
    }));
    forces.forEach(f => {
      const mag = parseFloat(f.magnitude) || 0;
      const angle = ((parseFloat(f.angle) || 0) * Math.PI) / 180;
      externalForces[f.Joint].x += mag * Math.cos(angle);
      externalForces[f.Joint].y += mag * Math.sin(angle);
    });

    // ----------------------- Step 3: Solve Each Joint -----------------------
    const tolerance = 1e-6;
    let progress = true;
    const steps: string[] = [];

    steps.push("Step 1: Calculate support reactions");
    reactions.forEach((r, i) => {
      const label = nodeLabel(i);
      steps.push(`Joint ${label}: Rx = ${r.x.toFixed(2)} kN, Ry = ${r.y.toFixed(2)} kN`);
    });

    steps.push("\nStep 2: Solve joints using method of joints:");

    while (progress) {
      progress = false;

      for (let j = 0; j < nJoints; j++) {
        const connected = jointMembers[j];
        const unknowns = connected.filter(idx => !solvedMembers[idx]);
        if (unknowns.length === 0 || unknowns.length > 2) continue;

        const rowX: number[] = [];
        const rowY: number[] = [];
        let fxKnown = externalForces[j].x;
        let fyKnown = externalForces[j].y;

        unknowns.forEach(mIdx => {
          const m = members[mIdx];
          const other = m.start === j ? m.end : m.start;
          const dx = numericNodes[other].x - numericNodes[j].x;
          const dy = numericNodes[other].y - numericNodes[j].y;
          const L = Math.hypot(dx, dy);
          rowX.push(dx / L);
          rowY.push(dy / L);
        });

        connected.forEach(mIdx => {
          if (solvedMembers[mIdx]) {
            const m = members[mIdx];
            const other = m.start === j ? m.end : m.start;
            const dx = numericNodes[other].x - numericNodes[j].x;
            const dy = numericNodes[other].y - numericNodes[j].y;
            const L = Math.hypot(dx, dy);
            const f = memberForces[mIdx];
            fxKnown -= f * (dx / L);
            fyKnown -= f * (dy / L);
          }
        });

        if (unknowns.length === 1) {
          const f = (fxKnown * rowX[0] + fyKnown * rowY[0]) / (rowX[0] ** 2 + rowY[0] ** 2);
          memberForces[unknowns[0]] = f;
          solvedMembers[unknowns[0]] = true;
          progress = true;

          const label = nodeLabel(j);
          const mIdx = unknowns[0];
          const m = members[mIdx];
          const type = f >= 0 ? "Tension" : "Compression";
          steps.push(`Joint ${label}: Member ${nodeLabel(m.start)}${nodeLabel(m.end)} = ${f.toFixed(2)} kN (${type})`);
        } else if (unknowns.length === 2) {
          const det = rowX[0] * rowY[1] - rowX[1] * rowY[0];
          if (Math.abs(det) < tolerance) continue;
          const f1 = (fxKnown * rowY[1] - fyKnown * rowX[1]) / det;
          const f2 = (fyKnown * rowX[0] - fxKnown * rowY[0]) / det;
          memberForces[unknowns[0]] = f1;
          memberForces[unknowns[1]] = f2;
          solvedMembers[unknowns[0]] = true;
          solvedMembers[unknowns[1]] = true;
          progress = true;

          const label = nodeLabel(j);
          const m1 = members[unknowns[0]];
          const m2 = members[unknowns[1]];
          steps.push(`Joint ${label}: Member ${nodeLabel(m1.start)}${nodeLabel(m1.end)} = ${f1.toFixed(2)} kN (${f1 >= 0 ? "Tension" : "Compression"})`);
          steps.push(`Joint ${label}: Member ${nodeLabel(m2.start)}${nodeLabel(m2.end)} = ${f2.toFixed(2)} kN (${f2 >= 0 ? "Tension" : "Compression"})`);
        }
      }
    }

    setSolution({
      steps,
      memberForces,
      reactions,
      displacements: Array(numericNodes.length * 2).fill(0), // <-- placeholder zeros for X/Y DOFs
    });

    console.log("Step-by-step solution:", steps);
  };



  /* ---------- Joint LABEL HELPER ---------- */
  const nodeLabel = (index: number) => String.fromCharCode(65 + index); // 0 -> A, 1 -> B, etc.
  /* ---------- FBD HELPERS (ADDED) ---------- */
  const svgSize = 360;
  const padding = 40;

  const numericNodes = allNodes.map(n => ({
    x: parseFloat(n.x || "0"),
    y: parseFloat(n.y || "0"),
  }));

  const minX = Math.min(...numericNodes.map(n => n.x), 0);
  const maxX = Math.max(...numericNodes.map(n => n.x), 1);
  const minY = Math.min(...numericNodes.map(n => n.y), 0);
  const maxY = Math.max(...numericNodes.map(n => n.y), 1);

  const scale = Math.min(
    (svgSize - 2 * padding) / (maxX - minX || 1),
    (svgSize - 2 * padding) / (maxY - minY || 1)
  );

  const toSvgX = (x: number) => padding + (x - minX) * scale;
  const toSvgY = (y: number) => svgSize - (padding + (y - minY) * scale);

  /* ===================== JSX ===================== */
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <main className="flex-grow px-6 py-10 max-w-6xl mx-auto w-full">
        {/* TABS */}
        <div className="flex justify-center mb-6 gap-4">

          <button
            onClick={() => setActiveTab("concurrent")}
            className={`px-5 py-2 rounded-lg font-semibold ${activeTab === "concurrent"
                ? "bg-blue-800 text-white"
                : "bg-gray-200"
              }`}
          >
            Concurrent Force System
          </button>

          <button
            onClick={() => setActiveTab("nonconcurrent")}
            className={`px-5 py-2 rounded-lg font-semibold ${activeTab === "nonconcurrent"
                ? "bg-blue-800 text-white"
                : "bg-gray-200"
              }`}
          >
            Non-Concurrent Force System
          </button>

        </div>
        {activeTab === "concurrent" && (
          <>
            <h1 className="text-3xl font-bold text-center mb-2">Truss Calculator</h1>
            <h2 className="text-xl font-semibold text-center mb-6">Real-Time Free Body Diagram</h2>

            {/* FBD */}
            <div
              className="relative rounded-xl shadow h-[420px] mb-8 overflow-hidden bg-white"
            >
              {/* board */}
              <svg
                viewBox={`0 0 ${svgSize} ${svgSize}`}
                width="100%"
                height="100%"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* SCALE BASED ON HEIGHT */}
                {(() => {
                  const numericNodesScaled = numericNodes;
                  const minYCoord = Math.min(...numericNodesScaled.map(n => n.y), 0);
                  const maxYCoord = Math.max(...numericNodesScaled.map(n => n.y), 1);
                  const minXCoord = Math.min(...numericNodesScaled.map(n => n.x), 0);
                  const maxXCoord = Math.max(...numericNodesScaled.map(n => n.x), 1);

                  const yRange = maxYCoord - minYCoord || 1;
                  const xRange = maxXCoord - minXCoord || 1;

                  // scale based on height
                  const scale = (svgSize - 2 * padding) / yRange;

                  // horizontal offset to center the truss
                  const totalWidth = xRange * scale;
                  const xOffset = (svgSize - totalWidth) / 2 - minXCoord * scale;

                  const toSvgXScaled = (x: number) => x * scale + xOffset;
                  const toSvgYScaled = (y: number) => svgSize - padding - (y - minYCoord) * scale;

                  return (
                    <>

                      {/* Axes */}
                      <line
                        x1={toSvgXScaled(minXCoord)}
                        y1={toSvgYScaled(0)}
                        x2={toSvgXScaled(maxXCoord)}
                        y2={toSvgYScaled(0)}
                        stroke="gray"
                      />
                      <line
                        x1={toSvgXScaled(0)}
                        y1={toSvgYScaled(minYCoord)}
                        x2={toSvgXScaled(0)}
                        y2={toSvgYScaled(maxYCoord)}
                        stroke="gray"
                      />

                      {/* Members */}
                      {members.map((m, i) => {
                        const n1 = numericNodesScaled[m.start];
                        const n2 = numericNodesScaled[m.end];
                        if (!n1 || !n2) return null;
                        return (
                          <line
                            key={`member-${i}`}
                            x1={toSvgXScaled(n1.x)}
                            y1={toSvgYScaled(n1.y)}
                            x2={toSvgXScaled(n2.x)}
                            y2={toSvgYScaled(n2.y)}
                            stroke="black"
                            strokeWidth={2}
                          />
                        );
                      })}

                      {/* Joints */}
                      {numericNodesScaled.map((n, i) => (
                        <g key={`joint-${i}`}>
                          <circle cx={toSvgXScaled(n.x)} cy={toSvgYScaled(n.y)} r={5} fill="blue" />
                          <text x={toSvgXScaled(n.x) + 6} y={toSvgYScaled(n.y) - 6} fontSize="12">
                            {nodeLabel(i)}
                          </text>
                        </g>
                      ))}

                      {/* Supports */}
                      {supports.map((s, i) => {
                        const n = numericNodesScaled[i];
                        if (!n) return null;
                        return s.type === "Pinned" ? (
                          <polygon
                            key={`support-${i}`}
                            points={`
                  ${toSvgXScaled(n.x) - 8},${toSvgYScaled(n.y) + 10}
                  ${toSvgXScaled(n.x) + 8},${toSvgYScaled(n.y) + 10}
                  ${toSvgXScaled(n.x)},${toSvgYScaled(n.y)}
                `}
                            fill="gray"
                          />
                        ) : (
                          <rect
                            key={`support-${i}`}
                            x={toSvgXScaled(n.x) - 8}
                            y={toSvgYScaled(n.y) + 2}
                            width={16}
                            height={6}
                            fill="gray"
                          />
                        );
                      })}

                      {/* Forces */}
                      {forces.map((f, i) => {
                        const n = numericNodesScaled[f.Joint];
                        if (!n) return null;
                        const angle = (parseFloat(f.angle || "0") * Math.PI) / 180;
                        const length = 30;
                        const x1 = toSvgXScaled(n.x);
                        const y1 = toSvgYScaled(n.y);
                        const x2 = x1 + length * Math.cos(angle);
                        const y2 = y1 - length * Math.sin(angle);

                        return (
                          <line
                            key={`force-${i}`}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="red"
                            strokeWidth={2}
                            markerEnd="url(#arrow)"
                          />
                        );
                      })}
                    </>
                  );
                })()}

                {/* Arrow marker */}
                <defs>
                  <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="red" />
                  </marker>
                </defs>
              </svg>
            </div>

            {/* INPUT PANELS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Supports */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-xl font-semibold mb-2">Supports</h3>
                {supports.map((s, i) => (
                  <div key={i} className="grid grid-cols-5 gap-2 items-end mb-2">
                    <span className="font-medium text-[18px]">Joint {nodeLabel(i)}</span>
                    <input type="number" placeholder="x" value={s.x} onChange={(e) => handleChange(supports, setSupports, i, "x", e.target.value)} className={inputClass} />
                    <input type="number" placeholder="y" value={s.y} onChange={(e) => handleChange(supports, setSupports, i, "y", e.target.value)} className={inputClass} />
                    <select value={s.type} onChange={(e) => handleChange(supports, setSupports, i, "type", e.target.value)} className={inputClass}>
                      <option>Pinned</option>
                      <option>Roller</option>
                    </select>
                    {supports.length > 1 && <button onClick={() => removeItem(supports, setSupports, i)} className={redButtonClass}>–</button>}
                  </div>
                ))}
                <button onClick={() => addItem(supports, setSupports, { x: "", y: "", type: "Pinned" })} className={greenButtonClass}>+ Add Support</button>
              </div>

              {/* Nodes */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-xl font-semibold mb-2">Nodes</h3>
                {nodes.map((n, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 items-end mb-2">
                    <span className="font-medium text-[18px]">Joint {nodeLabel(supports.length + i)}</span>
                    <input type="number" placeholder="x" value={n.x} onChange={(e) => handleChange(nodes, setNodes, i, "x", e.target.value)} className={inputClass} />
                    <input type="number" placeholder="y" value={n.y} onChange={(e) => handleChange(nodes, setNodes, i, "y", e.target.value)} className={inputClass} />
                    {nodes.length > 1 && <button onClick={() => removeItem(nodes, setNodes, i)} className={redButtonClass}>–</button>}
                  </div>
                ))}
                <button onClick={() => addItem(nodes, setNodes, { x: "", y: "" })} className={greenButtonClass}>+ Add Joint</button>
              </div>

              {/* Members */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-xl font-semibold mb-2">Members</h3>

                {/* Label Row */}
                <div className="grid grid-cols-4 gap-2 items-end mb-2">
                  <span className="text-[16px] font-medium text-gray-700"> </span>
                  <span className="text-[16px] font-medium text-gray-700">Start Joint</span>
                  <span className="text-[16px] font-medium text-gray-700">End Joint</span>
                  <span className="text-[16px] font-medium text-gray-700"> </span>
                </div>

                {members.map((m, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 items-end mb-2">
                    <span className="font-medium text-[18px]">
                      Member {nodeLabel(m.start)}{nodeLabel(m.end)}
                    </span>

                    <select
                      value={m.start}
                      onChange={(e) => handleChange(members, setMembers, i, "start", Number(e.target.value))}
                      className={inputClass}
                    >
                      {allNodes.map((_, idx) => (
                        <option key={idx} value={idx}>Joint {nodeLabel(idx)}</option>
                      ))}
                    </select>

                    <select
                      value={m.end}
                      onChange={(e) => handleChange(members, setMembers, i, "end", Number(e.target.value))}
                      className={inputClass}
                    >
                      {allNodes.map((_, idx) => (
                        <option key={idx} value={idx}>Joint {nodeLabel(idx)}</option>
                      ))}
                    </select>

                    {members.length > 1 ? (
                      <button onClick={() => removeItem(members, setMembers, i)} className={redButtonClass}>–</button>
                    ) : (
                      <div /> // empty placeholder to keep grid alignment
                    )}
                  </div>
                ))}

                <button
                  onClick={() => addItem(members, setMembers, { start: 0, end: 0 })}
                  className={greenButtonClass}
                >
                  + Add Member
                </button>
              </div>


              {/* Forces */}
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-xl font-semibold mb-2">Forces</h3>
                {forces.map((f, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 items-end mb-2">
                    <select value={f.Joint} onChange={(e) => handleChange(forces, setForces, i, "Joint", Number(e.target.value))} className={inputClass}>
                      {allNodes.map((_, idx) => <option key={idx} value={idx}>Joint {String.fromCharCode(65 + idx)}</option>)}
                    </select>
                    <input type="number" placeholder="kN" value={f.magnitude} onChange={(e) => handleChange(forces, setForces, i, "magnitude", e.target.value)} className={inputClass} />
                    <input type="number" placeholder="deg" value={f.angle} onChange={(e) => handleChange(forces, setForces, i, "angle", e.target.value)} className={inputClass} />
                    {forces.length > 1 && <button onClick={() => removeItem(forces, setForces, i)} className={redButtonClass}>–</button>}
                  </div>
                ))}
                <button onClick={() => addItem(forces, setForces, { Joint: 0, magnitude: "", angle: "" })} className={greenButtonClass}>+ Add Force</button>
              </div>
            </div>

            <button className="w-full bg-blue-800 text-white py-3 rounded-lg font-semibold mb-6" onClick={solveTruss}>Calculate</button>

            {solution && (
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="text-xl font-semibold mb-2">Solution</h3>

                {/* Step-by-Step */}
                <div className="mt-2">
                  <h4 className="font-medium mb-1">Step-by-Step Solution:</h4>
                  <pre className="whitespace-pre-wrap text-sm">
                    {solution.steps.join("\n")}
                  </pre>
                </div>

                {/* Member Forces */}
                <div className="mt-2">
                  <h4 className="font-medium">Member Forces:</h4>
                  <pre>
                    {solution.memberForces.map((f, i) => {
                      const type = f >= 0 ? "Tension" : "Compression";
                      const letterStart = String.fromCharCode(65 + members[i].start); // A, B, C...
                      const letterEnd = String.fromCharCode(65 + members[i].end);
                      return `Member ${letterStart}${letterEnd}: ${Math.abs(f).toFixed(5)} ${type}`;
                    }).join("\n")}
                  </pre>
                </div>
              </div>
            )}

          </>
        )}

        {activeTab === "nonconcurrent" && <BeamPage />}

      </main>
      <Footer />
    </div>
  );
}