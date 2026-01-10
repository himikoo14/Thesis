"use client";

import { useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

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
  /* ---------- STATE ---------- */
  const [supports, setSupports] = useState<Support[]>([
    { x: "", y: "", type: "Pinned" },
    { x: "", y: "", type: "Roller" },
  ]);

  const [nodes, setNodes] = useState<Joint[]>([{ x: "", y: "" }]);
  const [members, setMembers] = useState<Member[]>([{ start: 0, end: 1 }]);
  const [forces, setForces] = useState<Force[]>([{ Joint: 0, magnitude: "", angle: "" }]);
  const [solution, setSolution] = useState<{ displacements: number[]; memberForces: number[] } | null>(null);

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

  /* ===================== MATRIX TRUSS SOLVER ===================== */

  const solveTruss = () => {
    const nNodes = allNodes.length;
    const dof = 2 * nNodes;

    // Joint coordinates
    const coords = allNodes.map(n => [parseFloat(n.x), parseFloat(n.y)]);

    // Initialize global stiffness matrix
    const K: number[][] = Array.from({ length: dof }, () => Array(dof).fill(0));

    // Assemble members
    members.forEach(m => {
      const [i, j] = [m.start, m.end];
      const [x1, y1] = coords[i];
      const [x2, y2] = coords[j];
      const L = Math.hypot(x2 - x1, y2 - y1);
      const c = (x2 - x1) / L;
      const s = (y2 - y1) / L;
      const k = 1 / L; // assume AE = 1

      const kLocal = [
        [c * c * k, c * s * k, -c * c * k, -c * s * k],
        [c * s * k, s * s * k, -c * s * k, -s * s * k],
        [-c * c * k, -c * s * k, c * c * k, c * s * k],
        [-c * s * k, -s * s * k, c * s * k, s * s * k],
      ];

      const dofMap = [2 * i, 2 * i + 1, 2 * j, 2 * j + 1];
      for (let a = 0; a < 4; a++) {
        for (let b = 0; b < 4; b++) {
          K[dofMap[a]][dofMap[b]] += kLocal[a][b];
        }
      }
    });

    // Force vector
    const F = Array(dof).fill(0);
    forces.forEach(f => {
      const angleRad = (parseFloat(f.angle) * Math.PI) / 180;
      const mag = parseFloat(f.magnitude);
      F[2 * f.Joint] = mag * Math.cos(angleRad);
      F[2 * f.Joint + 1] = mag * Math.sin(angleRad);
    });

    // Fixed DOFs from supports
    const fixedDOFs: number[] = [];
    supports.forEach((s, idx) => {
      if (s.type === "Pinned") fixedDOFs.push(2 * idx, 2 * idx + 1);
      if (s.type === "Roller") fixedDOFs.push(2 * idx + 1);
    });

    const freeDOFs = Array.from({ length: dof }, (_, i) => i).filter(i => !fixedDOFs.includes(i));

    // Reduced matrices
    const K_reduced = freeDOFs.map(i => freeDOFs.map(j => K[i][j]));
    const F_reduced = freeDOFs.map(i => F[i]);

    // Solve using Gauss elimination
    const U_reduced = solveLinearSystem(K_reduced, F_reduced);

    const U = Array(dof).fill(0);
    freeDOFs.forEach((dofIdx, k) => { U[dofIdx] = U_reduced[k]; });

    // Member forces
    const memberForces = members.map(m => {
      const [i, j] = [m.start, m.end];
      const [x1, y1] = coords[i];
      const [x2, y2] = coords[j];
      const L = Math.hypot(x2 - x1, y2 - y1);
      const c = (x2 - x1) / L;
      const s = (y2 - y1) / L;
      const k = 1 / L;
      const u = [U[2 * i], U[2 * i + 1], U[2 * j], U[2 * j + 1]];
      return k * ((u[2] - u[0]) * c + (u[3] - u[1]) * s);
    });

    setSolution({ displacements: U, memberForces });
    console.log("Joint Displacements:", U);
    console.log("Member Forces:", memberForces);
  };

  /* ===================== GAUSS ELIMINATION ===================== */
  const solveLinearSystem = (A: number[][], b: number[]): number[] => {
    const n = b.length;
    const M = A.map((row, i) => [...row, b[i]]); // augmented

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
      [M[i], M[maxRow]] = [M[maxRow], M[i]];

      for (let k = i + 1; k < n; k++) {
        const factor = M[k][i] / M[i][i];
        for (let j = i; j <= n; j++) M[k][j] -= factor * M[i][j];
      }
    }

    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = M[i][n] / M[i][i];
      for (let k = i - 1; k >= 0; k--) M[k][n] -= M[k][i] * x[i];
    }
    return x;
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
        <h1 className="text-3xl font-bold text-center mb-2">Truss Calculator</h1>
        <h2 className="text-xl font-semibold text-center mb-6">Real-Time Free Body Diagram</h2>

        {/* FBD */}
        <div className="bg-white border rounded-xl shadow h-[420px] flex items-center justify-center mb-8">
          <svg width="360" height="360">
            {/* Axes */}
            <line x1="180" y1="20" x2="180" y2="340" stroke="gray" />
            <line x1="20" y1="180" x2="340" y2="180" stroke="gray" />
            <text x="350" y="185">x</text>
            <text x="185" y="15">y</text>

            {/* Members */}
            {members.map((m, i) => {
              const n1 = numericNodes[m.start];
              const n2 = numericNodes[m.end];
              if (!n1 || !n2) return null;

              return (
                <line
                  key={`member-${i}`}
                  x1={toSvgX(n1.x)}
                  y1={toSvgY(n1.y)}
                  x2={toSvgX(n2.x)}
                  y2={toSvgY(n2.y)}
                  stroke="black"
                  strokeWidth={2}
                />
              );
            })}

            {/* Joints */}
            {numericNodes.map((n, i) => (
              <g key={`joint-${i}`}>
                <circle
                  cx={toSvgX(n.x)}
                  cy={toSvgY(n.y)}
                  r={5}
                  fill="blue"
                />
                <text
                  x={toSvgX(n.x) + 6}
                  y={toSvgY(n.y) - 6}
                  fontSize="12"
                >
                  {nodeLabel(i)}
                </text>
              </g>
            ))}

            {/* Supports */}
            {supports.map((s, i) => {
              const n = numericNodes[i];
              if (!n) return null;

              return s.type === "Pinned" ? (
                <polygon
                  key={`support-${i}`}
                  points={`
          ${toSvgX(n.x) - 8},${toSvgY(n.y) + 10}
          ${toSvgX(n.x) + 8},${toSvgY(n.y) + 10}
          ${toSvgX(n.x)},${toSvgY(n.y)}
        `}
                  fill="gray"
                />
              ) : (
                <rect
                  key={`support-${i}`}
                  x={toSvgX(n.x) - 8}
                  y={toSvgY(n.y) + 2}
                  width={16}
                  height={6}
                  fill="gray"
                />
              );
            })}

            {/* Forces */}
            {forces.map((f, i) => {
              const n = numericNodes[f.Joint];
              if (!n) return null;

              const angle = (parseFloat(f.angle || "0") * Math.PI) / 180;
              const length = 30;

              const x1 = toSvgX(n.x);
              const y1 = toSvgY(n.y);
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

            {/* Arrow marker */}
            <defs>
              <marker
                id="arrow"
                markerWidth="10"
                markerHeight="10"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="red" />
              </marker>
            </defs>
          </svg>
        </div> {/* <-- FBD div closed */}

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

              {/* Joint Displacements */}
              <div>
                <h4 className="font-medium">Joint Displacements (m):</h4>
                <pre>
                  {solution.displacements.map((d, i) => {
                    const nodeLetter = String.fromCharCode(65 + Math.floor(i / 2)); // A, B, C... assuming 2 DOFs per Joint
                    const dofType = i % 2 === 0 ? "X" : "Y"; // X or Y displacement
                    return `Joint ${nodeLetter} ${dofType}: ${d.toFixed(5)}`;
                  }).join("\n")}
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


      </main>
      <Footer />
    </div>
  );
}
