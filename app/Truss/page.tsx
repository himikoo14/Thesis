"use client";

import { useState, useEffect } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

/* ── KaTeX via CDN (loaded once) ─────────────────────────────────────────── */
declare global { interface Window { katex: any } }

function KaTeX({ tex, display = false }: { tex: string; display?: boolean }) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined" && window.katex) {
      try {
        setHtml(window.katex.renderToString(tex, { displayMode: display, throwOnError: false }));
      } catch { setHtml(tex); }
    }
  }, [tex, display]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ===================== TYPES ===================== */

type Support  = { x: string; y: string; type: "Pinned" | "Roller" };
type Joint    = { x: string; y: string };
type Member   = { start: number; end: number };
type Force    = { Joint: number; magnitude: string; angle: string };
type GenericObject = Record<string, any>;

/* ── Structured step types (fed to KaTeX renderer) ───────────────────────── */
type StepLine =
  | { kind: "heading";    text: string }
  | { kind: "subheading"; text: string }
  | { kind: "text";       text: string }
  | { kind: "eq";         tex:  string }
  | { kind: "result";     tex:  string }
  | { kind: "warn";       text: string }
  | { kind: "spacer" };

type Solution = {
  lines: StepLine[];
  memberForces: number[];
  reactions: { x: number; y: number }[];
};

/* ===================== COMPONENT ===================== */

export default function TrussSolverUI() {
  /* ── KaTeX script loader ── */
  useEffect(() => {
    if (document.getElementById("katex-css")) return;
    const link = document.createElement("link");
    link.id   = "katex-css";
    link.rel  = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
    document.head.appendChild(link);

    const script   = document.createElement("script");
    script.src     = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
    script.async   = true;
    document.head.appendChild(script);
  }, []);

  /* ---------- STATE ---------- */
  const [supports, setSupports] = useState<Support[]>([
    { x: "", y: "", type: "Pinned" },
    { x: "", y: "", type: "Roller" },
  ]);
  const [nodes,    setNodes]    = useState<Joint[]>([{ x: "", y: "" }]);
  const [members,  setMembers]  = useState<Member[]>([{ start: 0, end: 1 }]);
  const [forces,   setForces]   = useState<Force[]>([{ Joint: 0, magnitude: "", angle: "" }]);
  const [solution, setSolution] = useState<Solution | null>(null);

  /* ---------- DERIVED NODES ---------- */
  const allNodes: Joint[] = [...supports.map(s => ({ x: s.x, y: s.y })), ...nodes];

  /* ---------- STYLES ---------- */
  const inputClass       = "w-full mt-1 rounded-lg border border-gray-300 text-[18px] p-2 outline-none focus:ring-0";
  const redButtonClass   = "w-10 px-2 py-0.5 bg-red-500 text-white rounded-md hover:bg-red-600 text-[20px]";
  const greenButtonClass = "px-3 py-1 bg-[#008409] text-white rounded-lg hover:bg-[#15711b] transition text-[18px]";

  /* ---------- GENERIC HANDLERS ---------- */
  const handleChange = <T extends GenericObject>(
    arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>,
    index: number, field: keyof T, value: T[keyof T]
  ) => { const a = [...arr]; a[index][field] = value; setArr(a); };

  const addItem    = <T,>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, tpl: T) => setArr([...arr, tpl]);
  const removeItem = <T,>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, i: number) => setArr(arr.filter((_, j) => j !== i));

  /* ---------- HELPERS ---------- */
  const nodeLabel = (i: number) => String.fromCharCode(65 + i);
  const n4 = (v: number) => v.toFixed(4);
  const n3 = (v: number) => v.toFixed(3);
  const fmtNum = (v: number, d = 4) => (v < 0 ? `-${Math.abs(v).toFixed(d)}` : `${v.toFixed(d)}`);
  const cosTex = (cos: number, lbl: string) => `${fmtNum(cos)} \\cdot F_{${lbl}}`;

  /* ===================== SOLVER ===================== */
  const solveTruss = () => {
    const numericNodes = allNodes.map(n => ({ x: parseFloat(n.x), y: parseFloat(n.y) }));
    const nJoints      = numericNodes.length;
    const nMembers     = members.length;
    const tolerance    = 1e-6;

    const memberForces:  number[]  = Array(nMembers).fill(0);
    const solvedMembers: boolean[] = Array(nMembers).fill(false);
    const jointMembers:  number[][] = Array.from({ length: nJoints }, () => []);
    members.forEach((mb, idx) => { jointMembers[mb.start].push(idx); jointMembers[mb.end].push(idx); });

    const lines: StepLine[] = [];
    const H  = (text: string) => lines.push({ kind: "heading",    text });
    const SH = (text: string) => lines.push({ kind: "subheading", text });
    const T  = (text: string) => lines.push({ kind: "text",       text });
    const E  = (tex:  string) => lines.push({ kind: "eq",         tex  });
    const R  = (tex:  string) => lines.push({ kind: "result",     tex  });
    const W  = (text: string) => lines.push({ kind: "warn",       text });
    const SP = ()             => lines.push({ kind: "spacer"           });

    /* ── STEP 1: Determinacy ──────────────────────────────────────────── */
    H("Step 1: Determinacy Check");
    const m_val   = nMembers;
    const j_val   = nJoints;
    const r_val   = supports.reduce((a, s) => a + (s.type === "Pinned" ? 2 : 1), 0);
    const det_val = m_val + r_val - 2 * j_val;

    T(`Members: m = ${m_val},  Joints: j = ${j_val},  Reactions: r = ${r_val}`);
    E(`m + r - 2j = ${m_val} + ${r_val} - 2(${j_val}) = ${det_val}`);
    if      (det_val === 0) R("\\checkmark\\ \\text{Statically Determinate and stable}");
    else if (det_val < 0)   W("✘  Mechanism (unstable) — check inputs.");
    else                    W("✘  Statically Indeterminate — this solver handles determinate trusses only.");
    SP();

    /* ── STEP 2: Support Reactions ────────────────────────────────────── */
    H("Step 2: Support Reactions");
    const reactions: { x: number; y: number }[] = numericNodes.map(() => ({ x: 0, y: 0 }));

    let totalFx = 0, totalFy = 0;
    forces.forEach(f => {
      const mag = parseFloat(f.magnitude) || 0;
      const ang = (parseFloat(f.angle) || 0) * Math.PI / 180;
      totalFx += mag * Math.cos(ang);
      totalFy += mag * Math.sin(ang);
    });

    SH("Applied external loads:");
    forces.forEach((f, i) => {
      const mag  = parseFloat(f.magnitude) || 0;
      const ang  = parseFloat(f.angle) || 0;
      const angR = ang * Math.PI / 180;
      const fx   = mag * Math.cos(angR);
      const fy   = mag * Math.sin(angR);
      T(`F${i + 1} at Joint ${nodeLabel(f.Joint)}: ${mag} kN @ ${ang}°`);
      E(`F_{x${i+1}} = ${mag}\\cos(${ang}^\\circ) = ${n3(fx)}\\ \\text{kN}`);
      E(`F_{y${i+1}} = ${mag}\\sin(${ang}^\\circ) = ${n3(fy)}\\ \\text{kN}`);
    });
    E(`\\Sigma F_x = ${n3(totalFx)}\\ \\text{kN}, \\quad \\Sigma F_y = ${n3(totalFy)}\\ \\text{kN}`);
    SP();

    if (supports.length === 2) {
      const labelA = nodeLabel(0);
      const labelB = nodeLabel(1);
      const node1  = numericNodes[0];
      const node2  = numericNodes[1];

      let momentA = 0;
      forces.forEach(f => {
        const mag = parseFloat(f.magnitude) || 0;
        const ang = (parseFloat(f.angle) || 0) * Math.PI / 180;
        const fy  = mag * Math.sin(ang);
        const dx  = numericNodes[f.Joint].x - node1.x;
        momentA  += fy * dx;
      });
      const dxSup = node2.x - node1.x;
      const Ry2   = dxSup !== 0 ? momentA / dxSup : 0;
      const Ry1   = totalFy - Ry2;
      const Rx1   = -totalFx;

      reactions[0] = { x: Rx1, y: Ry1 };
      reactions[1] = { x: 0,   y: Ry2 };

      SH(`Moment about Joint ${labelA}  (ΣM = 0):`);
      forces.forEach(f => {
        const mag = parseFloat(f.magnitude) || 0;
        const ang = (parseFloat(f.angle) || 0) * Math.PI / 180;
        const fy  = mag * Math.sin(ang);
        const dx  = numericNodes[f.Joint].x - node1.x;
        E(`F_{y} \\times d = ${n3(fy)} \\times ${n3(dx)} = ${n3(fy * dx)}\\ \\text{kN{\\cdot}m}`);
      });
      E(`R_{y${labelB}} \\times ${n3(dxSup)} = ${n3(momentA)}`);
      R(`R_{y${labelB}} = ${n3(Ry2)}\\ \\text{kN}`);
      SP();

      SH("ΣFy = 0:");
      E(`R_{y${labelA}} + R_{y${labelB}} = ${n3(totalFy)}`);
      E(`R_{y${labelA}} = ${n3(totalFy)} - ${n3(Ry2)}`);
      R(`R_{y${labelA}} = ${n3(Ry1)}\\ \\text{kN}`);
      SP();

      SH("ΣFx = 0:");
      E(`R_{x${labelA}} = -(${n3(totalFx)})`);
      R(`R_{x${labelA}} = ${n3(Rx1)}\\ \\text{kN}`);
      SP();
    }

    /* ── build net joint forces ── */
    const extF: { x: number; y: number }[] = numericNodes.map((_, idx) => ({
      x: reactions[idx]?.x || 0,
      y: reactions[idx]?.y || 0,
    }));
    forces.forEach(f => {
      const mag = parseFloat(f.magnitude) || 0;
      const ang = (parseFloat(f.angle) || 0) * Math.PI / 180;
      extF[f.Joint].x += mag * Math.cos(ang);
      extF[f.Joint].y += mag * Math.sin(ang);
    });

    /* ── STEP 3: Method of Joints ─────────────────────────────────────── */
    H("Step 3: Method of Joints");
    T("Convention: (+) = Tension,  (−) = Compression");
    SP();

    let progress = true;
    let iter = 0;
    while (progress && iter < nJoints * 2) {
      progress = false;
      iter++;

      for (let jIdx = 0; jIdx < nJoints; jIdx++) {
        const connected = jointMembers[jIdx];
        const unknowns  = connected.filter(i => !solvedMembers[i]);
        if (unknowns.length === 0 || unknowns.length > 2) continue;

        const lbl = nodeLabel(jIdx);
        SH(`Joint ${lbl}`);
        T(`Connected: ${connected.map(u => { const mb = members[u]; return `${nodeLabel(mb.start)}${nodeLabel(mb.end)}`; }).join(", ")}`);
        T(`Unknowns:  ${unknowns.map(u  => { const mb = members[u]; return `${nodeLabel(mb.start)}${nodeLabel(mb.end)}`; }).join(", ")}`);
        SP();

        const rowX: number[] = [];
        const rowY: number[] = [];
        let fxK = extF[jIdx].x;
        let fyK = extF[jIdx].y;

        connected.forEach(mIdx => {
          if (solvedMembers[mIdx]) {
            const mb    = members[mIdx];
            const other = mb.start === jIdx ? mb.end : mb.start;
            const dx = numericNodes[other].x - numericNodes[jIdx].x;
            const dy = numericNodes[other].y - numericNodes[jIdx].y;
            const L  = Math.hypot(dx, dy);
            const f  = memberForces[mIdx];
            fxK -= f * (dx / L);
            fyK -= f * (dy / L);
          }
        });

        const cosines: { dx: number; dy: number; L: number; label: string }[] = [];
        unknowns.forEach(mIdx => {
          const mb    = members[mIdx];
          const other = mb.start === jIdx ? mb.end : mb.start;
          const dx = numericNodes[other].x - numericNodes[jIdx].x;
          const dy = numericNodes[other].y - numericNodes[jIdx].y;
          const L  = Math.hypot(dx, dy);
          rowX.push(dx / L);
          rowY.push(dy / L);
          cosines.push({ dx, dy, L, label: `${nodeLabel(mb.start)}${nodeLabel(mb.end)}` });
        });

        if (unknowns.length === 1) {
          const c = cosines[0];
          E(`L_{${c.label}} = \\sqrt{(${n3(c.dx)})^2 + (${n3(c.dy)})^2} = ${n4(c.L)}\\ \\text{m}`);
          E(`\\cos_x = ${n4(c.dx / c.L)},\\quad \\cos_y = ${n4(c.dy / c.L)}`);
          E(`\\Sigma F_x = 0:\\quad ${cosTex(c.dx / c.L, c.label)} + (${n4(fxK)}) = 0`);
          E(`\\Sigma F_y = 0:\\quad ${cosTex(c.dy / c.L, c.label)} + (${n4(fyK)}) = 0`);

          const denom = rowX[0] ** 2 + rowY[0] ** 2;
          const f     = -(fxK * rowX[0] + fyK * rowY[0]) / denom;
          memberForces[unknowns[0]]  = f;
          solvedMembers[unknowns[0]] = true;
          progress = true;

          const type = Math.abs(f) < tolerance ? "\\text{Zero-force}" : f > 0 ? "\\text{Tension}" : "\\text{Compression}";
          R(`F_{${c.label}} = ${n4(f)}\\ \\text{kN}\\quad (${type})`);

        } else if (unknowns.length === 2) {
          const [c0, c1] = cosines;
          E(`L_{${c0.label}} = ${n4(c0.L)}\\ \\text{m},\\quad \\cos_x = ${n4(rowX[0])},\\quad \\cos_y = ${n4(rowY[0])}`);
          E(`L_{${c1.label}} = ${n4(c1.L)}\\ \\text{m},\\quad \\cos_x = ${n4(rowX[1])},\\quad \\cos_y = ${n4(rowY[1])}`);
          E(`\\Sigma F_x = 0:\\quad ${cosTex(rowX[0], c0.label)} + ${cosTex(rowX[1], c1.label)} + (${n4(fxK)}) = 0`);
          E(`\\Sigma F_y = 0:\\quad ${cosTex(rowY[0], c0.label)} + ${cosTex(rowY[1], c1.label)} + (${n4(fyK)}) = 0`);

          const det = rowX[0] * rowY[1] - rowX[1] * rowY[0];
          if (Math.abs(det) < tolerance) {
            W(`✘  Singular system at Joint ${lbl} (det ≈ 0) — skipping.`);
            SP();
            continue;
          }

          const f1 = (-fxK * rowY[1] + fyK * rowX[1]) / det;
          const f2 = ( fxK * rowY[0] - fyK * rowX[0]) / det;
          memberForces[unknowns[0]]  = f1;
          memberForces[unknowns[1]]  = f2;
          solvedMembers[unknowns[0]] = true;
          solvedMembers[unknowns[1]] = true;
          progress = true;

          E(`\\Delta = ${n4(rowX[0])} \\cdot ${n4(rowY[1])} - ${n4(rowX[1])} \\cdot ${n4(rowY[0])} = ${n4(det)}`);
          const t1 = Math.abs(f1) < tolerance ? "\\text{Zero-force}" : f1 > 0 ? "\\text{Tension}" : "\\text{Compression}";
          const t2 = Math.abs(f2) < tolerance ? "\\text{Zero-force}" : f2 > 0 ? "\\text{Tension}" : "\\text{Compression}";
          R(`F_{${c0.label}} = ${n4(f1)}\\ \\text{kN}\\quad (${t1})`);
          R(`F_{${c1.label}} = ${n4(f2)}\\ \\text{kN}\\quad (${t2})`);
        }
        SP();
      }
    }

    const unsolvedIdx = members.map((_, i) => i).filter(i => !solvedMembers[i]);
    if (unsolvedIdx.length > 0) {
      W(`⚠  Could not solve: ${unsolvedIdx.map(i => { const mb = members[i]; return `${nodeLabel(mb.start)}${nodeLabel(mb.end)}`; }).join(", ")}.`);
    }

    setSolution({ lines, memberForces, reactions });
  };

  /* ---------- FBD HELPERS ---------- */
  const svgSize      = 360;
  const padding      = 40;
  const numericNodes = allNodes.map(n => ({ x: parseFloat(n.x || "0"), y: parseFloat(n.y || "0") }));

  /* ===================== JSX ===================== */
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <main className="flex-grow px-6 py-10 max-w-6xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-center mb-2">Truss Calculator</h1>
        <h2 className="text-xl font-semibold text-center mb-6">Real-Time Free Body Diagram</h2>

        {/* ── FBD ── */}
        <div className="relative rounded-xl shadow h-[420px] mb-8 overflow-hidden bg-white">
          <svg viewBox={`0 0 ${svgSize} ${svgSize}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            {(() => {
              const minY = Math.min(...numericNodes.map(n => n.y), 0);
              const maxY = Math.max(...numericNodes.map(n => n.y), 1);
              const minX = Math.min(...numericNodes.map(n => n.x), 0);
              const maxX = Math.max(...numericNodes.map(n => n.x), 1);
              const scale   = (svgSize - 2 * padding) / ((maxY - minY) || 1);
              const xOffset = (svgSize - (maxX - minX) * scale) / 2 - minX * scale;
              const sx = (x: number) => x * scale + xOffset;
              const sy = (y: number) => svgSize - padding - (y - minY) * scale;
              return (
                <>
                  <line x1={sx(minX)} y1={sy(0)}   x2={sx(maxX)} y2={sy(0)}   stroke="gray" />
                  <line x1={sx(0)}    y1={sy(minY)} x2={sx(0)}    y2={sy(maxY)} stroke="gray" />
                  {members.map((m, i) => {
                    const n1 = numericNodes[m.start], n2 = numericNodes[m.end];
                    if (!n1 || !n2) return null;
                    return <line key={`m-${i}`} x1={sx(n1.x)} y1={sy(n1.y)} x2={sx(n2.x)} y2={sy(n2.y)} stroke="black" strokeWidth={2} />;
                  })}
                  {numericNodes.map((n, i) => (
                    <g key={`j-${i}`}>
                      <circle cx={sx(n.x)} cy={sy(n.y)} r={5} fill="blue" />
                      <text x={sx(n.x) + 6} y={sy(n.y) - 6} fontSize="12">{nodeLabel(i)}</text>
                    </g>
                  ))}
                  {supports.map((s, i) => {
                    const n = numericNodes[i];
                    if (!n) return null;
                    return s.type === "Pinned"
                      ? <polygon key={`s-${i}`} points={`${sx(n.x)-8},${sy(n.y)+10} ${sx(n.x)+8},${sy(n.y)+10} ${sx(n.x)},${sy(n.y)}`} fill="gray" />
                      : <rect    key={`s-${i}`} x={sx(n.x)-8} y={sy(n.y)+2} width={16} height={6} fill="gray" />;
                  })}
                  {forces.map((f, i) => {
                    const n = numericNodes[f.Joint];
                    if (!n) return null;
                    const ang = (parseFloat(f.angle || "0") * Math.PI) / 180;
                    const len = 30;
                    const x1 = sx(n.x), y1 = sy(n.y);
                    return <line key={`f-${i}`} x1={x1} y1={y1} x2={x1 + len * Math.cos(ang)} y2={y1 - len * Math.sin(ang)} stroke="red" strokeWidth={2} markerEnd="url(#arrow)" />;
                  })}
                </>
              );
            })()}
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="red" />
              </marker>
            </defs>
          </svg>
        </div>

        {/* ── INPUT PANELS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {/* Supports */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-xl font-semibold mb-2">Supports</h3>
            {supports.map((s, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 items-end mb-2">
                <span className="font-medium text-[18px]">Joint {nodeLabel(i)}</span>
                <input type="number" placeholder="x" value={s.x} onChange={e => handleChange(supports, setSupports, i, "x", e.target.value)} className={inputClass} />
                <input type="number" placeholder="y" value={s.y} onChange={e => handleChange(supports, setSupports, i, "y", e.target.value)} className={inputClass} />
                <select value={s.type} onChange={e => handleChange(supports, setSupports, i, "type", e.target.value)} className={inputClass}>
                  <option>Pinned</option><option>Roller</option>
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
                <input type="number" placeholder="x" value={n.x} onChange={e => handleChange(nodes, setNodes, i, "x", e.target.value)} className={inputClass} />
                <input type="number" placeholder="y" value={n.y} onChange={e => handleChange(nodes, setNodes, i, "y", e.target.value)} className={inputClass} />
                {nodes.length > 1 && <button onClick={() => removeItem(nodes, setNodes, i)} className={redButtonClass}>–</button>}
              </div>
            ))}
            <button onClick={() => addItem(nodes, setNodes, { x: "", y: "" })} className={greenButtonClass}>+ Add Joint</button>
          </div>

          {/* Members */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-xl font-semibold mb-2">Members</h3>
            <div className="grid grid-cols-4 gap-2 items-end mb-2">
              <span className="text-[16px] font-medium text-gray-700"> </span>
              <span className="text-[16px] font-medium text-gray-700">Start Joint</span>
              <span className="text-[16px] font-medium text-gray-700">End Joint</span>
              <span className="text-[16px] font-medium text-gray-700"> </span>
            </div>
            {members.map((m, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-end mb-2">
                <span className="font-medium text-[18px]">Member {nodeLabel(m.start)}{nodeLabel(m.end)}</span>
                <select value={m.start} onChange={e => handleChange(members, setMembers, i, "start", Number(e.target.value))} className={inputClass}>
                  {allNodes.map((_, idx) => <option key={idx} value={idx}>Joint {nodeLabel(idx)}</option>)}
                </select>
                <select value={m.end} onChange={e => handleChange(members, setMembers, i, "end", Number(e.target.value))} className={inputClass}>
                  {allNodes.map((_, idx) => <option key={idx} value={idx}>Joint {nodeLabel(idx)}</option>)}
                </select>
                {members.length > 1 ? <button onClick={() => removeItem(members, setMembers, i)} className={redButtonClass}>–</button> : <div />}
              </div>
            ))}
            <button onClick={() => addItem(members, setMembers, { start: 0, end: 0 })} className={greenButtonClass}>+ Add Member</button>
          </div>

          {/* Forces */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="text-xl font-semibold mb-2">Forces</h3>
            {forces.map((f, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-end mb-2">
                <select value={f.Joint} onChange={e => handleChange(forces, setForces, i, "Joint", Number(e.target.value))} className={inputClass}>
                  {allNodes.map((_, idx) => <option key={idx} value={idx}>Joint {String.fromCharCode(65 + idx)}</option>)}
                </select>
                <input type="number" placeholder="kN"  value={f.magnitude} onChange={e => handleChange(forces, setForces, i, "magnitude", e.target.value)} className={inputClass} />
                <input type="number" placeholder="deg" value={f.angle}     onChange={e => handleChange(forces, setForces, i, "angle",     e.target.value)} className={inputClass} />
                {forces.length > 1 && <button onClick={() => removeItem(forces, setForces, i)} className={redButtonClass}>–</button>}
              </div>
            ))}
            <button onClick={() => addItem(forces, setForces, { Joint: 0, magnitude: "", angle: "" })} className={greenButtonClass}>+ Add Force</button>
          </div>
        </div>

        <button
          className="w-full bg-[#1848a0] hover:bg-[#163d8a] text-white py-3 rounded-lg font-semibold mb-6 transition"
          onClick={solveTruss}
        >
          Calculate
        </button>

        {/* ══════════════ SOLUTION DISPLAY ══════════════ */}
        {solution && (
          <>
            {/* Member Forces card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-[15px] font-semibold text-gray-800 tracking-wide">Member Forces</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {solution.memberForces.map((f, i) => {
                  const tol   = 1e-6;
                  const type  = Math.abs(f) < tol ? "Zero-force" : f > 0 ? "Tension" : "Compression";
                  const lS    = String.fromCharCode(65 + members[i].start);
                  const lE    = String.fromCharCode(65 + members[i].end);
                  const color = Math.abs(f) < tol ? "text-gray-400" : f > 0 ? "text-blue-600" : "text-red-600";
                  const badge = Math.abs(f) < tol ? "bg-gray-100 text-gray-500" : f > 0 ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600";
                  return (
                    <div key={i} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <span className="text-[13px] text-gray-500 uppercase tracking-wider">Member </span>
                        <span className="text-[15px] font-semibold text-gray-800">{lS}{lE}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[15px] font-mono font-semibold ${color}`}>
                          {f > 0 ? "+" : ""}{f.toFixed(4)} kN
                        </span>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badge}`}>{type}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Support Reactions card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-[15px] font-semibold text-gray-800 tracking-wide">Support Reactions</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {solution.reactions.map((r, i) => {
                  if (Math.abs(r.x) < 1e-6 && Math.abs(r.y) < 1e-6) return null;
                  const hasRx = Math.abs(r.x) > 1e-6;
                  const label = nodeLabel(i);
                  const sType = i < supports.length ? supports[i].type : "";
                  return (
                    <div key={i} className="px-5 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[14px] font-semibold text-gray-800">Joint {label}</span>
                        <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{sType}</span>
                      </div>
                      <div className="flex gap-8">
                        {hasRx && (
                          <div>
                            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Horizontal (R<sub>x</sub>)</p>
                            <KaTeX tex={`${r.x.toFixed(4)}\\ \\text{kN}`} />
                          </div>
                        )}
                        <div>
                          <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Vertical (R<sub>y</sub>)</p>
                          <KaTeX tex={`${r.y.toFixed(4)}\\ \\text{kN}`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step-by-Step Solution card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-[15px] font-semibold text-gray-800 tracking-wide">Step-by-Step Solution</h3>
              </div>
              <div className="px-6 py-5 space-y-0.5">
                {solution.lines.map((line, idx) => {
                  switch (line.kind) {

                    case "heading":
                      return (
                        <div key={idx} className="pt-5 pb-1 first:pt-0">
                          <h4 className="text-[12px] font-bold text-[#1848a0] uppercase tracking-widest border-b border-blue-100 pb-1.5">
                            {line.text}
                          </h4>
                        </div>
                      );

                    case "subheading":
                      return (
                        <p key={idx} className="text-[13px] font-semibold text-gray-600 pt-3 pb-0.5 pl-1">
                          {line.text}
                        </p>
                      );

                    case "text":
                      return (
                        <p key={idx} className="text-[13px] text-gray-500 leading-relaxed pl-2">
                          {line.text}
                        </p>
                      );

                    case "eq":
                      return (
                        <div key={idx} className="py-1 pl-6 overflow-x-auto">
                          <KaTeX tex={line.tex} display />
                        </div>
                      );

                    case "result":
                      return (
                        <div key={idx} className="py-1 pl-6 flex items-center gap-2 bg-green-50/60 rounded-lg my-1 pr-3">
                          <span className="text-green-500 text-[15px] font-bold flex-shrink-0 pl-1">✓</span>
                          <div className="overflow-x-auto">
                            <KaTeX tex={line.tex} display />
                          </div>
                        </div>
                      );

                    case "warn":
                      return (
                        <p key={idx} className="text-[13px] text-red-500 font-medium pl-2 py-1">
                          {line.text}
                        </p>
                      );

                    case "spacer":
                      return <div key={idx} className="h-2" />;

                    default:
                      return null;
                  }
                })}
              </div>
            </div>
          </>
        )}

      </main>
      <Footer />
    </div>
  );
}