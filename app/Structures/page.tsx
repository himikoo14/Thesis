"use client";

import { useState, useEffect } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

/* ===================== KATEX LOADER ===================== */
// KaTeX is loaded via CDN in useEffect
declare global {
  interface Window {
    katex: any;
  }
}

function KaTeX({ math, block = false }: { math: string; block?: boolean }) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    const render = () => {
      if (window.katex) {
        try {
          setHtml(window.katex.renderToString(math, { displayMode: block, throwOnError: false }));
        } catch {
          setHtml(math);
        }
      }
    };

    if (window.katex) {
      render();
    } else {
      // Load KaTeX if not yet loaded
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
      script.onload = render;
      document.head.appendChild(script);
    }
  }, [math, block]);

  if (block) {
    return <div className="overflow-x-auto py-1" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ===================== TYPES ===================== */
type Support = { x: string; y: string; type: "Pinned" | "Roller" };
type Joint = { x: string; y: string };
type Member = { start: number; end: number };
type Force = { Joint: number; magnitude: string; angle: string };
type GenericObject = Record<string, any>;

/* ===================== STRUCTURED STEP ===================== */
type SolutionStep = {
  title: string;
  lines: { label: string; latex: string }[];
};

type Solution = {
  steps: SolutionStep[];
  memberForces: number[];
  reactions: { x: number; y: number }[];
};

/* ===================== COMPONENT ===================== */
export default function TrussSolverUI() {
  const [supports, setSupports] = useState<Support[]>([
    { x: "", y: "", type: "Pinned" },
    { x: "", y: "", type: "Roller" },
  ]);
  const [nodes, setNodes] = useState<Joint[]>([{ x: "", y: "" }]);
  const [members, setMembers] = useState<Member[]>([{ start: 0, end: 1 }]);
  const [forces, setForces] = useState<Force[]>([{ Joint: 0, magnitude: "", angle: "" }]);
  const [solution, setSolution] = useState<Solution | null>(null);

  const allNodes: Joint[] = [...supports.map(s => ({ x: s.x, y: s.y })), ...nodes];

  const inputClass = "w-full mt-1 rounded-lg border border-gray-300 text-[16px] p-2 outline-none focus:ring-2 focus:ring-blue-300";
  const redButtonClass = "w-10 px-2 py-0.5 bg-red-500 text-white rounded-md hover:bg-red-600 text-[20px]";
  const greenButtonClass = "px-3 py-1 bg-[#15711b] text-white rounded-lg hover:bg-[#0f5414] text-[16px]";

  const handleChange = <T extends GenericObject>(
    arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>,
    index: number, field: keyof T, value: T[keyof T]
  ) => { const newArr = [...arr]; newArr[index][field] = value; setArr(newArr); };

  const addItem = <T,>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, template: T) =>
    setArr([...arr, template]);
  const removeItem = <T,>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, index: number) =>
    setArr(arr.filter((_, i) => i !== index));

  const nodeLabel = (i: number) => String.fromCharCode(65 + i);

  /* ===================== SOLVER ===================== */
  const solveTruss = () => {
    const numericNodes = allNodes.map(n => ({ x: parseFloat(n.x), y: parseFloat(n.y) }));
    const nMembers = members.length;
    const nJoints = numericNodes.length;
    const memberForces: number[] = Array(nMembers).fill(0);
    const solvedMembers: boolean[] = Array(nMembers).fill(false);
    const jointMembers: number[][] = Array.from({ length: nJoints }, () => []);
    members.forEach((m, idx) => { jointMembers[m.start].push(idx); jointMembers[m.end].push(idx); });

    let reactions: { x: number; y: number }[] = numericNodes.map(() => ({ x: 0, y: 0 }));
    const steps: SolutionStep[] = [];

    // ---- Step 1: Reactions ----
    const reactionStep: SolutionStep = {
      title: "Step 1: Support Reactions",
      lines: [],
    };

    if (supports.length === 2) {
      const [i1, i2] = [0, 1];
      const node1 = numericNodes[i1];
      const node2 = numericNodes[i2];

      let momentSum = 0;
      let totalFy = 0;
      let totalFx = 0;

      const momentTerms: string[] = [];
      const fyTerms: string[] = [];
      const fxTerms: string[] = [];

      forces.forEach(f => {
        const mag = parseFloat(f.magnitude) || 0;
        const angleDeg = parseFloat(f.angle) || 0;
        const angle = (angleDeg * Math.PI) / 180;
        const Fy = mag * Math.sin(angle);
        const Fx = mag * Math.cos(angle);
        const dx = numericNodes[f.Joint].x - node1.x;
        momentSum += Fy * dx;
        totalFy += Fy;
        totalFx += Fx;

        const jLabel = nodeLabel(f.Joint);
        momentTerms.push(`${mag.toFixed(1)}\\sin(${angleDeg}^\\circ)(${dx.toFixed(1)})`);
        fyTerms.push(`${mag.toFixed(1)}\\sin(${angleDeg}^\\circ)`);
        fxTerms.push(`${mag.toFixed(1)}\\cos(${angleDeg}^\\circ)`);
      });

      const dxSupport = node2.x - node1.x;
      const Fy2 = dxSupport !== 0 ? momentSum / dxSupport : 0;
      const Fy1 = totalFy - Fy2;

      reactions[i1].y = Fy1;
      reactions[i2].y = Fy2;
      reactions[i1].x = -totalFx;

      const A = nodeLabel(i1);
      const B = nodeLabel(i2);

      reactionStep.lines.push({
        label: `Moment about ${A}`,
        latex: `\\sum M_{${A}} = 0: \\quad R_{${B}y}(${dxSupport.toFixed(1)}) = ${momentTerms.join(" + ") || "0"}`,
      });
      reactionStep.lines.push({
        label: `Reaction at ${B}`,
        latex: `R_{${B}y} = ${Fy2.toFixed(3)} \\text{ kN}`,
      });
      reactionStep.lines.push({
        label: `Vertical equilibrium`,
        latex: `\\sum F_y = 0: \\quad R_{${A}y} = ${totalFy.toFixed(3)} - ${Fy2.toFixed(3)} = ${Fy1.toFixed(3)} \\text{ kN}`,
      });
      reactionStep.lines.push({
        label: `Horizontal equilibrium`,
        latex: `\\sum F_x = 0: \\quad R_{${A}x} = -${totalFx.toFixed(3)} = ${(-totalFx).toFixed(3)} \\text{ kN}`,
      });
    }

    steps.push(reactionStep);

    // ---- Step 2+: Method of Joints ----
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

    const tolerance = 1e-6;
    let progress = true;
    let stepNum = 2;

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

        const fxLatexTerms: string[] = [];
        const fyLatexTerms: string[] = [];

        // Add external force/reaction to latex
        if (Math.abs(externalForces[j].x) > tolerance) {
          fxLatexTerms.push((externalForces[j].x).toFixed(3));
        }
        if (Math.abs(externalForces[j].y) > tolerance) {
          fyLatexTerms.push((externalForces[j].y).toFixed(3));
        }

        unknowns.forEach(mIdx => {
          const m = members[mIdx];
          const other = m.start === j ? m.end : m.start;
          const dx = numericNodes[other].x - numericNodes[j].x;
          const dy = numericNodes[other].y - numericNodes[j].y;
          const L = Math.hypot(dx, dy);
          const cx = dx / L;
          const cy = dy / L;
          rowX.push(cx);
          rowY.push(cy);

          const mLabel = `F_{${nodeLabel(m.start)}${nodeLabel(m.end)}}`;
          fxLatexTerms.push(`${cx.toFixed(4)} ${mLabel}`);
          fyLatexTerms.push(`${cy.toFixed(4)} ${mLabel}`);
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

        const jStep: SolutionStep = {
          title: `Step ${stepNum}: Joint ${nodeLabel(j)}`,
          lines: [],
        };

        jStep.lines.push({
          label: "ΣFx = 0",
          latex: `\\sum F_x = 0: \\quad ${fxLatexTerms.join(" + ")} = 0`,
        });
        jStep.lines.push({
          label: "ΣFy = 0",
          latex: `\\sum F_y = 0: \\quad ${fyLatexTerms.join(" + ")} = 0`,
        });

        if (unknowns.length === 1) {
          const f = (fxKnown * rowX[0] + fyKnown * rowY[0]) / (rowX[0] ** 2 + rowY[0] ** 2);
          memberForces[unknowns[0]] = f;
          solvedMembers[unknowns[0]] = true;
          progress = true;
          const m = members[unknowns[0]];
          const mLabel = `F_{${nodeLabel(m.start)}${nodeLabel(m.end)}}`;
          const type = f >= 0 ? "\\text{T}" : "\\text{C}";
          jStep.lines.push({
            label: "Result",
            latex: `${mLabel} = ${f.toFixed(4)} \\text{ kN} \\quad (${type})`,
          });
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
          const m1 = members[unknowns[0]];
          const m2 = members[unknowns[1]];
          jStep.lines.push({
            label: "Results",
            latex: `F_{${nodeLabel(m1.start)}${nodeLabel(m1.end)}} = ${f1.toFixed(4)} \\text{ kN} \\;(${f1 >= 0 ? "\\text{T}" : "\\text{C}"}), \\quad F_{${nodeLabel(m2.start)}${nodeLabel(m2.end)}} = ${f2.toFixed(4)} \\text{ kN} \\;(${f2 >= 0 ? "\\text{T}" : "\\text{C}"})`,
          });
        }

        steps.push(jStep);
        stepNum++;
      }
    }

    // Final summary step
    const summaryStep: SolutionStep = {
      title: "Summary: Member Forces",
      lines: memberForces.map((f, i) => {
        const m = members[i];
        const type = f >= 0 ? "\\text{Tension}" : "\\text{Compression}";
        return {
          label: `Member ${nodeLabel(m.start)}${nodeLabel(m.end)}`,
          latex: `F_{${nodeLabel(m.start)}${nodeLabel(m.end)}} = ${Math.abs(f).toFixed(4)} \\text{ kN} \\quad (${type})`,
        };
      }),
    };
    steps.push(summaryStep);

    setSolution({ steps, memberForces, reactions });
  };

  /* ===================== SVG DIAGRAM ===================== */
  const svgSize = 360;
  const padding = 48;

  const numericNodes = allNodes.map(n => ({
    x: parseFloat(n.x || "0"),
    y: parseFloat(n.y || "0"),
  }));

  const minX = Math.min(...numericNodes.map(n => n.x), 0);
  const maxX = Math.max(...numericNodes.map(n => n.x), 1);
  const minY = Math.min(...numericNodes.map(n => n.y), 0);
  const maxY = Math.max(...numericNodes.map(n => n.y), 1);
  const xRange = maxX - minX || 1;
  const yRange = maxY - minY || 1;
  const scale = Math.min((svgSize - 2 * padding) / xRange, (svgSize - 2 * padding) / yRange);
  const totalWidth = xRange * scale;
  const xOffset = (svgSize - totalWidth) / 2 - minX * scale;
  const toSvgX = (x: number) => x * scale + xOffset;
  const toSvgY = (y: number) => svgSize - padding - (y - minY) * scale;

  /* ===================== RENDER ===================== */
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <main className="flex-grow px-6 py-10 max-w-6xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-center mb-2">Truss Calculator</h1>
        <h2 className="text-xl font-semibold text-center mb-6 text-gray-600">Method of Joints — Real-Time Free Body Diagram</h2>

        {/* FBD */}
        <div className="relative rounded-xl shadow h-[400px] mb-8 overflow-hidden bg-white border border-gray-200">
          <svg viewBox={`0 0 ${svgSize} ${svgSize}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="red" />
              </marker>
              <marker id="reactionArrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#16a34a" />
              </marker>
            </defs>

            {/* Grid lines */}
            <line x1={padding / 2} y1={toSvgY(0)} x2={svgSize - padding / 2} y2={toSvgY(0)} stroke="#e5e7eb" strokeWidth={1} />
            <line x1={toSvgX(0)} y1={padding / 2} x2={toSvgX(0)} y2={svgSize - padding / 2} stroke="#e5e7eb" strokeWidth={1} />

            {/* Members */}
            {members.map((m, i) => {
              const n1 = numericNodes[m.start];
              const n2 = numericNodes[m.end];
              if (!n1 || !n2) return null;
              const force = solution?.memberForces[i];
              const color = force === undefined ? "#1e3a5f" : force >= 0 ? "#dc2626" : "#2563eb";
              return (
                <line key={`m-${i}`}
                  x1={toSvgX(n1.x)} y1={toSvgY(n1.y)}
                  x2={toSvgX(n2.x)} y2={toSvgY(n2.y)}
                  stroke={color} strokeWidth={2.5}
                />
              );
            })}

            {/* Member force labels */}
            {solution && members.map((m, i) => {
              const n1 = numericNodes[m.start];
              const n2 = numericNodes[m.end];
              if (!n1 || !n2) return null;
              const mx = (toSvgX(n1.x) + toSvgX(n2.x)) / 2;
              const my = (toSvgY(n1.y) + toSvgY(n2.y)) / 2;
              const f = solution.memberForces[i];
              return (
                <text key={`fl-${i}`} x={mx} y={my - 5} fontSize="9" fill={f >= 0 ? "#dc2626" : "#2563eb"} textAnchor="middle">
                  {Math.abs(f).toFixed(1)}{f >= 0 ? "T" : "C"}
                </text>
              );
            })}

            {/* Supports */}
            {supports.map((s, i) => {
              const n = numericNodes[i];
              if (!n) return null;
              const cx = toSvgX(n.x);
              const cy = toSvgY(n.y);
              return s.type === "Pinned" ? (
                <g key={`sup-${i}`}>
                  <polygon points={`${cx - 10},${cy + 14} ${cx + 10},${cy + 14} ${cx},${cy}`} fill="#6b7280" />
                  <line x1={cx - 13} y1={cy + 16} x2={cx + 13} y2={cy + 16} stroke="#6b7280" strokeWidth={2} />
                </g>
              ) : (
                <g key={`sup-${i}`}>
                  <rect x={cx - 8} y={cy + 2} width={16} height={6} rx={2} fill="#6b7280" />
                  <circle cx={cx - 5} cy={cy + 12} r={3} fill="#6b7280" />
                  <circle cx={cx + 5} cy={cy + 12} r={3} fill="#6b7280" />
                </g>
              );
            })}

            {/* Joints */}
            {numericNodes.map((n, i) => (
              <g key={`j-${i}`}>
                <circle cx={toSvgX(n.x)} cy={toSvgY(n.y)} r={6} fill="#1d4ed8" stroke="white" strokeWidth={1.5} />
                <text x={toSvgX(n.x) + 9} y={toSvgY(n.y) - 7} fontSize="12" fontWeight="bold" fill="#1e293b">
                  {nodeLabel(i)}
                </text>
              </g>
            ))}

            {/* Applied Forces */}
            {forces.map((f, i) => {
              const n = numericNodes[f.Joint];
              if (!n) return null;
              const angle = (parseFloat(f.angle || "0") * Math.PI) / 180;
              const len = 36;
              const x1 = toSvgX(n.x);
              const y1 = toSvgY(n.y);
              const x2 = x1 + len * Math.cos(angle);
              const y2 = y1 - len * Math.sin(angle);
              return (
                <g key={`f-${i}`}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="red" strokeWidth={2} markerEnd="url(#arrow)" />
                  <text x={x2 + 3} y={y2 - 3} fontSize="9" fill="red">{f.magnitude}kN</text>
                </g>
              );
            })}

            {/* Reaction Forces (shown after solve) */}
            {solution && solution.reactions.map((r, i) => {
              const n = numericNodes[i];
              if (!n) return null;
              const len = 30;
              const elements = [];
              if (Math.abs(r.x) > 0.001) {
                const x2 = toSvgX(n.x) + (r.x > 0 ? len : -len);
                elements.push(
                  <g key={`rx-${i}`}>
                    <line x1={toSvgX(n.x)} y1={toSvgY(n.y)} x2={x2} y2={toSvgY(n.y)} stroke="#16a34a" strokeWidth={2} markerEnd="url(#reactionArrow)" />
                    <text x={x2 + (r.x > 0 ? 2 : -20)} y={toSvgY(n.y) - 4} fontSize="9" fill="#16a34a">{Math.abs(r.x).toFixed(1)}</text>
                  </g>
                );
              }
              if (Math.abs(r.y) > 0.001) {
                const y2 = toSvgY(n.y) + (r.y > 0 ? -len : len);
                elements.push(
                  <g key={`ry-${i}`}>
                    <line x1={toSvgX(n.x)} y1={toSvgY(n.y)} x2={toSvgX(n.x)} y2={y2} stroke="#16a34a" strokeWidth={2} markerEnd="url(#reactionArrow)" />
                    <text x={toSvgX(n.x) + 3} y={y2 - 3} fontSize="9" fill="#16a34a">{Math.abs(r.y).toFixed(1)}</text>
                  </g>
                );
              }
              return elements;
            })}
          </svg>

          {/* Legend */}
          {solution && (
            <div className="absolute bottom-2 right-2 bg-white/90 rounded-lg px-3 py-2 text-xs shadow border border-gray-100 flex flex-col gap-1">
              <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-red-600" /> Tension</div>
              <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-blue-600" /> Compression</div>
              <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-green-600" /> Reactions</div>
            </div>
          )}
        </div>

        {/* INPUT PANELS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Supports */}
          <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
            <h3 className="text-lg font-semibold mb-3">Supports</h3>
            {supports.map((s, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 items-end mb-2">
                <span className="font-medium text-sm">Joint {nodeLabel(i)}</span>
                <input type="number" placeholder="x" value={s.x} onChange={e => handleChange(supports, setSupports, i, "x", e.target.value)} className={inputClass} />
                <input type="number" placeholder="y" value={s.y} onChange={e => handleChange(supports, setSupports, i, "y", e.target.value)} className={inputClass} />
                <select value={s.type} onChange={e => handleChange(supports, setSupports, i, "type", e.target.value)} className={inputClass}>
                  <option>Pinned</option>
                  <option>Roller</option>
                </select>
                {supports.length > 1
                  ? <button onClick={() => removeItem(supports, setSupports, i)} className={redButtonClass}>–</button>
                  : <div />}
              </div>
            ))}
            <button onClick={() => addItem(supports, setSupports, { x: "", y: "", type: "Pinned" })} className={greenButtonClass}>+ Add Support</button>
          </div>

          {/* Nodes */}
          <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
            <h3 className="text-lg font-semibold mb-3">Nodes</h3>
            {nodes.map((n, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-end mb-2">
                <span className="font-medium text-sm">Joint {nodeLabel(supports.length + i)}</span>
                <input type="number" placeholder="x" value={n.x} onChange={e => handleChange(nodes, setNodes, i, "x", e.target.value)} className={inputClass} />
                <input type="number" placeholder="y" value={n.y} onChange={e => handleChange(nodes, setNodes, i, "y", e.target.value)} className={inputClass} />
                {nodes.length > 1
                  ? <button onClick={() => removeItem(nodes, setNodes, i)} className={redButtonClass}>–</button>
                  : <div />}
              </div>
            ))}
            <button onClick={() => addItem(nodes, setNodes, { x: "", y: "" })} className={greenButtonClass}>+ Add Joint</button>
          </div>

          {/* Members */}
          <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
            <h3 className="text-lg font-semibold mb-3">Members</h3>
            <div className="grid grid-cols-4 gap-2 mb-2">
              <span className="text-sm text-gray-500"> </span>
              <span className="text-sm font-medium text-gray-600">Start</span>
              <span className="text-sm font-medium text-gray-600">End</span>
              <span />
            </div>
            {members.map((m, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-end mb-2">
                <span className="font-medium text-sm">M {nodeLabel(m.start)}{nodeLabel(m.end)}</span>
                <select value={m.start} onChange={e => handleChange(members, setMembers, i, "start", Number(e.target.value))} className={inputClass}>
                  {allNodes.map((_, idx) => <option key={idx} value={idx}>{nodeLabel(idx)}</option>)}
                </select>
                <select value={m.end} onChange={e => handleChange(members, setMembers, i, "end", Number(e.target.value))} className={inputClass}>
                  {allNodes.map((_, idx) => <option key={idx} value={idx}>{nodeLabel(idx)}</option>)}
                </select>
                {members.length > 1
                  ? <button onClick={() => removeItem(members, setMembers, i)} className={redButtonClass}>–</button>
                  : <div />}
              </div>
            ))}
            <button onClick={() => addItem(members, setMembers, { start: 0, end: 0 })} className={greenButtonClass}>+ Add Member</button>
          </div>

          {/* Forces */}
          <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
            <h3 className="text-lg font-semibold mb-3">Applied Forces</h3>
            <div className="grid grid-cols-4 gap-2 mb-2">
              <span className="text-sm font-medium text-gray-600">Joint</span>
              <span className="text-sm font-medium text-gray-600">Magnitude (kN)</span>
              <span className="text-sm font-medium text-gray-600">Angle (°)</span>
              <span />
            </div>
            {forces.map((f, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-end mb-2">
                <select value={f.Joint} onChange={e => handleChange(forces, setForces, i, "Joint", Number(e.target.value))} className={inputClass}>
                  {allNodes.map((_, idx) => <option key={idx} value={idx}>{nodeLabel(idx)}</option>)}
                </select>
                <input type="number" placeholder="kN" value={f.magnitude} onChange={e => handleChange(forces, setForces, i, "magnitude", e.target.value)} className={inputClass} />
                <input type="number" placeholder="°" value={f.angle} onChange={e => handleChange(forces, setForces, i, "angle", e.target.value)} className={inputClass} />
                {forces.length > 1
                  ? <button onClick={() => removeItem(forces, setForces, i)} className={redButtonClass}>–</button>
                  : <div />}
              </div>
            ))}
            <button onClick={() => addItem(forces, setForces, { Joint: 0, magnitude: "", angle: "" })} className={greenButtonClass}>+ Add Force</button>
          </div>
        </div>

        <button
          className="w-full bg-blue-800 hover:bg-blue-900 text-white py-3 rounded-lg font-semibold mb-8 text-lg transition-colors"
          onClick={solveTruss}
        >
          Calculate
        </button>

        {/* SOLUTION */}
        {solution && (
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <h3 className="text-2xl font-bold mb-6 text-blue-900">Solution</h3>

            {solution.steps.map((step, si) => (
              <div key={si} className="mb-6">
                <h4 className="text-base font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-200">
                  {step.title}
                </h4>
                <div className="space-y-3">
                  {step.lines.map((line, li) => (
                    <div key={li} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                      {line.label && (
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide sm:w-28 shrink-0 pt-1">
                          {line.label}
                        </span>
                      )}
                      <div className="bg-gray-50 rounded-lg px-4 py-2 flex-1 overflow-x-auto">
                        <KaTeX math={line.latex} block />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}