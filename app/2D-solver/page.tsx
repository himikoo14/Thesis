"use client";

import { useRef, useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Solver3D from "../solver/page";
import "katex/dist/katex.min.css";
import { useStepByStepPDF } from "../ToPDF/Page";
import { StepByStepSolution, fromLegacySteps } from "../../components/StepByStep";
import jsPDF from "jspdf";



const fmt2 = (v: number): string => {
  if (Math.abs(v - Math.round(v)) < 1e-9) return Math.round(v).toString();
  return v.toFixed(2).replace(/\.?0+$/, "");
};

/* ===================== Force System Logic ===================== */
class ForceSystem2D {
  vectors: { fx: number; fy: number; magnitude: number; angleDeg: number }[];

  constructor() {
    this.vectors = [];
  }

  addForce(magnitude: number, angleDeg: number) {
    const angleRad = (angleDeg * Math.PI) / 180;
    const fx = magnitude * Math.cos(angleRad);
    const fy = magnitude * Math.sin(angleRad);
    this.vectors.push({ fx, fy, magnitude, angleDeg });
  }

  stepByStepSolution() {
    const steps: string[] = [];
    steps.push("Step 1: Resolve each force into components:");

    let sumFx = 0;
    let sumFy = 0;

    this.vectors.forEach((v, i) => {
      steps.push(
        `\\text{Force ${i + 1}: } |F|=${v.magnitude}\\,\\text{kN},\\; \\theta=${v.angleDeg}^\\circ`
      );
      steps.push(`
        \\begin{align*}
        F_{x${i + 1}} &= ${v.magnitude}\\cos(${v.angleDeg}^\\circ) \\\\
                      &= ${fmt2(v.fx)}\\,\\text{kN} \\\\
        F_{y${i + 1}} &= ${v.magnitude}\\sin(${v.angleDeg}^\\circ) \\\\
                      &= ${fmt2(v.fy)}\\,\\text{kN}
        \\end{align*}
      `);
      sumFx += v.fx;
      sumFy += v.fy;
    });

    steps.push("Step 2: Sum of components:");

    const fxTerms = this.vectors.map((v, i) => `F_{x${i + 1}}`).join(" + ");
    const fyTerms = this.vectors.map((v, i) => `F_{y${i + 1}}`).join(" + ");

    const fxNums = this.vectors.map(v => fmt2(v.fx)).join(" + ");
    const fyNums = this.vectors.map(v => fmt2(v.fy)).join(" + ");

    steps.push(`
\\begin{align*}
\\Sigma F_x &= ${fxTerms} \\\\
           &= ${fxNums} \\\\
           &= ${fmt2(sumFx)}\\,\\text{kN} \\\\
\\\\
\\Sigma F_y &= ${fyTerms} \\\\
           &= ${fyNums} \\\\
           &= ${fmt2(sumFy)}\\,\\text{kN}
\\end{align*}
`);

    const R = Math.hypot(sumFx, sumFy);
    const theta = (Math.atan2(sumFy, sumFx) * 180) / Math.PI;
    const arrow = theta >= 0 ? "↺" : "↻";

    steps.push("Step 3: Resultant force:");
    steps.push(`
      \\begin{align*}
      R &= \\sqrt{(\\Sigma F_x)^2 + (\\Sigma F_y)^2} \\\\
        &= ${R.toFixed(3)}\\,\\text{kN} \\\\
\\theta &= \\tan^{-1}\\left(\\frac{{\\Sigma F_y}\\vphantom{F_x}}{{\\Sigma F_x}}\\right) \\\\
              &= ${theta.toFixed(2)}^\\circ ${arrow}\\,\\text{from +x axis}
      \\end{align*}
    `);

    steps.push(`\\text{Resultant magnitude: } R = ${R.toFixed(3)}\\,\\text{kN}`);
    steps.push(`\\text{Resultant angle: } \\theta = ${theta.toFixed(2)}^\\circ`);
    return { steps, sumFx, sumFy, R, theta };
  }
}

/* ===================== Types ===================== */
type ForceInput = { magnitude: string; angle: string };
type ForceResult = {
  steps: string[];
  sumFx: number;
  sumFy: number;
  R: number;
  theta: number;
};

/* ===================== ResultantFBD ===================== */
function ResultantFBD({
  forces,
  result,
  svgRef,
}: {
  forces: ForceInput[];
  result: ForceResult;
  svgRef?: React.RefObject<SVGSVGElement>;
}) {
  const vectors = forces
    .map((f) => {
      const m = parseFloat(f.magnitude);
      const a = parseFloat(f.angle);
      if (isNaN(m) || isNaN(a)) return null;
      const rad = (a * Math.PI) / 180;
      return { x: m * Math.cos(rad), y: m * Math.sin(rad) };
    })
    .filter(Boolean) as { x: number; y: number }[];

  const R = { x: result.sumFx, y: result.sumFy };
  const magnitudes = [...vectors.map((v) => Math.hypot(v.x, v.y)), Math.hypot(R.x, R.y)];
  const maxMag = Math.max(1, ...magnitudes);
  const scale = 90 / maxMag;

  return (
    <svg
      ref={svgRef}
      width="300"
      height="300"
      className="border rounded-lg bg-white shadow mx-auto"
    >
      <g transform="translate(150,150)">
        <line x1={-140} y1={0} x2={140} y2={0} stroke="gray" strokeWidth="1" />
        <line x1={0} y1={-140} x2={0} y2={140} stroke="gray" strokeWidth="1" />

        {vectors.map((v, i) => {
          const x = v.x * scale;
          const y = -v.y * scale;
          return (
            <g key={i}>
              <line x1={0} y1={0} x2={x} y2={y} stroke="#1848a0" strokeWidth="3" markerEnd="url(#arrowF)" />
              <text x={x + 6} y={y - 6} fontSize="14" fill="#1848a0" fontWeight="bold">F{i + 1}</text>
            </g>
          );
        })}

        <line x1={0} y1={0} x2={R.x * scale} y2={-R.y * scale} stroke="#009900" strokeWidth="4" markerEnd="url(#arrowR)" />
        <text x={R.x * scale + 8} y={-R.y * scale - 8} fontSize="16" fill="#009900" fontWeight="bold">R</text>

        <defs>
          <marker id="arrowF" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="#1848a0" />
          </marker>
          <marker id="arrowR" markerWidth="12" markerHeight="12" refX="6" refY="3" orient="auto">
            <polygon points="0 0, 7 3, 0 6" fill="#009900" />
          </marker>
        </defs>
      </g>
    </svg>
  );
}

/* ===================== Draggable FBD (live preview) ===================== */
function FBD({ forces, setForces }: { forces: ForceInput[]; setForces: (f: ForceInput[]) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const vectors = forces
    .map((f) => {
      const m = parseFloat(f.magnitude);
      const a = parseFloat(f.angle);
      if (isNaN(m) || isNaN(a)) return null;
      const rad = (a * Math.PI) / 180;
      return { x: m * Math.cos(rad), y: m * Math.sin(rad) };
    })
    .filter(Boolean) as { x: number; y: number }[];

  const maxMag = Math.max(1, ...vectors.map((v) => Math.hypot(v.x, v.y)));
  const scale = 80 / maxMag;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragIndex === null) return;
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const cursor = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const newAngle = (Math.atan2(-(cursor.y - 150), cursor.x - 150) * 180) / Math.PI;
    const newForces = [...forces];
    newForces[dragIndex] = { ...newForces[dragIndex], angle: newAngle.toFixed(3) };
    setForces(newForces);
  };

  return (
    <svg
      ref={svgRef}
      width="300" height="300"
      className="border rounded-lg bg-white shadow"
      style={{ background: "white" }}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setDragIndex(null)}
      onMouseLeave={() => setDragIndex(null)}
    >
      <g transform="translate(150,150)">
        <line x1={-140} y1={0} x2={140} y2={0} stroke="gray" strokeWidth="1" />
        <line x1={0} y1={-140} x2={0} y2={140} stroke="gray" strokeWidth="1" />

        {vectors.map((v, i) => {
          const x = v.x * scale;
          const y = -v.y * scale;
          const offset = 10;
          return (
            <g key={i}>
              <line x1={0} y1={0} x2={x} y2={y} stroke="#1848a0" strokeWidth="3"
                markerEnd="url(#arrow)" className="cursor-pointer"
                onMouseDown={() => setDragIndex(i)} />
              <text x={x + (x / Math.hypot(x, y)) * offset}
                y={y + (y / Math.hypot(x, y)) * offset}
                fontSize="14" fill="black" fontWeight="bold">F{i + 1}</text>
            </g>
          );
        })}

        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="#1848a0" />
          </marker>
        </defs>
      </g>
    </svg>
  );
}

/* ===================== MAIN COMPONENT ===================== */
export default function Solver2D() {
  const [activeTab, setActiveTab] = useState<"2d" | "3d">("2d");
  const [forces, setForces] = useState<ForceInput[]>([{ magnitude: "", angle: "" }]);
  const [result, setResult] = useState<ForceResult | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");

  const off = status === "generating";

const labels: Record<typeof status, string> = {
  idle: "⬇ Download Solution as PDF",
  generating: "⏳ Generating PDF…",   // ← was "Opening print view…"
  done: "✅ Downloaded!",
  error: "❌ Export failed — try again",
};

  const fbdRef = useRef<SVGSVGElement>(null);

  const [solutionRef, PDFButton] = useStepByStepPDF({
    title: "2D Resultant Force — Step-by-Step Solution",
    filename: "resultant-2d-solution.pdf",
  });

  const handleInputChange = (index: number, field: "magnitude" | "angle", value: string) => {
    const newForces = [...forces];
    newForces[index][field] = value;
    setForces(newForces);
  };

  const calculateResultant = () => {
    const system = new ForceSystem2D();
    forces.forEach((f) => {
      const mag = parseFloat(f.magnitude);
      const ang = parseFloat(f.angle);
      if (!isNaN(mag) && !isNaN(ang)) system.addForce(mag, ang);
    });
    setResult(system.stepByStepSolution());
  };

  // ✅ Replaced fetch("/api/export-pdf") with browser print — works on Netlify
const handleExportPDF = (result: ForceResult) => {
  if (!result) return;
  setStatus("generating");

  try {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const PW = 210, PH = 297, M = 18, CW = PW - M * 2, MAXY = PH - 22;
    let y = 0;

    const guard = (need: number) => {
      if (y + need > MAXY) { pdf.addPage(); y = M; }
    };

    pdf.setFillColor(24, 72, 160);
    pdf.rect(0, 0, PW, 10, "F");
    y = 18;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(24, 72, 160);
    pdf.text("2D Resultant Force — Step-by-Step Solution", M, y);
    y += 6;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, M, y);
    y += 5;

    pdf.setDrawColor(220, 228, 245);
    pdf.setLineWidth(0.4);
    pdf.line(M, y, PW - M, y);
    y += 9;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(20, 20, 20);
    pdf.text("Results Summary", M, y);
    y += 8;

    const resultRows = [
      { label: "Horizontal component (ΣFx)", value: `${fmt2(result.sumFx)} kN` },
      { label: "Vertical component (ΣFy)",   value: `${fmt2(result.sumFy)} kN` },
      { label: "Magnitude (R)",               value: `${result.R.toFixed(3)} kN` },
      { label: "Angle (θ)",                   value: `${result.theta.toFixed(2)}°` },
    ];

    for (const { label, value } of resultRows) {
      guard(10);
      pdf.setFillColor(245, 248, 255);
      pdf.roundedRect(M, y - 5, CW, 9, 2, 2, "F");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(50, 50, 50);
      pdf.text(label, M + 4, y);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(24, 72, 160);
      pdf.text(value, PW - M - 4, y, { align: "right" });
      y += 11;
    }

    y += 4;
    pdf.setDrawColor(220, 228, 245);
    pdf.setLineWidth(0.4);
    pdf.line(M, y, PW - M, y);
    y += 8;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(20, 20, 20);
    pdf.text("Step-by-Step Solution", M, y);
    y += 9;

    for (const step of result.steps) {
      const plain = step
        .replace(/\\begin\{align\*\}|\\end\{align\*\}/g, "")
        .replace(/&=/g, "=")
        .replace(/\\\\/g, "  ")
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)")
        .replace(/\\text\{([^}]+)\}/g, "$1")
        .replace(/\\[a-zA-Z]+/g, "")
        .replace(/\{|\}/g, "")
        .trim();

      if (!plain) continue;

      const isStep = plain.startsWith("Step");
      guard(isStep ? 12 : 8);

      if (isStep) {
        y += 2;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(24, 72, 160);
        pdf.text(plain, M, y);
        y += 8;
      } else {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        const wrapped = pdf.splitTextToSize(plain, CW);
        pdf.text(wrapped, M, y);
        y += wrapped.length * 6 + 2;
      }
    }

    const total = pdf.getNumberOfPages();
    for (let pg = 1; pg <= total; pg++) {
      pdf.setPage(pg);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Page ${pg} of ${total}`, PW - M, PH - 8, { align: "right" });
      pdf.setFillColor(24, 72, 160);
      pdf.rect(0, PH - 4, PW, 4, "F");
    }

    pdf.save("resultant-2d-solution.pdf");
    setStatus("done");
    setTimeout(() => setStatus("idle"), 2500);

  } catch (err) {
    console.error("PDF export error:", err);
    setStatus("error");
    setTimeout(() => setStatus("idle"), 3000);
  }
};}