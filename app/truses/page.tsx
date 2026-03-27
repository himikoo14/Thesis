"use client";

import { useState, useEffect, useRef } from "react";

/* ── KaTeX via CDN ────────────────────────────────────────────────────────── */
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
type Support = { x: string; y: string; type: "Pinned" | "Roller" };
type Joint = { x: string; y: string };
type Member = { start: number; end: number };
type Force = { Joint: number; magnitude: string; angle: string };
type GenericObject = Record<string, any>;

type StepLine =
  | { kind: "heading"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "text"; text: string }
  | { kind: "eq"; tex: string }
  | { kind: "result"; tex: string }
  | { kind: "warn"; text: string }
  | { kind: "jointFBD"; joint: number; members: number[] }
  | { kind: "spacer" };

type Solution = {
  lines: StepLine[];
  memberForces: number[];
  reactions: { x: number; y: number }[];
};

/* ===================== COMPONENT ===================== */
export default function TrussSolverUI() {
  /* ── KaTeX + Fonts loader ── */
  useEffect(() => {
    if (!document.getElementById("katex-css")) {
      const link = document.createElement("link");
      link.id = "katex-css"; link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
      document.head.appendChild(link);
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
      script.async = true; document.head.appendChild(script);
    }
    if (!document.getElementById("gfonts")) {
      const link = document.createElement("link");
      link.id = "gfonts"; link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  /* ---------- STATE ---------- */
  const [supports, setSupports] = useState<Support[]>([
    { x: "0", y: "0", type: "Pinned" },
    { x: "4", y: "0", type: "Roller" },
  ]);
  const [nodes, setNodes] = useState<Joint[]>([{ x: "2", y: "3" }]);
  const [members, setMembers] = useState<Member[]>([
    { start: 0, end: 2 }, { start: 1, end: 2 }, { start: 0, end: 1 },
  ]);
  const [forces, setForces] = useState<Force[]>([{ Joint: 2, magnitude: "10", angle: "270" }]);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [activeTab, setActiveTab] = useState<"input" | "solution">("input");
  const [solveAnim, setSolveAnim] = useState(false);

  const allNodes: Joint[] = [...supports.map(s => ({ x: s.x, y: s.y })), ...nodes];
  const nodeLabel = (i: number) => String.fromCharCode(65 + i);
  const n4 = (v: number) => v.toFixed(4);
  const n3 = (v: number) => v.toFixed(3);
  const fmtNum = (v: number, d = 4) => (v < 0 ? `-${Math.abs(v).toFixed(d)}` : `${v.toFixed(d)}`);
  const cosTex = (cos: number, lbl: string) => `${fmtNum(cos)} \\cdot F_{${lbl}}`;

  /* ---------- HANDLERS ---------- */
  const handleChange = <T extends GenericObject>(
    arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>,
    index: number, field: keyof T, value: T[keyof T]
  ) => { const a = [...arr]; a[index][field] = value; setArr(a); };
  const addItem = <T,>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, tpl: T) => setArr([...arr, tpl]);
  const removeItem = <T,>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, i: number) => setArr(arr.filter((_, j) => j !== i));

  /* ===================== SOLVER ===================== */
  const solveTruss = () => {
    setSolveAnim(true);
    setTimeout(() => setSolveAnim(false), 600);

    const numericNodes = allNodes.map(n => ({ x: parseFloat(n.x), y: parseFloat(n.y) }));
    const nJoints = numericNodes.length;
    const nMembers = members.length;
    const tolerance = 1e-6;

    const memberForces: number[] = Array(nMembers).fill(0);
    const solvedMembers: boolean[] = Array(nMembers).fill(false);
    const jointMembers: number[][] = Array.from({ length: nJoints }, () => []);
    members.forEach((mb, idx) => { jointMembers[mb.start].push(idx); jointMembers[mb.end].push(idx); });

    const lines: StepLine[] = [];
    const H = (text: string) => lines.push({ kind: "heading", text });
    const SH = (text: string) => lines.push({ kind: "subheading", text });
    const T = (text: string) => lines.push({ kind: "text", text });
    const E = (tex: string) => lines.push({ kind: "eq", tex });
    const R = (tex: string) => lines.push({ kind: "result", tex });
    const W = (text: string) => lines.push({ kind: "warn", text });
    const SP = () => lines.push({ kind: "spacer" });

    H("Step 1: Determinacy Check");
    const m_val = nMembers, j_val = nJoints;
    const r_val = supports.reduce((a, s) => a + (s.type === "Pinned" ? 2 : 1), 0);
    const det_val = m_val + r_val - 2 * j_val;
    T(`Members: m = ${m_val},  Joints: j = ${j_val},  Reactions: r = ${r_val}`);
    E(`m + r - 2j = ${m_val} + ${r_val} - 2(${j_val}) = ${det_val}`);
    if (det_val === 0) R("\\checkmark\\ \\text{Statically Determinate and stable}");
    else if (det_val < 0) W("✘  Mechanism (unstable) — check inputs.");
    else W("✘  Statically Indeterminate — this solver handles determinate trusses only.");
    SP();

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
      const mag = parseFloat(f.magnitude) || 0;
      const ang = parseFloat(f.angle) || 0;
      const angR = ang * Math.PI / 180;
      T(`F${i + 1} at Joint ${nodeLabel(f.Joint)}: ${mag} kN @ ${ang}°`);
      E(`F_{x${i + 1}} = ${mag}\\cos(${ang}^\\circ) = ${n3(mag * Math.cos(angR))}\\ \\text{kN}`);
      E(`F_{y${i + 1}} = ${mag}\\sin(${ang}^\\circ) = ${n3(mag * Math.sin(angR))}\\ \\text{kN}`);
    });
    E(`\\Sigma F_x = ${n3(totalFx)}\\ \\text{kN}, \\quad \\Sigma F_y = ${n3(totalFy)}\\ \\text{kN}`);
    SP();

    if (supports.length === 2) {
      const labelA = nodeLabel(0), labelB = nodeLabel(1);
      const node1 = numericNodes[0], node2 = numericNodes[1];
      let momentA = 0;
      forces.forEach(f => {
        const mag = parseFloat(f.magnitude) || 0;
        const ang = (parseFloat(f.angle) || 0) * Math.PI / 180;
        const fy = mag * Math.sin(ang);
        momentA += fy * (numericNodes[f.Joint].x - node1.x);
      });
      const dxSup = node2.x - node1.x;
      const Ry2 = dxSup !== 0 ? momentA / dxSup : 0;
      const Ry1 = totalFy - Ry2;
      const Rx1 = -totalFx;
      reactions[0] = { x: Rx1, y: Ry1 };
      reactions[1] = { x: 0, y: Ry2 };
      SH(`Moment about Joint ${labelA}  (ΣM = 0):`);
      forces.forEach(f => {
        const mag = parseFloat(f.magnitude) || 0;
        const ang = (parseFloat(f.angle) || 0) * Math.PI / 180;
        const fy = mag * Math.sin(ang);
        const dx = numericNodes[f.Joint].x - node1.x;
        E(`F_{y} \\times d = ${n3(fy)} \\times ${n3(dx)} = ${n3(fy * dx)}\\ \\text{kN{\\cdot}m}`);
      });
      E(`R_{y${labelB}} \\times ${n3(dxSup)} = ${n3(momentA)}`);
      R(`R_{y${labelB}} = ${n3(Ry2)}\\ \\text{kN}`);
      SP();
      SH("ΣFy = 0:");
      E(`R_{y${labelA}} = ${n3(totalFy)} - ${n3(Ry2)}`);
      R(`R_{y${labelA}} = ${n3(Ry1)}\\ \\text{kN}`);
      SP();
      SH("ΣFx = 0:");
      R(`R_{x${labelA}} = ${n3(Rx1)}\\ \\text{kN}`);
      SP();
    }

    const extF: { x: number; y: number }[] = numericNodes.map((_, idx) => ({
      x: reactions[idx]?.x || 0, y: reactions[idx]?.y || 0,
    }));
    forces.forEach(f => {
      const mag = parseFloat(f.magnitude) || 0;
      const ang = (parseFloat(f.angle) || 0) * Math.PI / 180;
      extF[f.Joint].x += mag * Math.cos(ang);
      extF[f.Joint].y += mag * Math.sin(ang);
    });

    H("Step 3: Method of Joints");
    T("Convention: (+) = Tension,  (−) = Compression");
    SP();

    let progress = true, iter = 0;
    while (progress && iter < nJoints * 2) {
      progress = false; iter++;
      for (let jIdx = 0; jIdx < nJoints; jIdx++) {
        const connected = jointMembers[jIdx];
        const unknowns = connected.filter(i => !solvedMembers[i]);
        if (unknowns.length === 0 || unknowns.length > 2) continue;
        const lbl = nodeLabel(jIdx);
        SH(`Joint ${lbl}`);
        lines.push({ kind: "jointFBD", joint: jIdx, members: connected });
        T(`Connected: ${connected.map(u => { const mb = members[u]; return `${nodeLabel(mb.start)}${nodeLabel(mb.end)}`; }).join(", ")}`);
        T(`Unknowns:  ${unknowns.map(u => { const mb = members[u]; return `${nodeLabel(mb.start)}${nodeLabel(mb.end)}`; }).join(", ")}`);
        SP();
        const rowX: number[] = [], rowY: number[] = [];
        let fxK = extF[jIdx].x, fyK = extF[jIdx].y;
        connected.forEach(mIdx => {
          if (solvedMembers[mIdx]) {
            const mb = members[mIdx];
            const other = mb.start === jIdx ? mb.end : mb.start;
            const dx = numericNodes[other].x - numericNodes[jIdx].x;
            const dy = numericNodes[other].y - numericNodes[jIdx].y;
            const L = Math.hypot(dx, dy);
            fxK -= memberForces[mIdx] * (dx / L);
            fyK -= memberForces[mIdx] * (dy / L);
          }
        });
        const cosines: { dx: number; dy: number; L: number; label: string }[] = [];
        unknowns.forEach(mIdx => {
          const mb = members[mIdx];
          const other = mb.start === jIdx ? mb.end : mb.start;
          const dx = numericNodes[other].x - numericNodes[jIdx].x;
          const dy = numericNodes[other].y - numericNodes[jIdx].y;
          const L = Math.hypot(dx, dy);
          rowX.push(dx / L); rowY.push(dy / L);
          cosines.push({ dx, dy, L, label: `${nodeLabel(mb.start)}${nodeLabel(mb.end)}` });
        });
        if (unknowns.length === 1) {
          const c = cosines[0];
          E(`L_{${c.label}} = ${n4(c.L)}\\ \\text{m},\\quad \\cos_x = ${n4(c.dx / c.L)},\\quad \\cos_y = ${n4(c.dy / c.L)}`);
          E(`\\Sigma F_x = 0:\\quad ${cosTex(c.dx / c.L, c.label)} + (${n4(fxK)}) = 0`);
          E(`\\Sigma F_y = 0:\\quad ${cosTex(c.dy / c.L, c.label)} + (${n4(fyK)}) = 0`);
          const denom = rowX[0] ** 2 + rowY[0] ** 2;
          const f = -(fxK * rowX[0] + fyK * rowY[0]) / denom;
          memberForces[unknowns[0]] = f; solvedMembers[unknowns[0]] = true; progress = true;
          const type = Math.abs(f) < tolerance ? "\\text{Zero-force}" : f > 0 ? "\\text{Tension}" : "\\text{Compression}";
          R(`F_{${c.label}} = ${n4(f)}\\ \\text{kN}\\quad (${type})`);
        } else if (unknowns.length === 2) {
          const [c0, c1] = cosines;
          E(`L_{${c0.label}} = ${n4(c0.L)}\\ \\text{m},\\quad L_{${c1.label}} = ${n4(c1.L)}\\ \\text{m}`);
          E(`\\Sigma F_x = 0:\\quad ${cosTex(rowX[0], c0.label)} + ${cosTex(rowX[1], c1.label)} + (${n4(fxK)}) = 0`);
          E(`\\Sigma F_y = 0:\\quad ${cosTex(rowY[0], c0.label)} + ${cosTex(rowY[1], c1.label)} + (${n4(fyK)}) = 0`);
          const det = rowX[0] * rowY[1] - rowX[1] * rowY[0];
          if (Math.abs(det) < tolerance) { W(`✘  Singular system at Joint ${lbl} — skipping.`); SP(); continue; }
          const f1 = (-fxK * rowY[1] + fyK * rowX[1]) / det;
          const f2 = (fxK * rowY[0] - fyK * rowX[0]) / det;
          memberForces[unknowns[0]] = f1; memberForces[unknowns[1]] = f2;
          solvedMembers[unknowns[0]] = true; solvedMembers[unknowns[1]] = true; progress = true;
          E(`\\Delta = ${n4(det)}`);
          const t1 = Math.abs(f1) < tolerance ? "\\text{Zero-force}" : f1 > 0 ? "\\text{Tension}" : "\\text{Compression}";
          const t2 = Math.abs(f2) < tolerance ? "\\text{Zero-force}" : f2 > 0 ? "\\text{Tension}" : "\\text{Compression}";
          R(`F_{${c0.label}} = ${n4(f1)}\\ \\text{kN}\\quad (${t1})`);
          R(`F_{${c1.label}} = ${n4(f2)}\\ \\text{kN}\\quad (${t2})`);
        }
        SP();
      }
    }
    const unsolvedIdx = members.map((_, i) => i).filter(i => !solvedMembers[i]);
    if (unsolvedIdx.length > 0) W(`⚠  Could not solve: ${unsolvedIdx.map(i => { const mb = members[i]; return `${nodeLabel(mb.start)}${nodeLabel(mb.end)}`; }).join(", ")}.`);

    setSolution({ lines, memberForces, reactions });
    setActiveTab("solution");
  };

  /* ── FBD canvas ── */
  const numericNodes = allNodes.map(n => ({ x: parseFloat(n.x || "0"), y: parseFloat(n.y || "0") }));

  const FBD = () => {
    const W = 520, H = 340, pad = 52;
    const xs = numericNodes.map(n => n.x), ys = numericNodes.map(n => n.y);
    const minX = Math.min(...xs, 0), maxX = Math.max(...xs, 1);
    const minY = Math.min(...ys, 0), maxY = Math.max(...ys, 1);
    const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;
    const scaleX = (W - 2 * pad) / rangeX, scaleY = (H - 2 * pad) / rangeY;
    const scale = Math.min(scaleX, scaleY);
    const offX = (W - rangeX * scale) / 2 - minX * scale;
    const offY = (H - rangeY * scale) / 2 - minY * scale;
    const sx = (x: number) => x * scale + offX;
    const sy = (y: number) => H - (y * scale + offY);

    const memberColors = solution?.memberForces.map(f => {
      const tol = 1e-6;
      if (Math.abs(f) < tol) return "#94a3b8";
      return f > 0 ? "#3b82f6" : "#ef4444";
    }) || [];

    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ fontFamily: "'DM Mono', monospace" }}>
        <defs>
          <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6 Z" fill="#f97316" />
          </marker>
          <marker id="arr-blue" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6 Z" fill="#3b82f6" />
          </marker>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" rx="4" />

        {/* Members */}
        {members.map((m, i) => {
          const n1 = numericNodes[m.start], n2 = numericNodes[m.end];
          if (!n1 || !n2) return null;
          const color = memberColors[i] || "#334155";
          const f = solution?.memberForces[i];
          const mid = { x: (sx(n1.x) + sx(n2.x)) / 2, y: (sy(n1.y) + sy(n2.y)) / 2 };
          return (
            <g key={`m-${i}`}>
              <line x1={sx(n1.x)} y1={sy(n1.y)} x2={sx(n2.x)} y2={sy(n2.y)}
                stroke={color} strokeWidth={solution ? 3 : 2.5} strokeLinecap="round"
                style={{ filter: solution ? `drop-shadow(0 0 3px ${color}66)` : "none" }} />
              {solution && f !== undefined && (
                <text x={mid.x} y={mid.y - 7} fontSize="9" fill={color} textAnchor="middle" fontWeight="500">
                  {Math.abs(f) < 1e-6 ? "0" : `${f > 0 ? "+" : ""}${f.toFixed(2)}`}
                </text>
              )}
            </g>
          );
        })}

        {/* Forces */}
        {forces.map((f, i) => {
          const n = numericNodes[f.Joint];
          if (!n) return null;
          const ang = (parseFloat(f.angle || "0") * Math.PI) / 180;
          const len = 38;
          return (
            <g key={`f-${i}`}>
              <line x1={sx(n.x)} y1={sy(n.y)}
                x2={sx(n.x) + len * Math.cos(ang)} y2={sy(n.y) - len * Math.sin(ang)}
                stroke="#f97316" strokeWidth={2.5} markerEnd="url(#arr)" strokeLinecap="round" />
              <text x={sx(n.x) + (len + 6) * Math.cos(ang)} y={sy(n.y) - (len + 6) * Math.sin(ang)}
                fontSize="9.5" fill="#f97316" textAnchor="middle" fontWeight="600">
                {f.magnitude}kN
              </text>
            </g>
          );
        })}

        {/* Reaction arrows */}
        {solution && solution.reactions.map((r, i) => {
          const n = numericNodes[i];
          if (!n || (Math.abs(r.x) < 1e-6 && Math.abs(r.y) < 1e-6)) return null;
          const len = 34;
          return (
            <g key={`rx-${i}`}>
              {Math.abs(r.x) > 1e-6 && (
                <line x1={sx(n.x)} y1={sy(n.y)} x2={sx(n.x) + Math.sign(r.x) * len} y2={sy(n.y)}
                  stroke="#3b82f6" strokeWidth={2.5} markerEnd="url(#arr-blue)" strokeLinecap="round" />
              )}
              {Math.abs(r.y) > 1e-6 && (
                <line x1={sx(n.x)} y1={sy(n.y)} x2={sx(n.x)} y2={sy(n.y) - Math.sign(r.y) * len}
                  stroke="#3b82f6" strokeWidth={2.5} markerEnd="url(#arr-blue)" strokeLinecap="round" />
              )}
            </g>
          );
        })}

        {/* Support symbols */}
        {supports.map((s, i) => {
          const n = numericNodes[i];
          if (!n) return null;
          const cx = sx(n.x), cy = sy(n.y);
          return s.type === "Pinned" ? (
            <g key={`s-${i}`}>
              <polygon points={`${cx - 10},${cy + 14} ${cx + 10},${cy + 14} ${cx},${cy}`}
                fill="none" stroke="#64748b" strokeWidth="1.5" />
              <line x1={cx - 13} y1={cy + 16} x2={cx + 13} y2={cy + 16} stroke="#64748b" strokeWidth="1.5" />
              {[...Array(4)].map((_, k) => (
                <line key={k} x1={cx - 10 + k * 7} y1={cy + 16} x2={cx - 14 + k * 7} y2={cy + 22}
                  stroke="#64748b" strokeWidth="1" />
              ))}
            </g>
          ) : (
            <g key={`s-${i}`}>
              <circle cx={cx - 5} cy={cy + 10} r="3.5" fill="none" stroke="#64748b" strokeWidth="1.5" />
              <circle cx={cx + 5} cy={cy + 10} r="3.5" fill="none" stroke="#64748b" strokeWidth="1.5" />
              <line x1={cx - 10} y1={cy + 14} x2={cx + 10} y2={cy + 14} stroke="#64748b" strokeWidth="1.5" />
              {[...Array(4)].map((_, k) => (
                <line key={k} x1={cx - 10 + k * 7} y1={cy + 14} x2={cx - 14 + k * 7} y2={cy + 20}
                  stroke="#64748b" strokeWidth="1" />
              ))}
            </g>
          );
        })}

        {/* Nodes */}
        {numericNodes.map((n, i) => (
          <g key={`j-${i}`}>
            <circle cx={sx(n.x)} cy={sy(n.y)} r={7} fill="#0f172a" stroke="#e2e8f0" strokeWidth="1.5" />
            <text x={sx(n.x) + 11} y={sy(n.y) - 8} fontSize="11" fill="#0f172a" fontWeight="700" letterSpacing="-0.3">
              {nodeLabel(i)}
            </text>
          </g>
        ))}

        {/* Legend when solved */}
        {solution && (
          <g>
            <rect x={W - 110} y={8} width={102} height={54} rx="5" fill="white" fillOpacity="0.9" />
            <circle cx={W - 98} cy={22} r={4} fill="#3b82f6" />
            <text x={W - 90} y={26} fontSize="9" fill="#334155">Tension</text>
            <circle cx={W - 98} cy={37} r={4} fill="#ef4444" />
            <text x={W - 90} y={41} fontSize="9" fill="#334155">Compression</text>
            <circle cx={W - 98} cy={52} r={4} fill="#94a3b8" />
            <text x={W - 90} y={56} fontSize="9" fill="#334155">Zero-force</text>
          </g>
        )}
      </svg>
    );
  };

  /* ── Styled input ── */
  const inp = "w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white transition-all";
  const sel = `${inp} cursor-pointer`;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f8fafc; }
        .truss-root { font-family: 'DM Sans', system-ui, sans-serif; min-height: 100vh; background: #f1f5f9; }
        .truss-header { background: #0f172a; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; height: 56px; }
        .truss-logo { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800; color: white; letter-spacing: -0.5px; }
        .truss-logo span { color: #f97316; }
        .truss-badge { font-family: 'DM Mono', monospace; font-size: 10px; background: #1e293b; color: #64748b; padding: 3px 10px; border-radius: 20px; letter-spacing: 1px; text-transform: uppercase; }
        .truss-body { max-width: 1080px; margin: 0 auto; padding: 28px 20px 60px; }
        .page-title { font-family: 'Syne', sans-serif; font-size: 30px; font-weight: 800; color: #0f172a; letter-spacing: -1px; margin-bottom: 4px; }
        .page-sub { font-size: 14px; color: #64748b; margin-bottom: 24px; }

        /* FBD container */
        .fbd-wrap { background: white; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        .fbd-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid #f1f5f9; }
        .fbd-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: #94a3b8; font-family: 'DM Mono', monospace; }
        .fbd-status { font-size: 11px; font-family: 'DM Mono', monospace; color: #22c55e; background: #f0fdf4; padding: 2px 10px; border-radius: 20px; }

        /* Tabs */
        .tab-row { display: flex; gap: 4px; background: #f1f5f9; border-radius: 10px; padding: 4px; margin-bottom: 20px; }
        .tab-btn { flex: 1; padding: 9px; border-radius: 7px; border: none; cursor: pointer; font-size: 13px; font-weight: 500; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
        .tab-btn.active { background: white; color: #0f172a; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-weight: 600; }
        .tab-btn:not(.active) { background: transparent; color: #64748b; }

        /* Cards */
        .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .card-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #94a3b8; margin-bottom: 16px; font-family: 'DM Mono', monospace; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        @media (max-width: 640px) { .grid-2 { grid-template-columns: 1fr; } }

        /* Input row */
        .input-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .joint-label { font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 500; color: #475569; min-width: 52px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 8px; text-align: center; }
        .input-hint { font-size: 10px; color: #94a3b8; font-family: 'DM Mono', monospace; display: block; margin-bottom: 2px; }
        .add-btn { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: #3b82f6; background: #eff6ff; border: 1px dashed #bfdbfe; border-radius: 7px; padding: 7px 14px; cursor: pointer; transition: all 0.15s; }
        .add-btn:hover { background: #dbeafe; border-color: #93c5fd; }
        .rm-btn { width: 26px; height: 26px; border-radius: 6px; background: #fef2f2; border: 1px solid #fecaca; color: #ef4444; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; }
        .rm-btn:hover { background: #fee2e2; }
        .member-label { font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 600; color: #64748b; min-width: 52px; }

        /* Solve button */
        .solve-btn { width: 100%; padding: 14px; border-radius: 12px; border: none; cursor: pointer; font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; letter-spacing: -0.3px; background: linear-gradient(135deg, #1d4ed8, #1e40af); color: white; transition: all 0.2s; box-shadow: 0 4px 14px rgba(29,78,216,0.3); margin-bottom: 24px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .solve-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(29,78,216,0.4); }
        .solve-btn.anim { transform: scale(0.98); }
        .solve-btn-icon { font-size: 18px; }

        /* Results */
        .results-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        @media (max-width: 640px) { .results-grid { grid-template-columns: 1fr; } }
        .result-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .result-card-header { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #94a3b8; font-family: 'DM Mono', monospace; background: #fafafa; }
        .member-row { display: flex; align-items: center; justify-content: space-between; padding: 11px 16px; border-bottom: 1px solid #f8fafc; }
        .member-row:last-child { border-bottom: none; }
        .member-id { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 600; color: #0f172a; }
        .member-val { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 600; }
        .member-val.tension { color: #2563eb; }
        .member-val.compression { color: #dc2626; }
        .member-val.zero { color: #94a3b8; }
        .badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px; font-family: 'DM Mono', monospace; }
        .badge.tension { background: #eff6ff; color: #2563eb; }
        .badge.compression { background: #fef2f2; color: #dc2626; }
        .badge.zero { background: #f8fafc; color: #94a3b8; }

        /* Steps */
        .steps-wrap { background: white; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .steps-header { padding: 14px 20px; border-bottom: 1px solid #f1f5f9; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #94a3b8; font-family: 'DM Mono', monospace; background: #fafafa; }
        .steps-body { padding: 24px; }
        .step-h { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 20px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 2px solid #f1f5f9; letter-spacing: -0.3px; }
        .step-sh { font-size: 13px; font-weight: 600; color: #475569; margin-top: 12px; margin-bottom: 4px; }
        .step-t { font-size: 13px; color: #64748b; margin-bottom: 3px; font-family: 'DM Mono', monospace; }
        .step-eq { text-align: center; padding: 6px 0; color: #1e293b; }
        .step-result { text-align: center; padding: 8px 16px; margin: 6px 0; background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-left: 3px solid #22c55e; border-radius: 0 6px 6px 0; color: #166534; }
        .step-warn { font-size: 13px; color: #dc2626; background: #fef2f2; padding: 8px 12px; border-radius: 6px; border-left: 3px solid #ef4444; margin: 6px 0; }

        /* Mini FBD */
        .mini-fbd { display: block; margin: 12px auto; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
      `}</style>

      <div className="truss-root">
        {/* Header */}
        <header className="truss-header">
          <div className="truss-logo">Truss<span>Lab</span></div>
          <div className="truss-badge">Method of Joints</div>
        </header>

        <div className="truss-body">
          <div className="page-title">Truss Analyzer</div>
          <div className="page-sub">Static analysis of 2D determinate trusses — step-by-step with free body diagrams</div>

          {/* FBD */}
          <div className="fbd-wrap">
            <div className="fbd-header">
              <span className="fbd-title">Free Body Diagram</span>
              {solution && <span className="fbd-status">✓ Solved</span>}
            </div>
            <div style={{ height: 300, padding: "0 8px 8px" }}>
              <FBD />
            </div>
          </div>

          {/* Tabs */}
          <div className="tab-row">
            <button className={`tab-btn ${activeTab === "input" ? "active" : ""}`} onClick={() => setActiveTab("input")}>
              ⚙ Inputs
            </button>
            <button className={`tab-btn ${activeTab === "solution" ? "active" : ""}`} onClick={() => setActiveTab("solution")} disabled={!solution}>
              📐 Solution {solution ? `(${members.length} members)` : ""}
            </button>
          </div>

          {activeTab === "input" && (
            <>
              <div className="grid-2">
                {/* Supports */}
                <div className="card">
                  <div className="card-title">Supports</div>
                  {supports.map((s, i) => (
                    <div key={i} className="input-row">
                      <span className="joint-label">{nodeLabel(i)}</span>
                      <div style={{ flex: 1 }}>
                        <span className="input-hint">x (m)</span>
                        <input type="number" value={s.x} onChange={e => handleChange(supports, setSupports, i, "x", e.target.value)} className={inp} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span className="input-hint">y (m)</span>
                        <input type="number" value={s.y} onChange={e => handleChange(supports, setSupports, i, "y", e.target.value)} className={inp} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span className="input-hint">type</span>
                        <select value={s.type} onChange={e => handleChange(supports, setSupports, i, "type", e.target.value)} className={sel}>
                          <option>Pinned</option><option>Roller</option>
                        </select>
                      </div>
                      {supports.length > 1 && (
                        <button onClick={() => removeItem(supports, setSupports, i)} className="rm-btn" style={{ marginTop: 16 }}>×</button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addItem(supports, setSupports, { x: "", y: "", type: "Pinned" })} className="add-btn">+ support</button>
                </div>

                {/* Joints */}
                <div className="card">
                  <div className="card-title">Free Joints</div>
                  {nodes.map((n, i) => (
                    <div key={i} className="input-row">
                      <span className="joint-label">{nodeLabel(supports.length + i)}</span>
                      <div style={{ flex: 1 }}>
                        <span className="input-hint">x (m)</span>
                        <input type="number" value={n.x} onChange={e => handleChange(nodes, setNodes, i, "x", e.target.value)} className={inp} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span className="input-hint">y (m)</span>
                        <input type="number" value={n.y} onChange={e => handleChange(nodes, setNodes, i, "y", e.target.value)} className={inp} />
                      </div>
                      {nodes.length > 1 && (
                        <button onClick={() => removeItem(nodes, setNodes, i)} className="rm-btn" style={{ marginTop: 16 }}>×</button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addItem(nodes, setNodes, { x: "", y: "" })} className="add-btn">+ joint</button>
                </div>

                {/* Members */}
                <div className="card">
                  <div className="card-title">Members</div>
                  {members.map((m, i) => (
                    <div key={i} className="input-row">
                      <span className="member-label">{nodeLabel(m.start)}{nodeLabel(m.end)}</span>
                      <div style={{ flex: 1 }}>
                        <span className="input-hint">start</span>
                        <select value={m.start} onChange={e => handleChange(members, setMembers, i, "start", Number(e.target.value))} className={sel}>
                          {allNodes.map((_, idx) => <option key={idx} value={idx}>{nodeLabel(idx)}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <span className="input-hint">end</span>
                        <select value={m.end} onChange={e => handleChange(members, setMembers, i, "end", Number(e.target.value))} className={sel}>
                          {allNodes.map((_, idx) => <option key={idx} value={idx}>{nodeLabel(idx)}</option>)}
                        </select>
                      </div>
                      {members.length > 1 && (
                        <button onClick={() => removeItem(members, setMembers, i)} className="rm-btn" style={{ marginTop: 16 }}>×</button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addItem(members, setMembers, { start: 0, end: 0 })} className="add-btn">+ member</button>
                </div>

                {/* Forces */}
                <div className="card">
                  <div className="card-title">Applied Forces</div>
                  {forces.map((f, i) => (
                    <div key={i} className="input-row">
                      <div style={{ flex: 1 }}>
                        <span className="input-hint">joint</span>
                        <select value={f.Joint} onChange={e => handleChange(forces, setForces, i, "Joint", Number(e.target.value))} className={sel}>
                          {allNodes.map((_, idx) => <option key={idx} value={idx}>{nodeLabel(idx)}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <span className="input-hint">kN</span>
                        <input type="number" value={f.magnitude} onChange={e => handleChange(forces, setForces, i, "magnitude", e.target.value)} className={inp} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span className="input-hint">angle °</span>
                        <input type="number" value={f.angle} onChange={e => handleChange(forces, setForces, i, "angle", e.target.value)} className={inp} />
                      </div>
                      {forces.length > 1 && (
                        <button onClick={() => removeItem(forces, setForces, i)} className="rm-btn" style={{ marginTop: 16 }}>×</button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addItem(forces, setForces, { Joint: 0, magnitude: "", angle: "" })} className="add-btn">+ force</button>
                </div>
              </div>

              <button className={`solve-btn ${solveAnim ? "anim" : ""}`} onClick={solveTruss}>
                <span className="solve-btn-icon">⚡</span> Solve Truss
              </button>
            </>
          )}

          {activeTab === "solution" && solution && (
            <>
              {/* Results summary */}
              <div className="results-grid">
                <div className="result-card">
                  <div className="result-card-header">Member Forces</div>
                  {solution.memberForces.map((f, i) => {
                    const tol = 1e-6;
                    const type = Math.abs(f) < tol ? "zero" : f > 0 ? "tension" : "compression";
                    const label = Math.abs(f) < tol ? "Zero" : f > 0 ? "Tension" : "Compression";
                    return (
                      <div key={i} className="member-row">
                        <span className="member-id">
                          {nodeLabel(members[i].start)}{nodeLabel(members[i].end)}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className={`member-val ${type}`}>
                            {f > 0 ? "+" : ""}{f.toFixed(3)} kN
                          </span>
                          <span className={`badge ${type}`}>{label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="result-card">
                  <div className="result-card-header">Support Reactions</div>
                  {solution.reactions.map((r, i) => {
                    if (Math.abs(r.x) < 1e-6 && Math.abs(r.y) < 1e-6) return null;
                    return (
                      <div key={i} className="member-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="member-id">Joint {nodeLabel(i)}</span>
                          <span className="badge zero">{i < supports.length ? supports[i].type : ""}</span>
                        </div>
                        <div style={{ display: "flex", gap: 20, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
                          {Math.abs(r.x) > 1e-6 && (
                            <span style={{ color: "#2563eb" }}>Rx = {r.x > 0 ? "+" : ""}{r.x.toFixed(3)} kN</span>
                          )}
                          {Math.abs(r.y) > 1e-6 && (
                            <span style={{ color: "#2563eb" }}>Ry = {r.y > 0 ? "+" : ""}{r.y.toFixed(3)} kN</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step-by-step */}
              <div className="steps-wrap">
                <div className="steps-header">Step-by-Step Solution</div>
                <div className="steps-body">
                  {solution.lines.map((line, idx) => {
                    if (line.kind === "heading") return <div key={idx} className="step-h">{line.text}</div>;
                    if (line.kind === "subheading") return <div key={idx} className="step-sh">{line.text}</div>;
                    if (line.kind === "text") return <div key={idx} className="step-t">{line.text}</div>;
                    if (line.kind === "eq") return <div key={idx} className="step-eq"><KaTeX tex={line.tex} display /></div>;
                    if (line.kind === "result") return <div key={idx} className="step-result"><KaTeX tex={line.tex} display /></div>;
                    if (line.kind === "warn") return <div key={idx} className="step-warn">{line.text}</div>;
                    if (line.kind === "spacer") return <div key={idx} style={{ height: 6 }} />;
                    if (line.kind === "jointFBD") {
                      const joint = numericNodes[line.joint];
                      const W2 = 180, H2 = 180;
                      return (
                        <svg key={idx} className="mini-fbd" width={W2} height={H2} viewBox={`0 0 ${W2} ${H2}`}>
                          <defs>
                            <marker id={`arr-mini-${idx}`} markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
                              <path d="M0,0 L6,3 L0,6 Z" fill="#f97316" />
                            </marker>
                          </defs>
                          {line.members.map((mIdx, k) => {
                            const mb = members[mIdx];
                            const other = mb.start === line.joint ? mb.end : mb.start;
                            const dx = numericNodes[other].x - joint.x;
                            const dy = numericNodes[other].y - joint.y;
                            const L = Math.hypot(dx, dy);
                            const x2 = 90 + (dx / L) * 65;
                            const y2 = 90 - (dy / L) * 65;
                            const lbl = `${nodeLabel(mb.start)}${nodeLabel(mb.end)}`;
                            const f = solution.memberForces[mIdx];
                            const col = Math.abs(f) < 1e-6 ? "#94a3b8" : f > 0 ? "#3b82f6" : "#ef4444";
                            return (
                              <g key={k}>
                                <line x1="90" y1="90" x2={x2} y2={y2} stroke={col} strokeWidth="2.5" strokeLinecap="round" />
                                <text x={(90 + x2) / 2 + (dy / L) * 10} y={(90 + y2) / 2 - (dx / L) * 10}
                                  fontSize="9" fill={col} textAnchor="middle" fontFamily="'DM Mono', monospace" fontWeight="600">{lbl}</text>
                              </g>
                            );
                          })}
                          <circle cx="90" cy="90" r="6" fill="#0f172a" />
                          <text x="90" y="108" fontSize="11" fill="#0f172a" textAnchor="middle" fontFamily="'DM Mono', monospace" fontWeight="700">
                            {nodeLabel(line.joint)}
                          </text>
                        </svg>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>

              <button className="solve-btn" onClick={() => setActiveTab("input")} style={{ marginTop: 16, background: "#1e293b", boxShadow: "none" }}>
                ← Edit Inputs
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}