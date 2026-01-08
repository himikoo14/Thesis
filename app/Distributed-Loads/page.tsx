"use client";

import { useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

/* ================= TYPES ================= */
type Node = { x: number; y: number };
type Element = { n1: number; n2: number; E: number; A: number };
type Support = { x: number; y: number; type: "pinned" | "roller" };
type Force = { node: number; Fx: number; Fy: number };

/* ================= COMPONENT ================= */
export default function TrussSolverUI() {
  /* ================= STATE ================= */
  const [nodes, setNodes] = useState<Node[]>([
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ]);
  const [supports, setSupports] = useState<Support[]>([
    { x: 0, y: 0, type: "pinned" },
  ]);
  const [forces, setForces] = useState<Force[]>([]);
  const [elements, setElements] = useState<Element[]>([
    // optional default elements, can also be empty
  ]);
  const [results, setResults] = useState<any>(null);

  /* ================= HELPERS ================= */
  function zeros(n: number, m: number) {
    return Array.from({ length: n }, () => Array(m).fill(0));
  }

  function assembleK() {
    const dof = nodes.length * 2;
    const K = zeros(dof, dof);

    elements.forEach(el => {
      const n1 = nodes[el.n1];
      const n2 = nodes[el.n2];

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const L = Math.sqrt(dx * dx + dy * dy);
      const c = dx / L;
      const s = dy / L;
      const k = (el.E * el.A) / L;

      const ke = [
        [c * c, c * s, -c * c, -c * s],
        [c * s, s * s, -c * s, -s * s],
        [-c * c, -c * s, c * c, c * s],
        [-c * s, -s * s, c * s, s * s],
      ].map(r => r.map(v => v * k));

      const map = [el.n1 * 2, el.n1 * 2 + 1, el.n2 * 2, el.n2 * 2 + 1];
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          K[map[i]][map[j]] += ke[i][j];
    });

    return K;
  }

  function solveSystem(A: number[][], b: number[]) {
    const n = b.length;
    for (let i = 0; i < n; i++) {
      let max = i;
      for (let j = i + 1; j < n; j++)
        if (Math.abs(A[j][i]) > Math.abs(A[max][i])) max = j;

      [A[i], A[max]] = [A[max], A[i]];
      [b[i], b[max]] = [b[max], b[i]];

      for (let j = i + 1; j < n; j++) {
        const f = A[j][i] / A[i][i];
        for (let k = i; k < n; k++) A[j][k] -= f * A[i][k];
        b[j] -= f * b[i];
      }
    }

    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = b[i];
      for (let j = i + 1; j < n; j++) x[i] -= A[i][j] * x[j];
      x[i] /= A[i][i];
    }
    return x;
  }

  /* ================= SOLVER ================= */
  function solveTruss() {
    const dof = nodes.length * 2;
    const K = assembleK();

    const F = Array(dof).fill(0);
    forces.forEach(f => {
      F[f.node * 2] = f.Fx;
      F[f.node * 2 + 1] = f.Fy;
    });

    const fixed: number[] = [];
    supports.forEach(s => {
      const i = nodes.findIndex(n => n.x === s.x && n.y === s.y);
      if (i >= 0) {
        fixed.push(i * 2 + 1); // y always fixed
        if (s.type === "pinned") fixed.push(i * 2); // x also fixed if pinned
      }
    });

    const free = Array.from({ length: dof }, (_, i) => i).filter(i => !fixed.includes(i));
    const Kred = free.map(i => free.map(j => K[i][j]));
    const Fred = free.map(i => F[i]);

    const dRed = solveSystem(Kred, Fred);
    const D = Array(dof).fill(0);
    free.forEach((d, i) => (D[d] = dRed[i]));

    const memberForces = elements.map(el => {
      const n1 = nodes[el.n1];
      const n2 = nodes[el.n2];
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const L = Math.sqrt(dx * dx + dy * dy);
      const c = dx / L;
      const s = dy / L;
      const k = (el.E * el.A) / L;

      const u = [
        D[el.n1 * 2],
        D[el.n1 * 2 + 1],
        D[el.n2 * 2],
        D[el.n2 * 2 + 1],
      ];

      return k * (-c * u[0] - s * u[1] + c * u[2] + s * u[3]);
    });

    const R = K.map((row, i) =>
      row.reduce((sum, v, j) => sum + v * D[j], 0) - F[i]
    );

    setResults({ D, memberForces, R });
  }

  /* ================= UI ================= */

  // Add / Remove handlers for dynamic input fields
  const addSupport = () => setSupports([...supports, { x: 0, y: 0, type: "pinned" }]);
  const removeSupport = () => setSupports(supports.slice(0, -1));

  const addNode = () => setNodes([...nodes, { x: 0, y: 0 }]);
  const removeNode = () => setNodes(nodes.slice(0, -1));

  const addForce = () => setForces([...forces, { node: 0, Fx: 0, Fy: 0 }]);
  const removeForce = () => setForces(forces.slice(0, -1));

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900">
      <Header />

      <main className="flex-grow px-6 py-10 max-w-6xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-center mb-2">Truss Solver (Matrix Method)</h1>
        <h2 className="text-xl font-semibold text-center mb-6">Real-Time Free Body Diagram</h2>

        {/* FBD Placeholder */}
        <div className="bg-white border rounded-xl shadow h-[420px] flex items-center justify-center mb-8">
          <svg width="360" height="360">
            <line x1="180" y1="20" x2="180" y2="340" stroke="gray" />
            <line x1="20" y1="180" x2="340" y2="180" stroke="gray" />
            <text x="350" y="185" fontSize="14">x</text>
            <text x="185" y="15" fontSize="14">y</text>
          </svg>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Supports */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-xl font-semibold mb-2">Supports</h3>
            {supports.map((s, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <span className="w-16">Node {i + 1}</span>
                <input type="number" className="input" value={s.x} onChange={e => {
                  const newS = [...supports]; newS[i].x = parseFloat(e.target.value); setSupports(newS);
                }} />
                <input type="number" className="input" value={s.y} onChange={e => {
                  const newS = [...supports]; newS[i].y = parseFloat(e.target.value); setSupports(newS);
                }} />
                <select className="input" value={s.type} onChange={e => {
                  const newS = [...supports]; newS[i].type = e.target.value as "pinned"|"roller"; setSupports(newS);
                }}>
                  <option value="pinned">Pinned</option>
                  <option value="roller">Roller</option>
                </select>
              </div>
            ))}
          </div>

          {/* Nodes */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-xl font-semibold mb-2">Nodes</h3>
            {nodes.map((n, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <span className="w-16">Node {i + 1}</span>
                <input type="number" className="input" value={n.x} onChange={e => {
                  const newN = [...nodes]; newN[i].x = parseFloat(e.target.value); setNodes(newN);
                }} />
                <input type="number" className="input" value={n.y} onChange={e => {
                  const newN = [...nodes]; newN[i].y = parseFloat(e.target.value); setNodes(newN);
                }} />
              </div>
            ))}
          </div>

          {/* Forces */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-xl font-semibold mb-2">Forces</h3>
            {forces.map((f, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                <input type="number" className="input" value={f.node} onChange={e => {
                  const newF = [...forces]; newF[i].node = parseInt(e.target.value); setForces(newF);
                }} placeholder="Node"/>
                <input type="number" className="input" value={f.Fx} onChange={e => {
                  const newF = [...forces]; newF[i].Fx = parseFloat(e.target.value); setForces(newF);
                }} placeholder="Fx"/>
                <input type="number" className="input" value={f.Fy} onChange={e => {
                  const newF = [...forces]; newF[i].Fy = parseFloat(e.target.value); setForces(newF);
                }} placeholder="Fy"/>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button onClick={addSupport} className="bg-green-700 text-white py-2 rounded-md hover:bg-green-800">+ Add Support</button>
          <button onClick={addNode} className="bg-green-700 text-white py-2 rounded-md hover:bg-green-800">+ Add Node</button>
          <button onClick={addForce} className="bg-green-700 text-white py-2 rounded-md hover:bg-green-800">+ Add Force</button>
          <button onClick={removeSupport} className="bg-red-600 text-white py-2 rounded-md hover:bg-red-700">− Remove Support</button>
          <button onClick={removeNode} className="bg-red-600 text-white py-2 rounded-md hover:bg-red-700">− Remove Node</button>
          <button onClick={removeForce} className="bg-red-600 text-white py-2 rounded-md hover:bg-red-700">− Remove Force</button>
        </div>

        {/* Calculate */}
        <button onClick={solveTruss} className="w-full bg-blue-800 text-white py-3 rounded-lg text-[17px] font-semibold hover:bg-blue-900 transition mb-6">
          Calculate
        </button>

        {/* Results */}
        {results && (
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-xl font-semibold">Solution</h3>
            {results.memberForces.map((f: number, i: number) => (
              <div key={i}>
                Member {i + 1}: {f.toFixed(3)} {f > 0 ? "Tension" : "Compression"}
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
