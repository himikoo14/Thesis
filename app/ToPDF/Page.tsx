/**
 * ============================================================
 *  ToPDF/Page.tsx — MathJax SVG-rendered math PDF export
 *
 *  IMPROVEMENTS in this version:
 *   1. Replaced html2canvas with MathJax SVG output for perfect
 *      mathematical rendering with infinite scalability
 *   2. Fractions, radicals, and complex expressions render
 *      flawlessly without pixelation or alignment issues
 *   3. Smaller file sizes due to vector graphics
 * ============================================================
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { mathjax } from "mathjax-full/js/mathjax";
import { TeX } from "mathjax-full/js/input/tex";
import { SVG } from "mathjax-full/js/output/svg";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html";
import "katex/dist/katex.min.css";

/* ── CDN: jsPDF + svg2pdf ───────────────────────────────────── */
declare global {
  interface Window {
    jspdf: { jsPDF: new (opts: Record<string, unknown>) => any };
    svg2pdf: {
  svg2pdf: (
    element: SVGElement,
    pdf: any,
    options?: Record<string, unknown>
  ) => Promise<void>;
};
  }
}

const JSPDF_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
const SVG2PDF_URL =
  "https://cdn.jsdelivr.net/npm/svg2pdf.js@2.2.3/dist/svg2pdf.umd.min.js";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
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
const MM_PER_PX = 0.264583; // at 96 dpi

/* ─────────────────────────────────────────────────────────────
   MATHJAX SETUP
   ───────────────────────────────────────────────────────────── */
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const tex = new TeX({
  packages: {
    "[+]": ["ams", "newcommand", "boldsymbol", "color"],
  },
});
const svg = new SVG({
  fontCache: "none",
});
const mathDocument = mathjax.document("", { InputJax: tex, OutputJax: svg });

/* ─────────────────────────────────────────────────────────────
   FRACTION UPGRADE
   Forces ALL fractions to display-size for consistent rendering.
   ───────────────────────────────────────────────────────────── */
function upgradeFracs(tex: string): string {
  const hasFrac = tex.includes("\\frac");
  const alreadyDisplay = tex.includes("\\displaystyle");
  if (!hasFrac || alreadyDisplay) return tex;
  const upgraded = tex
    .replace(/\\tfrac(?=\{)/g, "\\dfrac")
    .replace(/(?<![dt])\\frac(?=\{)/g, "\\dfrac");
  return `\\displaystyle ${upgraded}`;
}

/* ─────────────────────────────────────────────────────────────
   LaTeX → SVG (MathJax)
   ───────────────────────────────────────────────────────────── */
function latexToSvg(
  texInput: string
): { svg: string; wMm: number; hMm: number } | null {
  try {
    const processedTex = upgradeFracs(texInput)
  .replace(
    /\\begin\{align\*\}([\s\S]*?)\\end\{align\*\}/g,
    (_, content) => `\\displaystyle\\begin{aligned}${content}\\end{aligned}`
  )
  .replace(
    /\\begin\{align\}([\s\S]*?)\\end\{align\}/g,
    (_, content) => `\\displaystyle\\begin{aligned}${content}\\end{aligned}`
  );

    // Convert LaTeX to MathJax node
    const node = mathDocument.convert(processedTex, {
      display: true,
      em: 16,
      ex: 8,
      containerWidth: 1200,
    });

    // Extract SVG string
    const svgString = adaptor.innerHTML(node);

    // Parse SVG to get dimensions
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
    const svgEl = svgDoc.querySelector("svg");

    if (!svgEl) return null;

    // Get viewBox or width/height attributes
    const viewBox = svgEl.getAttribute("viewBox");
    let width = 0;
    let height = 0;

    if (viewBox) {
      const [, , w, h] = viewBox.split(" ").map(Number);
      width = w;
      height = h;
    } else {
      width = parseFloat(svgEl.getAttribute("width") || "0");
      height = parseFloat(svgEl.getAttribute("height") || "0");
    }

    // Convert ex units to pixels (1ex ≈ 8px at default size)
    if (svgEl.getAttribute("width")?.includes("ex")) {
      width = parseFloat(svgEl.getAttribute("width") || "0") * 8;
    }
    if (svgEl.getAttribute("height")?.includes("ex")) {
      height = parseFloat(svgEl.getAttribute("height") || "0") * 8;
    }

    return {
      svg: svgString,
      wMm: width * MM_PER_PX,
      hMm: height * MM_PER_PX,
    };
  } catch (e) {
    console.warn("latexToSvg failed:", texInput, e);
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────
   SVG element → PNG  (for the FBD diagram - fallback)
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
      svgStr = svgStr.replace(
        "<svg",
        `<svg xmlns="http://www.w3.org/2000/svg"`
      );

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
   SVG string → data URL for embedding
   ───────────────────────────────────────────────────────────── */
function svgToDataUrl(svgString: string): string {
  const base64 = btoa(unescape(encodeURIComponent(svgString)));
  return `data:image/svg+xml;base64,${base64}`;
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

  let y = M;

  const guard = (need: number) => {
    if (y + need > MAXY) {
      pdf.addPage();
      y = M;
    }
  };

  /* helper — embed a MathJax SVG centred */
  const mathLine = async (tex: string) => {
    const r = latexToSvg(tex);
    if (!r) return;

    const MAX_WIDTH = CW * 0.9;
    let { wMm: width, hMm: height, svg: svgString } = r;

    if (width > MAX_WIDTH) {
      const scale = MAX_WIDTH / width;
      width *= scale;
      height *= scale;
    }

    guard(height + 6);
    const x = (PW - width) / 2;

    // Embed SVG as image using data URL
const parser = new DOMParser();
const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
const svgElement = svgDoc.documentElement as unknown as SVGSVGElement;

const svg2pdfFn =
  window.svg2pdf?.svg2pdf ||
  (window as any).svg2pdf ||
  (window as any).svg2pdf?.default;

if (!svg2pdfFn) {
  throw new Error("svg2pdf library failed to load");
}

const svgWidth =
  svgElement.viewBox?.baseVal?.width ||
  svgElement.width.baseVal.value ||
  1;

await svg2pdfFn(svgElement, pdf, {
  xOffset: x,
  yOffset: y,
  scale: width / svgWidth,
});

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
    // a plain bold label
    const textMatch = s.match(/^\\text\{(.+?)\}(.*)$/);
    if (textMatch) {
      const plainLabel = textMatch[1].trim();
      guard(8);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(24, 72, 160);
      pdf.text(plainLabel, M, y);
      y += 8;
      // render any remaining math on the same step
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

      guard(finalH + 24);

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
  const [status, setStatus] = useState<
    "idle" | "generating" | "done" | "error"
  >("idle");

  useEffect(() => {
    Promise.all([loadScript(JSPDF_URL), loadScript(SVG2PDF_URL)])
      .then(() => setLibReady(true))
      .catch(console.error);
  }, []);

  const handleExport = useCallback(async () => {
    if (!libReady || status === "generating") return;
    setStatus("generating");
    try {
      await writePDF({
        steps,
        resultRows,
        fbdRef,
        title,
        filename,
        includeDate,
      });
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
      style={{
        ...BTN,
        opacity: off ? 0.65 : 1,
        cursor: off ? "not-allowed" : "pointer",
      }}
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
  options: Partial<
    Omit<StepByStepPDFExportProps, "steps" | "resultRows" | "fbdRef">
  > = {}
) {
  const ref = useRef<HTMLElement | null>(null);
  const optsRef = useRef(options);
  useEffect(() => {
    optsRef.current = options;
  });

  const Button = useCallback(
    (
      extra: Pick<StepByStepPDFExportProps, "steps"> &
        Partial<StepByStepPDFExportProps>
    ) => <StepByStepPDFExport {...optsRef.current} {...extra} />,
    []
  );

  return [ref, Button] as const;
}