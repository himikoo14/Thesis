"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import {
  solveTruss,
  fmt,
  fmtN,
  nodeLabel,
  type Support,
  type Joint,
  type Member,
  type Force,
  type Solution,
  type StepLine,
} from "../../lib/truss";

/* ── KaTeX via CDN ─────────────────────────────────────────────────────────── */
declare global {
  interface Window {
    katex: any;
    jspdf: { jsPDF: new (opts: Record<string, unknown>) => any };
  }
}

function useKatexScript() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (window.katex) { setOk(true); return; }
    if (!document.getElementById("katex-css")) {
      const link = document.createElement("link");
      link.id = "katex-css"; link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
      document.head.appendChild(link);
    }
    if (!document.getElementById("katex-js")) {
      const script = document.createElement("script");
      script.id = "katex-js";
      script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
      script.async = true;
      script.onload = () => setOk(true);
      document.head.appendChild(script);
    } else {
      const t = setInterval(() => { if (window.katex) { setOk(true); clearInterval(t); } }, 80);
    }
  }, []);
  return ok;
}

function KaTeXInline({ tex, display = false }: { tex: string; display?: boolean }) {
  const [html, setHtml] = useState("");
  const ready = useKatexScript();
  useEffect(() => {
    if (!ready || !window.katex) return;
    try { setHtml(window.katex.renderToString(tex, { displayMode: display, throwOnError: false })); }
    catch { setHtml(tex); }
  }, [tex, display, ready]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function KTX({ tex }: { tex: string }) {
  const ref = useCallback((el: HTMLDivElement | null) => {
    if (!el || !window.katex) return;
    try { window.katex.render(tex, el, { displayMode: true, throwOnError: false }); }
    catch { el.innerText = tex; }
  }, [tex]);
  const ready = useKatexScript();
  if (!ready) return null;
  return <div ref={ref} className="my-0.5 overflow-x-auto dark:[&_.katex]:text-white dark:[&_.katex-html]:text-white" />;
}

/* ===================== LOCAL TYPES ===================== */
type GenericObject = Record<string, any>;

type FBDArrow = {
  angle: number;
  color: string;
  label: string;
  magnitude: number;
  dashed: boolean;
};

/* ── Arrow marker helper ─────────────────────────────────────────────────── */
function ArrowMarker({ id, color }: { id: string; color: string }) {
  return (
    <marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L7,3 L0,6 Z" fill={color} />
    </marker>
  );
}

function Arrow({ x1, y1, x2, y2, color, markerId, label, labelOffset = { dx: 6, dy: -4 }, fontSize = 10 }: {
  x1: number; y1: number; x2: number; y2: number;
  color: string; markerId: string;
  label?: string; labelOffset?: { dx: number; dy: number }; fontSize?: number;
}) {
  const dx = x2 - x1; const dy = y2 - y1;
  const L = Math.hypot(dx, dy) || 1;
  const ex = x2 - (dx / L); const ey = y2 - (dy / L);
  return (
    <g>
      <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={color} strokeWidth={2} markerEnd={`url(#${markerId})`} />
      {label && <text x={x2 + labelOffset.dx} y={y2 + labelOffset.dy} fontSize={fontSize} fill={color} fontWeight="600">{label}</text>}
    </g>
  );
}

/* ================================================================
   STEP-BY-STEP RENDERER
================================================================ */
function TrussStepRenderer({
  lines, solution, members, allNodes, supports, forces,
}: {
  lines: StepLine[];
  solution: Solution;
  members: Member[];
  allNodes: Joint[];
  supports: Support[];
  forces: Force[];
}) {
  return (
    <div className="leading-relaxed">
      {lines.map((line, idx) => {
        switch (line.kind) {
          case "heading":
            return <p key={idx} className="font-bold text-[16px] text-[#1848a0] dark:text-blue-400 mt-4 mb-0.5">{line.text}</p>;
          case "subheading":
            return <p key={idx} className="font-semibold text-[14px] text-gray-700 dark:text-gray-300 mt-2.5 mb-0.5">{line.text}</p>;
          case "text":
            return <p key={idx} className="text-gray-600 dark:text-gray-400 my-0.5 text-[14px]">{line.text}</p>;
          case "eq":
            return <KTX key={idx} tex={line.tex} />;
          case "result":
            return (
              <div key={idx} className="bg-blue-50 dark:bg-blue-900/30 border-l-[3px] border-[#1848a0] dark:border-blue-500 rounded-[6px] px-3 py-1 my-1">
                <KTX tex={line.tex} />
              </div>
            );
          case "warn":
            return <p key={idx} className="text-red-600 dark:text-red-400 font-medium my-1">{line.text}</p>;
          case "spacer":
            return <div key={idx} className="h-2" />;
          case "jointFBD":
            return (
              <JointFBD
                key={idx}
                jointIdx={line.joint}
                connectedMembers={line.members}
                solvedMemberForces={solution.memberForces}
                members={members}
                allNodes={allNodes}
                solution={solution}
                forces={forces}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}


/* ===================== MAIN FBD ===================== */
function MainFBD({ numericNodes, members, supports, forces, solution, allNodes }: {
  numericNodes: { x: number; y: number }[];
  members: Member[];
  supports: Support[];
  forces: Force[];
  solution: Solution | null;
  allNodes: Joint[];
}) {
  const W = 560, H = 420, PAD = 56;
  const xs = numericNodes.map(n => n.x); const ys = numericNodes.map(n => n.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1; const rangeY = maxY - minY || 1;
  const scale = Math.min((W - 2 * PAD) / rangeX, (H - 2 * PAD) / rangeY);
  const offX = (W - rangeX * scale) / 2 - minX * scale;
  const offY = (H - rangeY * scale) / 2 - minY * scale;
  const sx = (x: number) => x * scale + offX;
  const sy = (y: number) => H - (y * scale + offY);
  const arrowLen = Math.max(40, Math.min(scale * 0.6, 60));
  const tol = 1e-6;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <defs>
        <ArrowMarker id="main-black" color="#111" />
        <ArrowMarker id="main-red" color="#dc2626" />
        <ArrowMarker id="main-green" color="#16a34a" />
        <ArrowMarker id="main-blue" color="#2563eb" />
      </defs>
      <line x1={PAD} y1={sy(0)} x2={W - PAD} y2={sy(0)} stroke="#4b5563" strokeWidth={1} />
      <line x1={sx(0)} y1={PAD} x2={sx(0)} y2={H - PAD} stroke="#4b5563" strokeWidth={1} />

      {members.map((m, i) => {
        const n1 = numericNodes[m.start]; const n2 = numericNodes[m.end];
        if (!n1 || !n2) return null;
        const force = solution?.memberForces[i];
        const color = force == null ? "#9ca3af" : Math.abs(force) < tol ? "#6b7280" : force > 0 ? "#60a5fa" : "#f87171";
        const mx = (sx(n1.x) + sx(n2.x)) / 2; const my = (sy(n1.y) + sy(n2.y)) / 2;
        return (
          <g key={`m-${i}`}>
            <line x1={sx(n1.x)} y1={sy(n1.y)} x2={sx(n2.x)} y2={sy(n2.y)} stroke={color} strokeWidth={2.5} />
            <text x={mx} y={my - 6} textAnchor="middle" fontSize={10} fill={color} fontWeight="600">{nodeLabel(m.start)}{nodeLabel(m.end)}</text>
            {force != null && (
              <text x={mx} y={my + 14} textAnchor="middle" fontSize={9} fill={color}>
                {Math.abs(force) < tol ? "0" : `${force > 0 ? "+" : ""}${fmt(force)} kN`}
              </text>
            )}
          </g>
        );
      })}

      {numericNodes.map((n, i) => (
        <g key={`j-${i}`}>
          <circle cx={sx(n.x)} cy={sy(n.y)} r={6} fill="#1e293b" stroke="#60a5fa" strokeWidth={2} />
          <text x={sx(n.x)} y={sy(n.y) - 12} textAnchor="middle" fontSize={12} fontWeight="700" fill="#93c5fd">{nodeLabel(i)}</text>
        </g>
      ))}

      {supports.map((s, i) => {
        const n = numericNodes[i]; if (!n) return null;
        const cx = sx(n.x); const cy = sy(n.y);
        return s.type === "Pinned" ? (
          <g key={`sup-${i}`}>
            <polygon points={`${cx},${cy} ${cx - 10},${cy + 14} ${cx + 10},${cy + 14}`} fill="#6b7280" stroke="#9ca3af" strokeWidth={1} />
            <line x1={cx - 12} y1={cy + 14} x2={cx + 12} y2={cy + 14} stroke="#9ca3af" strokeWidth={2} />
          </g>
        ) : (
          <g key={`sup-${i}`}>
            <polygon points={`${cx},${cy} ${cx - 10},${cy + 14} ${cx + 10},${cy + 14}`} fill="#4b5563" stroke="#6b7280" strokeWidth={1} />
            <circle cx={cx - 7} cy={cy + 17} r={3} fill="none" stroke="#6b7280" strokeWidth={1.5} />
            <circle cx={cx} cy={cy + 17} r={3} fill="none" stroke="#6b7280" strokeWidth={1.5} />
            <circle cx={cx + 7} cy={cy + 17} r={3} fill="none" stroke="#6b7280" strokeWidth={1.5} />
          </g>
        );
      })}

      {forces.map((f, i) => {
        const n = numericNodes[f.Joint]; if (!n) return null;
        const mag = parseFloat(f.magnitude || "0"); if (!mag) return null;
        const ang = (parseFloat(f.angle || "0") * Math.PI) / 180;
        const cosA = Math.cos(ang);
        const sinA = Math.sin(ang);
        const ex = sx(n.x) + arrowLen * cosA;
        const ey = sy(n.y) - arrowLen * sinA;
        const labelGap = 14;
        const labelX = ex + cosA * labelGap;
        const labelY = ey - sinA * labelGap;
        const anchor = cosA > 0.15 ? "start" : cosA < -0.15 ? "end" : "middle";
        return (
          <g key={`f-${i}`}>
            <line x1={sx(n.x)} y1={sy(n.y)} x2={ex} y2={ey} stroke="#f87171" strokeWidth={2.5} markerEnd="url(#main-red)" />
            <text x={labelX} y={labelY} fontSize={10} fill="#f87171" fontWeight="700" textAnchor={anchor}>{mag} kN</text>
          </g>
        );
      })}

      {solution && solution.reactions.map((r, i) => {
        const n = numericNodes[r.node]; if (!n || (Math.abs(r.x) < tol && Math.abs(r.y) < tol)) return null;
        const cx = sx(n.x); const cy = sy(n.y); const lbl = nodeLabel(r.node);
        return (
          <g key={`rx-${i}`}>
            {Math.abs(r.x) > tol && (
              <Arrow x1={cx - Math.sign(r.x) * arrowLen} y1={cy} x2={cx} y2={cy}
                color="#4ade80" markerId="main-green"
                label={`R${lbl}x = ${fmt(r.x)} kN`}
                labelOffset={{ dx: r.x > 0 ? -arrowLen - 4 : 6, dy: -8 }} fontSize={10} />
            )}
            {Math.abs(r.y) > tol && (
              <Arrow x1={cx} y1={cy + Math.sign(r.y) * arrowLen} x2={cx} y2={cy}
                color="#4ade80" markerId="main-green"
                label={`R${lbl}y = ${fmt(r.y)} kN`}
                labelOffset={{ dx: 8, dy: r.y > 0 ? arrowLen + 14 : -arrowLen - 4 }} fontSize={10} />
            )}
          </g>
        );
      })}

      {solution && (
        <g transform={`translate(${W - 110}, 8)`}>
          <rect x={0} y={0} width={104} height={52} rx={4} fill="#1e293b" stroke="#334155" strokeWidth={1} />
          <line x1={8} y1={14} x2={28} y2={14} stroke="#60a5fa" strokeWidth={2.5} /><text x={32} y={17} fontSize={9} fill="#60a5fa">Tension (+)</text>
          <line x1={8} y1={28} x2={28} y2={28} stroke="#f87171" strokeWidth={2.5} /><text x={32} y={31} fontSize={9} fill="#f87171">Compression (−)</text>
          <line x1={8} y1={42} x2={28} y2={42} stroke="#6b7280" strokeWidth={2.5} /><text x={32} y={45} fontSize={9} fill="#6b7280">Zero-force</text>
        </g>
      )}
    </svg>
  );
}

/* ===================== JOINT FBD ===================== */
function JointFBD({ jointIdx, connectedMembers, solvedMemberForces, members, allNodes, solution, forces }: {
  jointIdx: number;
  connectedMembers: number[];
  solvedMemberForces: number[];
  members: Member[];
  allNodes: Joint[];
  solution: Solution;
  forces: Force[];
}) {
  const SIZE = 260, CX = SIZE / 2, CY = SIZE / 2;
  const tol = 1e-6;
  const jointNode = allNodes[jointIdx];
  const jx = parseFloat(jointNode?.x || "0");
  const jy = parseFloat(jointNode?.y || "0");
  const jLabel = nodeLabel(jointIdx);
  const arrows: FBDArrow[] = [];

  connectedMembers.forEach(mIdx => {
    const mb = members[mIdx];
    const otherIdx = mb.start === jointIdx ? mb.end : mb.start;
    const otherNode = allNodes[otherIdx];
    const ox = parseFloat(otherNode?.x || "0");
    const oy = parseFloat(otherNode?.y || "0");
    const dx = ox - jx; const dy = oy - jy;
    const angleToOther = Math.atan2(dy, dx);
    const lbl = `${nodeLabel(mb.start)}${nodeLabel(mb.end)}`;
    const force = solvedMemberForces[mIdx];
    const known = force !== undefined && !isNaN(force);
    const isTension = known && force > tol;
    const isZero = known && Math.abs(force) <= tol;
    const color = !known ? "#6b7280" : isZero ? "#9ca3af" : isTension ? "#60a5fa" : "#f87171";
    arrows.push({
      angle: angleToOther,
      color,
      label: known ? `F${lbl}=${fmt(Math.abs(force))} kN` : `F${lbl}=?`,
      magnitude: known ? Math.abs(force) : 1,
      dashed: !known,
    });
  });

  const rxn = solution.reactions.find(r => r.node === jointIdx);
  if (rxn) {
    if (Math.abs(rxn.x) > tol) arrows.push({ angle: rxn.x > 0 ? 0 : Math.PI, color: "#4ade80", label: `R${nodeLabel(jointIdx)}x=${fmt(rxn.x)} kN`, magnitude: Math.abs(rxn.x), dashed: false });
    if (Math.abs(rxn.y) > tol) arrows.push({ angle: rxn.y > 0 ? Math.PI / 2 : -Math.PI / 2, color: "#4ade80", label: `R${nodeLabel(jointIdx)}y=${fmt(rxn.y)} kN`, magnitude: Math.abs(rxn.y), dashed: false });
  }

  forces.filter(f => f.Joint === jointIdx).forEach((f, i) => {
    const mag = parseFloat(f.magnitude || "0"); if (!mag) return;
    const ang = (parseFloat(f.angle || "0") * Math.PI) / 180;
    arrows.push({ angle: -ang, color: "#f87171", label: `F${i + 1}=${fmt(Math.abs(mag))} kN`, magnitude: Math.abs(mag), dashed: false });
  });

  const maxForce = Math.max(...arrows.map(a => a.magnitude || 1), 1);
  const MAX_ARM = 90, MIN_ARM = 40;

  return (
    <svg width={SIZE} height={SIZE} style={{ display: "block", margin: "12px auto", borderRadius: 8 }}
      className="bg-gray-800 border border-gray-700">
      <defs>
        <ArrowMarker id={`jg-${jointIdx}`} color="#6b7280" />
        <ArrowMarker id={`jb-${jointIdx}`} color="#60a5fa" />
        <ArrowMarker id={`jr-${jointIdx}`} color="#f87171" />
        <ArrowMarker id={`jgr-${jointIdx}`} color="#4ade80" />
        <ArrowMarker id={`jlg-${jointIdx}`} color="#9ca3af" />
      </defs>
      <line x1={CX - MAX_ARM - 10} y1={CY} x2={CX + MAX_ARM + 10} y2={CY} stroke="#334155" strokeWidth={1} />
      <line x1={CX} y1={CY - MAX_ARM - 10} x2={CX} y2={CY + MAX_ARM + 10} stroke="#334155" strokeWidth={1} />

      {arrows.map((arrow, idx) => {
        const scale = arrow.magnitude / maxForce;
        const length = MIN_ARM + scale * (MAX_ARM - MIN_ARM);
        const isMemberArrow = idx < connectedMembers.length;
        const mIdx = isMemberArrow ? connectedMembers[idx] : -1;
        const mForce = isMemberArrow ? solvedMemberForces[mIdx] : undefined;
        const isCompression = mForce !== undefined && !isNaN(mForce) && mForce < -tol;
        let x1: number, y1: number, x2: number, y2: number;
        if (isCompression) {
          x1 = CX + Math.cos(arrow.angle) * length; y1 = CY - Math.sin(arrow.angle) * length;
          x2 = CX; y2 = CY;
        } else {
          x1 = CX; y1 = CY;
          x2 = CX + Math.cos(arrow.angle) * length; y2 = CY - Math.sin(arrow.angle) * length;
        }
        const markerId = arrow.color === "#60a5fa" ? `jb-${jointIdx}` : arrow.color === "#f87171" ? `jr-${jointIdx}` : arrow.color === "#4ade80" ? `jgr-${jointIdx}` : arrow.color === "#9ca3af" ? `jlg-${jointIdx}` : `jg-${jointIdx}`;
        const labelR = length + 14;
        const lx = CX + Math.cos(arrow.angle) * labelR;
        const ly = CY - Math.sin(arrow.angle) * labelR;
        const textAnchor = Math.cos(arrow.angle) > 0.2 ? "start" : Math.cos(arrow.angle) < -0.2 ? "end" : "middle";
        const textDy = Math.sin(arrow.angle) > 0.2 ? -2 : Math.sin(arrow.angle) < -0.2 ? 10 : 4;
        const dxLine = x2 - x1; const dyLine = y2 - y1;
        const Lline = Math.hypot(dxLine, dyLine) || 1;
        const ex = x2 - (dxLine / Lline); const ey = y2 - (dyLine / Lline);
        return (
          <g key={idx}>
            <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={arrow.color} strokeWidth={2.2} strokeDasharray={arrow.dashed ? "5,3" : undefined} markerEnd={`url(#${markerId})`} />
            <text x={lx} y={ly + textDy} textAnchor={textAnchor} fontSize={9} fill={arrow.color} fontWeight="600">{arrow.label}</text>
          </g>
        );
      })}

      <circle cx={CX} cy={CY} r={7} fill="#0f172a" stroke="#60a5fa" strokeWidth={2.5} />
      <text x={CX} y={CY + 4} textAnchor="middle" fontSize={10} fontWeight="800" fill="#93c5fd">{jLabel}</text>
      <text x={SIZE / 2} y={14} textAnchor="middle" fontSize={10} fontWeight="700" fill="#e2e8f0">FBD — Joint {jLabel}</text>
      <g transform={`translate(4, ${SIZE - 22})`}>
        <line x1={0} y1={8} x2={14} y2={8} stroke="#60a5fa" strokeWidth={2} /><text x={17} y={11} fontSize={7.5} fill="#60a5fa">Tension</text>
        <line x1={52} y1={8} x2={66} y2={8} stroke="#f87171" strokeWidth={2} /><text x={69} y={11} fontSize={7.5} fill="#f87171">Compression</text>
        <line x1={122} y1={8} x2={136} y2={8} stroke="#6b7280" strokeWidth={2} strokeDasharray="4,2" /><text x={139} y={11} fontSize={7.5} fill="#6b7280">Unknown</text>
        <line x1={185} y1={8} x2={199} y2={8} stroke="#4ade80" strokeWidth={2} /><text x={202} y={11} fontSize={7.5} fill="#4ade80">Reaction</text>
      </g>
    </svg>
  );
}

/* ===================== MAIN COMPONENT ===================== */
export default function TrussSolverUI() {
  const [supports, setSupports] = useState<Support[]>([{ x: "", y: "", type: "Pinned" }, { x: "", y: "", type: "Roller" }]);
  const [nodes, setNodes] = useState<Joint[]>([{ x: "", y: "" }]);
  const [members, setMembers] = useState<Member[]>([{ start: 0, end: 1 }]);
  const [forces, setForces] = useState<Force[]>([{ Joint: 0, magnitude: "", angle: "" }]);
  const [solution, setSolution] = useState<Solution | null>(null);

  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const off = status === "generating";
  const labels: Record<typeof status, string> = {
    idle: "⬇ Download Solution as PDF",
    generating: "⏳ Opening print view…",
    done: "✅ Done!",
    error: "❌ Export failed — try again",
  };

  const allNodes: Joint[] = [...supports.map(s => ({ x: s.x, y: s.y })), ...nodes];
  const numericNodes = allNodes.map(n => ({ x: parseFloat(n.x || "0"), y: parseFloat(n.y || "0") }));

  const inputClass = "w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-[18px] p-2 outline-none focus:ring-0";
  const redButtonClass = "w-10 px-2 py-0.5 bg-red-500 text-white rounded-md hover:bg-red-600 text-[20px]";
  const greenButtonClass = "px-3 py-1 bg-[#008409] text-white rounded-lg hover:bg-[#15711b] transition text-[18px]";
  const cardCls = "bg-white dark:bg-gray-800 rounded-xl shadow p-4 relative z-10 border border-transparent dark:border-gray-700";

  function handleChange<T extends GenericObject>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, index: number, field: keyof T, value: T[keyof T]) {
    const a = [...arr]; a[index][field] = value; setArr(a);
  }
  function addItem<T>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, tpl: T) { setArr([...arr, tpl]); }
  function removeItem<T>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, i: number) { setArr(arr.filter((_, j) => j !== i)); }

  const handleSolve = () => {
    setSolution(solveTruss(supports, nodes, members, forces));
  };

  const resultRows = solution ? [
    ...solution.memberForces.map((f, i) => {
      const tol = 1e-6;
      const type = Math.abs(f) < tol ? "Zero-force" : f > 0 ? "Tension" : "Compression";
      return {
        label: `Member ${nodeLabel(members[i].start)}${nodeLabel(members[i].end)}`,
        value: `${f > 0 ? "+" : ""}${fmt(f)} kN  (${type})`,
      };
    }),
    ...solution.reactions.filter(r => Math.abs(r.x) > 1e-6 || Math.abs(r.y) > 1e-6).flatMap(r => {
      const rows = [];
      if (Math.abs(r.x) > 1e-6) rows.push({ label: `R${nodeLabel(r.node)}x`, value: `${fmt(r.x)} kN` });
      if (Math.abs(r.y) > 1e-6) rows.push({ label: `R${nodeLabel(r.node)}y`, value: `${fmt(r.y)} kN` });
      return rows;
    }),
  ] : [];

  return (
    <section className="relative flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <Header />

      <main className="hidden sm:block flex-grow px-6 py-10 max-w-6xl mx-auto w-full relative">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900 dark:text-white">Truss Calculator</h1>
        <h2 className="text-xl font-semibold text-center mb-6 text-gray-700 dark:text-gray-300">Real-Time Free Body Diagram</h2>

        {/* FBD canvas */}
        <div className="relative rounded-xl shadow h-[420px] mb-8 overflow-hidden bg-gray-800 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <MainFBD numericNodes={numericNodes} members={members} supports={supports} forces={forces} solution={solution} allNodes={allNodes} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {/* Supports */}
          <div className={cardCls}>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Supports</h3>
            {supports.map((s, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 items-end mb-2">
                <span className="font-medium text-[18px] text-gray-700 dark:text-gray-300">Joint {nodeLabel(i)}</span>
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
          <div className={cardCls}>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Nodes</h3>
            {nodes.map((n, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-end mb-2">
                <span className="font-medium text-[18px] text-gray-700 dark:text-gray-300">Joint {nodeLabel(supports.length + i)}</span>
                <input type="number" placeholder="x" value={n.x} onChange={e => handleChange(nodes, setNodes, i, "x", e.target.value)} className={inputClass} />
                <input type="number" placeholder="y" value={n.y} onChange={e => handleChange(nodes, setNodes, i, "y", e.target.value)} className={inputClass} />
                {nodes.length > 1 && <button onClick={() => removeItem(nodes, setNodes, i)} className={redButtonClass}>–</button>}
              </div>
            ))}
            <button onClick={() => addItem(nodes, setNodes, { x: "", y: "" })} className={greenButtonClass}>+ Add Joint</button>
          </div>

          {/* Members */}
          <div className={cardCls}>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Members</h3>
            <div className="grid grid-cols-4 gap-2 items-end mb-2">
              <span className="text-[16px] font-medium text-gray-500 dark:text-gray-400"> </span>
              <span className="text-[16px] font-medium text-gray-500 dark:text-gray-400">Start Joint</span>
              <span className="text-[16px] font-medium text-gray-500 dark:text-gray-400">End Joint</span>
              <span className="text-[16px] font-medium text-gray-500 dark:text-gray-400"> </span>
            </div>
            {members.map((m, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-end mb-2">
                <span className="font-medium text-[18px] text-gray-700 dark:text-gray-300">Member {nodeLabel(m.start)}{nodeLabel(m.end)}</span>
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
          <div className={cardCls}>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Forces</h3>
            {forces.map((f, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-end mb-2">
                <select value={f.Joint} onChange={e => handleChange(forces, setForces, i, "Joint", Number(e.target.value))} className={inputClass}>
                  {allNodes.map((_, idx) => <option key={idx} value={idx}>Joint {nodeLabel(idx)}</option>)}
                </select>
                <input type="number" placeholder="kN" value={f.magnitude} onChange={e => handleChange(forces, setForces, i, "magnitude", e.target.value)} className={inputClass} />
                <input type="number" placeholder="deg" value={f.angle} onChange={e => handleChange(forces, setForces, i, "angle", e.target.value)} className={inputClass} />
                {forces.length > 1 && <button onClick={() => removeItem(forces, setForces, i)} className={redButtonClass}>–</button>}
              </div>
            ))}
            <button onClick={() => addItem(forces, setForces, { Joint: 0, magnitude: "", angle: "" })} className={greenButtonClass}>+ Add Force</button>
          </div>
        </div>

        <button className="w-full bg-[#1848a0] hover:bg-[#163d8a] text-white py-3 rounded-lg font-semibold mb-6 transition" onClick={handleSolve}>
          Calculate
        </button>

        {solution && (
          <>
            {/* Member Forces */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-4">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-[15px] font-semibold text-gray-800 dark:text-white tracking-wide">Member Forces</h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {solution.memberForces.map((f, i) => {
                  const tol = 1e-6;
                  const type = Math.abs(f) < tol ? "Zero-force" : f > 0 ? "Tension" : "Compression";
                  const lS = nodeLabel(members[i].start), lE = nodeLabel(members[i].end);
                  const color = Math.abs(f) < tol ? "text-gray-400" : f > 0 ? "text-blue-500 dark:text-blue-400" : "text-red-500 dark:text-red-400";
                  const badge = Math.abs(f) < tol
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    : f > 0
                      ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300"
                      : "bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-300";
                  return (
                    <div key={i} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <span className="text-[13px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Member </span>
                        <span className="text-[15px] font-semibold text-gray-800 dark:text-white">{lS}{lE}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[15px] font-mono font-semibold ${color}`}>{f > 0 ? "+" : ""}{fmt(f)} kN</span>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badge}`}>{type}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Support Reactions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-4">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-[15px] font-semibold text-gray-800 dark:text-white tracking-wide">Support Reactions</h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {solution.reactions.map((r, i) => {
                  if (Math.abs(r.x) < 1e-6 && Math.abs(r.y) < 1e-6) return null;
                  const hasRx = Math.abs(r.x) > 1e-6;
                  const hasRy = Math.abs(r.y) > 1e-6;
                  const label = nodeLabel(i);
                  const sType = i < supports.length ? supports[i].type : "";
                  return (
                    <div key={i} className="px-5 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[14px] font-semibold text-gray-800 dark:text-white">Joint {label}</span>
                        <span className="text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{sType}</span>
                      </div>
                      <div className="flex gap-8">
                        {hasRx && (
                          <div>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Horizontal (R<sub>{label}</sub><sub>x</sub>)</p>
                            <KaTeXInline tex={`${fmt(r.x)}\\ \\text{kN}`} />
                          </div>
                        )}
                        {hasRy && (
                          <div>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Vertical (R<sub>{label}</sub><sub>y</sub>)</p>
                            <KaTeXInline tex={`${fmt(r.y)}\\ \\text{kN}`} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step-by-Step */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-[15px] font-semibold text-gray-800 dark:text-white tracking-wide">Step-by-Step Solution</h3>
              </div>
              <div className="px-6 py-5">
                <button
                  onClick={() => {
                    setStatus("generating");
                    const payload = { supports, nodes, members, forces, resultRows, solution };
                    const encoded = encodeURIComponent(JSON.stringify(payload));
                    window.open(`/print/truss?data=${encoded}`, "_blank");
                    setStatus("done");
                    setTimeout(() => setStatus("idle"), 2500);
                  }}
                  disabled={off}
                  className={`w-full mb-4 py-3 rounded-xl font-semibold text-white transition ${off ? "cursor-not-allowed bg-[#1848a0]/60" : "bg-[#1848a0] hover:bg-[#163d8a]"}`}
                >
                  {labels[status]}
                </button>
                <TrussStepRenderer lines={solution.lines} solution={solution} members={members} allNodes={allNodes} supports={supports} forces={forces} />
              </div>
            </div>
          </>
        )}
      </main>

      <main className="block sm:hidden flex-grow px-4 py-6 w-full">
        <h1 className="text-2xl font-bold text-center mb-1 text-gray-900 dark:text-white">Truss Calculator</h1>
        <h2 className="text-base font-semibold text-center mb-4 text-gray-700 dark:text-gray-300">Real-Time Free Body Diagram</h2>

        {/* FBD canvas */}
        <div className="relative rounded-xl shadow h-[250px] mb-6 overflow-hidden bg-gray-800 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <MainFBD numericNodes={numericNodes} members={members} supports={supports} forces={forces} solution={solution} allNodes={allNodes} />
        </div>

        <div className="flex flex-col gap-4 mb-6">

          {/* Supports */}
          <div className={cardCls}>
            <h3 className="text-base font-semibold mb-2 text-gray-900 dark:text-white">Supports</h3>
            {supports.map((s, i) => (
              <div key={i} className="flex flex-col gap-1 mb-3">
                <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Joint {nodeLabel(i)}</span>
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" placeholder="x" value={s.x} onChange={e => handleChange(supports, setSupports, i, "x", e.target.value)} className={`${inputClass} min-w-0`} />
                  <input type="number" placeholder="y" value={s.y} onChange={e => handleChange(supports, setSupports, i, "y", e.target.value)} className={`${inputClass} min-w-0`} />
                  <select value={s.type} onChange={e => handleChange(supports, setSupports, i, "type", e.target.value)} className={`${inputClass} min-w-0 text-sm`}>
                    <option>Pinned</option><option>Roller</option>
                  </select>
                </div>
                {supports.length > 1 && <button onClick={() => removeItem(supports, setSupports, i)} className={`${redButtonClass} w-full mt-1`}>– Remove</button>}
              </div>
            ))}
            <button onClick={() => addItem(supports, setSupports, { x: "", y: "", type: "Pinned" })} className={greenButtonClass}>+ Add Support</button>
          </div>

          {/* Nodes */}
          <div className={cardCls}>
            <h3 className="text-base font-semibold mb-2 text-gray-900 dark:text-white">Nodes</h3>
            {nodes.map((n, i) => (
              <div key={i} className="flex flex-col gap-1 mb-3">
                <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Joint {nodeLabel(supports.length + i)}</span>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="x" value={n.x} onChange={e => handleChange(nodes, setNodes, i, "x", e.target.value)} className={`${inputClass} min-w-0`} />
                  <input type="number" placeholder="y" value={n.y} onChange={e => handleChange(nodes, setNodes, i, "y", e.target.value)} className={`${inputClass} min-w-0`} />
                </div>
                {nodes.length > 1 && <button onClick={() => removeItem(nodes, setNodes, i)} className={`${redButtonClass} w-full mt-1`}>– Remove</button>}
              </div>
            ))}
            <button onClick={() => addItem(nodes, setNodes, { x: "", y: "" })} className={greenButtonClass}>+ Add Joint</button>
          </div>

          {/* Members */}
          <div className={cardCls}>
            <h3 className="text-base font-semibold mb-2 text-gray-900 dark:text-white">Members</h3>
            {members.map((m, i) => (
              <div key={i} className="flex flex-col gap-1 mb-3">
                <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Member {nodeLabel(m.start)}{nodeLabel(m.end)}</span>
                <div className="grid grid-cols-2 gap-2">
                  <select value={m.start} onChange={e => handleChange(members, setMembers, i, "start", Number(e.target.value))} className={`${inputClass} min-w-0 text-sm`}>
                    {allNodes.map((_, idx) => <option key={idx} value={idx}>Joint {nodeLabel(idx)}</option>)}
                  </select>
                  <select value={m.end} onChange={e => handleChange(members, setMembers, i, "end", Number(e.target.value))} className={`${inputClass} min-w-0 text-sm`}>
                    {allNodes.map((_, idx) => <option key={idx} value={idx}>Joint {nodeLabel(idx)}</option>)}
                  </select>
                </div>
                {members.length > 1 && <button onClick={() => removeItem(members, setMembers, i)} className={`${redButtonClass} w-full mt-1`}>– Remove</button>}
              </div>
            ))}
            <button onClick={() => addItem(members, setMembers, { start: 0, end: 0 })} className={greenButtonClass}>+ Add Member</button>
          </div>

          {/* Forces */}
          <div className={cardCls}>
            <h3 className="text-base font-semibold mb-2 text-gray-900 dark:text-white">Forces</h3>
            {forces.map((f, i) => (
              <div key={i} className="flex flex-col gap-1 mb-3">
                <select value={f.Joint} onChange={e => handleChange(forces, setForces, i, "Joint", Number(e.target.value))} className={`${inputClass} min-w-0 text-sm w-full`}>
                  {allNodes.map((_, idx) => <option key={idx} value={idx}>Joint {nodeLabel(idx)}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="kN" value={f.magnitude} onChange={e => handleChange(forces, setForces, i, "magnitude", e.target.value)} className={`${inputClass} min-w-0`} />
                  <input type="number" placeholder="deg" value={f.angle} onChange={e => handleChange(forces, setForces, i, "angle", e.target.value)} className={`${inputClass} min-w-0`} />
                </div>
                {forces.length > 1 && <button onClick={() => removeItem(forces, setForces, i)} className={`${redButtonClass} w-full mt-1`}>– Remove</button>}
              </div>
            ))}
            <button onClick={() => addItem(forces, setForces, { Joint: 0, magnitude: "", angle: "" })} className={greenButtonClass}>+ Add Force</button>
          </div>
        </div>

        <button className="w-full bg-[#1848a0] hover:bg-[#163d8a] text-white py-3 rounded-lg font-semibold mb-6 transition" onClick={handleSolve}>
          Calculate
        </button>

        {solution && (
          <>
            {/* Member Forces */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-4">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white tracking-wide">Member Forces</h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {solution.memberForces.map((f, i) => {
                  const tol = 1e-6;
                  const type = Math.abs(f) < tol ? "Zero-force" : f > 0 ? "Tension" : "Compression";
                  const lS = nodeLabel(members[i].start), lE = nodeLabel(members[i].end);
                  const color = Math.abs(f) < tol ? "text-gray-400" : f > 0 ? "text-blue-500 dark:text-blue-400" : "text-red-500 dark:text-red-400";
                  const badge = Math.abs(f) < tol
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    : f > 0
                      ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300"
                      : "bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-300";
                  return (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Member </span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-white">{lS}{lE}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-mono font-semibold ${color}`}>{f > 0 ? "+" : ""}{fmt(f)} kN</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge}`}>{type}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Support Reactions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-4">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white tracking-wide">Support Reactions</h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {solution.reactions.map((r, i) => {
                  if (Math.abs(r.x) < 1e-6 && Math.abs(r.y) < 1e-6) return null;
                  const hasRx = Math.abs(r.x) > 1e-6;
                  const hasRy = Math.abs(r.y) > 1e-6;
                  const label = nodeLabel(i);
                  const sType = i < supports.length ? supports[i].type : "";
                  return (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-gray-800 dark:text-white">Joint {label}</span>
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{sType}</span>
                      </div>
                      <div className="flex gap-6">
                        {hasRx && (
                          <div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Horizontal (R<sub>{label}</sub><sub>x</sub>)</p>
                            <KaTeXInline tex={`${fmt(r.x)}\\ \\text{kN}`} />
                          </div>
                        )}
                        {hasRy && (
                          <div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Vertical (R<sub>{label}</sub><sub>y</sub>)</p>
                            <KaTeXInline tex={`${fmt(r.y)}\\ \\text{kN}`} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step-by-Step */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white tracking-wide">Step-by-Step Solution</h3>
              </div>
              <div className="px-4 py-4">
                <button
                  onClick={() => {
                    setStatus("generating");
                    const payload = { supports, nodes, members, forces, resultRows, solution };
                    const encoded = encodeURIComponent(JSON.stringify(payload));
                    window.open(`/print/truss?data=${encoded}`, "_blank");
                    setStatus("done");
                    setTimeout(() => setStatus("idle"), 2500);
                  }}
                  disabled={off}
                  className={`w-full mb-4 py-3 rounded-xl font-semibold text-white transition ${off ? "cursor-not-allowed bg-[#1848a0]/60" : "bg-[#1848a0] hover:bg-[#163d8a]"}`}
                >
                  {labels[status]}
                </button>
                <TrussStepRenderer lines={solution.lines} solution={solution} members={members} allNodes={allNodes} supports={supports} forces={forces} />
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />
    </section>
  );
}