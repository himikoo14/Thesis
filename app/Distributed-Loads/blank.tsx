"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

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

function KTX({ tex }: { tex: string }) {
  const ref = useCallback((el: HTMLDivElement | null) => {
    if (!el || !window.katex) return;
    try { window.katex.render(tex, el, { displayMode: true, throwOnError: false }); }
    catch { el.innerText = tex; }
  }, [tex]);
  const ready = useKatexScript();
  if (!ready) return null;
  return <div ref={ref} style={{ margin: "3px 0", overflowX: "auto" }} />;
}

/* ===================== TYPES ===================== */

// TODO: Define your soil/wall input types here
type WallInputs = {
  wallHeight: string;       // H — total wall height (m)
  soilUnitWeight: string;   // γ — unit weight of soil (kN/m³)
  frictionAngle: string;    // φ — angle of internal friction (°)
  cohesion: string;         // c — cohesion (kPa), 0 for cohesionless
  surcharge: string;        // q — surcharge load (kPa)
  waterTableDepth: string;  // depth to water table (m), leave blank if none
  theoryType: "Rankine" | "Coulomb";
};

// TODO: Define your result type to match your computation output
type WallResult = {
  Ka: number;
  Kp: number;
  activeForce: number;
  passiveForce: number;
  momentAtBase: number;
  // ... add more fields as needed
};

type StepLine =
  | { kind: "heading";    text: string }
  | { kind: "subheading"; text: string }
  | { kind: "text";       text: string }
  | { kind: "eq";         tex: string }
  | { kind: "result";     tex: string }
  | { kind: "spacer" };

/* ===================== STEP RENDERER ===================== */
function StepRenderer({ lines }: { lines: StepLine[] }) {
  return (
    <div style={{ lineHeight: 1.8 }}>
      {lines.map((line, idx) => {
        switch (line.kind) {
          case "heading":
            return (
              <p key={idx} style={{ fontWeight: 700, fontSize: 16, color: "#1848a0", marginTop: 16, marginBottom: 2 }}>
                {line.text}
              </p>
            );
          case "subheading":
            return (
              <p key={idx} style={{ fontWeight: 600, fontSize: 14, color: "#374151", marginTop: 10, marginBottom: 2 }}>
                {line.text}
              </p>
            );
          case "text":
            return (
              <p key={idx} style={{ color: "#555", margin: "2px 0", fontSize: 14 }}>
                {line.text}
              </p>
            );
          case "eq":
            return <KTX key={idx} tex={line.tex} />;
          case "result":
            return (
              <div key={idx} style={{ background: "#f0f4ff", borderLeft: "3px solid #1848a0", borderRadius: 6, padding: "4px 12px", margin: "4px 0" }}>
                <KTX tex={line.tex} />
              </div>
            );
          case "spacer":
            return <div key={idx} style={{ height: 8 }} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

/* ===================== PDF EXPORT ===================== */
const JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
const MM_PER_PX = 0.264583;
const RENDER_SCALE = 3;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = () => resolve(); s.onerror = () => reject(new Error(`Failed: ${src}`));
    document.head.appendChild(s);
  });
}

function upgradeFracs(tex: string): string {
  if (!tex.includes("\\frac") || tex.includes("\\displaystyle")) return tex;
  return `{\\displaystyle ${tex.replace(/\\tfrac(?=\{)/g, "\\dfrac").replace(/(?<![dt])\\frac(?=\{)/g, "\\dfrac")}}`;
}

async function latexToPng(tex: string): Promise<{ dataUrl: string; wMm: number; hMm: number } | null> {
  const html2canvas = (await import("html2canvas")).default;
  try {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position:absolute;left:-9999px;top:0;background:#ffffff;color:#000;display:inline-block;";
    const inner = document.createElement("span");
    inner.style.cssText = "display:inline-block;padding:10px 14px;";
    wrapper.appendChild(inner);
    document.body.appendChild(wrapper);
    window.katex.render(upgradeFracs(tex), inner, { displayMode: true, throwOnError: false, output: "html" });
    const targetEl = (inner.querySelector(".katex-html") as HTMLElement) || inner;
    const innerRect = targetEl.getBoundingClientRect();
    const wrapRect = wrapper.getBoundingClientRect();
    const offsetLeft = innerRect.left - wrapRect.left;
    const canvas = await html2canvas(wrapper, { backgroundColor: "#ffffff", scale: RENDER_SCALE, useCORS: true, logging: false });
    document.body.removeChild(wrapper);
    const PAD = 18, EL = -8;
    const sx = Math.max(0, Math.round(offsetLeft * RENDER_SCALE) - PAD - EL);
    const sw = Math.round(innerRect.width * RENDER_SCALE) + PAD * 2 + EL;
    const cropped = document.createElement("canvas");
    cropped.width = sw; cropped.height = canvas.height;
    const ctx = cropped.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(canvas, sx, 0, sw, canvas.height, 0, 0, sw, canvas.height);
    return { dataUrl: cropped.toDataURL("image/png"), wMm: (sw / RENDER_SCALE) * MM_PER_PX, hMm: (canvas.height / RENDER_SCALE) * MM_PER_PX };
  } catch (e) { console.warn("latexToPng:", tex, e); return null; }
}

function flattenForPDF(lines: StepLine[]): string[] {
  return lines.flatMap(line => {
    switch (line.kind) {
      case "heading":    return [line.text];
      case "subheading": return [line.text];
      case "text":       return [line.text];
      case "eq":         return [line.tex];
      case "result":     return [line.tex];
      case "spacer":     return [];
    }
  });
}

async function writePDF(p: {
  flatSteps: string[];
  resultRows: { label: string; value: string }[];
  title: string;
  filename: string;
}) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210, PH = 297, M = 18, CW = PW - M * 2, MAXY = PH - 22;
  let y = 0;

  const guard = (need: number) => { if (y + need > MAXY) { pdf.addPage(); y = M; } };
  const mathLine = async (tex: string) => {
    const r = await latexToPng(tex);
    if (!r) return;
    const MAX = CW * 0.9;
    let { wMm: w, hMm: h } = r;
    if (w > MAX) { h *= MAX / w; w = MAX; }
    guard(h + 6);
    pdf.addImage(r.dataUrl, "PNG", (PW - w) / 2, y, w, h);
    y += h + 6;
  };

  // Header
  pdf.setFillColor(24, 72, 160); pdf.rect(0, 0, PW, 10, "F");
  y = 18;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(14); pdf.setTextColor(24, 72, 160);
  pdf.text(p.title, M, y); y += 6;
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(100, 116, 139);
  pdf.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, M, y); y += 5;
  pdf.setDrawColor(220, 228, 245); pdf.setLineWidth(0.4); pdf.line(M, y, PW - M, y); y += 9;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.setTextColor(20, 20, 20);
  pdf.text("Step-by-Step Solution", M, y); y += 10;

  for (const raw of p.flatSteps) {
    const s = raw.trim();
    if (!s) continue;
    if (s.startsWith("Step") || s === "Final Result") {
      guard(12); y += 2;
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(24, 72, 160);
      pdf.text(s, M, y); y += 14; continue;
    }
    if (s.includes("\\")) { await mathLine(s); y += 2; continue; }
    guard(8);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.setTextColor(50, 50, 50);
    const wrapped = pdf.splitTextToSize(s, CW);
    pdf.text(wrapped, M, y); y += wrapped.length * 6 + 2;
  }

  if (p.resultRows.length > 0) {
    guard(24 + p.resultRows.length * 11); y += 4;
    pdf.setDrawColor(220, 228, 245); pdf.setLineWidth(0.4); pdf.line(M, y, PW - M, y); y += 8;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.setTextColor(20, 20, 20);
    pdf.text("Results Summary", M, y); y += 9;
    for (const { label: lbl, value } of p.resultRows) {
      guard(11);
      pdf.setFillColor(245, 248, 255); pdf.roundedRect(M, y - 5, CW, 9, 2, 2, "F");
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(11); pdf.setTextColor(50, 50, 50);
      pdf.text(lbl, M + 4, y);
      pdf.setFont("helvetica", "bold"); pdf.setTextColor(24, 72, 160);
      pdf.text(value, PW - M - 4, y, { align: "right" }); y += 11;
    }
  }

  const total = pdf.internal.getNumberOfPages();
  for (let pg = 1; pg <= total; pg++) {
    pdf.setPage(pg);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(148, 163, 184);
    pdf.text(`Page ${pg} of ${total}`, PW - M, PH - 8, { align: "right" });
    pdf.setFillColor(24, 72, 160); pdf.rect(0, PH - 4, PW, 4, "F");
  }
  pdf.save(p.filename);
}

function PDFExportButton({ lines, resultRows, title, filename }: {
  lines: StepLine[];
  resultRows: { label: string; value: string }[];
  title: string;
  filename: string;
}) {
  const [libReady, setLibReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");

  useEffect(() => { loadScript(JSPDF_URL).then(() => setLibReady(true)).catch(console.error); }, []);

  const handleExport = useCallback(async () => {
    if (!libReady || status === "generating") return;
    setStatus("generating");
    try {
      await writePDF({ flatSteps: flattenForPDF(lines), resultRows, title, filename });
      setStatus("done"); setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      console.error(err); setStatus("error"); setTimeout(() => setStatus("idle"), 3000);
    }
  }, [libReady, status, lines, resultRows, title, filename]);

  const off = !libReady || status === "generating";
  const labels: Record<typeof status, string> = {
    idle: "⬇ Download Solution as PDF",
    generating: "⏳ Generating PDF…",
    done: "✅ Downloaded!",
    error: "❌ Export failed — try again",
  };

  return (
    <button
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        width: "100%", padding: "12px 0", border: "none", borderRadius: 10,
        fontSize: 14, fontWeight: 600, transition: "all 0.2s",
        background: "linear-gradient(135deg, #0f2d6b, #1848a0)",
        color: "#fff", boxShadow: "0 4px 14px rgba(24,72,160,0.25)",
        marginBottom: 14, opacity: off ? 0.65 : 1, cursor: off ? "not-allowed" : "pointer",
      }}
      onClick={handleExport} disabled={off}
    >
      {labels[status]}
    </button>
  );
}

/* ===================== HELPERS ===================== */
const fmtS = (n: number, d = 4) => {
  const rounded = Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(d);
};

/* ===================== BUILD STEP LINES ===================== */
// TODO: Replace this stub with your actual step-by-step solution builder.
// Receives the computed result and returns an array of StepLine objects
// that the StepRenderer will display.
function buildStepLines(
  _inputs: WallInputs,
  _result: WallResult
): StepLine[] {
  const lines: StepLine[] = [];

  const H  = (text: string) => lines.push({ kind: "heading",    text });
  const SH = (text: string) => lines.push({ kind: "subheading", text });
  const T  = (text: string) => lines.push({ kind: "text",       text });
  const E  = (tex: string)  => lines.push({ kind: "eq",         tex });
  const R  = (tex: string)  => lines.push({ kind: "result",     tex });
  const SP = ()              => lines.push({ kind: "spacer" });

  // ── EXAMPLE STRUCTURE — replace with real soil pressure steps ──────────────

  H("Step 1: Determine Lateral Earth Pressure Coefficient");
  SH("Rankine's Ka");
  T("For cohesionless soil using Rankine's theory:");
  E("K_a = \\tan^2\\!\\left(45° - \\dfrac{\\phi}{2}\\right)");
  // R(`K_a = ${fmtS(_result.Ka, 4)}`);
  SP();

  H("Step 2: Active Earth Pressure Distribution");
  T("Pressure at the base of the wall:");
  E("\\sigma_a = K_a \\cdot \\gamma \\cdot H + K_a \\cdot q");
  SP();

  H("Step 3: Total Active Force");
  E("P_a = \\frac{1}{2} K_a \\gamma H^2 + K_a q H");
  SP();

  H("Step 4: Location of Resultant");
  T("Point of application measured from the base:");
  E("\\bar{y} = \\frac{H}{3}");
  SP();

  H("Final Result");
  // R(`K_a = ${fmtS(_result.Ka, 4)}`);
  // R(`P_a = ${fmtS(_result.activeForce, 4)} \\text{ kN/m}`);
  // R(`M_{\\text{base}} = ${fmtS(_result.momentAtBase, 4)} \\text{ kN·m/m}`);

  return lines;
}

/* ===================== COMPUTE ===================== */
// TODO: Replace this stub with your actual lateral soil pressure engine.
// Should return a WallResult object.
function computeLateralPressure(_inputs: WallInputs): WallResult {
  // STUB — replace with real formulas
  return {
    Ka: 0,
    Kp: 0,
    activeForce: 0,
    passiveForce: 0,
    momentAtBase: 0,
  };
}

/* ===================== COMPONENT ===================== */
export default function RetainingWallPage() {
  const [inputs, setInputs] = useState<WallInputs>({
    wallHeight: "",
    soilUnitWeight: "",
    frictionAngle: "",
    cohesion: "",
    surcharge: "",
    waterTableDepth: "",
    theoryType: "Rankine",
  });

  const [result, setResult]       = useState<WallResult | null>(null);
  const [stepLines, setStepLines] = useState<StepLine[]>([]);

  const set = (field: keyof WallInputs) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setInputs(prev => ({ ...prev, [field]: e.target.value }));

  const calculate = () => {
    const computed = computeLateralPressure(inputs);
    setResult(computed);
    setStepLines(buildStepLines(inputs, computed));
  };

  const formatNum = (n: number) => Number(n.toFixed(3));

  /* ── Result rows for PDF summary table ── */
  const resultRows = result ? [
    { label: "Ka (active coefficient)",   value: `${formatNum(result.Ka)}` },
    { label: "Kp (passive coefficient)",  value: `${formatNum(result.Kp)}` },
    { label: "Active force Pa",           value: `${formatNum(result.activeForce)} kN/m` },
    { label: "Passive force Pp",          value: `${formatNum(result.passiveForce)} kN/m` },
    { label: "Moment at base",            value: `${formatNum(result.momentAtBase)} kN·m/m` },
  ] : [];

  /* ── Input field helper ── */
  const Field = ({
    label, field, placeholder, unit
  }: {
    label: string; field: keyof WallInputs; placeholder: string; unit?: string;
  }) => (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-44 text-sm">{label}</span>
      <input
        value={inputs[field] as string}
        onChange={set(field)}
        placeholder={placeholder}
        className="flex-1 rounded bg-gray-100 px-3 py-1 focus:outline-none text-sm"
      />
      {unit && <span className="text-xs text-gray-500 w-14">{unit}</span>}
    </div>
  );

  /* ===================== JSX ===================== */
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 text-gray-900">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Lateral Soil Pressure — Retaining Wall Calculator
        </h1>

        <div className="flex items-start gap-6 flex-wrap">

          {/* ── LEFT COLUMN ── */}
          <div className="flex flex-col w-[320px] shrink-0 gap-4">

            {/* Theory Selection */}
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold mb-3">Theory</h3>
              <select
                value={inputs.theoryType}
                onChange={set("theoryType")}
                className="w-full rounded bg-white px-3 py-2 focus:outline-none"
              >
                <option value="Rankine">Rankine's Theory</option>
                <option value="Coulomb">Coulomb's Theory</option>
              </select>
            </div>

            {/* Calculate Button */}
            <button
              onClick={calculate}
              className="w-full bg-[#1848a0] text-white py-3 rounded-lg hover:bg-[#163d8a] transition text-[18px]"
            >
              Calculate
            </button>

            {/* Quick Results Panel */}
            {result && (
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="font-semibold mb-3 text-blue-900">Quick Results</h3>
                <p className="text-sm mb-1"><span className="font-medium">Ka:</span> {formatNum(result.Ka)}</p>
                <p className="text-sm mb-1"><span className="font-medium">Kp:</span> {formatNum(result.Kp)}</p>
                <hr className="my-3" />
                <p className="text-sm mb-1"><span className="font-medium">Active Force Pa:</span> {formatNum(result.activeForce)} kN/m</p>
                <p className="text-sm mb-1"><span className="font-medium">Passive Force Pp:</span> {formatNum(result.passiveForce)} kN/m</p>
                <p className="text-sm mb-1"><span className="font-medium">Moment at Base:</span> {formatNum(result.momentAtBase)} kN·m/m</p>
              </div>
            )}
          </div>

          {/* ── INPUT CARD ── */}
          <div className="bg-white rounded-xl shadow px-6 py-4 w-[380px]">
            <h3 className="font-semibold mb-4">Wall &amp; Soil Parameters</h3>

            <Field label="Wall Height (H)"          field="wallHeight"       placeholder="e.g. 5"   unit="m" />
            <Field label="Unit Weight (γ)"           field="soilUnitWeight"   placeholder="e.g. 18"  unit="kN/m³" />
            <Field label="Friction Angle (φ)"        field="frictionAngle"    placeholder="e.g. 30"  unit="°" />
            <Field label="Cohesion (c)"              field="cohesion"         placeholder="e.g. 0"   unit="kPa" />
            <Field label="Surcharge (q)"             field="surcharge"        placeholder="e.g. 10"  unit="kPa" />
            <Field label="Water Table Depth"         field="waterTableDepth"  placeholder="blank = none" unit="m" />
          </div>

        </div>

        {/* ══════════════ SOLUTION DISPLAY ══════════════ */}
        {result && stepLines.length > 0 && (
          <div className="mt-10 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-[15px] font-semibold text-gray-800 tracking-wide">Step-by-Step Solution</h3>
            </div>
            <div className="px-6 py-5">
              <PDFExportButton
                lines={stepLines}
                resultRows={resultRows}
                title="Lateral Soil Pressure — Step-by-Step Solution"
                filename="retaining-wall-solution.pdf"
              />
              <StepRenderer lines={stepLines} />
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}