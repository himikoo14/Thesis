"use client";

import { useRef, useEffect, useState, ReactNode } from "react";
import FBD3DComponent from "../../components/FBD3D";

function useKatex() {
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
  const katexReady = useKatex();
  useEffect(() => {
    if (!el.current || !katexReady) return;
    const katex = (window as any).katex;
    if (!katex) return;
    try { katex.render(tex, el.current, { displayMode: true, throwOnError: false }); }
    catch (_) { if (el.current) el.current.innerText = tex; }
  }, [tex, katexReady]);
  return <div ref={el} className="my-0.5 overflow-x-auto dark:[&_.katex]:text-white dark:[&_.katex-html]:text-white" />;
}

type StepLine =
  | { type: "heading"; text: string }
  | { type: "math"; tex: string }
  | { type: "text"; text: string }
  | { type: "diagram"; label?: string; node: ReactNode };

function fromLegacySteps(steps: string[]): StepLine[] {
  return steps.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("Step")) return { type: "heading", text: trimmed };
    return { type: "math", tex: trimmed };
  });
}

function StepByStepSolution({ steps, title = "Step-by-Step Solution", containerRef }: {
  steps: StepLine[];
  title?: string;
  containerRef?: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div ref={containerRef} className="bg-white dark:bg-gray-800 rounded-[14px] border border-gray-200 dark:border-gray-600 p-4 sm:p-5 shadow-sm overflow-x-auto">
      {title && <h2 className="text-[17px] sm:text-[18px] font-semibold mb-4 mt-0 text-gray-900 dark:text-white">{title}</h2>}
      <div className="flex flex-col gap-2">
        {steps.map((line, i) => {
          switch (line.type) {
            case "heading":
              return <p key={i} className="font-semibold text-[15px] mt-2.5 mb-0.5 text-gray-900 dark:text-white">{line.text}</p>;
            case "math":
              return <KTX key={i} tex={line.tex} />;
            case "text":
              return <p key={i} className="text-[14px] text-gray-600 dark:text-gray-300 m-0">{line.text}</p>;
            case "diagram":
              return (
                <div key={i} className="mt-4">
                  {line.label && <p className="font-semibold text-[14px] mb-2 dark:text-white">{line.label}</p>}
                  <div className="flex justify-center">{line.node}</div>
                </div>
              );
            default: return null;
          }
        })}
      </div>
    </div>
  );
}

function buildSolution(details: any[], Rx: number, Ry: number, Rz: number, R: number): string[] {
  const steps: string[] = [];
  steps.push("Step 1: Determine position vectors");
  details.forEach(d => steps.push(`\\vec r_{${d.from}${d.to}} = (${d.bx}-${d.ax})\\hat i + (${d.by}-${d.ay})\\hat j + (${d.bz}-${d.az})\\hat k`));
  steps.push("Step 2: Magnitudes");
  details.forEach(d => steps.push(`|\\vec r_{${d.from}${d.to}}| = \\sqrt{${d.dx}^2+${d.dy}^2+${d.dz}^2} = ${d.len.toFixed(2)}`));
  steps.push("Step 3: Unit vectors");
  details.forEach(d => steps.push(`\\hat u_{${d.from}${d.to}} = \\frac{${d.dx}\\hat i+${d.dy}\\hat j+${d.dz}\\hat k}{${d.len.toFixed(2)}}`));
  steps.push("Step 4: Force vectors");
  details.forEach(d => steps.push(`\\vec F_{${d.to}} = ${d.mag}\\,\\hat u_{${d.from}${d.to}} = ${d.Fx.toFixed(2)}\\hat i + ${d.Fy.toFixed(2)}\\hat j + ${d.Fz.toFixed(2)}\\hat k`));
  steps.push("Step 5: Resultant");
  steps.push(`\\vec R = ${Rx.toFixed(2)}\\hat i + ${Ry.toFixed(2)}\\hat j + ${Rz.toFixed(2)}\\hat k`);
  steps.push(`R = \\sqrt{(${Rx.toFixed(2)})^2+(${Ry.toFixed(2)})^2+(${Rz.toFixed(2)})^2} = ${R.toFixed(2)}`);
  if (R > 0.0001) {
    const alpha = (Math.acos(Rx / R) * 180) / Math.PI;
    const beta = (Math.acos(Ry / R) * 180) / Math.PI;
    const gamma = (Math.acos(Rz / R) * 180) / Math.PI;
    steps.push("Step 6: Direction angles (α, β, γ)");
    steps.push(`\\alpha=\\cos^{-1}\\!\\left(\\frac{${Rx.toFixed(2)}}{${R.toFixed(2)}}\\right)=${alpha.toFixed(2)}^\\circ`);
    steps.push(`\\beta=\\cos^{-1}\\!\\left(\\frac{${Ry.toFixed(2)}}{${R.toFixed(2)}}\\right)=${beta.toFixed(2)}^\\circ`);
    steps.push(`\\gamma=\\cos^{-1}\\!\\left(\\frac{${Rz.toFixed(2)}}{${R.toFixed(2)}}\\right)=${gamma.toFixed(2)}^\\circ`);
    steps.push(`\\cos^2\\alpha+\\cos^2\\beta+\\cos^2\\gamma=${((Rx / R) ** 2 + (Ry / R) ** 2 + (Rz / R) ** 2).toFixed(3)}\\approx 1\\checkmark`);
  }
  return steps;
}

export default function CoordinateTab() {
  const ptLabel = (i: number) => String.fromCharCode(65 + i);
  const [points, setPoints] = useState([{ label: "A", x: "", y: "", z: "" }, { label: "B", x: "", y: "", z: "" }]);
  const [forces, setForces] = useState([{ mag: "", from: 0, to: 1 }]);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");

  const off = status === "generating";
  const labels: Record<typeof status, string> = {
    idle: "⬇ Download Solution as PDF",
    generating: "⏳ Opening print view…",
    done: "✅ Done!",
    error: "❌ Export failed — try again",
  };

  const addPoint = () => setPoints(p => [...p, { label: ptLabel(p.length), x: "", y: "", z: "" }]);
  const removePoint = (i: number) => {
    if (points.length <= 2) return;
    setPoints(p => p.filter((_, j) => j !== i).map((v, j) => ({ ...v, label: ptLabel(j) })));
  };
  const updatePoint = (i: number, field: string, val: string) =>
    setPoints(p => p.map((v, j) => j === i ? { ...v, [field]: val } : v));
  const addForce = () => setForces(f => [...f, { mag: "", from: 0, to: Math.min(1, points.length - 1) }]);
  const removeForce = (i: number) => { if (forces.length <= 1) return; setForces(f => f.filter((_, j) => j !== i)); };
  const updateForce = (i: number, field: string, val: any) =>
    setForces(f => f.map((v, j) => j === i ? { ...v, [field]: val } : v));

  const calculate = () => {
    let Rx = 0, Ry = 0, Rz = 0;
    const details: any[] = [];
    forces.forEach(f => {
      const mag = parseFloat(f.mag);
      if (!mag) return;
      const a = points[f.from], b = points[f.to];
      if (!a || !b) return;
      const ax = parseFloat(a.x) || 0, ay = parseFloat(a.y) || 0, az = parseFloat(a.z) || 0;
      const bx = parseFloat(b.x) || 0, by = parseFloat(b.y) || 0, bz = parseFloat(b.z) || 0;
      const dx = bx - ax, dy = by - ay, dz = bz - az;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (!len) return;
      const Fx = mag * dx / len, Fy = mag * dy / len, Fz = mag * dz / len;
      Rx += Fx; Ry += Fy; Rz += Fz;
      details.push({ mag, from: points[f.from].label, to: points[f.to].label, ax, ay, az, bx, by, bz, dx, dy, dz, Fx, Fy, Fz, len });
    });
    const R = Math.sqrt(Rx * Rx + Ry * Ry + Rz * Rz);
    const rawSteps = buildSolution(details, Rx, Ry, Rz, R);
    const alpha = (Math.acos(Rx / R) * 180) / Math.PI, beta = (Math.acos(Ry / R) * 180) / Math.PI, gamma = (Math.acos(Rz / R) * 180) / Math.PI;
    setResult({
      details, Rx, Ry, Rz, R, steps: rawSteps,
      stepLines: fromLegacySteps(rawSteps),
      resultRows: [
        { label: "Resultant Rx", value: `${Rx.toFixed(3)} N` },
        { label: "Resultant Ry", value: `${Ry.toFixed(3)} N` },
        { label: "Resultant Rz", value: `${Rz.toFixed(3)} N` },
        { label: "Magnitude |R|", value: `${R.toFixed(3)} N` },
        { label: "α (angle with X)", value: `${alpha.toFixed(2)}°` },
        { label: "β (angle with Y)", value: `${beta.toFixed(2)}°` },
        { label: "γ (angle with Z)", value: `${gamma.toFixed(2)}°` },
      ],
    });
  };

  const handleExportPDF = async () => {
    if (!result) return;
    setStatus("generating");
    const payload = {
      steps: result.steps,
      resultRows: result.resultRows,
      points,
      forces,
      result: { Rx: result.Rx, Ry: result.Ry, Rz: result.Rz, R: result.R, details: result.details },
    };
    const encoded = encodeURIComponent(JSON.stringify(payload));
    const win = window.open(`/print/resultant-3dcoordinate?data=${encoded}`, "_blank");
    if (win) {
      win.addEventListener("load", () => {
        setTimeout(() => { setStatus("done"); setTimeout(() => setStatus("idle"), 2500); }, 800);
      });
    } else {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  // Convert coordinate-based forces to FBD3DComponent format
  const fbd3DForces = forces.map(f => {
    const mag = parseFloat(f.mag);
    const a = points[f.from], b = points[f.to];
    if (!mag || !a || !b) return { magnitude: "", azimuth: "", elevation: "" };
    const ax = parseFloat(a.x) || 0, ay = parseFloat(a.y) || 0, az = parseFloat(a.z) || 0;
    const bx = parseFloat(b.x) || 0, by = parseFloat(b.y) || 0, bz = parseFloat(b.z) || 0;
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!len) return { magnitude: "", azimuth: "", elevation: "" };
    const azimuth = (Math.atan2(dy, dx) * 180) / Math.PI;
    const elevation = (Math.asin(dz / len) * 180) / Math.PI;
    return { magnitude: String(mag), azimuth: String(azimuth), elevation: String(elevation) };
  });

  const inputCls = "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-[13px] w-full outline-none text-gray-900 dark:text-white";
  const selectCls = "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-[13px] outline-none text-gray-900 dark:text-white w-full";
  const cardCls = "bg-white dark:bg-gray-800 rounded-[14px] border border-gray-200 dark:border-gray-600 p-4 sm:p-5 shadow-sm";
  const h3Cls = "text-[14px] sm:text-[15px] font-semibold mt-0 mb-3 text-gray-900 dark:text-white";

  return (
    <div className="w-full max-w-[580px] mx-auto bg-transparent">

      {/* ← REPLACED: was <CoordThreeCanvas points={points} forces={forces} /> */}
      <div className="w-full max-w-[580px] mx-auto mb-4">
        <h2 className="text-[17px] sm:text-[18px] font-semibold text-center mb-2 text-gray-900 dark:text-white">
          Cartesian Vector Method
        </h2>
        <p className="text-[12px] sm:text-[13px] text-gray-500 dark:text-gray-400 text-center mt-0 mb-3">
          Real-Time Free Body Diagram
        </p>
        <FBD3DComponent forces={fbd3DForces} />
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

        {/* Points card */}
        <div className={cardCls}>
          <h3 className={h3Cls}>Coordinates of Points</h3>
          <div className="grid grid-cols-[40px_1fr_1fr_1fr_30px] gap-1 mb-1">
            <span />
            {["x", "y", "z"].map(l => <span key={l} className="text-[11px] text-gray-400 text-center">{l}</span>)}
            <span />
          </div>
          {points.map((p, i) => (
            <div key={i} className="grid grid-cols-[40px_1fr_1fr_1fr_30px] gap-1 items-center mb-1.5">
              <span className="text-[12px] text-gray-500 dark:text-gray-400 truncate">Pt {p.label}</span>
              {["x", "y", "z"].map(field => (
                <input key={field} className={inputCls} placeholder={field}
                  value={(p as any)[field]} onChange={e => updatePoint(i, field, e.target.value)} />
              ))}
              <button onClick={() => removePoint(i)}
                className="bg-red-500 text-white rounded-[7px] w-full h-full flex items-center justify-center cursor-pointer font-bold hover:bg-red-600 text-[14px]">
                –
              </button>
            </div>
          ))}
          <button onClick={addPoint}
            className="bg-[#008409] hover:bg-[#15711b] text-white rounded-lg px-3 py-1.5 text-[12px] sm:text-[13px] cursor-pointer mt-1 transition">
            + Add Point
          </button>
        </div>

        {/* Forces card */}
        <div className={cardCls}>
          <h3 className={h3Cls}>Forces</h3>
          {forces.map((f, i) => (
            <div key={i} className="bg-white dark:bg-gray-700 rounded-[10px] border border-gray-200 dark:border-gray-600 p-2.5 mb-2">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[12px] text-gray-500 dark:text-gray-400 w-24 shrink-0">Magnitude (kN):</span>
                <input className={inputCls} placeholder="kN" value={f.mag}
                  onChange={e => updateForce(i, "mag", e.target.value)} />
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[12px] text-gray-500 dark:text-gray-400 w-24 shrink-0">From:</span>
                <select className={selectCls} value={f.from} onChange={e => updateForce(i, "from", +e.target.value)}>
                  {points.map((p, j) => <option key={j} value={j}>Point {p.label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-gray-500 dark:text-gray-400 w-24 shrink-0">To:</span>
                <select className={selectCls} value={f.to} onChange={e => updateForce(i, "to", +e.target.value)}>
                  {points.map((p, j) => <option key={j} value={j}>Point {p.label}</option>)}
                </select>
              </div>
              {forces.length > 1 && (
                <div className="text-right mt-2">
                  <button onClick={() => removeForce(i)}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-[7px] px-2.5 py-1 text-[12px] cursor-pointer transition">
                    – Remove
                  </button>
                </div>
              )}
            </div>
          ))}
          <button onClick={addForce}
            className="bg-[#008409] hover:bg-[#15711b] text-white rounded-lg px-3 py-1.5 text-[12px] sm:text-[13px] cursor-pointer transition">
            + Add Force
          </button>
        </div>
      </div>

      {/* Calculate */}
      <button onClick={calculate}
        className="w-full bg-[#1848a0] hover:bg-[#163d8a] text-white rounded-[10px] py-3 text-[15px] sm:text-[16px] font-semibold cursor-pointer mb-4 transition">
        Calculate
      </button>

      {/* Solution */}
      {result && (
        <>
          {/* ── WIDE SCREEN (sm+) ── */}
          <div className="hidden sm:block flex-col gap-3 mt-4">
            <h3 className="text-[15px] sm:text-[16px] font-semibold text-gray-900 dark:text-white mb-4">
              Step-by-Step Solution
            </h3>
            <div className="mt-4">
              <button
                onClick={handleExportPDF}
                disabled={off}
                className={`w-full py-3 rounded-[10px] text-[14px] sm:text-[15px] font-semibold text-white mb-3 transition ${off ? "opacity-60 cursor-not-allowed bg-[#1848a0]" : "cursor-pointer bg-[#1848a0] hover:bg-[#163d8a]"}`}>
                {labels[status]}
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {result.resultRows.map((row: { label: string; value: string }, i: number) => (
                  <div key={i} className="bg-blue-50 dark:bg-gray-700 rounded-[10px] border border-blue-100 dark:border-gray-600 px-3 py-2.5">
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">{row.label}</div>
                    <div className="text-[15px] font-bold text-[#1848a0] dark:text-blue-400">{row.value}</div>
                  </div>
                ))}
              </div>
              <StepByStepSolution steps={result.stepLines} title="" />
            </div>
          </div>

          {/* ── MOBILE ── */}
          <div className="flex sm:hidden flex-col gap-3 mt-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-3">
              <h3 className="text-[11px] font-semibold mb-2 text-gray-900 dark:text-white">Results</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {result.resultRows.map((row: { label: string; value: string }, i: number) => (
                  <div key={i} className="bg-blue-50 dark:bg-gray-700 rounded-[6px] border border-blue-100 dark:border-gray-600 px-2 py-1.5">
                    <div className="text-[9px] text-gray-500 dark:text-gray-400 mb-0.5 leading-tight">{row.label}</div>
                    <div className="text-[12px] font-bold text-[#1848a0] dark:text-blue-400">{row.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={handleExportPDF}
              disabled={off}
              className={`w-full py-3 rounded-[10px] text-[14px] sm:text-[15px] font-semibold text-white mb-3 transition ${off ? "opacity-60 cursor-not-allowed bg-[#1848a0]" : "cursor-pointer bg-[#1848a0] hover:bg-[#163d8a]"}`}>
              {labels[status]}
            </button>
            <div className="overflow-x-auto text-[11px]">
              <StepByStepSolution steps={result.stepLines} title="Step-by-Step Solution" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}