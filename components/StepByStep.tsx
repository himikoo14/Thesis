"use client";

/**
 * ============================================================
 *  StepByStep.tsx
 *  Dedicated step-by-step solution renderer for all calculators.
 *
 *  USAGE (drop into any calculator):
 *
 *    import { StepByStepSolution, useStepByStep } from "@/components/StepByStep";
 *
 *    // 1. Define your steps anywhere (in your solver class or component):
 *    const steps: StepLine[] = [
 *      { type: "heading", text: "Step 1: Resolve each force into components:" },
 *      { type: "math",    tex: "F_{x1} = 10\\cos(30^\\circ) = 8.660\\,\\text{kN}" },
 *      { type: "text",    text: "All components resolved successfully." },
 *      { type: "diagram", node: <MyFBDComponent /> },
 *    ];
 *
 *    // 2. Use the hook to get ref + PDF button (same as useStepByStepPDF):
 *    const { ref, PDFButton, StepByStepSolution } = useStepByStep({
 *      title: "2D Resultant Force — Step-by-Step Solution",
 *      filename: "solution.pdf",
 *    });
 *
 *    // 3. Render:
 *    <StepByStepSolution steps={steps} title="Step-by-Step Solution" />
 *
 * ============================================================
 */

import React, { useRef, ReactNode } from "react";
import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

/**
 * A single line in the solution.
 *
 * | type      | what renders                                          |
 * |-----------|-------------------------------------------------------|
 * | "heading" | Bold step label  e.g. "Step 1: Resolve forces"       |
 * | "math"    | LaTeX via BlockMath                                   |
 * | "text"    | Plain paragraph (same 18px weight as heading but not bold) |
 * | "diagram" | Any ReactNode — FBD, SVG, chart, image, etc.         |
 */
export type StepLine =
  | { type: "heading"; text: string }
  | { type: "math"; tex: string }
  | { type: "text"; text: string }
  | { type: "diagram"; label?: string; node: ReactNode };

/* ------------------------------------------------------------------ */
/*  Helper: convert the OLD string[] format your solvers produce       */
/*  into the new StepLine[] format — zero refactor needed in solver.   */
/* ------------------------------------------------------------------ */

/**
 * Converts a legacy `string[]` (where "Step …" lines are headings and
 * everything else is treated as LaTeX) into `StepLine[]`.
 *
 * Drop-in bridge so your existing ForceSystem2D / 3D classes keep
 * returning `string[]` without any changes.
 *
 * Example:
 *   const lines = system.stepByStepSolution().steps;  // string[]
 *   const stepLines = fromLegacySteps(lines);          // StepLine[]
 */
export function fromLegacySteps(steps: string[]): StepLine[] {
  return steps.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("Step")) {
      return { type: "heading", text: trimmed };
    }
    return { type: "math", tex: trimmed };
  });
}

/* ------------------------------------------------------------------ */
/*  Core renderer                                                       */
/* ------------------------------------------------------------------ */

interface StepByStepSolutionProps {
  /** Array of StepLine items produced by your solver */
  steps: StepLine[];

  /** Section title shown at the top of the card. Default: "Step-by-Step Solution" */
  title?: string;

  /**
   * Optional extra content appended after the steps
   * (e.g. the ResultantFBD "Step 4" block you already have).
   */
  footer?: ReactNode;

  /** Optional ref forwarded to the outer div (for PDF capture, etc.) */
  containerRef?: React.RefObject<HTMLDivElement>;
}

/**
 * StepByStepSolution
 *
 * Renders a white `rounded-2xl shadow` card — identical to every other
 * card in your calculators — with numbered steps, LaTeX math, plain
 * text, and diagram slots.
 */
export function StepByStepSolution({
  steps,
  title = "Step-by-Step Solution",
  footer,
  containerRef,
}: StepByStepSolutionProps) {
  return (
    <div
      ref={containerRef}
      className="w-full max-w-xl mt-6 bg-white rounded-2xl shadow p-6"
    >
      {/* ── Card header ── */}
      <h2 className="text-[20px] font-semibold mb-4">{title}</h2>

      {/* ── Steps ── */}
      <div className="space-y-4">
        {steps.map((line, i) => {
          switch (line.type) {
            /* Bold step heading — "Step 1: …" */
            case "heading":
              return (
                <p key={i} className="font-medium text-[18px] text-gray-900">
                  {line.text}
                </p>
              );

            /* LaTeX math block */
            case "math":
              return (
                <div key={i} className="text-[18px] overflow-x-auto">
                  <BlockMath>{line.tex}</BlockMath>
                </div>
              );

            /* Plain descriptive text */
            case "text":
              return (
                <p key={i} className="text-[18px] text-gray-700">
                  {line.text}
                </p>
              );

            /* Diagram / FBD / SVG slot */
            case "diagram":
              return (
                <div key={i} className="mt-6">
                  {line.label && (
                    <p className="font-medium text-[18px] mb-2">{line.label}</p>
                  )}
                  <div className="flex justify-center">{line.node}</div>
                </div>
              );

            default:
              return null;
          }
        })}
      </div>

      {/* ── Optional footer (e.g. "Step 4: Final FBD") ── */}
      {footer && <div className="mt-8">{footer}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  useStepByStep hook                                                  */
/*  Mirrors the API of your existing useStepByStepPDF hook             */
/* ------------------------------------------------------------------ */

interface UseStepByStepOptions {
  /** Displayed in the exported PDF header */
  title?: string;
  /** PDF file name */
  filename?: string;
}

interface UseStepByStepReturn {
  /** Attach to the div you want captured in the PDF */
  ref: React.RefObject<HTMLDivElement>;
  /**
   * A ready-to-render PDF export button.
   * Place it inside the solution area, same as your existing PDFButton.
   */
  PDFButton: () => JSX.Element;
  /**
   * Pre-bound StepByStepSolution — just pass `steps` and optionally
   * `footer`. The ref and title are already wired in.
   */
  StepByStepSolutionBound: (
    props: Omit<StepByStepSolutionProps, "containerRef" | "title"> & {
      title?: string;
    }
  ) => JSX.Element;
}

/**
 * useStepByStep
 *
 * Convenience hook that wires together:
 *  - a ref for PDF capture
 *  - a PDF export button (delegates to your existing useStepByStepPDF if available,
 *    otherwise falls back to a window.print() stub)
 *  - a pre-bound StepByStepSolution component
 *
 * Drop-in replacement for:
 *   const [solutionRef, PDFButton] = useStepByStepPDF({ title, filename });
 *
 * Become:
 *   const { ref, PDFButton, StepByStepSolutionBound } = useStepByStep({ title, filename });
 */
export function useStepByStep({
  title = "Step-by-Step Solution",
  filename = "solution.pdf",
}: UseStepByStepOptions = {}): UseStepByStepReturn {
  const ref = useRef<HTMLDivElement>(null);

  /* PDF button — delegates to your useStepByStepPDF hook when available.
     The stub below is a safe fallback (window.print) so this file compiles
     standalone without the PDF hook as a hard dependency.             */
  const PDFButton = () => (
    <button
      onClick={() => {
        /* Replace this body with your actual PDF logic if needed,
           or simply keep using useStepByStepPDF alongside this component. */
        if (typeof window !== "undefined") window.print();
      }}
      className="mb-4 px-4 py-2 bg-[#1848a0] text-white rounded-lg hover:bg-[#163d8a] transition text-[18px] font-medium"
    >
      Export PDF
    </button>
  );

  /* Pre-bound component — title + ref already set */
  const StepByStepSolutionBound = ({
    steps,
    footer,
    title: overrideTitle,
  }: Omit<StepByStepSolutionProps, "containerRef" | "title"> & {
    title?: string;
  }) => (
    <StepByStepSolution
      steps={steps}
      title={overrideTitle ?? title}
      footer={footer}
      containerRef={ref}
    />
  );

  return { ref, PDFButton, StepByStepSolutionBound };
}

/* ------------------------------------------------------------------ */
/*  INTEGRATION EXAMPLES (reference — not rendered)                    */
/* ------------------------------------------------------------------ */

/*
  ── EXAMPLE A: With your existing string[] steps (zero changes to solver) ──

  import { fromLegacySteps, useStepByStep } from "@/components/StepByStep";

  const { ref, PDFButton, StepByStepSolutionBound } = useStepByStep({
    title: "2D Resultant Force — Step-by-Step Solution",
    filename: "resultant-2d-solution.pdf",
  });

  // Inside your JSX, replace the existing step-by-step block:
  {result && (
    <div ref={ref}>
      <PDFButton />
      <StepByStepSolutionBound
        steps={fromLegacySteps(result.steps)}
        footer={
          <div>
            <p className="font-medium text-[18px] mb-2">
              Step 4: Final Free Body Diagram (All Forces + Resultant)
            </p>
            <ResultantFBD forces={forces} result={result} />
          </div>
        }
      />
    </div>
  )}


  ── EXAMPLE B: With StepLine[] built directly in the solver ──

  stepByStepSolution(): { steps: StepLine[]; ... } {
    const steps: StepLine[] = [];

    steps.push({ type: "heading", text: "Step 1: Resolve each force into components:" });

    this.vectors.forEach((v, i) => {
      steps.push({ type: "math", tex: `|F|=${v.magnitude}\\,\\text{kN},\\; \\theta=${v.angleDeg}^\\circ` });
      steps.push({
        type: "math",
        tex: `\\begin{align*}
          F_{x${i+1}} &= ${v.magnitude}\\cos(${v.angleDeg}^\\circ) = ${v.fx.toFixed(3)}\\,\\text{kN} \\\\
          F_{y${i+1}} &= ${v.magnitude}\\sin(${v.angleDeg}^\\circ) = ${v.fy.toFixed(3)}\\,\\text{kN}
        \\end{align*}`,
      });
    });

    steps.push({ type: "heading", text: "Step 2: Sum of components:" });
    // ... etc.

    steps.push({
      type: "diagram",
      label: "Step 4: Final Free Body Diagram (All Forces + Resultant)",
      node: <ResultantFBD forces={...} result={...} />,
    });

    return { steps, sumFx, sumFy, R, theta };
  }


  ── EXAMPLE C: 3D solver (same pattern) ──

  const { ref, PDFButton, StepByStepSolutionBound } = useStepByStep({
    title: "3D Resultant Force — Step-by-Step Solution",
    filename: "resultant-3d-solution.pdf",
  });

  {result && (
    <div ref={ref}>
      <PDFButton />
      <StepByStepSolutionBound steps={fromLegacySteps(result.steps)} />
    </div>
  )}
*/