"use client";

import { useEffect, useRef } from "react";

// MathJax type declaration
declare global {
  interface Window {
    MathJax: {
      tex: { inlineMath: string[][]; displayMath: string[][] };
      options: { skipHtmlTags: string[] };
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
    };
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormulaBlockProps {
  label: string;
  formula: string;
}

interface StepProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FormulaBlock({ label, formula }: FormulaBlockProps) {
  return (
    <div style={styles.formulaBlock}>
      <div style={styles.formulaLabel}>{label}</div>
      <div
        style={styles.formula}
        dangerouslySetInnerHTML={{ __html: formula }}
      />
    </div>
  );
}

function Step({ number, title, children }: StepProps) {
  return (
    <div style={styles.section}>
      <div style={styles.stepHeader}>
        <div style={styles.stepNum}>{number}</div>
        <div style={styles.stepTitle}>{title}</div>
      </div>
      <div style={styles.stepBody}>{children}</div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Centroid() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Load MathJax and typeset on mount
  useEffect(() => {
    const configureMathJax = () => {
      window.MathJax = {
        tex: {
          inlineMath: [["$", "$"], ["\\(", "\\)"]],
          displayMath: [["$$", "$$"], ["\\[", "\\]"]],
        },
        options: {
          skipHtmlTags: ["script", "noscript", "style", "textarea", "pre"],
        },
      };
    };

    const loadAndTypeset = async () => {
      configureMathJax();

      if (!document.getElementById("mathjax-script")) {
        const script = document.createElement("script");
        script.id = "mathjax-script";
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-chtml.min.js";
        script.async = true;
        script.onload = () => {
          setTimeout(() => {
            window.MathJax?.typesetPromise?.([containerRef.current!]);
          }, 300);
        };
        document.head.appendChild(script);
      } else {
        await window.MathJax?.typesetPromise?.([containerRef.current!]);
      }
    };

    loadAndTypeset();
  }, []);

  return (
    <>
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,300&family=JetBrains+Mono:wght@400;600&display=swap"
        rel="stylesheet"
      />

      <div style={styles.page}>
        {/* Background grid */}
        <div style={styles.grid} />

        <div style={styles.container} ref={containerRef}>
          {/* ── Header ── */}
          <header style={styles.header}>
            <div style={styles.tag}>Engineering Mechanics</div>
            <h1 style={styles.h1}>
              Moment of Inertia of{" "}
              <span style={styles.h1Accent}>Composite Areas</span>
            </h1>
            <p style={styles.subtitle}>About the Centroidal Axis</p>
            <div style={styles.headerBar} />
          </header>

          {/* ── Intro ── */}
          <div style={styles.introCard}>
            <p>
              A <em style={styles.em}>Composite Area</em> is formed by
              combining simple parts or shapes such as rectangles, triangles,
              and circles.
            </p>
            <p style={{ marginTop: 12 }}>
              The <em style={styles.em}>Moment of Inertia</em> of a Composite
              Area is found by algebraically summing the moments of inertia of
              all parts, provided each component is evaluated about the{" "}
              <em style={styles.em}>same axis</em>.
            </p>
          </div>

          {/* ── Step 1 ── */}
          <Step number={1} title="Divide the Composite Area">
            <p style={styles.p}>
              Split the area into simple parts or shapes and choose a{" "}
              <em style={styles.em}>reference axis</em>.
            </p>
            <ul style={styles.ul}>
              {["Rectangle", "Triangle", "Circle"].map((shape) => (
                <li key={shape} style={styles.li}>
                  <span style={styles.liArrow}>→</span>
                  {shape}
                </li>
              ))}
            </ul>
          </Step>

          {/* ── Step 2 ── */}
          <Step number={2} title="Identify the Location of Centroidal Axis">
            <p style={styles.p}>
              For every labeled part, identify the{" "}
              <em style={styles.em}>Area (Aᵢ)</em> and determine its centroid{" "}
              <em style={styles.em}>(xᵢ, yᵢ)</em>.
            </p>
            <p style={styles.p}>
              Then compute the overall centroid of the composite:
            </p>
            <div style={styles.formulaRow}>
              <FormulaBlock
                label="x-centroid"
                formula={`$$\\bar{x} = \\frac{\\sum A_i x_i}{\\sum A_i}$$`}
              />
              <FormulaBlock
                label="y-centroid"
                formula={`$$\\bar{y} = \\frac{\\sum A_i y_i}{\\sum A_i}$$`}
              />
            </div>
          </Step>

          {/* ── Step 3 ── */}
          <Step number={3} title="Compute Centroidal MOI of Each Shape">
            <p style={styles.p}>
              For each shape, compute its{" "}
              <em style={styles.em}>centroidal Moment of Inertia</em> using
              standard formulas from reference tables.
            </p>
          </Step>

          {/* ── Step 4 ── */}
          <Step number={4} title="Apply Parallel Axis Theorem">
            <p style={styles.p}>
              Transfer each shape's MOI to the composite centroidal axis using:
            </p>
            <FormulaBlock
              label="Parallel Axis Theorem"
              formula={`$$I_i = \\bar{I}_{c_i} + A_i d^2$$`}
            />
            <p style={{ ...styles.p, marginTop: 12 }}>
              where <em style={styles.em}>d</em> is the perpendicular distance
              between the shape's centroidal axis and the reference axis.
            </p>
          </Step>

          {/* ── Step 5 ── */}
          <Step number={5} title="Summation of Moment of Inertia">
            <p style={styles.p}>Sum all contributions for each axis:</p>
            <div style={styles.formulaRow}>
              <FormulaBlock
                label="Horizontal Axis"
                formula={`$$I_x = \\sum\\left(\\bar{I}_{c_i} + A_i d_{y_i}^2\\right)$$`}
              />
              <FormulaBlock
                label="Vertical Axis"
                formula={`$$I_y = \\sum\\left(\\bar{I}_{c_i} + A_i d_{x_i}^2\\right)$$`}
              />
            </div>
            <div style={styles.note}>
              <span style={styles.noteIcon}>⚠️</span>
              <span>
                If there is a <strong>hole</strong> or cutout in the composite
                area, <strong>subtract</strong> its moment of inertia value
                instead of adding it.
              </span>
            </div>
          </Step>
        </div>
      </div>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const colors = {
  bg: "#0f1117",
  card: "#1e2336",
  border: "#2d3450",
  accent: "#5b8dee",
  accent2: "#e8a94b",
  text: "#e8eaf2",
  muted: "#8b91aa",
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: colors.bg,
    color: colors.text,
    fontFamily: "'Source Serif 4', serif",
    fontWeight: 300,
    lineHeight: 1.8,
    minHeight: "100vh",
    position: "relative",
  },
  grid: {
    position: "fixed",
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(91,141,238,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(91,141,238,0.03) 1px, transparent 1px)
    `,
    backgroundSize: "40px 40px",
    pointerEvents: "none",
    zIndex: 0,
  },
  container: {
    maxWidth: 860,
    margin: "0 auto",
    padding: "60px 32px 100px",
    position: "relative",
    zIndex: 1,
  },
  header: {
    textAlign: "center",
    marginBottom: 64,
    paddingBottom: 40,
    borderBottom: `1px solid ${colors.border}`,
  },
  headerBar: {
    width: 80,
    height: 3,
    background: `linear-gradient(90deg, ${colors.accent}, ${colors.accent2})`,
    margin: "24px auto 0",
    borderRadius: 2,
  },
  tag: {
    display: "inline-block",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.72rem",
    letterSpacing: "0.15em",
    color: colors.accent,
    background: "rgba(91,141,238,0.1)",
    border: "1px solid rgba(91,141,238,0.25)",
    padding: "4px 14px",
    borderRadius: 20,
    marginBottom: 20,
    textTransform: "uppercase",
  },
  h1: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
    lineHeight: 1.2,
    color: "#fff",
    letterSpacing: "-0.01em",
  },
  h1Accent: { color: colors.accent2 },
  subtitle: {
    marginTop: 16,
    color: colors.muted,
    fontSize: "1rem",
    fontStyle: "italic",
  },
  introCard: {
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderLeft: `4px solid ${colors.accent}`,
    borderRadius: 12,
    padding: "28px 32px",
    marginBottom: 48,
    fontSize: "1.05rem",
  },
  section: { marginBottom: 40 },
  stepHeader: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  stepNum: {
    flexShrink: 0,
    width: 42,
    height: 42,
    background: `linear-gradient(135deg, ${colors.accent}, #3d6fd4)`,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
    fontSize: "1rem",
    color: "#fff",
    boxShadow: "0 4px 16px rgba(91,141,238,0.3)",
  },
  stepTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "1.35rem",
    color: "#fff",
  },
  stepBody: {
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: "24px 28px",
    marginLeft: 58,
  },
  p: { marginBottom: 12 },
  ul: { listStyle: "none", padding: 0 },
  li: {
    padding: "6px 0 6px 24px",
    position: "relative",
    color: colors.text,
  },
  liArrow: {
    position: "absolute",
    left: 0,
    color: colors.accent,
    fontFamily: "'JetBrains Mono', monospace",
  },
  formulaRow: {
    display: "flex",
    gap: 32,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  formulaBlock: {
    flex: 1,
    minWidth: 180,
    background: "rgba(15,17,23,0.7)",
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    padding: "20px 24px",
    margin: "16px 0",
    textAlign: "center",
  },
  formulaLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.7rem",
    letterSpacing: "0.12em",
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  formula: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "1.05rem",
    color: colors.accent2,
    lineHeight: 2,
  },
  note: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    background: "rgba(232,169,75,0.07)",
    border: "1px solid rgba(232,169,75,0.25)",
    borderRadius: 10,
    padding: "16px 20px",
    marginTop: 16,
    fontSize: "0.95rem",
    color: "#d4c4a0",
  },
  noteIcon: { fontSize: "1.1rem", flexShrink: 0, marginTop: 2 },
  em: { color: colors.accent, fontStyle: "normal", fontWeight: 600 },
};

