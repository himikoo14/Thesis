"use client";

/**
 * ============================================================
 *  StepByStep.tsx
 */

import React, { useRef, ReactNode } from "react";
import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";

export type StepLine =
  | { type: "heading"; text: string }
  | { type: "math"; tex: string }
  | { type: "text"; text: string }
  | { type: "diagram"; label?: string; node: ReactNode };

export function fromLegacySteps(steps: string[]): StepLine[] {
  return steps.map((line) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("Step")) {
      return { type: "heading", text: trimmed };
    }

    const looksLikeMath =
      trimmed.startsWith("\\") ||
      trimmed.includes("=") ||
      trimmed.includes("^") ||
      trimmed.includes("_") ||
      trimmed.includes("\\frac") ||
      trimmed.includes("\\sqrt");

    if (looksLikeMath) {
      return { type: "math", tex: trimmed };
    }

    return { type: "text", text: trimmed };
  });
}

interface StepByStepSolutionProps {
  steps: StepLine[];
  title?: string;
  footer?: ReactNode;
  containerRef?: React.RefObject<HTMLDivElement>;
}

export function StepByStepSolution({
  steps,
  title = "Step-by-Step Solution",
  footer,
  containerRef,
}: StepByStepSolutionProps) {
  return (
    <div
      ref={containerRef}
      // FIX: added dark:bg-gray-800 dark:text-white
      className="w-full max-w-xl mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow p-6"
    >
      {/* ── Card header ── */}
      {/* FIX: added dark:text-white */}
      <h2 className="text-[20px] font-semibold mb-4 text-gray-900 dark:text-white">{title}</h2>

      {/* ── Steps ── */}
      <div className="space-y-4">
        {steps.map((line, i) => {
          switch (line.type) {
            case "heading":
              return (
                // FIX: added dark:text-white
                <p key={`${line.type}-${i}`} className="font-medium text-[18px] text-gray-900 dark:text-white">
                  {line.text}
                </p>
              );

            case "math":
              return (
                // FIX: added dark:text-white and dark invert filter for KaTeX SVGs
                <div key={`${line.type}-${i}`} className="text-[18px] overflow-x-auto py-1 text-gray-900 dark:text-white dark:[&_.katex]:text-white dark:[&_.katex-html]:text-white">
                  <BlockMath>{line.tex}</BlockMath>
                </div>
              );

            case "text":
              return (
                // FIX: added dark:text-gray-300
                <p key={`${line.type}-${i}`} className="text-[18px] text-gray-700 dark:text-gray-300">
                  {line.text}
                </p>
              );

            case "diagram":
              return (
                <div key={`${line.type}-${i}`} className="mt-6">
                  {line.label && (
                    // FIX: added dark:text-white
                    <p className="font-medium text-[18px] mb-2 dark:text-white">{line.label}</p>
                  )}
                  <div className="flex justify-center">{line.node}</div>
                </div>
              );

            default:
              return null;
          }
        })}
      </div>

      {footer && <div className="mt-8">{footer}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  useStepByStep hook                                                  */
/* ------------------------------------------------------------------ */

interface UseStepByStepOptions {
  title?: string;
  filename?: string;
}

interface UseStepByStepReturn {
  ref: React.RefObject<HTMLDivElement>;
  PDFButton: () => JSX.Element;
  StepByStepSolutionBound: (
    props: Omit<StepByStepSolutionProps, "containerRef" | "title"> & {
      title?: string;
    }
  ) => JSX.Element;
}

export function useStepByStep({
  title = "Step-by-Step Solution",
  filename = "solution.pdf",
}: UseStepByStepOptions = {}): UseStepByStepReturn {
  const ref = useRef<HTMLDivElement>(null);

  const PDFButton = () => (
    <button
      onClick={() => {
        if (typeof window !== "undefined") window.print();
      }}
      className="mb-4 px-4 py-2 bg-[#1848a0] text-white rounded-lg hover:bg-[#163d8a] transition text-[18px] font-medium"
    >
      Export PDF
    </button>
  );

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