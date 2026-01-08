"use client";

import { useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";

/* ===================== TYPES ===================== */

type Node = {
  x: string;
  y: string;
  fixX: boolean;
  fixY: boolean;
  loadX: string;
  loadY: string;
};

type Element = {
  n1: string;
  n2: string;
  E: string;
  A: string;
};

type TrussResult = {
  steps: string[];
  displacements: number[];
  memberForces: number[];
};

/* ===================== TRUSS SOLVER LOGIC ===================== */

class TrussSystem2D {
  nodes: any[];
  elements: any[];

  constructor(nodes: any[], elements: any[]) {
    this.nodes = nodes;
    this.elements = elements;
  }

  solve(): TrussResult {
    const steps: string[] = [];
    const dof = this.nodes.length * 2;

    let K = Array.from({ length: dof }, () => Array(dof).fill(0));
    let F = Array(dof).fill(0);

    steps.push("Step 1: Each node has two degrees of freedom (ux, uy)");

    /* -------- Assemble stiffness matrix -------- */
    this.elements.forEach((e: any, idx: number) => {
      const n1 = this.nodes[e.n1];
      const n2 = this.nodes[e.n2];

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const L = Math.hypot(dx, dy);
      const c = dx / L;
      const s = dy / L;
      const k = (e.E * e.A) / L;

      steps.push(`
\\text{Element ${idx + 1}: }
L=${L.toFixed(3)},\\;
c=${c.toFixed(3)},\\;
s=${s.toFixed(3)}
`);

      const ke = [
        [ c*c,  c*s, -c*c, -c*s ],
        [ c*s,  s*s, -c*s, -s*s ],
        [ -c*c, -c*s, c*c,  c*s ],
        [ -c*s, -s*s, c*s,  s*s ]
      ].map(row => row.map(v => v * k));

      const map = [
        e.n1 * 2, e.n1 * 2 + 1,
        e.n2 * 2, e.n2 * 2 + 1
      ];

      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++)
          K[map[i]][map[j]] += ke[i][j];
    });

    steps.push("Step 2: Assemble global stiffness matrix \\(K\\)");

    /* -------- Load vector -------- */
    this.nodes.forEach((n, i) => {
      F[i * 2] = n.loadX;
      F[i * 2 + 1] = n.loadY;
    });

    steps.push("Step 3: Assemble global load vector \\(F\\)");

    /* -------- Boundary conditions -------- */
    this.nodes.forEach((n, i) => {
      if (n.fixX) this.fixDOF(K, F, i * 2);
      if (n.fixY) this.fixDOF(K, F, i * 2 + 1);
    });

    steps.push("Step 4: Apply boundary conditions");

    /* -------- Solve KU = F -------- */
    const U = this.gaussianSolve(K, F);

    steps.push("Step 5: Solve matrix equation \\(KU = F\\)");

    /* -------- Member forces -------- */
    const memberForces = this.elements.map((e: any, i: number) => {
      const n1 = this.nodes[e.n1];
      const n2 = this.nodes[e.n2];

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const L = Math.hypot(dx, dy);
      const c = dx / L;
      const s = dy / L;

      const u1 = U[e.n1 * 2];
      const v1 = U[e.n1 * 2 + 1];
      const u2 = U[e.n2 * 2];
      const v2 = U[e.n2 * 2 + 1];

      const strain = (-c*u1 - s*v1 + c*u2 + s*v2) / L;
      const force = e.E * e.A * strain;

      steps.push(`
\\text{Element ${i + 1} axial force: }
F = EA\\varepsilon = ${force.toFixed(3)}\\,\\text{N}
`);

      return force;
    });

    return { steps, displacements: U, memberForces };
  }

  fixDOF(K: number[][], F: number[], dof: number) {
    for (let i = 0; i < K.length; i++) {
      K[dof][i] = 0;
      K[i][dof] = 0;
    }
    K[dof][dof] = 1;
    F[dof] = 0;
  }

  gaussianSolve(A: number[][], b: number[]) {
    const n = b.length;
    for (let p = 0; p < n; p++) {
      for (let i = p + 1; i < n; i++) {
        const factor = A[i][p] / A[p][p];
        b[i] -= factor * b[p];
        for (let j = p; j < n; j++)
          A[i][j] -= factor * A[p][j];
      }
    }

    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = 0;
      for (let j = i + 1; j < n; j++) sum += A[i][j] * x[j];
      x[i] = (b[i] - sum) / A[i][i];
    }
    return x;
  }
}

/* ===================== MAIN COMPONENT ===================== */

export default function TrussSolverPage() {
  const [nodes, setNodes] = useState<Node[]>([
    { x: "0", y: "0", fixX: true, fixY: true, loadX: "0", loadY: "0" },
    { x: "1", y: "1", fixX: false, fixY: false, loadX: "0", loadY: "-10000" },
    { x: "2", y: "0", fixX: false, fixY: true, loadX: "0", loadY: "0" }
  ]);

  const [elements, setElements] = useState<Element[]>([
    { n1: "0", n2: "1", E: "200e9", A: "0.005" },
    { n1: "1", n2: "2", E: "200e9", A: "0.005" },
    { n1: "0", n2: "2", E: "200e9", A: "0.005" }
  ]);

  const [result, setResult] = useState<TrussResult | null>(null);

  const solveTruss = () => {
    const parsedNodes = nodes.map(n => ({
      x: parseFloat(n.x),
      y: parseFloat(n.y),
      fixX: n.fixX,
      fixY: n.fixY,
      loadX: parseFloat(n.loadX),
      loadY: parseFloat(n.loadY)
    }));

    const parsedElements = elements.map(e => ({
      n1: parseInt(e.n1),
      n2: parseInt(e.n2),
      E: eval(e.E),
      A: eval(e.A)
    }));

    const truss = new TrussSystem2D(parsedNodes, parsedElements);
    setResult(truss.solve());
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 text-[18px]">
      <Header />

      <main className="flex-grow flex flex-col items-center px-4 py-10">
        <h1 className="text-[32px] font-bold mb-6 text-gray-900">2D Truss Matrix Solver</h1>

        <button
          onClick={solveTruss}
          className="bg-[#1848a0] text-white px-6 py-3 rounded-lg hover:bg-[#163d8a]"
        >
          Solve Truss
        </button>

        {result && (
          <div className="w-full max-w-2xl mt-6 bg-white rounded-2xl shadow p-6 space-y-6">
            <h2 className="text-[22px] font-semibold text-gray-900">Step-by-Step Solution</h2>

            {result.steps.map((s, i) =>
              s.startsWith("Step") ? (
                <p key={i} className="font-medium text-gray-800">{s}</p>
              ) : (
                <BlockMath key={i}>{s}</BlockMath>
              )
            )}

            <h2 className="text-[22px] font-semibold text-gray-900">Member Forces (N)</h2>
            {result.memberForces.map((f, i) => (
              <p key={i} className="text-gray-800">
  Element {i + 1}: {f.toFixed(3)} N
</p>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
