"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import FBD3DComponent from "../../components/FBD3D";

/* ================================================================
   DARK MODE HOOK — reactive to toggle
================================================================ */
function useDarkMode() {
  const [dark, setDark] = useState(
    typeof window !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark"))
    );
    obs.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/* ================================================================
   FORCE SYSTEM LOGIC
================================================================ */
class ForceSystem3D {
  vectors: any[] = [];

  addForce(magnitude: number, azimuthDeg: number, elevationDeg: number) {
    const az = (azimuthDeg * Math.PI) / 180;
    const el = (elevationDeg * Math.PI) / 180;
    this.vectors.push({
      fx: magnitude * Math.cos(el) * Math.cos(az),
      fy: magnitude * Math.cos(el) * Math.sin(az),
      fz: magnitude * Math.sin(el),
      magnitude, azimuthDeg, elevationDeg,
    });
  }

  solve() {
    const steps: string[] = [];
    steps.push("Step 1: Resolve each force into 3D components:");
    let sumFx = 0, sumFy = 0, sumFz = 0;
    this.vectors.forEach((v, i) => {
      steps.push(`\\text{Force ${i + 1}: }|F|=${v.magnitude}\\,\\text{kN},\\;\\phi=${v.azimuthDeg}^\\circ,\\;\\alpha=${v.elevationDeg}^\\circ`);
      steps.push(
        `\\begin{align*}` +
        `F_{x${i + 1}}&=${v.magnitude}\\cos(${v.elevationDeg}^\\circ)\\cos(${v.azimuthDeg}^\\circ)=${v.fx.toFixed(3)}\\,\\text{kN}\\\\` +
        `F_{y${i + 1}}&=${v.magnitude}\\cos(${v.elevationDeg}^\\circ)\\sin(${v.azimuthDeg}^\\circ)=${v.fy.toFixed(3)}\\,\\text{kN}\\\\` +
        `F_{z${i + 1}}&=${v.magnitude}\\sin(${v.elevationDeg}^\\circ)=${v.fz.toFixed(3)}\\,\\text{kN}` +
        `\\end{align*}`
      );
      sumFx += v.fx; sumFy += v.fy; sumFz += v.fz;
    });
    steps.push("Step 2: Sum of components:");
    steps.push(
      `\\begin{align*}` +
      `\\Sigma F_x&=${sumFx.toFixed(3)}\\,\\text{kN}\\\\` +
      `\\Sigma F_y&=${sumFy.toFixed(3)}\\,\\text{kN}\\\\` +
      `\\Sigma F_z&=${sumFz.toFixed(3)}\\,\\text{kN}` +
      `\\end{align*}`
    );
    const R = Math.sqrt(sumFx ** 2 + sumFy ** 2 + sumFz ** 2);
    const azimuth = (Math.atan2(sumFy, sumFx) * 180) / Math.PI;
    const elevation = (Math.asin(sumFz / (R || 1)) * 180) / Math.PI;
    steps.push("Step 3: Resultant force:");
    steps.push(
      `\\begin{align*}` +
      `R&=\\sqrt{(\\Sigma F_x)^2+(\\Sigma F_y)^2+(\\Sigma F_z)^2}=${R.toFixed(3)}\\,\\text{kN}\\\\` +
      `\\phi&=\\tan^{-1}\\!\\left(\\dfrac{\\Sigma F_y}{\\Sigma F_x}\\right)=${azimuth.toFixed(2)}^\\circ\\\\` +
      `\\alpha&=\\sin^{-1}\\!\\left(\\dfrac{\\Sigma F_z}{R}\\right)=${elevation.toFixed(2)}^\\circ` +
      `\\end{align*}`
    );
    if (R > 0.0001) {
      const alpha = (Math.acos(sumFx / R) * 180) / Math.PI;
      const beta = (Math.acos(sumFy / R) * 180) / Math.PI;
      const gamma = (Math.acos(sumFz / R) * 180) / Math.PI;
      steps.push("Step 4: Direction angles (α, β, γ):");
      steps.push(`\\alpha=\\cos^{-1}\\!\\left(\\dfrac{${sumFx.toFixed(3)}}{${R.toFixed(3)}}\\right)=${alpha.toFixed(2)}^\\circ`);
      steps.push(`\\beta=\\cos^{-1}\\!\\left(\\dfrac{${sumFy.toFixed(3)}}{${R.toFixed(3)}}\\right)=${beta.toFixed(2)}^\\circ`);
      steps.push(`\\gamma=\\cos^{-1}\\!\\left(\\dfrac{${sumFz.toFixed(3)}}{${R.toFixed(3)}}\\right)=${gamma.toFixed(2)}^\\circ`);
      steps.push(`\\cos^2\\alpha+\\cos^2\\beta+\\cos^2\\gamma=${((sumFx / R) ** 2 + (sumFy / R) ** 2 + (sumFz / R) ** 2).toFixed(3)}\\approx 1\\checkmark`);
    }
    return { steps, sumFx, sumFy, sumFz, R, azimuth, elevation };
  }
}

/* ================================================================
   KATEX
================================================================ */
function useMathJax() {
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

function MathBlock({ tex }: { tex: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !(window as any).katex) return;
    try { (window as any).katex.render(tex.trim(), ref.current, { displayMode: true, throwOnError: false }); } catch (_) { }
  }, [tex]);
  return <div ref={ref} className="overflow-x-auto my-1" />;
}

/* ================================================================
   MAIN EXPORT
================================================================ */
export default function AnglesTab() {
  const [forces, setForces] = useState([{ magnitude: "", azimuth: "", elevation: "" }]);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const katexOk = useMathJax();

  const off = status === "generating";
  const labels: Record<typeof status, string> = {
    idle: "⬇ Download Solution as PDF",
    generating: "⏳ Opening print view…",
    done: "✅ Done!",
    error: "❌ Export failed — try again",
  };

  const resultRows = result ? [
    { label: "X component (Fx)", value: `${result.sumFx.toFixed(3)} kN` },
    { label: "Y component (Fy)", value: `${result.sumFy.toFixed(3)} kN` },
    { label: "Z component (Fz)", value: `${result.sumFz.toFixed(3)} kN` },
    { label: "Magnitude (R)", value: `${result.R.toFixed(3)} kN` },
    { label: "Azimuth (φ)", value: `${result.azimuth.toFixed(2)}°` },
    { label: "Elevation (α)", value: `${result.elevation.toFixed(2)}°` },
    { label: "α (angle with X)", value: `${(Math.acos(result.sumFx / result.R) * 180 / Math.PI).toFixed(2)}°` },
    { label: "β (angle with Y)", value: `${(Math.acos(result.sumFy / result.R) * 180 / Math.PI).toFixed(2)}°` },
    { label: "γ (angle with Z)", value: `${(Math.acos(result.sumFz / result.R) * 180 / Math.PI).toFixed(2)}°` },
  ] : [];

  const handleExportPDF = () => {
    if (!result) return;
    setStatus("generating");
    const payload = { steps: result.steps, resultRows, forces, result: { sumFx: result.sumFx, sumFy: result.sumFy, sumFz: result.sumFz, R: result.R, azimuth: result.azimuth, elevation: result.elevation } };
    window.open(`/print/resultant-3dAzimuth?data=${encodeURIComponent(JSON.stringify(payload))}`, "_blank");
    setStatus("done");
    setTimeout(() => setStatus("idle"), 2500);
  };

  const update = (i: number, field: string, value: string) =>
    setForces(f => f.map((v, j) => j === i ? { ...v, [field]: value } : v));

  const calculate = () => {
    const sys = new ForceSystem3D();
    forces.forEach(f => {
      const m = parseFloat(f.magnitude), az = parseFloat(f.azimuth), el = parseFloat(f.elevation);
      if (!isNaN(m) && !isNaN(az) && !isNaN(el)) sys.addForce(m, az, el);
    });
    const solved = sys.solve();
    const { sumFx, sumFy, sumFz, R, azimuth, elevation, steps } = solved;

    setResult({
      ...solved,
      resultRows: [
        { label: "X component (Fx)", value: `${sumFx.toFixed(3)} kN` },
        { label: "Y component (Fy)", value: `${sumFy.toFixed(3)} kN` },
        { label: "Z component (Fz)", value: `${sumFz.toFixed(3)} kN` },
        { label: "Magnitude (R)", value: `${R.toFixed(3)} kN` },
        { label: "Azimuth (φ)", value: `${azimuth.toFixed(2)}°` },
        { label: "Elevation (α)", value: `${elevation.toFixed(2)}°` },
        { label: "α (angle with X)", value: `${(Math.acos(sumFx / R) * 180 / Math.PI).toFixed(2)}°` },
        { label: "β (angle with Y)", value: `${(Math.acos(sumFy / R) * 180 / Math.PI).toFixed(2)}°` },
        { label: "γ (angle with Z)", value: `${(Math.acos(sumFz / R) * 180 / Math.PI).toFixed(2)}°` },
      ],
    });
  };

  const inputCls = "w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-600 text-[15px] p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none";
  const labelCls = "block font-medium text-[14px] sm:text-[15px] text-gray-800 dark:text-gray-200";
  const cardCls = "w-full bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6 mt-4";
  const h3Cls = "text-[16px] font-semibold mb-4 text-gray-900 dark:text-white";

  return (
    <div className="flex flex-col items-center w-full" style={{ scrollbarGutter: "stable" }}>

      {/* Canvas */}
      <div className="w-full max-w-xl">
        <h2 className="text-[17px] sm:text-[18px] font-semibold text-center mb-2 text-gray-900 dark:text-white">
          Azimuth-Elevation Method
        </h2>
        <p className="text-[12px] sm:text-[13px] text-gray-500 dark:text-gray-400 text-center mb-3">
          Real-Time Free Body Diagram
        </p>
        {/* ← REPLACED: was <FBD3D forces={forces} /> */}
        <FBD3DComponent forces={forces} />
      </div>

      {/* Inputs */}
      <div className={`${cardCls} max-w-xl`}>
        <h2 className="text-[17px] sm:text-[18px] font-semibold mb-3 mt-0 text-gray-900 dark:text-white">
          Force Setup
        </h2>
        <p className="text-[12px] sm:text-[13px] text-gray-500 dark:text-gray-400 mb-4 mt-0">
          Enter each force with its <strong>azimuth</strong> (0–360°) and <strong>elevation</strong> (−90° to 90°).
        </p>

        {forces.map((f, i) => (
          <div key={i} className="mb-4 p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 mb-2">
              <div>
                <label className={labelCls}>Force {i + 1} (kN)</label>
                <input type="number" placeholder="Magnitude" value={f.magnitude}
                  onChange={e => update(i, "magnitude", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Azimuth (°)</label>
                <input type="number" placeholder="0–360°" value={f.azimuth}
                  onChange={e => update(i, "azimuth", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Elevation (°)</label>
                <input type="number" placeholder="−90–90°" value={f.elevation}
                  onChange={e => update(i, "elevation", e.target.value)} className={inputCls} />
              </div>
            </div>
            {forces.length > 1 && (
              <div className="flex justify-end">
                <button onClick={() => setForces(f => f.filter((_, j) => j !== i))}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-1.5 text-[13px] transition">
                  – Remove
                </button>
              </div>
            )}
          </div>
        ))}

        <button onClick={() => setForces(f => [...f, { magnitude: "", azimuth: "", elevation: "" }])}
          className="w-full bg-[#008409] hover:bg-[#15711b] text-white rounded-lg py-2.5 text-[15px] cursor-pointer mb-2.5 transition">
          + Add Force
        </button>
        <button onClick={calculate}
          className="w-full bg-[#1848a0] hover:bg-[#163d8a] text-white rounded-lg py-2.5 text-[15px] cursor-pointer transition">
          Calculate
        </button>
      </div>

      <div className="w-full max-w-xl">
        {result && (
          <>
            {/* ── WIDE SCREEN (sm+) ── */}
            <div className="hidden sm:flex flex-col gap-4 mt-4 w-full max-w-xl">
              <div className={cardCls}>
                <h3 className={h3Cls}>Results</h3>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {result.resultRows.map((row: { label: string; value: string }, i: number) => (
                    <div key={i} className="bg-blue-50 dark:bg-gray-700 rounded-[10px] border border-blue-100 dark:border-gray-600 px-3 py-2.5">
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">{row.label}</div>
                      <div className="text-[15px] font-bold text-[#1848a0] dark:text-blue-400">{row.value}</div>
                    </div>
                  ))}
                </div>
                <button onClick={handleExportPDF} disabled={off}
                  className={`w-full py-3 rounded-[10px] text-[14px] font-semibold text-white transition ${off ? "opacity-60 cursor-not-allowed bg-[#1848a0]" : "cursor-pointer bg-[#1848a0] hover:bg-[#163d8a]"}`}>
                  {labels[status]}
                </button>
              </div>

              <div className={cardCls}>
                <h3 className={h3Cls}>Step-by-Step Solution</h3>
                <div className="space-y-4">
                  {result.steps.map((line: string, i: number) =>
                    line.startsWith("Step") ? (
                      <p key={i} className="font-medium text-[16px] text-gray-900 dark:text-white">{line}</p>
                    ) : katexOk ? (
                      <MathBlock key={i} tex={line} />
                    ) : (
                      <pre key={i} className="text-[13px] text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{line}</pre>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* ── MOBILE ── */}
            <div className="flex sm:hidden flex-col gap-3 mt-4 w-full max-w-xl">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-3">
                <h3 className="text-[11px] font-semibold mb-2 text-gray-900 dark:text-white">Resultant Force</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    ["X component (Fx)", `${result.sumFx.toFixed(3)} kN`],
                    ["Y component (Fy)", `${result.sumFy.toFixed(3)} kN`],
                    ["Z component (Fz)", `${result.sumFz.toFixed(3)} kN`],
                    ["Magnitude (R)", `${result.R.toFixed(3)} kN`],
                    ["Azimuth (φ)", `${result.azimuth.toFixed(2)}°`],
                    ["Elevation (α)", `${result.elevation.toFixed(2)}°`],
                  ].map(([label, val]) => (
                    <div key={label} className="bg-blue-50 dark:bg-gray-700 rounded-[6px] border border-blue-100 dark:border-gray-600 px-2 py-1.5">
                      <div className="text-[9px] text-gray-500 dark:text-gray-400 mb-0.5 leading-tight">{label}</div>
                      <div className="text-[12px] font-bold text-[#1848a0] dark:text-blue-400">{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleExportPDF} disabled={off}
                className={`w-full rounded-lg px-3 py-2 font-semibold text-white transition text-[12px] ${off ? "cursor-not-allowed bg-[#1848a0]/60" : "bg-[#1848a0] hover:bg-[#163d8a]"}`}>
                {labels[status]}
              </button>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-3 overflow-x-auto text-[11px]">
                <h3 className="text-[11px] font-semibold mb-2 text-gray-900 dark:text-white">Step-by-Step Solution</h3>
                <div className="leading-relaxed">
                  {result.steps.map((line: string, i: number) =>
                    line.startsWith("Step") ? (
                      <p key={i} className="font-semibold text-[11px] mt-2.5 mb-0.5 text-gray-900 dark:text-white">{line}</p>
                    ) : katexOk ? (
                      <MathBlock key={i} tex={line} />
                    ) : (
                      <pre key={i} className="text-[10px] text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{line}</pre>
                    )
                  )}
                </div>
                <div className="mt-3">
                  <p className="font-semibold text-[11px] mb-1.5 text-gray-900 dark:text-white">Final FBD</p>
                  {/* ← REPLACED: was <ResultantFBD3D forces={forces} result={result} /> */}
                  <FBD3DComponent
                    forces={forces}
                    showResultant={true}
                    resultant={{ sumFx: result.sumFx, sumFy: result.sumFy, sumFz: result.sumFz, R: result.R }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}