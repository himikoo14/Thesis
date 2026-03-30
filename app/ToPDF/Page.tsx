/**
 * ============================================================
 *  ToPDF/Page.tsx — KaTeX-rendered math PDF export
 *
 *  FIXES in this version:
 *   1. Fraction bar size — nested \frac inside \tan^{-1}(…)
 *      renders at textstyle (small). We pre-process every LaTeX
 *      string and replace \frac with \dfrac so fractions are
 *      always display-size regardless of nesting depth.
 *   2. FBD legend overlap — the two legend items are now drawn
 *      on SEPARATE lines (item 1 then item 2), each individually
 *      centred, so there is zero risk of them colliding.
 *   3. STRUCTURAL FIX — latexToSvg was accidentally nested
 *      inside latexToPng, breaking both functions. They are now
 *      properly separated as top-level functions.
 * ============================================================
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import html2canvas from "html2canvas";

/* ── CDN: jsPDF ───────────────────────────────────────────── */
declare global {
  interface Window {
    jspdf: { jsPDF: new (opts: Record<string, unknown>) => any };
  }
}

const JSPDF_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

/* ─────────────────────────────────────────────────────────────
   TYPES
   ───────────────────────────────────────────────────────────── */
/** One row in the Results Summary table — any label/value pair. */
export type ResultRow = { label: string; value: string };

export interface StepByStepPDFExportProps {
  steps: string[];
  resultRows?: ResultRow[];
  fbdRef?: React.RefObject<SVGSVGElement | null>;
  filename?: string;
  label?: string;
  title?: string;
  includeDate?: boolean;
}

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
   ───────────────────────────────────────────────────────────── */
const MM_PER_PX = 0.264583;  // at 96 dpi
const RENDER_SCALE = 3;       // render @3× for crispness

/* ─────────────────────────────────────────────────────────────
   FRACTION UPGRADE
   Forces ALL fractions in an expression to display-size.
   ───────────────────────────────────────────────────────────── */
function upgradeFracs(tex: string): string {
  const hasFrac = tex.includes("\\frac");
  const alreadyDisplay = tex.includes("\\displaystyle");
  if (!hasFrac || alreadyDisplay) return tex;
  const upgraded = tex
    .replace(/\\tfrac(?=\{)/g, "\\dfrac")
    .replace(/(?<![dt])\\frac(?=\{)/g, "\\dfrac");
  return `{\\displaystyle ${upgraded}}`;
}

/* ─────────────────────────────────────────────────────────────
   KaTeX → PNG
   ───────────────────────────────────────────────────────────── */
async function latexToPng(
  tex: string
): Promise<{ dataUrl: string; wMm: number; hMm: number } | null> {
  try {
    const processedTex = upgradeFracs(tex);

    /* outer wrapper: absolutely positioned off-screen */
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      background: #ffffff;
      color: #000000;
      padding: 0;
      margin: 0;
      display: inline-block;
    `;

    /* inner span: KaTeX target, no extra spacing */
    const inner = document.createElement("span");
    inner.style.cssText = "display:inline-block;padding:10px 14px;";
    wrapper.appendChild(inner);
    document.body.appendChild(wrapper);

    katex.render(processedTex, inner, {
      displayMode: true,
      throwOnError: false,
      output: "html",
    });

    /* tight bounding box of the rendered math */
    const targetEl =
      (inner.querySelector(".katex-html") as HTMLElement) ||
      (inner.querySelector(".katex") as HTMLElement) ||
      inner;

    const innerRect = targetEl.getBoundingClientRect();
    const wrapRect = wrapper.getBoundingClientRect();

    const offsetLeft = innerRect.left - wrapRect.left;
    const offsetTop = innerRect.top - wrapRect.top;

    const canvas = await html2canvas(wrapper, {
      backgroundColor: "#ffffff",
      scale: RENDER_SCALE,
      useCORS: true,
      logging: false,
    });

    document.body.removeChild(wrapper);

    /* CROP: strip surrounding whitespace so math is flush */
    const PAD = 18;
    const EXTRA_LEFT = -8;

    const sx = Math.max(
      0,
      Math.round(offsetLeft * RENDER_SCALE) - PAD - EXTRA_LEFT
    );
    const sy = 0; // do not vertically crop — keep full KaTeX height
    const sw =
      Math.round(innerRect.width * RENDER_SCALE) + PAD * 2 + EXTRA_LEFT;
    const sh = canvas.height; // keep full canvas height

    const cropped = document.createElement("canvas");
    cropped.width = sw;
    cropped.height = sh;

    const ctx = cropped.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

    return {
      dataUrl: cropped.toDataURL("image/png"),
      wMm: (cropped.width / RENDER_SCALE) * MM_PER_PX,
      hMm: (cropped.height / RENDER_SCALE) * MM_PER_PX,
    };
  } catch (e) {
    console.warn("latexToPng failed:", tex, e);
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────
   KaTeX → SVG  (alternative — not used in writePDF but exported
   for external callers who may prefer vector output)
   ───────────────────────────────────────────────────────────── */
export async function latexToSvg(
  tex: string
): Promise<{ svg: string; wMm: number; hMm: number } | null> {
  try {
    const processedTex = upgradeFracs(tex);

    const htmlMarkup = katex.renderToString(processedTex, {
      displayMode: true,
      throwOnError: false,
    });

    const wrapper = document.createElement("div");
    wrapper.innerHTML = htmlMarkup;
    const svg = wrapper.querySelector("svg");

    if (!svg) return null;

    const width = svg.viewBox.baseVal.width;
    const height = svg.viewBox.baseVal.height;

    return {
      svg: new XMLSerializer().serializeToString(svg),
      wMm: width * MM_PER_PX,
      hMm: height * MM_PER_PX,
    };
  } catch (e) {
    console.warn("latexToSvg failed:", tex, e);
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────
   SVG element → PNG  (for the FBD diagram)
   ───────────────────────────────────────────────────────────── */
async function svgToPng(
  svgEl: SVGSVGElement,
  scale = 2
): Promise<{ dataUrl: string; wMm: number; hMm: number } | null> {
  try {
    const w = svgEl.width.baseVal.value || 300;
    const h = svgEl.height.baseVal.value || 300;

    let svgStr = new XMLSerializer().serializeToString(svgEl);
    if (!svgStr.includes("xmlns="))
      svgStr = svgStr.replace("<svg", `<svg xmlns="http://www.w3.org/2000/svg"`);

    const canvas = document.createElement("canvas");
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    await new Promise<void>((res, rej) => {
      const img = new Image();
      const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        res();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        rej(new Error("SVG image load failed"));
      };
      img.src = url;
    });

    return {
      dataUrl: canvas.toDataURL("image/png"),
      wMm: w * MM_PER_PX,
      hMm: h * MM_PER_PX,
    };
  } catch (e) {
    console.warn("svgToPng failed:", e);
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────
   WRITE PDF
   ───────────────────────────────────────────────────────────── */
async function writePDF(p: {
  steps: string[];
  resultRows?: ResultRow[];
  fbdRef?: React.RefObject<SVGSVGElement | null>;
  title: string;
  filename: string;
  includeDate: boolean;
}) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const PW = 210;
  const PH = 297;
  const M = 18;
  const CW = PW - M * 2;
  const MID = PW / 2;
  const MAXY = PH - 22;

  let y = 0;

  const guard = (need: number) => {
    if (y + need > MAXY) { pdf.addPage(); y = M; }
  };

  /* helper — embed a KaTeX image centred */
  const mathLine = async (tex: string) => {
    const r = await latexToPng(tex);
    if (!r) return;

    const MAX_WIDTH = CW * 0.9;
    let { wMm: width, hMm: height } = r;

    if (width > MAX_WIDTH) {
      const scale = MAX_WIDTH / width;
      width *= scale;
      height *= scale;
    }

    guard(height + 6);
    const x = (PW - width) / 2;
    pdf.addImage(r.dataUrl, "PNG", x, y, width, height);
    y += height + 6;
  };

  /* ━━━━━━━━━━━━━━━━ HEADER ━━━━━━━━━━━━━━━━ */
  pdf.setFillColor(24, 72, 160);
  pdf.rect(0, 0, PW, 10, "F");
  y = 18;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(24, 72, 160);
  pdf.text(p.title, M, y);
  y += 6;

  if (p.includeDate) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      `Generated: ${new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
      M,
      y
    );
    y += 5;
  }

  pdf.setDrawColor(220, 228, 245);
  pdf.setLineWidth(0.4);
  pdf.line(M, y, PW - M, y);
  y += 9;

  /* ━━━━━━━━━━━━━━━━ STEP-BY-STEP SECTION ━━━━━━━━━━━━━━━━ */
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(20, 20, 20);
  pdf.text("Step-by-Step Solution", M, y);
  y += 10;

  // DEBUG — remove after confirming step strings
  console.log("[PDF steps]", p.steps.map((s, i) => `[${i}] ${s}`).join("\n"));

  for (const raw of p.steps) {
    const s = raw.trim();

    // "Step N: …" — blue bold heading
    if (s.startsWith("Step")) {
      guard(10);
      y += 2;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(24, 72, 160);
      pdf.text(s, M, y);
      y += 14;
      continue;
    }

    // "\text{Force N: …}" — strip the \text{} wrapper and render as
    // a plain bold label instead of going through KaTeX/html2canvas,
    // which corrupts mixed text+math lines like this.
    const textMatch = s.match(/^\\text\{(.+?)\}(.*)$/);
    if (textMatch) {
      const plainLabel = textMatch[1].trim();
      guard(8);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(24, 72, 160);
      pdf.text(plainLabel, M, y);
      y += 8;
      // render any remaining math on the same step (after the \text{} part)
      const rest = textMatch[2].trim();
      if (rest) await mathLine(rest);
      continue;
    }

    await mathLine(s);
    y += 2;
  }

  /* ━━━━━━━━━━━━━━━━ RESULTS SECTION ━━━━━━━━━━━━━━━━ */
  if (p.resultRows && p.resultRows.length > 0) {
    guard(20 + p.resultRows.length * 11);
    y += 4;

    pdf.setDrawColor(220, 228, 245);
    pdf.setLineWidth(0.4);
    pdf.line(M, y, PW - M, y);
    y += 8;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(20, 20, 20);
    pdf.text("Results Summary", M, y);
    y += 9;

    for (const { label: lbl, value } of p.resultRows) {
      guard(11);
      pdf.setFillColor(245, 248, 255);
      pdf.roundedRect(M, y - 5, CW, 9, 2, 2, "F");

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(50, 50, 50);
      pdf.text(lbl, M + 4, y);

      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(24, 72, 160);
      pdf.text(value, PW - M - 4, y, { align: "right" });
      y += 11;
    }
  }

  /* ━━━━━━━━━━━━━━━━ FBD DIAGRAM SECTION ━━━━━━━━━━━━━━━━ */
  if (p.fbdRef?.current) {
    guard(90);
    y += 4;

    pdf.setDrawColor(220, 228, 245);
    pdf.setLineWidth(0.4);
    pdf.line(M, y, PW - M, y);
    y += 8;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(20, 20, 20);
    pdf.text("Step 4: Final Free Body Diagram (All Forces + Resultant)", M, y);
    y += 8;

    const fbd = await svgToPng(p.fbdRef.current, 2);
    if (fbd) {
      const maxW = CW * 0.55;
      const scale = Math.min(1, maxW / fbd.wMm);
      const finalW = fbd.wMm * scale;
      const finalH = fbd.hMm * scale;

      guard(finalH + 24); // extra room for two-line legend

      pdf.addImage(fbd.dataUrl, "PNG", (PW - finalW) / 2, y, finalW, finalH);
      y += finalH + 6;

      /* ─────────────────────────────────────────────────────
         FBD LEGEND: two separate centred lines
      ──────────────────────────────────────────────────────── */
      const DOT_R = 1.5;
      const DOT_D = DOT_R * 2;
      const DOT_GAP = 2.5;
      const LINE_H = 6;
      const LEGEND_FS = 9;

      pdf.setFontSize(LEGEND_FS);
      pdf.setFont("helvetica", "normal");

      // line 1: blue dot + "Individual forces (F₁, F₂, …)"
      const label1 = "Individual forces (F\u2081, F\u2082, \u2026)";
      const tw1 = pdf.getTextWidth(label1);
      const row1W = DOT_D + DOT_GAP + tw1;
      const x1 = MID - row1W / 2;

      pdf.setFillColor(24, 72, 160);
      pdf.circle(x1 + DOT_R, y - DOT_R + 0.5, DOT_R, "F");
      pdf.setTextColor(24, 72, 160);
      pdf.text(label1, x1 + DOT_D + DOT_GAP, y);

      y += LINE_H;

      // line 2: green dot + "Resultant (R)"
      const label2 = "Resultant (R)";
      const tw2 = pdf.getTextWidth(label2);
      const row2W = DOT_D + DOT_GAP + tw2;
      const x2 = MID - row2W / 2;

      pdf.setFillColor(0, 153, 0);
      pdf.circle(x2 + DOT_R, y - DOT_R + 0.5, DOT_R, "F");
      pdf.setTextColor(0, 153, 0);
      pdf.text(label2, x2 + DOT_D + DOT_GAP, y);

      y += 7;
    }
  }

  /* ━━━━━━━━━━━━━━━━ FOOTER on every page ━━━━━━━━━━━━━━━━ */
  const total = pdf.internal.getNumberOfPages();
  for (let pg = 1; pg <= total; pg++) {
    pdf.setPage(pg);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Page ${pg} of ${total}`, PW - M, PH - 8, { align: "right" });
    pdf.setFillColor(24, 72, 160);
    pdf.rect(0, PH - 4, PW, 4, "F");
  }

  pdf.save(p.filename);
}

/* ─────────────────────────────────────────────────────────────
   BUTTON STYLES
   ───────────────────────────────────────────────────────────── */
const BTN: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  width: "100%",
  padding: "14px",
  border: "none",
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 600,
  transition: "all 0.2s",
  background: "linear-gradient(135deg, #0f2d6b, #1848a0)",
  color: "#fff",
  boxShadow: "0 4px 14px rgba(24,72,160,0.25)",
  marginTop: 8,
};

/* ─────────────────────────────────────────────────────────────
   📦 COMPONENT: StepByStepPDFExport
   ───────────────────────────────────────────────────────────── */
export function StepByStepPDFExport({
  steps,
  resultRows = [],
  fbdRef,
  filename = "solution.pdf",
  label = "Download Solution as PDF",
  title = "Step-by-Step Solution",
  includeDate = true,
}: StepByStepPDFExportProps) {
  const [libReady, setLibReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");

  useEffect(() => {
    loadScript(JSPDF_URL).then(() => setLibReady(true)).catch(console.error);
  }, []);

  const handleExport = useCallback(async () => {
    if (!libReady || status === "generating") return;
    setStatus("generating");
    try {
      await writePDF({ steps, resultRows, fbdRef, title, filename, includeDate });
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      console.error("PDF export failed:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [libReady, status, steps, resultRows, fbdRef, title, filename, includeDate]);

  const off = !libReady || status === "generating";
  const labels: Record<typeof status, string> = {
    idle: `⬇ ${label}`,
    generating: "⏳ Generating PDF…",
    done: "✅ Downloaded!",
    error: "❌ Export failed — try again",
  };

  return (
    <button
      className="no-print"
      style={{ ...BTN, opacity: off ? 0.65 : 1, cursor: off ? "not-allowed" : "pointer" }}
      onClick={handleExport}
      disabled={off}
    >
      {labels[status]}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   📦 HOOK: useStepByStepPDF
   ───────────────────────────────────────────────────────────── */
export function useStepByStepPDF(
  options: Partial<Omit<StepByStepPDFExportProps, "steps" | "resultRows" | "fbdRef">> = {}
) {
  const ref = useRef<HTMLElement | null>(null);
  const optsRef = useRef(options);
  useEffect(() => { optsRef.current = options; });

  const Button = useCallback(
    (extra: Pick<StepByStepPDFExportProps, "steps"> & Partial<StepByStepPDFExportProps>) => (
      <StepByStepPDFExport {...optsRef.current} {...extra} />
    ),
    []
  );

  return [ref, Button] as const;
}