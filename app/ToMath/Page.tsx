/**
 * ============================================================
 *  MathStepByStep — KaTeX-rendered step-by-step solution
 *
 *  DROP-IN replacement for the existing <StepByStep> component.
 *
 *  DEPENDENCIES (CDN, no npm needed):
 *    • KaTeX v0.16  — cdn.jsdelivr.net/npm/katex
 *
 *  USAGE:
 *    Replace your existing <StepByStep steps={...} /> with:
 *    <MathStepByStep steps={buildMathSteps(result)} />
 *
 *    Also replace buildSteps() with buildMathSteps() in
 *    your Resultant2DCalculator component.
 * ============================================================
 */

"use client";

import { useEffect, useRef, useState } from "react";

/* ── Load KaTeX from CDN once ─────────────────────────────── */
const KATEX_CSS =
  "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
const KATEX_JS =
  "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js";

function loadKaTeX(): Promise<void> {
  return new Promise((resolve, reject) => {
    // CSS
    if (!document.querySelector(`link[href="${KATEX_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = KATEX_CSS;
      document.head.appendChild(link);
    }
    // JS
    if ((window as any).katex) { resolve(); return; }
    if (document.querySelector(`script[src="${KATEX_JS}"]`)) {
      // Already injected but may not have loaded yet
      const poll = setInterval(() => {
        if ((window as any).katex) { clearInterval(poll); resolve(); }
      }, 50);
      return;
    }
    const s = document.createElement("script");
    s.src = KATEX_JS;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("KaTeX failed to load"));
    document.head.appendChild(s);
  });
}

/* ── Inline KaTeX renderer ────────────────────────────────── */
function KaTeXSpan({ tex, display = false }: { tex: string; display?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current || !(window as any).katex) return;
    try {
      (window as any).katex.render(tex, ref.current, {
        displayMode: display,
        throwOnError: false,
        strict: false,
      });
    } catch {
      if (ref.current) ref.current.textContent = tex;
    }
  }, [tex, display]);

  return <span ref={ref} />;
}

/* ─────────────────────────────────────────────────────────────
   Data types
   ───────────────────────────────────────────────────────────── */

/** A single line inside a step — either plain text or a KaTeX expression */
export type MathLine =
  | { type: "text"; content: string }
  | { type: "math"; tex: string; display?: boolean }  // display = centered block
  | { type: "indent-math"; tex: string }              // indented block (= lines)
  | { type: "spacer" };                               // blank line between forces

export interface MathStep {
  label: string;
  lines: MathLine[];
}

/* ─────────────────────────────────────────────────────────────
   📦 COMPONENT: MathStepByStep
   ───────────────────────────────────────────────────────────── */
const STEP_STYLES = `
  .math-solution {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 15px;
    color: #1a202c;
    line-height: 1.9;
  }
  .math-step-label {
    font-family: 'Sora', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #1a202c;
    margin: 20px 0 6px;
  }
  .math-step-label:first-child { margin-top: 0; }
  .math-line-text {
    display: block;
    margin: 2px 0;
  }
  .math-line-display {
    display: flex;
    justify-content: center;
    margin: 6px 0;
  }
  .math-line-indent {
    display: flex;
    justify-content: center;
    margin: 1px 0;
  }
  .math-spacer { height: 14px; }

  /* KaTeX override — match the serif body font size */
  .math-solution .katex { font-size: 1em; }
  .math-solution .katex-display { margin: 0; }
`;

export function MathStepByStep({ steps }: { steps: MathStep[] }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadKaTeX().then(() => setReady(true)).catch(console.error);
  }, []);

  return (
    <>
      <style>{STEP_STYLES}</style>
      <div className="math-solution">
        {steps.map((step, si) => (
          <div key={si}>
            <div className="math-step-label">{step.label}</div>
            {step.lines.map((line, li) => {
              if (!ready) {
                // Fallback plain text while KaTeX loads
                if (line.type === "text") return <span key={li} className="math-line-text">{line.content}</span>;
                if (line.type === "spacer") return <div key={li} className="math-spacer" />;
                if (line.type === "math" || line.type === "indent-math")
                  return <span key={li} className="math-line-text">{line.tex}</span>;
                return null;
              }
              if (line.type === "text")
                return <span key={li} className="math-line-text">{line.content}</span>;
              if (line.type === "spacer")
                return <div key={li} className="math-spacer" />;
              if (line.type === "math")
                return (
                  <div key={li} className="math-line-display">
                    <KaTeXSpan tex={line.tex} display={line.display ?? true} />
                  </div>
                );
              if (line.type === "indent-math")
                return (
                  <div key={li} className="math-line-indent">
                    <KaTeXSpan tex={line.tex} display />
                  </div>
                );
              return null;
            })}
          </div>
        ))}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   🧮 buildMathSteps()
   Drop-in replacement for buildSteps() in Resultant2DCalculator.
   Produces typeset math matching the image style.
   ───────────────────────────────────────────────────────────── */

function fmt(n: number, d = 3): string {
  return parseFloat(n.toFixed(d)).toString();
}

interface ComponentRow {
  i: number;
  magnitude: number;
  angleDeg: number;
  fx: number;
  fy: number;
}

interface SolveResult {
  componentRows: ComponentRow[];
  sumFx: number;
  sumFy: number;
  R: number;
  theta: number;
}

export function buildMathSteps(res: SolveResult): MathStep[] {
  /* ── Step 1: resolve each force ── */
  const step1Lines: MathLine[] = [];

  res.componentRows.forEach((v, idx) => {
    if (idx > 0) step1Lines.push({ type: "spacer" });

    // "Force N: |F| = X kN, θ = Y°"
    step1Lines.push({
      type: "math",
      tex: `\\text{Force ${v.i + 1}: } |F| = ${fmt(v.magnitude)}\\text{ kN},\\; \\theta = ${fmt(v.angleDeg)}^\\circ`,
    });

    // Fx line
    step1Lines.push({
      type: "math",
      tex: `F_{x${v.i + 1}} = ${fmt(v.magnitude)}\\cos(${fmt(v.angleDeg)}^\\circ)`,
    });
    step1Lines.push({
      type: "indent-math",
      tex: `= ${fmt(v.fx)}\\text{ kN}`,
    });

    // Fy line
    step1Lines.push({
      type: "math",
      tex: `F_{y${v.i + 1}} = ${fmt(v.magnitude)}\\sin(${fmt(v.angleDeg)}^\\circ)`,
    });
    step1Lines.push({
      type: "indent-math",
      tex: `= ${fmt(v.fy)}\\text{ kN}`,
    });
  });

  /* ── Step 2: summation ── */
  const step2Lines: MathLine[] = [
    {
      type: "math",
      tex: `\\Sigma F_x = ${fmt(res.sumFx)}\\text{ kN}`,
    },
    {
      type: "math",
      tex: `\\Sigma F_y = ${fmt(res.sumFy)}\\text{ kN}`,
    },
  ];

  /* ── Step 3: resultant ── */
  const dir = res.theta >= 0 ? "\\circlearrowleft" : "\\circlearrowright";
  const step3Lines: MathLine[] = [
    {
      type: "math",
      tex: `R = \\sqrt{(\\Sigma F_x)^2 + (\\Sigma F_y)^2}`,
    },
    {
      type: "indent-math",
      tex: `= ${fmt(res.R)}\\text{ kN}`,
    },
    {
      type: "math",
      tex: `\\theta = \\tan^{-1}\\!\\left(\\frac{\\Sigma F_y}{\\Sigma F_x}\\right)`,
    },
    {
      type: "indent-math",
      tex: `= ${fmt(res.theta, 2)}^\\circ\\; ${dir} \\text{ from +x axis}`,
    },
  ];

  return [
    { label: "Step 1: Resolve each force into components:", lines: step1Lines },
    { label: "Step 2: Sum of components:",                 lines: step2Lines },
    { label: "Step 3: Resultant force:",                   lines: step3Lines },
  ];
}

/* ─────────────────────────────────────────────────────────────
   🗂️ INTEGRATION — replace in Resultant2DCalculator:

   1. Import at top of your calculator file:
        import { MathStepByStep, buildMathSteps } from "./MathStepByStep";

   2. Replace <StepByStep steps={buildSteps(result)} ... /> with:
        <MathStepByStep steps={buildMathSteps(result)} />

   3. The <ResultDisplay> and diagram stay unchanged.
   ───────────────────────────────────────────────────────────── */