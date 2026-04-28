"use client";

import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { solveBeam, BeamResult } from "../../lib/beamEngine";

/* ===================== TYPES ===================== */
type Support = { type: "Pinned" | "Roller"; location: string };
type PointLoad = { magnitude: string; location: string };
type DistributedLoad = { start: string; end: string; startMag: string; endMag: string };
type GenericObject = Record<string, any>;

/* ================================================================
   STEP LINE TYPES
================================================================ */
type StepLine =
  | { type: "heading"; text: string }
  | { type: "math"; tex: string }
  | { type: "text"; text: string }
  | { type: "diagram"; label?: string; node: ReactNode };

function fromLegacySteps(steps: string[]): StepLine[] {
  return steps.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("Step")) return { type: "heading", text: trimmed };
    if (!trimmed.includes("\\") || trimmed.includes("kN\\cdot") || trimmed.startsWith("Max")) {
      return { type: "text", text: trimmed.replace(/\\cdotp?/g, "·") };
    }
    return { type: "math", tex: trimmed };
  });
}

/* ================================================================
   KATEX INLINE RENDERER
================================================================ */
function useKatexScript() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if ((window as any).katex) { setOk(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css";
    document.head.appendChild(link);
    const scr = document.createElement("script");
    scr.src = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js";
    scr.onload = () => setOk(true);
    document.head.appendChild(scr);
  }, []);
  return ok;
}

function KTX({ tex }: { tex: string }) {
  const el = useRef<HTMLDivElement>(null);
  const katexReady = useKatexScript();
  useEffect(() => {
    if (!el.current || !katexReady) return;
    const katex = (window as any).katex;
    if (!katex) return;
    try { katex.render(tex, el.current, { displayMode: true, throwOnError: false }); }
    catch (_) { if (el.current) el.current.innerText = tex; }
  }, [tex, katexReady]);
  return <div ref={el} className="my-0.5 overflow-x-auto dark:[&_.katex]:text-white dark:[&_.katex-html]:text-white" />;
}

/* ================================================================
   STEP-BY-STEP SOLUTION RENDERER
================================================================ */
function StepByStepSolution({ steps, title = "Step-by-Step Solution" }: {
  steps: StepLine[];
  title?: string;
}) {
  return (
    <div>
      {title && <h2 className="text-[16px] sm:text-[18px] font-semibold mt-0 mb-3 text-gray-900 dark:text-white">{title}</h2>}
      <div className="flex flex-col gap-1.5 leading-relaxed">
        {steps.map((line, i) => {
          switch (line.type) {
            case "heading":
              return <p key={i} className="font-semibold text-[14px] sm:text-[16px] mt-3.5 mb-0.5 text-[#1848a0] dark:text-blue-400">{line.text}</p>;
            case "math":
              return <KTX key={i} tex={line.tex} />;
            case "text":
              return <p key={i} className="text-[13px] sm:text-[15px] text-gray-700 dark:text-gray-300 my-0.5">{line.text}</p>;
            case "diagram":
              return (
                <div key={i} className="mt-3">
                  {line.label && <p className="font-semibold text-[14px] sm:text-[15px] mb-2 dark:text-white">{line.label}</p>}
                  <div className="flex justify-center">{line.node}</div>
                </div>
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}

/* ===================== SVG FREE BODY DIAGRAM ===================== */
function BeamFBD({ beamLength, supports, pointLoads, distributedLoads, result }: {
  beamLength: string;
  supports: Support[];
  pointLoads: PointLoad[];
  distributedLoads: DistributedLoad[];
  result: BeamResult | null;
}) {
  const L = parseFloat(beamLength);
  if (!L || L <= 0) {
    return (
      <div className="flex items-center justify-center h-[160px] sm:h-[200px] w-full text-center text-gray-400 dark:text-gray-500 text-[13px] sm:text-[14px] bg-white dark:bg-gray-800 rounded-xl">
        Enter a beam length to see the diagram
      </div>
    );
  }

  const W = 680, H = 260, padL = 60, padR = 60, beamY = 160, beamH = 14;
  const drawW = W - padL - padR;
  const scale = drawW / L;
  const toX = (m: number) => padL + m * scale;

  const allMags = [
    ...pointLoads.map(p => Math.abs(parseFloat(p.magnitude) || 0)),
    ...distributedLoads.map(d => Math.max(Math.abs(parseFloat(d.startMag) || 0), Math.abs(parseFloat(d.endMag) || 0))),
  ];
  const maxMag = Math.max(1, ...allMags);
  const maxArrowH = 60;
  const arrowH = (mag: number) => Math.max(10, (Math.abs(mag) / maxMag) * maxArrowH);
  const maxReaction = result ? Math.max(...result.reactions.map(r => Math.abs(r.vertical))) : 1;
  const reactionArrowH = (v: number) => Math.max(10, (Math.abs(v) / Math.max(maxReaction, 1)) * 50);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <marker id="arrowDown" markerWidth="8" markerHeight="8" refX="4" refY="0" orient="90">
          <polygon points="0,0 8,0 4,8" fill="#1848a0" />
        </marker>
        <marker id="arrowDownGreen" markerWidth="8" markerHeight="8" refX="4" refY="0" orient="90">
          <polygon points="0,0 8,0 4,8" fill="#059669" />
        </marker>
        <marker id="arrowRight" markerWidth="8" markerHeight="8" refX="0" refY="4" orient="auto">
          <polygon points="0,0 0,8 8,4" fill="#9ca3af" />
        </marker>
        <marker id="arrowUp" markerWidth="8" markerHeight="8" refX="4" refY="0" orient="auto">
          <polygon points="0,8 8,8 4,0" fill="#009900" />
        </marker>
      </defs>

      {distributedLoads.map((d, i) => {
        const xs = parseFloat(d.start), xe = parseFloat(d.end);
        const ws = parseFloat(d.startMag), we = parseFloat(d.endMag);
        if (isNaN(xs) || isNaN(xe) || isNaN(ws) || isNaN(we) || xe <= xs) return null;
        const x1 = toX(xs), x2 = toX(xe);
        const hs = arrowH(Math.abs(ws)), he = arrowH(Math.abs(we));
        const topYs = beamY - hs, topYe = beamY - he;
        const numLines = Math.max(2, Math.round((x2 - x1) / 18));
        const lines = [];
        for (let j = 0; j <= numLines; j++) {
          const t = j / numLines;
          const lx = x1 + t * (x2 - x1);
          const topY = topYs + t * (topYe - topYs);
          lines.push(
            <g key={j}>
              <line x1={lx} y1={topY} x2={lx} y2={beamY - 6} stroke="#1848a0" strokeWidth="1.5" />
              <polygon points={`${lx - 4},${beamY - 6} ${lx + 4},${beamY - 6} ${lx},${beamY}`} fill="#1848a0" />
            </g>
          );
        }
        return (
          <g key={i}>
            {lines}
            <line x1={x1} y1={topYs} x2={x2} y2={topYe} stroke="#1848a0" strokeWidth="2.5" />
            {ws === we ? (
              <text x={(x1 + x2) / 2} y={Math.min(topYs, topYe) - 6} textAnchor="middle" fontSize="11" fill="#1848a0" fontFamily="monospace">{ws} kN/m</text>
            ) : (
              <>
                <text x={x1} y={topYs - 6} textAnchor="start" fontSize="11" fill="#1848a0" fontFamily="monospace">{ws} kN/m</text>
                <text x={x2} y={topYe - 6} textAnchor="end" fontSize="11" fill="#1848a0" fontFamily="monospace">{we} kN/m</text>
              </>
            )}
          </g>
        );
      })}

      {pointLoads.map((p, i) => {
        const m = parseFloat(p.magnitude), x = parseFloat(p.location);
        if (isNaN(m) || isNaN(x) || m === 0) return null;
        const px = toX(x);
        const overlapDist = distributedLoads.find(d => {
          const xs = parseFloat(d.start), xe = parseFloat(d.end);
          const ws = parseFloat(d.startMag), we = parseFloat(d.endMag);
          if (isNaN(xs) || isNaN(xe) || isNaN(ws) || isNaN(we) || xe <= xs) return false;
          return x >= xs && x <= xe;
        });
        let baseY = beamY;
        if (overlapDist) {
          const ws = parseFloat(overlapDist.startMag), we = parseFloat(overlapDist.endMag);
          baseY = beamY - arrowH(Math.max(Math.abs(ws), Math.abs(we)));
        }
        const h = arrowH(m);
        const labelGap = overlapDist ? 20 : 0;
        return (
          <g key={i}>
            <line x1={px} y1={baseY - h - labelGap} x2={px} y2={baseY - 7 - labelGap} stroke="#059669" strokeWidth="2.5" />
            <polygon points={`${px - 5},${baseY - 7 - labelGap} ${px + 5},${baseY - 7 - labelGap} ${px},${baseY - labelGap}`} fill="#059669" />
            <text x={px} y={baseY - h - labelGap - 6} textAnchor="middle" fontSize="12" fill="#059669" fontWeight="bold" fontFamily="monospace">{m} kN</text>
          </g>
        );
      })}

      <rect x={padL} y={beamY} width={drawW} height={beamH} fill="#d1d5db" stroke="#374151" strokeWidth="2" rx="2" />
      <line x1={padL} y1={beamY + beamH + 22} x2={padL + drawW} y2={beamY + beamH + 22} stroke="#9ca3af" strokeWidth="1" />
      <line x1={padL} y1={beamY + beamH + 16} x2={padL} y2={beamY + beamH + 28} stroke="#9ca3af" strokeWidth="1.5" />
      <line x1={padL + drawW} y1={beamY + beamH + 16} x2={padL + drawW} y2={beamY + beamH + 28} stroke="#9ca3af" strokeWidth="1.5" />
      <text x={padL + drawW / 2} y={beamY + beamH + 36} textAnchor="middle" fontSize="12" fill="#6b7280" fontFamily="monospace">L = {L} m</text>

      {supports.map((s, i) => {
        const x = parseFloat(s.location);
        if (isNaN(x)) return null;
        const sx = toX(x), sy = beamY + beamH;
        return (
          <g key={i}>
            {s.type === "Pinned" && (
              <>
                <polygon points={`${sx},${sy} ${sx - 12},${sy + 18} ${sx + 12},${sy + 18}`} fill="#6b7280" stroke="#374151" strokeWidth={1} />
                <line x1={sx - 14} y1={sy + 18} x2={sx + 14} y2={sy + 18} stroke="#374151" strokeWidth={2} />
              </>
            )}
            {s.type === "Roller" && (
              <>
                <polygon points={`${sx},${sy} ${sx - 12},${sy + 18} ${sx + 12},${sy + 18}`} fill="#9ca3af" stroke="#6b7280" strokeWidth={1} />
                <circle cx={sx - 7} cy={sy + 21} r={3} fill="none" stroke="#6b7280" strokeWidth={1.5} />
                <circle cx={sx} cy={sy + 21} r={3} fill="none" stroke="#6b7280" strokeWidth={1.5} />
                <circle cx={sx + 7} cy={sy + 21} r={3} fill="none" stroke="#6b7280" strokeWidth={1.5} />
              </>
            )}
            <text x={sx} y={beamY + beamH + (result ? 18 : 0) + 52} textAnchor="middle" fontSize="11" fill="#6b7280" fontFamily="monospace">{x} m</text>
          </g>
        );
      })}

      <rect x={padL} y={8} width={10} height={10} fill="#1848a055" stroke="#1848a0" strokeWidth="1" />
      <text x={padL + 14} y={18} fontSize="11" fill="#1848a0" fontFamily="monospace">Applied Load</text>
    </svg>
  );
}

/* ===================== MAIN COMPONENT ===================== */
export default function BeamSolverUI() {
  const [beamLength, setBeamLength] = useState("");
  const [supports, setSupports] = useState<Support[]>([{ type: "Pinned", location: "" }]);
  const [pointLoads, setPointLoads] = useState<PointLoad[]>([{ magnitude: "", location: "" }]);
  const [distributedLoads, setDistributedLoads] = useState<DistributedLoad[]>([{ start: "", end: "", startMag: "", endMag: "" }]);
  const [result, setResult] = useState<BeamResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");

  const off = status === "generating";
  const labels: Record<typeof status, string> = {
    idle: "⬇ Download Solution as PDF",
    generating: "⏳ Opening print view…",
    done: "✅ Done!",
    error: "❌ Export failed — try again",
  };

  // ── Shared class strings ──
  // Mobile-first: smaller text/padding on xs, normal on sm+
  const inputCls = "w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-600 text-[14px] sm:text-[16px] px-2 sm:px-2.5 py-1.5 sm:py-2 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-[inherit] box-border";
  const labelCls = "block font-medium text-[13px] sm:text-[16px] text-gray-800 dark:text-gray-200";
  const cardCls  = "bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 sm:p-6";
  const h3Cls    = "text-[15px] sm:text-[18px] font-semibold mt-0 mb-3 sm:mb-4 text-gray-900 dark:text-white";
  const subHCls  = "text-[13px] sm:text-[15px] font-semibold mt-4 sm:mt-5 mb-1.5 sm:mb-2 text-gray-700 dark:text-gray-300";

  /* ---------- GENERIC HANDLERS ---------- */
  const handleChange = <T extends GenericObject>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, index: number, field: keyof T, value: T[keyof T]) => {
    const n = [...arr]; n[index][field] = value; setArr(n);
  };
  const addItem = <T,>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, template: T) => setArr([...arr, template]);
  const removeItem = <T,>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, index: number) => setArr(arr.filter((_, i) => i !== index));

  /* ---------- CALCULATE ---------- */
  const calculate = () => {
    setError(null);
    try {
      const res = solveBeam({
        beamLength: parseFloat(beamLength),
        supports: supports.map(s => ({ type: s.type, location: parseFloat(s.location) })),
        pointLoads: pointLoads.filter(p => p.magnitude !== "" && p.location !== "").map(p => ({ magnitude: parseFloat(p.magnitude), location: parseFloat(p.location) })),
        distributedLoads: distributedLoads.filter(d => d.start !== "" && d.end !== "" && d.startMag !== "" && d.endMag !== "").map(d => ({ start: parseFloat(d.start), end: parseFloat(d.end), startMag: parseFloat(d.startMag), endMag: parseFloat(d.endMag) })),
      });
      setResult(res);
    } catch (e: any) {
      setError(e.message ?? "An error occurred.");
    }
  };

  const resultRows = result ? result.reactions.map(r => ({ label: `${r.type} at x = ${fmt(r.location)} m`, value: `${fmt(r.vertical)} kN` })) : [];

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-gray-900 dark:text-white items-center font-serif">
      <div className="w-full max-w-[760px] px-3 sm:px-4 pb-10">

        <h1 className="text-[20px] sm:text-[28px] font-bold text-center mt-5 sm:mt-7 mb-1 text-gray-900 dark:text-white">
          Non-Concurrent Parallel Force System
        </h1>
        <h2 className="text-[15px] sm:text-[18px] font-semibold text-center mb-2 text-gray-900 dark:text-white">
          Beam Analysis Calculator
        </h2>
        <p className="text-[12px] sm:text-[13px] text-gray-500 dark:text-gray-400 mt-1.5 text-center">
          Real-Time Free Body Diagram
        </p>

        {/* ── FBD ── */}
        <div className={`${cardCls} mb-4 sm:mb-6 min-h-[160px] sm:min-h-[200px] relative z-[1]`}>
          <BeamFBD
            beamLength={beamLength}
            supports={supports}
            pointLoads={pointLoads}
            distributedLoads={distributedLoads}
            result={result}
          />
        </div>

        {/* ── Input panels ──
            MOBILE: single column stack
            SM+:    two-column side by side (unchanged) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5 mb-4 sm:mb-5 relative z-[1]">

          {/* BEAM PROPERTIES */}
          <div className={cardCls}>
            <h3 className={h3Cls}>Beam Properties</h3>
            <label className={labelCls}>Beam Length</label>
            <input
              type="number"
              placeholder="m"
              value={beamLength}
              onChange={(e) => { setBeamLength(e.target.value); setResult(null); }}
              className={inputCls}
            />

            <p className={subHCls}>Supports</p>
            {supports.map((s, i) => (
              <div key={i} className="space-y-2 mb-3">
                {/* MOBILE: stack type + location vertically with remove inline */}
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0">
                    <label className={labelCls}>Type</label>
                    <select
                      value={s.type}
                      onChange={(e) => handleChange(supports, setSupports, i, "type", e.target.value as Support["type"])}
                      className={inputCls}
                    >
                      <option>Pinned</option>
                      <option>Roller</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className={labelCls}>Location (m)</label>
                    <input
                      type="number"
                      placeholder="m"
                      value={s.location}
                      onChange={(e) => handleChange(supports, setSupports, i, "location", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  {supports.length > 1 && (
                    <button
                      onClick={() => removeItem(supports, setSupports, i)}
                      className="self-end mb-1 bg-red-500 hover:bg-red-600 text-white border-none rounded-lg px-2.5 sm:px-3 py-1 cursor-pointer text-[15px] sm:text-[18px] transition"
                    >–</button>
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={() => addItem(supports, setSupports, { type: "Pinned", location: "" })}
              className="bg-[#008409] hover:bg-[#15711b] text-white border-none rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-[13px] sm:text-[15px] cursor-pointer mt-1 sm:mt-2 transition"
            >
              + Add Support
            </button>
          </div>

          {/* LOADS */}
          <div className={cardCls}>
            <h3 className={h3Cls}>Loads</h3>

            <p className={`${subHCls} mt-0`}>Point Loads</p>
            {pointLoads.map((p, i) => (
              <div key={i} className="flex gap-2 items-end mb-2.5">
                <div className="flex-1 min-w-0">
                  <label className={labelCls}>Magnitude (kN)</label>
                  <input
                    type="number"
                    placeholder="kN"
                    value={p.magnitude}
                    onChange={(e) => handleChange(pointLoads, setPointLoads, i, "magnitude", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className={labelCls}>Location (m)</label>
                  <input
                    type="number"
                    placeholder="m"
                    value={p.location}
                    onChange={(e) => handleChange(pointLoads, setPointLoads, i, "location", e.target.value)}
                    className={inputCls}
                  />
                </div>
                {pointLoads.length > 1 && (
                  <button
                    onClick={() => removeItem(pointLoads, setPointLoads, i)}
                    className="self-end mb-1 bg-red-500 hover:bg-red-600 text-white border-none rounded-lg px-2.5 sm:px-3 py-1 cursor-pointer text-[15px] sm:text-[18px] transition"
                  >–</button>
                )}
              </div>
            ))}
            <button
              onClick={() => addItem(pointLoads, setPointLoads, { magnitude: "", location: "" })}
              className="bg-[#008409] hover:bg-[#15711b] text-white border-none rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-[13px] sm:text-[15px] cursor-pointer mt-1 sm:mt-2 transition"
            >
              + Add Point Load
            </button>

            <p className={subHCls}>Distributed Loads</p>
            {distributedLoads.map((d, i) => (
              <div key={i} className="mb-3.5">
                {/* Start / End positions */}
                <div className="flex gap-2 items-end mb-1.5">
                  <div className="flex-1 min-w-0">
                    <label className={labelCls}>Start (m)</label>
                    <input
                      type="number"
                      placeholder="m"
                      value={d.start}
                      onChange={(e) => handleChange(distributedLoads, setDistributedLoads, i, "start", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className={labelCls}>End (m)</label>
                    <input
                      type="number"
                      placeholder="m"
                      value={d.end}
                      onChange={(e) => handleChange(distributedLoads, setDistributedLoads, i, "end", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  {distributedLoads.length > 1 ? (
                    <button
                      onClick={() => removeItem(distributedLoads, setDistributedLoads, i)}
                      className="self-end mb-1 bg-red-500 hover:bg-red-600 text-white border-none rounded-lg px-2.5 sm:px-3 py-1 cursor-pointer text-[15px] sm:text-[18px] transition"
                    >–</button>
                  ) : <div />}
                </div>
                {/* Start / End magnitudes */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Start Mag. (kN/m)</label>
                    <input
                      type="number"
                      placeholder="kN/m"
                      value={d.startMag}
                      onChange={(e) => handleChange(distributedLoads, setDistributedLoads, i, "startMag", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>End Mag. (kN/m)</label>
                    <input
                      type="number"
                      placeholder="kN/m"
                      value={d.endMag}
                      onChange={(e) => handleChange(distributedLoads, setDistributedLoads, i, "endMag", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={() => addItem(distributedLoads, setDistributedLoads, { start: "", end: "", startMag: "", endMag: "" })}
              className="bg-[#008409] hover:bg-[#15711b] text-white border-none rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-[13px] sm:text-[15px] cursor-pointer mt-1 sm:mt-2 transition"
            >
              + Add Distributed Load
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 mb-4 text-red-800 dark:text-red-300 text-[13px] sm:text-[15px]">
            ⚠ {error}
          </div>
        )}

        {/* ── Calculate ── */}
        <button
          onClick={calculate}
          className="w-full bg-[#1848a0] hover:bg-[#163d8a] text-white border-none rounded-lg py-2.5 sm:py-3.5 text-[14px] sm:text-[16px] font-semibold cursor-pointer mb-4 sm:mb-5 transition font-[inherit]"
        >
          Calculate
        </button>

        {/* ── Results ── */}
        {result && (
          <div className={`${cardCls} mb-4 sm:mb-5`}>
            <h2 className="text-[15px] sm:text-[18px] font-semibold mt-0 mb-3 sm:mb-3.5 text-gray-900 dark:text-white">Reactions</h2>
            {result.reactions.map((r, i) => (
              <div key={i} className="mb-2 sm:mb-2.5">
                <label className={labelCls}>{r.type} at x = {r.location} m</label>
                <input
                  type="text"
                  readOnly
                  value={`R = ${fmt(r.vertical)} kN`}
                  className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-600 text-[13px] sm:text-[16px] px-2 sm:px-2.5 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 outline-none"
                />
              </div>
            ))}

            {/* Result tiles — 1 col on mobile, 2 col on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 sm:mt-4">
              {resultRows.map((row, i) => (
                <div key={i} className="bg-blue-50 dark:bg-gray-700 rounded-[10px] border border-blue-100 dark:border-gray-600 px-3 sm:px-3.5 py-2 sm:py-2.5">
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">{row.label}</div>
                  <div className="text-[13px] sm:text-[15px] font-bold text-[#1848a0] dark:text-blue-400">{row.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step by Step ── */}
        {result && (
          <div className={`${cardCls} mb-4 sm:mb-5`}>
            <button
              onClick={() => {
                setStatus("generating");
                const payload = { beamLength, supports, pointLoads, distributedLoads, reactions: result.reactions, steps: result.steps, resultRows };
                const encoded = encodeURIComponent(JSON.stringify(payload));
                window.open(`/print/beam?data=${encoded}`, "_blank");
                setStatus("done");
                setTimeout(() => setStatus("idle"), 2500);
              }}
              disabled={off}
              className={`w-full py-2.5 sm:py-3 border-none rounded-[10px] text-[13px] sm:text-[14px] font-semibold text-white mb-3 sm:mb-3.5 transition font-[inherit] ${
                off ? "opacity-60 cursor-not-allowed bg-[#1848a0]" : "cursor-pointer bg-[#1848a0] hover:bg-[#163d8a]"
              }`}
            >
              {labels[status]}
            </button>

            <StepByStepSolution steps={fromLegacySteps(result.steps)} title="Step-by-Step Solution" />
          </div>
        )}

      </div>
    </div>
  );
}

const fmt = (n: number): string => {
  if (Math.abs(n - Math.round(n)) < 1e-9) return Math.round(n).toString();
  return n.toFixed(2);
};