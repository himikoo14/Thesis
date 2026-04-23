"use client";

import { useRef, useState, useCallback, useEffect, ReactNode } from "react";
import Header from "../../components/Header";
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
  // Fix double-subscript: F_{1}_x -> F_{{1}x} (KaTeX rejects double subscripts)
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

    // \textbf{...} => heading
    if (trimmed.startsWith("\\textbf{")) {
      const inner = trimmed.replace(/^\\textbf\{([\s\S]*)\}$/, "$1");
      return { type: "heading", text: inner };
    }

    // Plain "Step X: ..." headings
    if (trimmed.startsWith("Step "))
      return { type: "heading", text: trimmed };

    // \textit{...} => plain italic text (KaTeX doesn't support \textit in display mode)
    if (trimmed.startsWith("\\textit{") && !trimmed.includes("\\theta")) {
      const inner = trimmed.replace(/^\\textit\{([\s\S]*)\}$/, "$1");
      return { type: "text", text: `ℹ️ ${inner}` };
    }

    // No backslash => plain text
    if (!trimmed.includes("\\")) return { type: "text", text: trimmed };

    if (trimmed.startsWith("\\text{") && trimmed.endsWith("}")) {
      const inner = trimmed.replace(/^\\text\{([\s\S]*)\}$/, "$1");
      return { type: "text", text: inner };
    }
    // Math => sanitize then KaTeX
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
  return <div ref={el} style={{ margin: "3px 0", overflowX: "auto" }} />;
}

/* ================================================================
   STEP-BY-STEP SOLUTION RENDERER
================================================================ */
function StepByStepSolution({ steps, title = "Step-by-Step Solution" }: { steps: StepLine[]; title?: string }) {
  return (
    <div className="w-full max-w-xl mt-2">
      {title && <h3 className="font-semibold mb-3 text-lg">{title}</h3>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {steps.map((line, i) => {
          switch (line.type) {
            case "heading":
              return <p key={i} style={{ fontWeight: 600, fontSize: 16, marginTop: 10, marginBottom: 2, color: "#1848a0" }}>{line.text}</p>;
            case "math":
              return <KTX key={i} tex={line.tex} />;
            case "text":
              return <p key={i} style={{ fontSize: 15, color: "#333", margin: "2px 0" }}>{line.text}</p>;
            case "diagram":
              return (
                <div key={i} style={{ marginTop: 12 }}>
                  {line.label && <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{line.label}</p>}
                  <div style={{ display: "flex", justifyContent: "center" }}>{line.node}</div>
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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragIndex === null || !svgRef.current) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const cursor = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const x = cursor.x - 150, y = cursor.y - 150;
    const newAngle = (Math.atan2(-y, x) * 180) / Math.PI;
    const newForces = [...forces];
    newForces[dragIndex] = {
      ...newForces[dragIndex],
      angle: fmtNum(newAngle)
    };
    setForces(newForces);
  };

  return (
    <svg
      ref={svgRef}
      width="300" height="300"
      className="border rounded-lg bg-white shadow"
      onMouseMove={handleMouseMove}
      onMouseUp={() => setDragIndex(null)}
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
        <line x1={-140} y1={0} x2={140} y2={0} stroke="#e2e8f0" strokeWidth="1" />
        <line x1={0} y1={-140} x2={0} y2={140} stroke="#e2e8f0" strokeWidth="1" />
        <text x={143} y={4} fontSize="10" fill="#94a3b8">x</text>
        <text x={3} y={-133} fontSize="10" fill="#94a3b8">y</text>

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
            <g key={i} className="cursor-pointer" onMouseDown={() => setDragIndex(i)}>
              {showArc && v.angle !== 0 && (
                <>
                  <path
                    d={`M ${arcR} 0 A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEndX} ${arcEndY}`}
                    fill="none" stroke={color} strokeWidth="1" opacity="0.5"
                  />
                  <text x={aLx} y={aLy} fontSize="9" fill={color} textAnchor="middle" dominantBaseline="middle" opacity="0.8">
                    {Math.round(v.angle * 10) / 10}°
                  </text>
                </>
              )}
              <line
                x1={0} y1={0} x2={ex} y2={ey}
                stroke={color}
                strokeWidth={isUnknown ? 2 : 3}
                strokeDasharray={isUnknown ? "6 3" : undefined}
                opacity={isUnknown ? 0.65 : 1}
                markerEnd={isUnknown ? `url(#arrow-dash-${colorIdx})` : `url(#arrow-${colorIdx})`}
              />
              <text
                x={lx} y={ly}
                fontSize="11" fontWeight="700"
                fill={color}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {`F${i + 1}`}
                {v.magUnknown ? " (?)" : v.mag !== null ? ` (${Math.round((v.mag as number) * 100) / 100})` : ""}
              </text>
            </g>
          );
        })}

        <circle cx={0} cy={0} r={4} fill="#334155" />
      </g>
    </svg>
  );
}

/* ================================================================
   CALCULATE — all math delegated to solveEquilibrium2D
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

  /* ── Validate unknowns ── */
  if (totalUnknowns > 2) {
    return { error: "Too many unknowns. The system can only solve for up to 2 unknowns." };
  }

  /* ── Build known forces list ── */
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

  /* ── ALL FORCES KNOWN → resultant via single "unknown" at angle 0 with magnitude 0 trick
        OR just sum them directly by passing a dummy unknown resultant ── */
  if (totalUnknowns === 0) {
    if (knownForces.length === 0) {
      return { error: "Please enter at least one valid force." };
    }
    // To compute resultant, we ask for the equilibrant (opposite of resultant),
    // then negate. We use a dummy unknown with no angle constraint by using
    // solveEquilibrium2D with both unknowns being resultant x and y components.
    // Simpler: we call solveEquilibrium2D with one unknown at angle=0 and one at angle=90
    // then reconstruct. But cleanest: delegate by treating resultant computation
    // as "find Fx_result and Fy_result" using 0° and 90° unknowns.
    try {
      const resultX = solveEquilibrium2D(knownForces, [
        { angle: 0, label: "R_x" },
        { angle: 90, label: "R_y" },
      ]);
      // resultX gives -ΣFx and -ΣFy (equilibrant components), negate to get resultant
      const Rx = -resultX.unknowns[0].value;
      const Ry = -resultX.unknowns[1].value;
      const R = Math.hypot(Rx, Ry);
      const angle = (Math.atan2(Ry, Rx) * 180) / Math.PI;

      const resultRows = [
        { label: "Resultant Magnitude", value: `${fmtNum(R)} kN` },
        { label: "Resultant Angle", value: `${fmtNum(angle)}°` },
      ];
      const steps = resultX.steps;
      return { steps, stepLines: fromLegacySteps(steps), resultRows };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  /* ── CASE: one unknown magnitude, one unknown angle on SAME force ── */
  if (
    magUnknownIndices.length === 1 &&
    angUnknownIndices.length === 1 &&
    magUnknownIndices[0] === angUnknownIndices[0]
  ) {
    const idx = magUnknownIndices[0];
    // Decompose into two scalar unknowns: Fx and Fy of that force
    try {
      const result = solveEquilibrium2D(knownForces, [
        { angle: 0, label: `F_{${idx + 1}x}` },
        { angle: 90, label: `F_{${idx + 1}y}` },
      ]);
      const Fx = -result.unknowns[0].value;
      const Fy = -result.unknowns[1].value;
      const mag = Math.hypot(Fx, Fy);
      const ang = (Math.atan2(Fy, Fx) * 180) / Math.PI;
      const resultRows = [
        { label: `Force ${idx + 1} Magnitude`, value: `${fmtNum(mag)} kN` },
        { label: `Force ${idx + 1} Angle`, value: `${fmtNum(ang)}°` },
      ];
      const steps = result.steps;
      return {
        steps,
        stepLines: fromLegacySteps(steps),
        resultRows,
        solvedLabel: `F${idx + 1}: ${fmtNum(mag)} kN @ ${fmtNum(ang)}°`,
      };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  /* ── CASE: one unknown angle only ── */
  if (magUnknownIndices.length === 0 && angUnknownIndices.length === 1) {
    const idx = angUnknownIndices[0];
    const mag = parseFloat(forces[idx].magnitude);
    if (isNaN(mag)) return { error: `Force ${idx + 1}: provide magnitude when angle is unknown.` };

    // Decompose unknown-angle force into Fx = mag*cosθ and Fy = mag*sinθ
    // Treat as two unknowns: Fx_comp and Fy_comp, both free (angles 0 and 90)
    // but constrained by Fx_comp² + Fy_comp² = mag²
    // solveEquilibrium2D handles 2 unknowns at 0° and 90° → gives -ΣFx and -ΣFy
    try {
      const result = solveEquilibrium2D(knownForces, [
        { angle: 0, label: `F_{${idx + 1}x}` },
        { angle: 90, label: `F_{${idx + 1}y}` },
      ]);
      const Fx = -result.unknowns[0].value;
      const Fy = -result.unknowns[1].value;
      // validate against known magnitude
      const computedMag = Math.hypot(Fx, Fy);
      if (Math.abs(computedMag - mag) > Math.max(1e-6, 0.01 * mag)) {
        return {
          error: `No valid angle for Force ${idx + 1}: given magnitude ${fmtNum(mag)} kN is inconsistent with equilibrium — required magnitude is ${fmtNum(computedMag)} kN.`,
        };
      }
      const ang = (Math.atan2(Fy, Fx) * 180) / Math.PI;
      const resultRows = [{ label: `Force ${idx + 1} Angle`, value: `${fmtNum(ang)}°` }];

      const angleSteps: string[] = [
        `\\textbf{Finding the Angle of F_{${idx + 1}}}`,
        `\\text{The components of } F_{${idx + 1}} \\text{ required for equilibrium are:}`,
        `F_{${idx + 1}x} = ${fmtNum(Fx)} \\text{ kN}, \\quad F_{${idx + 1}y} = ${fmtNum(Fy)} \\text{ kN}`,
        `\\theta = \\tan^{-1}\\!\\left(\\frac{F_{${idx + 1}y}}{F_{${idx + 1}x}}\\right) = \\tan^{-1}\\!\\left(\\frac{${fmtNum(Fy)}}{${fmtNum(Fx)}}\\right)`,
        `\\theta = ${fmtNum(ang)}^{\\circ}`,
      ];

      const allSteps = [...result.steps, ...angleSteps];
      return {
        steps: allSteps,
        stepLines: fromLegacySteps(allSteps),
        resultRows,
        solvedLabel: `F${idx + 1} angle = ${fmtNum(ang)}°`,
      };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  /* ── CASE: one or two unknown magnitudes (known angles) ── */
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
      const result = solveEquilibrium2D(
        knownForces,
        unknownForces as { angle: number; label: string }[]
      );

      const resultRows = magUnknownIndices.map((origIdx, k) => {
        const val = result.unknowns[k].value;
        const mag = Math.abs(val);
        return { label: `Force ${origIdx + 1} Magnitude`, value: `${fmtNum(mag)} kN` };
      });

      const solvedLabel = magUnknownIndices
        .map((origIdx, k) => `F${origIdx + 1} = ${fmtNum(Math.abs(result.unknowns[k].value))} kN`)
        .join(" | ");

      return {
        steps: result.steps,
        stepLines: fromLegacySteps(result.steps),
        resultRows,
        solvedLabel,
      };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  /* ── CASE: one unknown magnitude + one unknown angle on DIFFERENT forces ── */
  if (magUnknownIndices.length === 1 && angUnknownIndices.length === 1) {
    const magIdx = magUnknownIndices[0];
    const angIdx = angUnknownIndices[0];
    const magAngle = parseFloat(forces[magIdx].angle);
    const angMag = parseFloat(forces[angIdx].magnitude);

    if (isNaN(magAngle)) return { error: `Force ${magIdx + 1}: provide angle when magnitude is unknown.` };
    if (isNaN(angMag)) return { error: `Force ${angIdx + 1}: provide magnitude when angle is unknown.` };

    // Treat the unknown-angle force as two component unknowns at 0° and 90°,
    // plus the unknown-magnitude force at its known angle.
    // That gives 3 unknowns for 2 equations — over-constrained. Instead, substitute
    // the magnitude constraint Fx² + Fy² = angMag² to eliminate one degree of freedom.
    // We solve using solveEquilibrium2D with the unknown-magnitude force + one axis component
    // of the unknown-angle force. The other component follows from the magnitude constraint.
    // Strategy: use ΣFx and ΣFy directly with 2 unknowns:
    //   unknown1 = F_{magIdx+1} (magnitude unknown, angle known)
    //   unknown2 conceptually split as angMag·cosθ and angMag·sinθ
    // We do this in two sub-solves: assume θ via atan2 after getting both components.
    try {
      // Pass both unknowns: unknown-mag force at its angle, plus x-component of unknown-angle force
      // Then recover y-component from ΣFy after solving.
      const resultFx = solveEquilibrium2D(
        knownForces,
        [
          { angle: magAngle, label: `F_{${magIdx + 1}}` },
          { angle: 0, label: `F_{${angIdx + 1}x}` },
        ]
      );
      // Now get the y residual
      const solvedMag = resultFx.unknowns[0].value;
      const solvedFx = -resultFx.unknowns[1].value;

      // Use ΣFy = 0 to find Fy of the unknown-angle force
      const resultFy = solveEquilibrium2D(
        [
          ...knownForces,
          { magnitude: Math.abs(solvedMag), angle: solvedMag >= 0 ? magAngle : magAngle + 180, label: `F_{${magIdx + 1}}` },
        ],
        [{ angle: 90, label: `F_{${angIdx + 1}y}` }]
      );
      const solvedFy = -resultFy.unknowns[0].value;

      const ang = (Math.atan2(solvedFy, solvedFx) * 180) / Math.PI;
      const actualMag = Math.abs(solvedMag);
      const actualAngle = solvedMag >= 0 ? magAngle : magAngle + 180;

      const resultRows = [
        { label: `Force ${magIdx + 1} Magnitude`, value: `${fmtNum(actualMag)} kN` },
        { label: `Force ${angIdx + 1} Angle`, value: `${fmtNum(ang)}°` },
      ];
      const steps = [...resultFx.steps, ...resultFy.steps];
      return {
        steps,
        stepLines: fromLegacySteps(steps),
        resultRows,
        solvedLabel: `F${magIdx + 1} = ${fmtNum(actualMag)} kN | F${angIdx + 1} angle = ${fmtNum(ang)}°`,
      };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  return { error: "Unsupported combination of unknowns." };
}

/* ===================== MAIN COMPONENT ===================== */
export default function Equilibrium() {
  const [forces, setForces] = useState<ForceInput[]>([
    { magnitude: "", angle: "", magnitudeUnknown: false, angleUnknown: false },
  ]);
  const [solution, setSolution] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<
    "idle" | "generating" | "done" | "error"
  >("idle");

  const off = status === "generating";

  const labels: Record<typeof status, string> = {
    idle: "⬇ Download Solution as PDF",
    generating: "⏳ Opening print view…",
    done: "✅ Done!",
    error: "❌ Export failed — try again",
  };
  const [activeTab, setActiveTab] = useState<"concurrent" | "nonconcurrent">("concurrent");

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

    if ("error" in result) {
      setError(result.error);
      return;
    }

    setSolution(result);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 text-[18px]">
      <Header />

      <main className="flex-grow flex flex-col items-center px-4 pt-8 pb-10">
        <div
        />
        {/* Tabs */}
        <div className="flex justify-center mb-6 gap-4">
          <button
            onClick={() => setActiveTab("concurrent")}
            className={`px-5 py-2 rounded-lg font-semibold ${activeTab === "concurrent" ? "bg-[#1848a0] text-white" : "bg-gray-200"}`}
          >
            Concurrent Force System
          </button>
          <button
            onClick={() => setActiveTab("nonconcurrent")}
            className={`px-5 py-2 rounded-lg font-semibold ${activeTab === "nonconcurrent" ? "bg-[#1848a0] text-white" : "bg-gray-200"}`}
          >
            Non-Concurrent Force System
          </button>
        </div>

        {activeTab === "concurrent" && (
          <>
            <h1 className="text-3xl font-bold text-center mb-2">
              Concurrent Force System
            </h1>

            <div className="mb-8 relative z-10">
              <h2 style={{ fontSize: 18, fontWeight: 600, textAlign: "center", marginBottom: 8 }}>Unkown Forces and Angles Calculator</h2>
              <p style={{ color: "#888", fontSize: 13, marginTop: 6, textAlign: "center" }}>Real-Time Free Body Diagram</p>
              <FBD forces={forces} setForces={setForces} />
              <p style={{ color: "#888", fontSize: 13, marginTop: 6, textAlign: "center" }}>Drag arrows to change angles</p>
            </div>

            <p className="w-full max-w-xl text-sm text-gray-700 mb-4 text-left">
              <span className="font-semibold">Note:</span> The angle is measured from the positive x-axis, counterclockwise.
            </p>

            <div className="w-full max-w-xl bg-white rounded-2xl shadow p-6 space-y-6 relative z-10">
              <h2 className="text-[20px] font-semibold">Force Setup</h2>
              <p className="text-[13px] text-gray-500">
                Enter the magnitude (kN) and angle (°) of each force. Click <span className="inline-flex items-center justify-center w-6 h-6 rounded border border-gray-300 font-bold text-[#1848a0] text-sm">?</span> to set the unknown value.
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
                        className={`w-full rounded-xl border p-3 pr-14 ${f.magnitudeUnknown ? "bg-blue-50 border-[#1848a0] text-[#1848a0] font-semibold placeholder-[#1848a0] cursor-not-allowed" : "border-gray-300"}`}
                      />
                      <button
                        type="button"
                        onClick={() => toggleUnknown(i, "magnitude")}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl border text-lg font-semibold transition duration-200 ${f.magnitudeUnknown ? "bg-[#1848a0] text-white border-[#1848a0]" : "bg-white text-[#1848a0] border-gray-300 hover:bg-blue-50"}`}
                      >?</button>
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
                        className={`w-full rounded-xl border p-3 pr-12 ${f.angleUnknown ? "bg-blue-50 border-[#1848a0] text-[#1848a0] font-semibold placeholder-[#1848a0] cursor-not-allowed" : "border-gray-300"}`}
                      />
                      <button
                        type="button"
                        onClick={() => toggleUnknown(i, "angle")}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl border text-lg font-semibold transition duration-200 ${f.angleUnknown ? "bg-[#1848a0] text-white border-[#1848a0]" : "bg-white text-[#1848a0] border-gray-300 hover:bg-blue-50"}`}
                      >?</button>
                    </div>
                  </div>

                  {forces.length > 1 && (
                    <button
                      onClick={() => setForces(forces.filter((_, idx) => idx !== i))}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200"
                    >–</button>
                  )}
                </div>
              ))}

              <button
                onClick={() => setForces([...forces, { magnitude: "", angle: "", magnitudeUnknown: false, angleUnknown: false }])}
                className="w-full bg-[#008409] text-white py-3 rounded-lg hover:bg-[#15711b] transition duration-200"
              >+ Add Force</button>

              <button
                onClick={handleCalculate}
                className="w-full bg-[#1848a0] text-white py-3 rounded-lg hover:bg-[#163d8a] transition duration-200 text-[18px]"
              >Calculate</button>
            </div>

            {error && (
              <div className="mt-4 w-full max-w-xl bg-red-50 border border-red-300 text-red-700 rounded-xl p-4">
                ⚠️ {error}
              </div>
            )}

            {solution && (
              <div className="mt-6 w-full max-w-xl bg-gray-50 p-4 rounded-xl border">

                {solution.solvedLabel && (
                  <div className="mb-4 p-3 bg-blue-50 border border-[#1848a0] rounded-xl">
                    <span className="font-semibold text-[#1848a0]">✅ Solved: </span>
                    <strong>{solution.solvedLabel}</strong>
                  </div>
                )}

                <button
                  onClick={() => {
                    setStatus("generating");
                    const payload = {
                      steps: solution.steps,
                      resultRows: solution.resultRows,
                      solvedLabel: solution.solvedLabel,
                      forces,
                    };
                    const encoded = encodeURIComponent(JSON.stringify(payload));
                    window.open(`/print/equilibrium?data=${encoded}`, "_blank");
                    setStatus("done");
                    setTimeout(() => setStatus("idle"), 2500);
                  }}
                  disabled={off}
                  className={`w-full mb-4 py-3 rounded-xl font-semibold text-white transition ${off ? "cursor-not-allowed bg-[#1848a0]/60" : "bg-[#1848a0] hover:bg-[#163d8a]"
                    }`}
                >
                  {labels[status]}
                </button>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {solution.resultRows?.map((row: { label: string; value: string }, i: number) => (
                    <div key={i} style={{ background: "#f5f8ff", borderRadius: 10, border: "1px solid #dce8ff", padding: "10px 14px" }}>
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>{row.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#1848a0" }}>{row.value}</div>
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
      </main>

      <Footer />
    </div>
  );
}