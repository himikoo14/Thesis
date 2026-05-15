"use client";

import { useRef, useState, useCallback, useEffect, ReactNode, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation"; import Header from "../../components/Header";
import Footer from "../../components/Footer";
import "katex/dist/katex.min.css";
import BeamPage from "../Beam/page";
import { solveEquilibrium2D } from "../../lib/Equilibriumconc";

/* ===================== Types ===================== */
type ForceInput = {
  magnitude: string;
  angle: string;
  magnitudeUnknown?: boolean;
  angleUnknown?: boolean;
};

type StepLine =
  | { type: "heading"; text: string }
  | { type: "math"; tex: string }
  | { type: "text"; text: string }
  | { type: "diagram"; label?: string; node: ReactNode };

/* ================================================================
   SANITIZE TEX + STEP RENDERER
================================================================ */
function sanitizeTeX(tex: string): string {
  return tex.replace(/(_\{[^}]+\})_([a-zA-Z])/g, (_match: string, sub: string, axis: string) => {
    const inner = sub.slice(2, -1);
    return `_{{${inner}}${axis}}`;
  });
}

function fmtNum(n: number): string {
  return parseFloat(n.toFixed(2)).toString();
}

function fromLegacySteps(steps: string[]): StepLine[] {
  return steps.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("\\textbf{")) {
      const inner = trimmed.replace(/^\\textbf\{([\s\S]*)\}$/, "$1");
      return { type: "heading", text: inner };
    }
    if (trimmed.startsWith("Step "))
      return { type: "heading", text: trimmed };
    if (trimmed.startsWith("\\textit{") && !trimmed.includes("\\theta")) {
      const inner = trimmed.replace(/^\\textit\{([\s\S]*)\}$/, "$1");
      return { type: "text", text: `ℹ️ ${inner}` };
    }
    if (!trimmed.includes("\\")) return { type: "text", text: trimmed };
    if (trimmed.startsWith("\\text{") && trimmed.endsWith("}")) {
      const inner = trimmed.replace(/^\\text\{([\s\S]*)\}$/, "$1");
      return { type: "text", text: inner };
    }
    return { type: "math", tex: sanitizeTeX(trimmed) };
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
  // FIX: dark mode KaTeX text
  return <div ref={el} className="my-0.5 overflow-x-auto dark:[&_.katex]:text-white dark:[&_.katex-html]:text-white" />;
}

/* ================================================================
   STEP-BY-STEP SOLUTION RENDERER
================================================================ */
function StepByStepSolution({ steps, title = "Step-by-Step Solution" }: { steps: StepLine[]; title?: string }) {
  return (
    <div className="w-full max-w-xl mt-2">
      {title && <h3 className="font-semibold mb-3 text-lg text-gray-900 dark:text-white">{title}</h3>}
      <div className="flex flex-col gap-1.5">
        {steps.map((line, i) => {
          switch (line.type) {
            case "heading":
              // FIX: was hardcoded color: "#1848a0"
              return <p key={i} className="font-semibold text-[16px] mt-2.5 mb-0.5 text-[#1848a0] dark:text-blue-400">{line.text}</p>;
            case "math":
              return <KTX key={i} tex={line.tex} />;
            case "text":
              // FIX: was hardcoded color: "#333"
              return <p key={i} className="text-[15px] text-gray-700 dark:text-gray-300 my-0.5">{line.text}</p>;
            case "diagram":
              return (
                <div key={i} className="mt-3">
                  {line.label && <p className="font-semibold text-[15px] mb-2 dark:text-white">{line.label}</p>}
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

/* ===================== SVG FBD Component ===================== */
const FORCE_COLORS = ["#1848a0", "#c0392b", "#16a34a", "#9333ea", "#d97706", "#0891b2"];
const UNKNOWN_LENGTH = 75;

function FBD({ forces, setForces }: { forces: ForceInput[]; setForces: (f: ForceInput[]) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const vectors = forces.map((f, i) => {
    const magUnknown = !!f.magnitudeUnknown;
    const angUnknown = !!f.angleUnknown;
    const rawMag = parseFloat(f.magnitude);
    const rawAng = parseFloat(f.angle);
    const angle = isNaN(rawAng) ? 0 : rawAng;
    const hasMag = !magUnknown && !isNaN(rawMag);
    return { mag: hasMag ? rawMag : null, angle, magUnknown, angUnknown, index: i };
  });

  const knownMags = vectors.filter((v) => v.mag !== null).map((v) => v.mag as number);
  const maxMag = Math.max(1, ...knownMags);
  const scale = 80 / maxMag;

  const handleMove = (clientX: number, clientY: number) => {
    if (dragIndex === null || !svgRef.current) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const cursor = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const x = cursor.x - 150, y = cursor.y - 150;
    const newAngle = (Math.atan2(-y, x) * 180) / Math.PI;
    const newForces = [...forces];
    newForces[dragIndex] = { ...newForces[dragIndex], angle: fmtNum(newAngle) };
    setForces(newForces);
  };

  return (
    // FIX: added dark:bg-gray-800 dark:border-gray-600
    <svg
      ref={svgRef}
      width="300" height="300"
      className="border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 shadow"
      style={{ touchAction: "none" }}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onTouchMove={(e) => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); }}
      onMouseUp={() => setDragIndex(null)}
      onTouchEnd={() => setDragIndex(null)}
      onMouseLeave={() => setDragIndex(null)}
    >
      <defs>
        {FORCE_COLORS.map((color, ci) => (
          <marker key={ci} id={`arrow-${ci}`} markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill={color} />
          </marker>
        ))}
        {FORCE_COLORS.map((color, ci) => (
          <marker key={`d${ci}`} id={`arrow-dash-${ci}`} markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill={color} opacity="0.55" />
          </marker>
        ))}
      </defs>

      <g transform="translate(150,150)">
        {/* FIX: axis lines use currentColor + opacity instead of hardcoded light gray */}
        <line x1={-140} y1={0} x2={140} y2={0} stroke="currentColor" strokeWidth="1" opacity="0.2" />
        <line x1={0} y1={-140} x2={0} y2={140} stroke="currentColor" strokeWidth="1" opacity="0.2" />
        <text x={143} y={4} fontSize="10" fill="currentColor" opacity="0.4">x</text>
        <text x={3} y={-133} fontSize="10" fill="currentColor" opacity="0.4">y</text>

        {vectors.map((v, i) => {
          const colorIdx = i % FORCE_COLORS.length;
          const color = FORCE_COLORS[colorIdx];
          const rad = (v.angle * Math.PI) / 180;
          const isUnknown = v.magUnknown || (v.mag === null);
          const len = isUnknown ? UNKNOWN_LENGTH : (v.mag as number) * scale;
          const ex = Math.cos(rad) * len;
          const ey = -Math.sin(rad) * len;
          const labelOffset = 14;
          const lx = Math.cos(rad) * (len + labelOffset);
          const ly = -Math.sin(rad) * (len + labelOffset);
          const showArc = !v.angUnknown && !isNaN(v.angle);
          const arcR = 28;
          const arcEndX = Math.cos(rad) * arcR;
          const arcEndY = -Math.sin(rad) * arcR;
          const largeArc = v.angle > 180 ? 1 : 0;
          const midAng = v.angle / 2;
          const midRad = (midAng * Math.PI) / 180;
          const aLx = Math.cos(midRad) * (arcR + 10);
          const aLy = -Math.sin(midRad) * (arcR + 10);

          return (
            <g key={i} className="cursor-pointer" onMouseDown={() => setDragIndex(i)} onTouchStart={() => setDragIndex(i)}>

              {showArc && v.angle !== 0 && (
                <>
                  <path d={`M ${arcR} 0 A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEndX} ${arcEndY}`}
                    fill="none" stroke={color} strokeWidth="1" opacity="0.5" />
                  <text x={aLx} y={aLy} fontSize="9" fill={color} textAnchor="middle" dominantBaseline="middle" opacity="0.8">
                    {Math.round(v.angle * 10) / 10}°
                  </text>
                </>
              )}
              <line x1={0} y1={0} x2={ex} y2={ey}
                stroke={color} strokeWidth={isUnknown ? 2 : 3}
                strokeDasharray={isUnknown ? "6 3" : undefined}
                opacity={isUnknown ? 0.65 : 1}
                markerEnd={isUnknown ? `url(#arrow-dash-${colorIdx})` : `url(#arrow-${colorIdx})`} />
              <text x={lx} y={ly} fontSize="11" fontWeight="700" fill={color} textAnchor="middle" dominantBaseline="middle">
                {`F${i + 1}`}
                {v.magUnknown ? " (?)" : v.mag !== null ? ` (${Math.round((v.mag as number) * 100) / 100})` : ""}
              </text>
            </g>
          );
        })}

        <circle cx={0} cy={0} r={4} fill="currentColor" opacity="0.6" />
      </g>
    </svg>
  );
}

/* ================================================================
   CALCULATE
================================================================ */
function calculate(forces: ForceInput[]): {
  steps: string[];
  stepLines: StepLine[];
  resultRows: { label: string; value: string }[];
  solvedLabel?: string;
} | { error: string } {

  const magUnknownIndices = forces.map((f, i) => f.magnitudeUnknown ? i : -1).filter(i => i !== -1);
  const angUnknownIndices = forces.map((f, i) => f.angleUnknown ? i : -1).filter(i => i !== -1);
  const totalUnknowns = magUnknownIndices.length + angUnknownIndices.length;

  if (totalUnknowns > 2) {
    return { error: "Too many unknowns. The system can only solve for up to 2 unknowns." };
  }

  const knownForces = forces
    .map((f, i) => ({ f, i }))
    .filter(({ f, i }) => !magUnknownIndices.includes(i) && !angUnknownIndices.includes(i))
    .map(({ f, i }) => {
      const magnitude = parseFloat(f.magnitude);
      const angle = parseFloat(f.angle);
      if (isNaN(magnitude) || isNaN(angle)) return null;
      return { magnitude, angle, label: `F_{${i + 1}}` };
    })
    .filter(Boolean) as { magnitude: number; angle: number; label: string }[];

  if (totalUnknowns === 0) {
    if (knownForces.length === 0) return { error: "Please enter at least one valid force." };
    try {
      const resultX = solveEquilibrium2D(knownForces, [{ angle: 0, label: "R_x" }, { angle: 90, label: "R_y" }]);
      const Rx = -resultX.unknowns[0].value;
      const Ry = -resultX.unknowns[1].value;
      const R = Math.hypot(Rx, Ry);
      const angle = (Math.atan2(Ry, Rx) * 180) / Math.PI;
      return {
        steps: resultX.steps,
        stepLines: fromLegacySteps(resultX.steps),
        resultRows: [
          { label: "Resultant Magnitude", value: `${fmtNum(R)} kN` },
          { label: "Resultant Angle", value: `${fmtNum(angle)}°` },
        ],
      };
    } catch (e: any) { return { error: e.message }; }
  }

  if (magUnknownIndices.length === 1 && angUnknownIndices.length === 1 && magUnknownIndices[0] === angUnknownIndices[0]) {
    const idx = magUnknownIndices[0];
    try {
      const result = solveEquilibrium2D(knownForces, [{ angle: 0, label: `F_{${idx + 1}x}` }, { angle: 90, label: `F_{${idx + 1}y}` }]);
      const Fx = -result.unknowns[0].value;
      const Fy = -result.unknowns[1].value;
      const mag = Math.hypot(Fx, Fy);
      const ang = (Math.atan2(Fy, Fx) * 180) / Math.PI;
      return {
        steps: result.steps,
        stepLines: fromLegacySteps(result.steps),
        resultRows: [
          { label: `Force ${idx + 1} Magnitude`, value: `${fmtNum(mag)} kN` },
          { label: `Force ${idx + 1} Angle`, value: `${fmtNum(ang)}°` },
        ],
        solvedLabel: `F${idx + 1}: ${fmtNum(mag)} kN @ ${fmtNum(ang)}°`,
      };
    } catch (e: any) { return { error: e.message }; }
  }

  if (magUnknownIndices.length === 0 && angUnknownIndices.length === 1) {
    const idx = angUnknownIndices[0];
    const mag = parseFloat(forces[idx].magnitude);
    if (isNaN(mag)) return { error: `Force ${idx + 1}: provide magnitude when angle is unknown.` };
    try {
      const result = solveEquilibrium2D(knownForces, [{ angle: 0, label: `F_{${idx + 1}x}` }, { angle: 90, label: `F_{${idx + 1}y}` }]);
      const Fx = -result.unknowns[0].value;
      const Fy = -result.unknowns[1].value;
      const computedMag = Math.hypot(Fx, Fy);
      if (Math.abs(computedMag - mag) > Math.max(1e-6, 0.01 * mag)) {
        return { error: `No valid angle for Force ${idx + 1}: given magnitude ${fmtNum(mag)} kN is inconsistent with equilibrium — required magnitude is ${fmtNum(computedMag)} kN.` };
      }
      const ang = (Math.atan2(Fy, Fx) * 180) / Math.PI;
      const angleSteps: string[] = [
        `\\textbf{Finding the Angle of F_{${idx + 1}}}`,
        `\\text{The components of } F_{${idx + 1}} \\text{ required for equilibrium are:}`,
        `F_{${idx + 1}x} = ${fmtNum(Fx)} \\text{ kN}, \\quad F_{${idx + 1}y} = ${fmtNum(Fy)} \\text{ kN}`,
        `\\theta = \\tan^{-1}\\!\\left(\\frac{F_{${idx + 1}y}}{F_{${idx + 1}x}}\\right) = \\tan^{-1}\\!\\left(\\frac{${fmtNum(Fy)}}{${fmtNum(Fx)}}\\right)`,
        `\\theta = ${fmtNum(ang)}^{\\circ}`,
      ];
      const allSteps = [...result.steps, ...angleSteps];
      return { steps: allSteps, stepLines: fromLegacySteps(allSteps), resultRows: [{ label: `Force ${idx + 1} Angle`, value: `${fmtNum(ang)}°` }], solvedLabel: `F${idx + 1} angle = ${fmtNum(ang)}°` };
    } catch (e: any) { return { error: e.message }; }
  }

  if (magUnknownIndices.length >= 1 && angUnknownIndices.length === 0) {
    const unknownForces = magUnknownIndices.map((i) => {
      const angle = parseFloat(forces[i].angle);
      if (isNaN(angle)) return null;
      return { angle, label: `F${i + 1}` };
    });
    if (unknownForces.some((u) => u === null)) {
      const missing = magUnknownIndices.find((i) => isNaN(parseFloat(forces[i].angle)));
      return { error: `Force ${missing! + 1}: angle must be provided when magnitude is unknown.` };
    }
    try {
      const result = solveEquilibrium2D(knownForces, unknownForces as { angle: number; label: string }[]);
      return {
        steps: result.steps,
        stepLines: fromLegacySteps(result.steps),
        resultRows: magUnknownIndices.map((origIdx, k) => ({
          label: `Force ${origIdx + 1} Magnitude`,
          value: `${fmtNum(Math.abs(result.unknowns[k].value))} kN`,
        })),
        solvedLabel: magUnknownIndices.map((origIdx, k) => `F${origIdx + 1} = ${fmtNum(Math.abs(result.unknowns[k].value))} kN`).join(" | "),
      };
    } catch (e: any) { return { error: e.message }; }
  }

  if (magUnknownIndices.length === 1 && angUnknownIndices.length === 1) {
    const magIdx = magUnknownIndices[0];
    const angIdx = angUnknownIndices[0];
    const magAngle = parseFloat(forces[magIdx].angle);
    const angMag = parseFloat(forces[angIdx].magnitude);
    if (isNaN(magAngle)) return { error: `Force ${magIdx + 1}: provide angle when magnitude is unknown.` };
    if (isNaN(angMag)) return { error: `Force ${angIdx + 1}: provide magnitude when angle is unknown.` };
    try {
      const resultFx = solveEquilibrium2D(knownForces, [{ angle: magAngle, label: `F_{${magIdx + 1}}` }, { angle: 0, label: `F_{${angIdx + 1}x}` }]);
      const solvedMag = resultFx.unknowns[0].value;
      const solvedFx = -resultFx.unknowns[1].value;
      const resultFy = solveEquilibrium2D(
        [...knownForces, { magnitude: Math.abs(solvedMag), angle: solvedMag >= 0 ? magAngle : magAngle + 180, label: `F_{${magIdx + 1}}` }],
        [{ angle: 90, label: `F_{${angIdx + 1}y}` }]
      );
      const solvedFy = -resultFy.unknowns[0].value;
      const ang = (Math.atan2(solvedFy, solvedFx) * 180) / Math.PI;
      const actualMag = Math.abs(solvedMag);
      return {
        steps: [...resultFx.steps, ...resultFy.steps],
        stepLines: fromLegacySteps([...resultFx.steps, ...resultFy.steps]),
        resultRows: [
          { label: `Force ${magIdx + 1} Magnitude`, value: `${fmtNum(actualMag)} kN` },
          { label: `Force ${angIdx + 1} Angle`, value: `${fmtNum(ang)}°` },
        ],
        solvedLabel: `F${magIdx + 1} = ${fmtNum(actualMag)} kN | F${angIdx + 1} angle = ${fmtNum(ang)}°`,
      };
    } catch (e: any) { return { error: e.message }; }
  }

// Case: 2 unknown angles, 0 unknown magnitudes
  if (magUnknownIndices.length === 0 && angUnknownIndices.length === 2) {
    const [idx1, idx2] = angUnknownIndices;
    const mag1 = Math.abs(parseFloat(forces[idx1].magnitude));
    const mag2 = Math.abs(parseFloat(forces[idx2].magnitude));
    if (isNaN(mag1)) return { error: `Force ${idx1 + 1}: provide magnitude when angle is unknown.` };
    if (isNaN(mag2)) return { error: `Force ${idx2 + 1}: provide magnitude when angle is unknown.` };

    const Rx = knownForces.reduce((s, f) => s + f.magnitude * Math.cos(f.angle * Math.PI / 180), 0);
    const Ry = knownForces.reduce((s, f) => s + f.magnitude * Math.sin(f.angle * Math.PI / 180), 0);
    const Cx = -Rx, Cy = -Ry;
    const C = Math.hypot(Cx, Cy);

    const cosAlpha = (mag1 ** 2 + mag2 ** 2 - C ** 2) / (2 * mag1 * mag2);
    if (Math.abs(cosAlpha) > 1) {
      return { error: "No solution: the given magnitudes cannot form equilibrium with the known forces." };
    }

    const alpha = Math.acos(cosAlpha);
    const phiC = Math.atan2(Cy, Cx);

    // Law of sines: sin(β)/mag2 = sin(α)/C
    const sinBeta = (mag2 * Math.sin(alpha)) / C;
    const beta = Math.asin(Math.max(-1, Math.min(1, sinBeta)));

    const theta1rad = phiC + beta;
    const theta2rad = phiC - (Math.PI - beta - alpha) - (Math.PI - alpha);

    // Compute both candidate angles and verify by checking equilibrium
    const candidates = [
      { t1: phiC + beta, t2: phiC + beta - alpha },
      { t1: phiC - beta, t2: phiC - beta + alpha },
      { t1: phiC + beta, t2: phiC + beta + alpha },
      { t1: phiC - beta, t2: phiC - beta - alpha },
    ];

    let bestErr = Infinity, bestT1 = 0, bestT2 = 0;
    for (const { t1, t2 } of candidates) {
      const sumX = mag1 * Math.cos(t1) + mag2 * Math.cos(t2) + Rx;
      const sumY = mag1 * Math.sin(t1) + mag2 * Math.sin(t2) + Ry;
      const err = sumX ** 2 + sumY ** 2;
      if (err < bestErr) { bestErr = err; bestT1 = t1; bestT2 = t2; }
    }

    const normalize = (a: number) => ((a % 360) + 360) % 360;
    const t1deg = normalize(bestT1 * 180 / Math.PI);
    const t2deg = normalize(bestT2 * 180 / Math.PI);

const stepLines: StepLine[] = [
  { type: "heading", text: `Finding Angles of F${idx1 + 1} and F${idx2 + 1}` },
  { type: "text", text: `Known forces sum: Rx = ${fmtNum(Rx)} kN, Ry = ${fmtNum(Ry)} kN` },
  { type: "text", text: `For equilibrium, F${idx1+1} + F${idx2+1} must equal (${fmtNum(Cx)}, ${fmtNum(Cy)}) kN` },
  { type: "math", tex: `C = \\sqrt{(${fmtNum(Cx)})^2 + (${fmtNum(Cy)})^2} = ${fmtNum(C)} \\text{ kN}` },
  { type: "text", text: `By Law of Cosines:` },
  { type: "math", tex: `C^2 = F_{${idx1+1}}^2 + F_{${idx2+1}}^2 - 2 \\cdot F_{${idx1+1}} \\cdot F_{${idx2+1}} \\cdot \\cos\\alpha` },
  { type: "math", tex: `\\cos\\alpha = \\frac{${fmtNum(mag1)}^2 + ${fmtNum(mag2)}^2 - ${fmtNum(C)}^2}{2(${fmtNum(mag1)})(${fmtNum(mag2)})} = ${fmtNum(cosAlpha)}` },
  { type: "math", tex: `\\alpha = ${fmtNum(alpha * 180 / Math.PI)}^\\circ` },
  { type: "text", text: `Direction of required resultant:` },
  { type: "math", tex: `\\varphi = ${fmtNum(((phiC * 180 / Math.PI) % 360 + 360) % 360)}^\\circ` },
  { type: "text", text: `By Law of Sines:` },
  { type: "math", tex: `\\frac{\\sin\\beta}{F_{${idx2+1}}} = \\frac{\\sin\\alpha}{C}` },
  { type: "math", tex: `\\beta = \\sin^{-1}\\!\\left(\\frac{${fmtNum(mag2)} \\cdot \\sin(${fmtNum(alpha * 180/Math.PI)}^\\circ)}{${fmtNum(C)}}\\right) = ${fmtNum(beta * 180/Math.PI)}^\\circ` },
  { type: "math", tex: `\\theta_{F${idx1+1}} = \\varphi - \\beta = ${fmtNum(((phiC * 180 / Math.PI) % 360 + 360) % 360)}^\\circ - ${fmtNum(beta * 180/Math.PI)}^\\circ = ${fmtNum(t1deg)}^\\circ` },
  { type: "math", tex: `\\theta_{F${idx2+1}} = \\theta_{F${idx1+1}} + \\alpha = ${fmtNum(t1deg)}^\\circ + ${fmtNum(alpha * 180/Math.PI)}^\\circ = ${fmtNum(t2deg)}^\\circ` },
];
    return {
      steps: [],
      stepLines,
      resultRows: [
        { label: `Force ${idx1 + 1} Angle`, value: `${fmtNum(t1deg)}°` },
        { label: `Force ${idx2 + 1} Angle`, value: `${fmtNum(t2deg)}°` },
      ],
      solvedLabel: `F${idx1+1} angle = ${fmtNum(t1deg)}° | F${idx2+1} angle = ${fmtNum(t2deg)}°`,
    };
  }  if (magUnknownIndices.length === 0 && angUnknownIndices.length === 2) {
    const [idx1, idx2] = angUnknownIndices;
    const mag1 = parseFloat(forces[idx1].magnitude);
    const mag2 = parseFloat(forces[idx2].magnitude);
    if (isNaN(mag1)) return { error: `Force ${idx1 + 1}: provide magnitude when angle is unknown.` };
    if (isNaN(mag2)) return { error: `Force ${idx2 + 1}: provide magnitude when angle is unknown.` };

    // Sum of known forces
    const Rx = knownForces.reduce((s, f) => s + f.magnitude * Math.cos(f.angle * Math.PI / 180), 0);
    const Ry = knownForces.reduce((s, f) => s + f.magnitude * Math.sin(f.angle * Math.PI / 180), 0);

    // The two unknown vectors must sum to (-Rx, -Ry)
    const Cx = -Rx, Cy = -Ry;
    const C = Math.hypot(Cx, Cy);

    // Law of cosines: C² = mag1² + mag2² - 2·mag1·mag2·cos(α)
    // where α is the angle between the two unknown vectors
    const cosAlpha = (mag1 ** 2 + mag2 ** 2 - C ** 2) / (2 * Math.abs(mag1) * Math.abs(mag2));
    if (Math.abs(cosAlpha) > 1) {
      return { error: "No solution: the given magnitudes cannot form equilibrium with the known forces." };
    }

    const alpha = Math.acos(cosAlpha); // angle between F_idx1 and F_idx2
    const phiC = Math.atan2(Cy, Cx);   // direction of the resultant needed

    // Law of sines: sin(β)/mag2 = sin(α)/C  where β = angle between C and F_idx1
    const sinBeta = (mag2 * Math.sin(alpha)) / C;
    const beta = Math.asin(Math.max(-1, Math.min(1, sinBeta)));

    // phi is direction of C; theta1 is below phi by beta
    const theta1 = ((phiC - beta) * 180) / Math.PI;
    const theta2 = theta1 + (alpha * 180) / Math.PI;

const stepLines: StepLine[] = [
  { type: "heading", text: `Finding Angles of F${idx1 + 1} and F${idx2 + 1}` },
  { type: "text", text: `Known forces sum: Rx = ${fmtNum(Rx)} kN, Ry = ${fmtNum(Ry)} kN` },
  { type: "text", text: `For equilibrium, F${idx1 + 1} + F${idx2 + 1} must equal (${fmtNum(Cx)}, ${fmtNum(Cy)}) kN` },
  { type: "math", tex: `C = \\sqrt{(${fmtNum(Cx)})^2 + (${fmtNum(Cy)})^2} = ${fmtNum(C)} \\text{ kN}` },
  { type: "text", text: `By Law of Cosines:` },
  { type: "math", tex: `C^2 = F_{${idx1+1}}^2 + F_{${idx2+1}}^2 - 2 \\cdot F_{${idx1+1}} \\cdot F_{${idx2+1}} \\cdot \\cos\\alpha` },
  { type: "math", tex: `\\cos\\alpha = \\frac{${fmtNum(mag1)}^2 + ${fmtNum(mag2)}^2 - ${fmtNum(C)}^2}{2(${fmtNum(mag1)})(${fmtNum(mag2)})} = ${fmtNum(cosAlpha)}` },
  { type: "math", tex: `\\alpha = ${fmtNum(alpha * 180 / Math.PI)}^\\circ` },
  { type: "text", text: `Direction of required resultant:` },
  { type: "math", tex: `\\varphi = ${fmtNum(((phiC * 180 / Math.PI) % 360 + 360) % 360)}^\\circ` },
  { type: "text", text: `By Law of Sines to find β (angle between resultant and F${idx1 + 1}):` },
  { type: "math", tex: `\\frac{\\sin\\beta}{F_{${idx2+1}}} = \\frac{\\sin\\alpha}{C}` },
  { type: "math", tex: `\\beta = \\sin^{-1}\\!\\left(\\frac{${fmtNum(mag2)} \\cdot \\sin(${fmtNum(alpha * 180 / Math.PI)}^\\circ)}{${fmtNum(C)}}\\right) = ${fmtNum(beta * 180 / Math.PI)}^\\circ` },
{ type: "math", tex: `\\theta_{F${idx1 + 1}} = \\varphi - \\beta = ${fmtNum(((phiC * 180 / Math.PI) % 360 + 360) % 360)}^\\circ - ${fmtNum(beta * 180 / Math.PI)}^\\circ = ${fmtNum(((theta1 % 360) + 360) % 360)}^\\circ` },
  { type: "math", tex: `\\theta_{F${idx2 + 1}} = \\theta_{F${idx1 + 1}} + \\alpha = ${fmtNum(((theta1 % 360) + 360) % 360)}^\\circ + ${fmtNum(alpha * 180 / Math.PI)}^\\circ = ${fmtNum(((theta2 % 360) + 360) % 360)}^\\circ` },
];

    const normalize = (a: number) => ((a % 360) + 360) % 360;
    return {
      steps: [],
      stepLines,
      resultRows: [
        { label: `Force ${idx1 + 1} Angle`, value: `${fmtNum(normalize(theta1))}°` },
        { label: `Force ${idx2 + 1} Angle`, value: `${fmtNum(normalize(theta2))}°` },
      ],
      solvedLabel: `F${idx1 + 1} angle = ${fmtNum(normalize(theta1))}° | F${idx2 + 1} angle = ${fmtNum(normalize(theta2))}°`,
    };
  }

  return { error: "Unsupported combination of unknowns." };
}

/* ===================== MAIN COMPONENT ===================== */
function EquilibriumContent() {

  const [forces, setForces] = useState<ForceInput[]>([
    { magnitude: "", angle: "", magnitudeUnknown: false, angleUnknown: false },
  ]);
  const [solution, setSolution] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [showHowTo, setShowHowTo] = useState(false); // ← ADD THIS

  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get("tab") as "concurrent" | "nonconcurrent") || "concurrent";
  const setActiveTab = (tab: "concurrent" | "nonconcurrent") => router.replace(`?tab=${tab}`, { scroll: false });

  const off = status === "generating";
  const labels: Record<typeof status, string> = {
    idle: "⬇ Download Solution as PDF",
    generating: "⏳ Opening print view…",
    done: "✅ Done!",
    error: "❌ Export failed — try again",
  };

  const toggleUnknown = (index: number, field: "magnitude" | "angle") => {
    const newForces = forces.map((f, i) => {
      if (i !== index) return f;
      if (field === "magnitude") return { ...f, magnitudeUnknown: !f.magnitudeUnknown, magnitude: !f.magnitudeUnknown ? "" : f.magnitude };
      return { ...f, angleUnknown: !f.angleUnknown, angle: !f.angleUnknown ? "" : f.angle };
    });
    setForces(newForces);
    setSolution(null);
    setError(null);
  };

  const handleInputChange = (index: number, field: "magnitude" | "angle", value: string) => {
    const newForces = [...forces];
    newForces[index][field] = value;
    setForces(newForces);
  };

  const handleCalculate = () => {
    setError(null);
    setSolution(null);
    const result = calculate(forces);
    if ("error" in result) { setError(result.error); return; }
    setSolution(result);
  };

  return (
    // FIX: added dark:bg-gray-900 dark:text-white
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-[18px]">
      <Header />

      {/* ── Tabs (desktop) ── */}
      <div className="hidden sm:flex justify-center mb-6 gap-4 mt-4">
        <button onClick={() => setActiveTab("concurrent")}
          className={`px-5 py-2 rounded-lg font-semibold ${activeTab === "concurrent" ? "bg-[#1848a0] text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-white"}`}>
          Concurrent Force System
        </button>
        <button onClick={() => setActiveTab("nonconcurrent")}
          className={`px-5 py-2 rounded-lg font-semibold ${activeTab === "nonconcurrent" ? "bg-[#1848a0] text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-white"}`}>
          Non-Concurrent Force System
        </button>
      </div>

      {/* ================================================================
            DESKTOP VIEW (hidden on mobile)
        ================================================================ */}
      <div className="hidden sm:flex flex-col items-center w-full">
        {activeTab === "concurrent" && (
          <>
            {/* FBD */}
            <div className="flex flex-col items-center justify-center mb-8 relative z-10 ">
              <h1 className="text-3xl font-bold text-center mb-2">Concurrent Force System</h1>
              <h2 className="text-[18px] font-semibold text-center mb-2">Unknown Forces and Angles Calculator</h2>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5 text-center">Real-Time Free Body Diagram</p>
              <FBD forces={forces} setForces={setForces} />
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5 text-center">Drag arrows to change angles</p>
              {/* ADD THIS */}
              <p className="text-sm text-center mt-1">
                <button
                  onClick={() => setShowHowTo(true)}
                  className="text-[#1848a0] dark:text-blue-400 underline hover:text-[#163d8a] dark:hover:text-blue-300 transition"
                >
                  How to Use Calculator
                </button>
              </p>
            </div>

            {/* Note */}
            <p className="w-full max-w-xl text-sm text-gray-700 dark:text-gray-300 mb-4 text-left -mt-5">
              <span className="font-semibold">Note:</span> The angle is measured from the positive x-axis, counterclockwise.
            </p>

            {/* Force Setup Card */}
            <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow p-6 space-y-6 relative z-10">
              <h2 className="text-[20px] font-semibold">Force Setup</h2>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 -mt-5 mb-3">
                Enter the magnitude (kN) and angle (°) of each force. Click <span className="inline-flex items-center justify-center w-6 h-6 rounded border border-gray-300 dark:border-gray-600 font-bold text-[#1848a0] text-sm">?</span> to set the unknown value.
              </p>

              {forces.map((f, i) => (
                <div key={i} className="flex gap-4 items-end">
                  {/* MAGNITUDE */}
                  <div className="flex-1">
                    <label className="block font-medium">Force {i + 1} (kN)</label>
                    <div className="relative mt-1">
                      <input
                        type={f.magnitudeUnknown ? "text" : "number"}
                        value={f.magnitudeUnknown ? "" : f.magnitude}
                        onChange={(e) => handleInputChange(i, "magnitude", e.target.value)}
                        disabled={f.magnitudeUnknown}
                        placeholder={f.magnitudeUnknown ? "Unknown" : ""}
                        className={`w-full rounded-xl border p-3 pr-14 ${f.magnitudeUnknown
                          ? "bg-blue-50 dark:bg-blue-900/30 border-[#1848a0] text-[#1848a0] dark:text-blue-300 font-semibold placeholder-[#1848a0] cursor-not-allowed"
                          : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white"
                          }`}
                      />
                      <button type="button" onClick={() => toggleUnknown(i, "magnitude")}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl border text-lg font-semibold transition duration-200 ${f.magnitudeUnknown
                          ? "bg-[#1848a0] text-white border-[#1848a0]"
                          : "bg-white dark:bg-gray-700 text-[#1848a0] border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                          }`}>?</button>
                    </div>
                  </div>

                  {/* ANGLE */}
                  <div className="flex-1">
                    <label className="block font-medium">Angle {i + 1} (°)</label>
                    <div className="relative mt-1">
                      <input
                        type={f.angleUnknown ? "text" : "number"}
                        value={f.angleUnknown ? "" : f.angle}
                        onChange={(e) => handleInputChange(i, "angle", e.target.value)}
                        disabled={f.angleUnknown}
                        placeholder={f.angleUnknown ? "Unknown" : ""}
                        className={`w-full rounded-xl border p-3 pr-12 ${f.angleUnknown
                          ? "bg-blue-50 dark:bg-blue-900/30 border-[#1848a0] text-[#1848a0] dark:text-blue-300 font-semibold placeholder-[#1848a0] cursor-not-allowed"
                          : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white"
                          }`}
                      />
                      <button type="button" onClick={() => toggleUnknown(i, "angle")}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl border text-lg font-semibold transition duration-200 ${f.angleUnknown
                          ? "bg-[#1848a0] text-white border-[#1848a0]"
                          : "bg-white dark:bg-gray-700 text-[#1848a0] border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                          }`}>?</button>
                    </div>
                  </div>

                  {forces.length > 1 && (
                    <button onClick={() => setForces(forces.filter((_, idx) => idx !== i))}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200">–</button>
                  )}
                </div>
              ))}

              <button onClick={() => setForces([...forces, { magnitude: "", angle: "", magnitudeUnknown: false, angleUnknown: false }])}
                className="w-full bg-[#008409] text-white py-3 rounded-lg hover:bg-[#15711b] transition duration-200">
                + Add Force
              </button>
              <button onClick={handleCalculate}
                className="w-full bg-[#1848a0] text-white py-3 rounded-lg hover:bg-[#163d8a] transition duration-200 text-[18px]">
                Calculate
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 w-full max-w-xl bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-xl p-4">
                ⚠️ {error}
              </div>
            )}

            {/* Solution */}
            {solution && (
              <div className="mt-6 w-full max-w-xl bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                {solution.solvedLabel && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-[#1848a0] dark:border-blue-600 rounded-xl">
                    <span className="font-semibold text-[#1848a0] dark:text-blue-400">✅ Solved: </span>
                    <strong className="dark:text-white">{solution.solvedLabel}</strong>
                  </div>
                )}
                <button
                  onClick={() => {
                    setStatus("generating");
                    const payload = { steps: solution.steps, resultRows: solution.resultRows, solvedLabel: solution.solvedLabel, forces };
                    const encoded = encodeURIComponent(JSON.stringify(payload));
                    window.open(`/print/equilibrium?data=${encoded}`, "_blank");
                    setStatus("done");
                    setTimeout(() => setStatus("idle"), 2500);
                  }}
                  disabled={off}
                  className={`w-full mb-4 py-3 rounded-xl font-semibold text-white transition ${off ? "cursor-not-allowed bg-[#1848a0]/60" : "bg-[#1848a0] hover:bg-[#163d8a]"}`}
                >
                  {labels[status]}
                </button>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {solution.resultRows?.map((row: { label: string; value: string }, i: number) => (
                    <div key={i} className="bg-blue-50 dark:bg-gray-700 rounded-[10px] border border-blue-100 dark:border-gray-600 px-3.5 py-2.5">
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">{row.label}</div>
                      <div className="text-[16px] font-bold text-[#1848a0] dark:text-blue-400">{row.value}</div>
                    </div>
                  ))}
                </div>
                <StepByStepSolution steps={solution.stepLines} title="Step-by-Step Solution" />
              </div>
            )}
          </>
        )}

        {activeTab === "nonconcurrent" && (
          <div className="w-full max-w-6xl">
            <BeamPage />
          </div>
        )}
      </div>

      {/* ── Tabs (mobile) ── */}
      <div className="flex sm:hidden justify-center mb-6 gap-4 ">
        <button onClick={() => setActiveTab("concurrent")}
          className={`px-3 py-3 text-[12px] rounded-lg font-semibold ${activeTab === "concurrent" ? "bg-[#1848a0] text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-white"}`}>
          Concurrent Forces System
        </button>
        <button onClick={() => setActiveTab("nonconcurrent")}
          className={`px-3 py-3 text-[12px] rounded-lg font-semibold ${activeTab === "nonconcurrent" ? "bg-[#1848a0] text-white" : "bg-gray-200 dark:bg-gray-700 dark:text-white"}`}>
          Non-Concurrent Force System
        </button>
      </div>

      {/* ================================================================
            MOBILE VIEW (hidden on desktop)
        ================================================================ */}
      <div className="flex sm:hidden flex-col items-center w-full px-6">
        {activeTab === "concurrent" && (
          <>
            {/* FBD */}
            <div className="flex flex-col mb-6 relative z-10">
              <h1 className="text-[25px] font-bold text-center mb-2">Concurrent Force System</h1>
              <h2 className="text-[13px] font-semibold text-center mb-2">Unknown Forces and Angles Calculator</h2>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5 text-center">Real-Time Free Body Diagram</p>
              <FBD forces={forces} setForces={setForces} />
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5 text-center">Drag arrows to change angles</p>
              {/* ADD THIS */}
              <p className="text-sm text-center mt-1">
                <button
                  onClick={() => setShowHowTo(true)}
                  className="font-sans text-[#1848a0] dark:text-blue-400 underline underline-offset-2 hover:text-[#163d8a] dark:hover:text-blue-300 transition font-medium"
                >
                  How to Use Calculator
                </button>
              </p>
            </div>

            {/* Note */}
            <p className="w-full max-w-xl text-sm text-gray-700 dark:text-gray-300 mb-4 text-left -mt-4">
              <span className="font-semibold">Note:</span> The angle is measured from the positive x-axis, counterclockwise.
            </p>

            {/* Force Setup Card */}
            <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow p-6 space-y-4 relative z-10">
              <h2 className="text-[20px] font-semibold">Force Setup</h2>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 -mt-3 mb-1">
                Enter the magnitude (kN) and angle (°) of each force. Click <span className="inline-flex items-center justify-center w-6 h-6 rounded border border-gray-300 dark:border-gray-600 font-bold text-[#1848a0] text-sm">?</span> to set the unknown value.
              </p>

              {forces.map((f, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    {/* MAGNITUDE */}
                    <div className="flex-1">
                      <label className="block font-medium text-sm">Force {i + 1} (kN)</label>
                      <div className="relative mt-1">
                        <input
                          type={f.magnitudeUnknown ? "text" : "number"}
                          value={f.magnitudeUnknown ? "" : f.magnitude}
                          onChange={(e) => handleInputChange(i, "magnitude", e.target.value)}
                          disabled={f.magnitudeUnknown}
                          placeholder={f.magnitudeUnknown ? "Unknown" : ""}
                          className={`w-full h-8 rounded-lg border px-3 pr-10 text-sm ${f.magnitudeUnknown
                            ? "bg-blue-50 dark:bg-blue-900/30 border-[#1848a0] text-[#1848a0] dark:text-blue-300 font-semibold placeholder-[#1848a0] cursor-not-allowed"
                            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white"
                            }`}
                        />
                        <button type="button" onClick={() => toggleUnknown(i, "magnitude")}
                          className={`absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md border text-sm font-semibold transition duration-200 ${f.magnitudeUnknown
                            ? "bg-[#1848a0] text-white border-[#1848a0]"
                            : "bg-white dark:bg-gray-700 text-[#1848a0] border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            }`}>?</button>
                      </div>
                    </div>

                    {/* ANGLE */}
                    <div className="flex-1">
                      <label className="block font-medium text-sm">Angle {i + 1} (°)</label>
                      <div className="relative mt-1">
                        <input
                          type={f.angleUnknown ? "text" : "number"}
                          value={f.angleUnknown ? "" : f.angle}
                          onChange={(e) => handleInputChange(i, "angle", e.target.value)}
                          disabled={f.angleUnknown}
                          placeholder={f.angleUnknown ? "Unknown" : ""}
                          className={`w-full h-8 rounded-lg border px-3 pr-10 text-sm ${f.angleUnknown
                            ? "bg-blue-50 dark:bg-blue-900/30 border-[#1848a0] text-[#1848a0] dark:text-blue-300 font-semibold placeholder-[#1848a0] cursor-not-allowed"
                            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white"
                            }`}
                        />
                        <button type="button" onClick={() => toggleUnknown(i, "angle")}
                          className={`absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md border text-sm font-semibold transition duration-200 ${f.angleUnknown
                            ? "bg-[#1848a0] text-white border-[#1848a0]"
                            : "bg-white dark:bg-gray-700 text-[#1848a0] border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            }`}>?</button>
                      </div>
                    </div>
                  </div>

                  {forces.length > 1 && (
                    <button onClick={() => setForces(forces.filter((_, idx) => idx !== i))}
                      className="w-full h-8 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200 text-sm font-medium">
                      Remove Force {i + 1}
                    </button>
                  )}
                </div>
              ))}

              <div className="flex flex-col gap-2">
                <button onClick={() => setForces([...forces, { magnitude: "", angle: "", magnitudeUnknown: false, angleUnknown: false }])}
                  className="w-full bg-[#008409] text-white px-2 py-1 rounded-lg hover:bg-[#15711b] transition duration-200 text-sm">
                  + Add Force
                </button>
                <button onClick={handleCalculate}
                  className="w-full bg-[#1848a0] text-white px-2 py-1 rounded-lg hover:bg-[#163d8a] transition duration-200 text-sm">
                  Calculate
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 w-full max-w-xl bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-xl p-4">
                ⚠️ {error}
              </div>
            )}

            {/* Solution */}
            {solution && (
              <div className="mt-6 w-full max-w-xl bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                {solution.solvedLabel && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-[#1848a0] dark:border-blue-600 rounded-xl">
                    <span className="font-semibold text-[#1848a0] dark:text-blue-400">✅ Solved: </span>
                    <strong className="dark:text-white">{solution.solvedLabel}</strong>
                  </div>
                )}
                <button
                  onClick={() => {
                    setStatus("generating");
                    const payload = { steps: solution.steps, resultRows: solution.resultRows, solvedLabel: solution.solvedLabel, forces };
                    const encoded = encodeURIComponent(JSON.stringify(payload));
                    window.open(`/print/equilibrium?data=${encoded}`, "_blank");
                    setStatus("done");
                    setTimeout(() => setStatus("idle"), 2500);
                  }}
                  disabled={off}
                  className={`w-full mb-4 py-3 rounded-xl font-semibold text-white transition ${off ? "cursor-not-allowed bg-[#1848a0]/60" : "bg-[#1848a0] hover:bg-[#163d8a]"}`}
                >
                  {labels[status]}
                </button>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {solution.resultRows?.map((row: { label: string; value: string }, i: number) => (
                    <div key={i} className="bg-blue-50 dark:bg-gray-700 rounded-[10px] border border-blue-100 dark:border-gray-600 px-3.5 py-2.5">
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">{row.label}</div>
                      <div className="text-[16px] font-bold text-[#1848a0] dark:text-blue-400">{row.value}</div>
                    </div>
                  ))}
                </div>
                <StepByStepSolution steps={solution.stepLines} title="Step-by-Step Solution" />
              </div>
            )}
          </>
        )}

        {activeTab === "nonconcurrent" && (
          <div className="w-full">
            <BeamPage />
          </div>
        )}
      </div>

      <Footer />

      {/* ADD THIS — How to Use Modal */}
      {showHowTo && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
          onClick={() => setShowHowTo(false)}
        >
          <div
            className="relative max-w-2xl w-full mx-4 max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowHowTo(false)}
              className="absolute -top-3 -right-3 z-10 bg-white dark:bg-gray-800 text-black dark:text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg text-lg font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              ✕
            </button>
            <img
              src="/2D EQUI.png"
              alt="How to Use"
              className="w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
}
export default function Equilibrium() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EquilibriumContent />
    </Suspense>
  );
}