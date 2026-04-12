"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import {
  solveTruss,
  fmt,
  fmtN,
  nodeLabel,
  type Support,
  type Joint,
  type Member,
  type Force,
  type Solution,
  type StepLine,
} from "../../lib/truss";

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

function KaTeXInline({ tex, display = false }: { tex: string; display?: boolean }) {
  const [html, setHtml] = useState("");
  const ready = useKatexScript();
  useEffect(() => {
    if (!ready || !window.katex) return;
    try { setHtml(window.katex.renderToString(tex, { displayMode: display, throwOnError: false })); }
    catch { setHtml(tex); }
  }, [tex, display, ready]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
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

/* ===================== LOCAL TYPES ===================== */
type GenericObject = Record<string, any>;

type FBDArrow = {
  angle: number;
  color: string;
  label: string;
  magnitude: number;
  dashed: boolean;
};

/* ── Arrow marker helper ─────────────────────────────────────────────────── */
function ArrowMarker({ id, color }: { id: string; color: string }) {
  return (
    <marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L7,3 L0,6 Z" fill={color} />
    </marker>
  );
}

function Arrow({ x1, y1, x2, y2, color, markerId, label, labelOffset = { dx: 6, dy: -4 }, fontSize = 10 }: {
  x1: number; y1: number; x2: number; y2: number;
  color: string; markerId: string;
  label?: string; labelOffset?: { dx: number; dy: number }; fontSize?: number;
}) {
  const dx = x2 - x1; const dy = y2 - y1;
  const L = Math.hypot(dx, dy) || 1;
  const ex = x2 - (dx / L); const ey = y2 - (dy / L);
  return (
    <g>
      <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={color} strokeWidth={2} markerEnd={`url(#${markerId})`} />
      {label && <text x={x2 + labelOffset.dx} y={y2 + labelOffset.dy} fontSize={fontSize} fill={color} fontWeight="600">{label}</text>}
    </g>
  );
}

/* ================================================================
   STEP-BY-STEP RENDERER
================================================================ */
function TrussStepRenderer({
  lines, solution, members, allNodes, supports, forces,
}: {
  lines: StepLine[];
  solution: Solution;
  members: Member[];
  allNodes: Joint[];
  supports: Support[];
  forces: Force[];
}) {
  return (
    <div style={{ lineHeight: 1.8 }}>
      {lines.map((line, idx) => {
        switch (line.kind) {
          case "heading":
            return <p key={idx} style={{ fontWeight: 700, fontSize: 16, color: "#1848a0", marginTop: 16, marginBottom: 2 }}>{line.text}</p>;
          case "subheading":
            return <p key={idx} style={{ fontWeight: 600, fontSize: 14, color: "#374151", marginTop: 10, marginBottom: 2 }}>{line.text}</p>;
          case "text":
            return <p key={idx} style={{ color: "#555", margin: "2px 0", fontSize: 14 }}>{line.text}</p>;
          case "eq":
            return <KTX key={idx} tex={line.tex} />;
          case "result":
            return (
              <div key={idx} style={{ background: "#f0f4ff", borderLeft: "3px solid #1848a0", borderRadius: 6, padding: "4px 12px", margin: "4px 0" }}>
                <KTX tex={line.tex} />
              </div>
            );
          case "warn":
            return <p key={idx} style={{ color: "#dc2626", fontWeight: 500, margin: "4px 0" }}>{line.text}</p>;
          case "spacer":
            return <div key={idx} style={{ height: 8 }} />;
          case "jointFBD":
            return (
              <JointFBD
                key={idx}
                jointIdx={line.joint}
                connectedMembers={line.members}
                solvedMemberForces={solution.memberForces}
                members={members}
                allNodes={allNodes}
                solution={solution}
                forces={forces}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

/* ================================================================
   PDF EXPORT
================================================================ */
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
  const out: string[] = [];
  for (const line of lines) {
    switch (line.kind) {
      case "heading": out.push(line.text); break;
      case "subheading": out.push(line.text); break;
      case "text": out.push(line.text); break;
      case "eq": out.push(line.tex); break;
      case "result": out.push(line.tex); break;
      case "warn": out.push(line.text); break;
      case "jointFBD": out.push(`[FBD — Joint ${String.fromCharCode(65 + line.joint)} (see diagram above)]`); break;
      case "spacer": break;
    }
  }
  return out;
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
    if (s.startsWith("Step")) {
      guard(12); y += 2;
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(24, 72, 160);
      pdf.text(s, M, y); y += 14; continue;
    }
    if (s.startsWith("[FBD")) {
      guard(8);
      pdf.setFont("helvetica", "italic"); pdf.setFontSize(10); pdf.setTextColor(120, 120, 120);
      pdf.text(s, M, y); y += 8; continue;
    }
    if (s.includes("\\")) { await mathLine(s); y += 2; continue; }
    guard(8);
    const isWarn = s.startsWith("✘") || s.startsWith("⚠");
    pdf.setFont("helvetica", isWarn ? "bold" : "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(isWarn ? 180 : 50, isWarn ? 30 : 50, isWarn ? 30 : 50);
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

/* ===================== MAIN FBD ===================== */
function MainFBD({ numericNodes, members, supports, forces, solution, allNodes }: {
  numericNodes: { x: number; y: number }[];
  members: Member[];
  supports: Support[];
  forces: Force[];
  solution: Solution | null;
  allNodes: Joint[];
}) {
  const W = 560, H = 420, PAD = 56;
  const xs = numericNodes.map(n => n.x); const ys = numericNodes.map(n => n.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1; const rangeY = maxY - minY || 1;
  const scale = Math.min((W - 2 * PAD) / rangeX, (H - 2 * PAD) / rangeY);
  const offX = (W - rangeX * scale) / 2 - minX * scale;
  const offY = (H - rangeY * scale) / 2 - minY * scale;
  const sx = (x: number) => x * scale + offX;
  const sy = (y: number) => H - (y * scale + offY);
  const arrowLen = Math.max(40, Math.min(scale * 0.6, 60));
  const tol = 1e-6;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <defs>
        <ArrowMarker id="main-black" color="#111" />
        <ArrowMarker id="main-red" color="#dc2626" />
        <ArrowMarker id="main-green" color="#16a34a" />
        <ArrowMarker id="main-blue" color="#2563eb" />
      </defs>
      <line x1={PAD} y1={sy(0)} x2={W - PAD} y2={sy(0)} stroke="#d1d5db" strokeWidth={1} />
      <line x1={sx(0)} y1={PAD} x2={sx(0)} y2={H - PAD} stroke="#d1d5db" strokeWidth={1} />

      {members.map((m, i) => {
        const n1 = numericNodes[m.start]; const n2 = numericNodes[m.end];
        if (!n1 || !n2) return null;
        const force = solution?.memberForces[i];
        const color = force == null ? "#374151" : Math.abs(force) < tol ? "#9ca3af" : force > 0 ? "#2563eb" : "#dc2626";
        const mx = (sx(n1.x) + sx(n2.x)) / 2; const my = (sy(n1.y) + sy(n2.y)) / 2;
        return (
          <g key={`m-${i}`}>
            <line x1={sx(n1.x)} y1={sy(n1.y)} x2={sx(n2.x)} y2={sy(n2.y)} stroke={color} strokeWidth={2.5} />
            <text x={mx} y={my - 6} textAnchor="middle" fontSize={10} fill={color} fontWeight="600">{nodeLabel(m.start)}{nodeLabel(m.end)}</text>
            {force != null && (
              <text x={mx} y={my + 14} textAnchor="middle" fontSize={9} fill={color}>
                {Math.abs(force) < tol ? "0" : `${force > 0 ? "+" : ""}${fmt(force)} kN`}
              </text>
            )}
          </g>
        );
      })}

      {numericNodes.map((n, i) => (
        <g key={`j-${i}`}>
          <circle cx={sx(n.x)} cy={sy(n.y)} r={6} fill="white" stroke="#1e40af" strokeWidth={2} />
          <text x={sx(n.x)} y={sy(n.y) - 12} textAnchor="middle" fontSize={12} fontWeight="700" fill="#1e3a8a">{nodeLabel(i)}</text>
        </g>
      ))}

      {supports.map((s, i) => {
        const n = numericNodes[i]; if (!n) return null;
        const cx = sx(n.x); const cy = sy(n.y);
        return s.type === "Pinned" ? (
          <g key={`sup-${i}`}>
            <polygon points={`${cx},${cy} ${cx - 10},${cy + 14} ${cx + 10},${cy + 14}`} fill="#6b7280" stroke="#374151" strokeWidth={1} />
            <line x1={cx - 12} y1={cy + 14} x2={cx + 12} y2={cy + 14} stroke="#374151" strokeWidth={2} />
          </g>
        ) : (
          <g key={`sup-${i}`}>
            <polygon points={`${cx},${cy} ${cx - 10},${cy + 14} ${cx + 10},${cy + 14}`} fill="#9ca3af" stroke="#6b7280" strokeWidth={1} />
            <circle cx={cx - 7} cy={cy + 17} r={3} fill="none" stroke="#6b7280" strokeWidth={1.5} />
            <circle cx={cx} cy={cy + 17} r={3} fill="none" stroke="#6b7280" strokeWidth={1.5} />
            <circle cx={cx + 7} cy={cy + 17} r={3} fill="none" stroke="#6b7280" strokeWidth={1.5} />
          </g>
        );
      })}

      {forces.map((f, i) => {
        const n = numericNodes[f.Joint]; if (!n) return null;
        const mag = parseFloat(f.magnitude || "0"); if (!mag) return null;
        const ang = (parseFloat(f.angle || "0") * Math.PI) / 180;
        const cosA = Math.cos(ang);
        const sinA = Math.sin(ang);
        const ex = sx(n.x) + arrowLen * cosA;
        const ey = sy(n.y) + arrowLen * sinA;
        const labelX = ex + (cosA >= 0 ? 8 : -8);
        const labelY = ey + (sinA > 0.2 ? 14 : -4);
        const anchor = cosA > 0.2 ? "start" : cosA < -0.2 ? "end" : "middle";
        return (
          <g key={`f-${i}`}>
            <line x1={sx(n.x)} y1={sy(n.y)} x2={ex} y2={ey} stroke="#dc2626" strokeWidth={2.5} markerEnd="url(#main-red)" />
            <text x={labelX} y={labelY} fontSize={10} fill="#dc2626" fontWeight="700" textAnchor={anchor}>{mag} kN</text>
          </g>
        );
      })}

      {solution && solution.reactions.map((r, i) => {
        const n = numericNodes[r.node]; if (!n || (Math.abs(r.x) < tol && Math.abs(r.y) < tol)) return null;
        const cx = sx(n.x); const cy = sy(n.y); const lbl = nodeLabel(r.node);
        return (
          <g key={`rx-${i}`}>
            {Math.abs(r.x) > tol && (
              <Arrow x1={cx - Math.sign(r.x) * arrowLen} y1={cy} x2={cx} y2={cy}
                color="#16a34a" markerId="main-green"
                label={`R${lbl}x = ${fmt(r.x)} kN`}
                labelOffset={{ dx: r.x > 0 ? -arrowLen - 4 : 6, dy: -8 }} fontSize={10} />
            )}
            {Math.abs(r.y) > tol && (
              <Arrow x1={cx} y1={cy + Math.sign(r.y) * arrowLen} x2={cx} y2={cy}
                color="#16a34a" markerId="main-green"
                label={`R${lbl}y = ${fmt(r.y)} kN`}
                labelOffset={{ dx: 8, dy: r.y > 0 ? arrowLen + 14 : -arrowLen - 4 }} fontSize={10} />
            )}
          </g>
        );
      })}

      {solution && (
        <g transform={`translate(${W - 110}, 8)`}>
          <rect x={0} y={0} width={104} height={52} rx={4} fill="white" stroke="#e5e7eb" strokeWidth={1} />
          <line x1={8} y1={14} x2={28} y2={14} stroke="#2563eb" strokeWidth={2.5} /><text x={32} y={17} fontSize={9} fill="#2563eb">Tension (+)</text>
          <line x1={8} y1={28} x2={28} y2={28} stroke="#dc2626" strokeWidth={2.5} /><text x={32} y={31} fontSize={9} fill="#dc2626">Compression (−)</text>
          <line x1={8} y1={42} x2={28} y2={42} stroke="#9ca3af" strokeWidth={2.5} /><text x={32} y={45} fontSize={9} fill="#9ca3af">Zero-force</text>
        </g>
      )}
    </svg>
  );
}

/* ===================== JOINT FBD ===================== */
function JointFBD({ jointIdx, connectedMembers, solvedMemberForces, members, allNodes, solution, forces }: {
  jointIdx: number;
  connectedMembers: number[];
  solvedMemberForces: number[];
  members: Member[];
  allNodes: Joint[];
  solution: Solution;
  forces: Force[];
}) {
  const SIZE = 260, CX = SIZE / 2, CY = SIZE / 2;
  const tol = 1e-6;
  const jointNode = allNodes[jointIdx];
  const jx = parseFloat(jointNode?.x || "0");
  const jy = parseFloat(jointNode?.y || "0");
  const jLabel = nodeLabel(jointIdx);
  const arrows: FBDArrow[] = [];

  connectedMembers.forEach(mIdx => {
    const mb = members[mIdx];
    const otherIdx = mb.start === jointIdx ? mb.end : mb.start;
    const otherNode = allNodes[otherIdx];
    const ox = parseFloat(otherNode?.x || "0");
    const oy = parseFloat(otherNode?.y || "0");
    const dx = ox - jx; const dy = oy - jy;
    const angleToOther = Math.atan2(dy, dx);
    const lbl = `${nodeLabel(mb.start)}${nodeLabel(mb.end)}`;
    const force = solvedMemberForces[mIdx];
    const known = force !== undefined && !isNaN(force);
    const isTension = known && force > tol;
    const isZero = known && Math.abs(force) <= tol;
    const color = !known ? "#6b7280" : isZero ? "#9ca3af" : isTension ? "#2563eb" : "#dc2626";
    arrows.push({
      angle: angleToOther,
      color,
      label: known ? `F${lbl}=${fmt(Math.abs(force))} kN` : `F${lbl}=?`,
      magnitude: known ? Math.abs(force) : 1,
      dashed: !known,
    });
  });

  const rxn = solution.reactions.find(r => r.node === jointIdx);
  if (rxn) {
    if (Math.abs(rxn.x) > tol) arrows.push({ angle: rxn.x > 0 ? 0 : Math.PI, color: "#16a34a", label: `Rx=${fmt(rxn.x)} kN`, magnitude: Math.abs(rxn.x), dashed: false });
    if (Math.abs(rxn.y) > tol) arrows.push({ angle: rxn.y > 0 ? Math.PI / 2 : -Math.PI / 2, color: "#16a34a", label: `Ry=${fmt(rxn.y)} kN`, magnitude: Math.abs(rxn.y), dashed: false });
  }

  forces.filter(f => f.Joint === jointIdx).forEach((f, i) => {
    const mag = parseFloat(f.magnitude || "0"); if (!mag) return;
    const ang = (parseFloat(f.angle || "0") * Math.PI) / 180;
    arrows.push({ angle: -ang, color: "#dc2626", label: `F${i + 1}=${fmt(Math.abs(mag))} kN`, magnitude: Math.abs(mag), dashed: false });
  });

  const maxForce = Math.max(...arrows.map(a => a.magnitude || 1), 1);
  const MAX_ARM = 90, MIN_ARM = 40;

  return (
    <svg width={SIZE} height={SIZE} style={{ display: "block", margin: "12px auto", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
      <defs>
        <ArrowMarker id={`jg-${jointIdx}`} color="#6b7280" />
        <ArrowMarker id={`jb-${jointIdx}`} color="#2563eb" />
        <ArrowMarker id={`jr-${jointIdx}`} color="#dc2626" />
        <ArrowMarker id={`jgr-${jointIdx}`} color="#16a34a" />
        <ArrowMarker id={`jlg-${jointIdx}`} color="#9ca3af" />
      </defs>
      <line x1={CX - MAX_ARM - 10} y1={CY} x2={CX + MAX_ARM + 10} y2={CY} stroke="#e2e8f0" strokeWidth={1} />
      <line x1={CX} y1={CY - MAX_ARM - 10} x2={CX} y2={CY + MAX_ARM + 10} stroke="#e2e8f0" strokeWidth={1} />

      {arrows.map((arrow, idx) => {
        const scale = arrow.magnitude / maxForce;
        const length = MIN_ARM + scale * (MAX_ARM - MIN_ARM);
        const isMemberArrow = idx < connectedMembers.length;
        const mIdx = isMemberArrow ? connectedMembers[idx] : -1;
        const mForce = isMemberArrow ? solvedMemberForces[mIdx] : undefined;
        const isCompression = mForce !== undefined && !isNaN(mForce) && mForce < -tol;
        let x1: number, y1: number, x2: number, y2: number;
        if (isCompression) {
          x1 = CX + Math.cos(arrow.angle) * length; y1 = CY - Math.sin(arrow.angle) * length;
          x2 = CX; y2 = CY;
        } else {
          x1 = CX; y1 = CY;
          x2 = CX + Math.cos(arrow.angle) * length; y2 = CY - Math.sin(arrow.angle) * length;
        }
        const markerId = arrow.color === "#2563eb" ? `jb-${jointIdx}` : arrow.color === "#dc2626" ? `jr-${jointIdx}` : arrow.color === "#16a34a" ? `jgr-${jointIdx}` : arrow.color === "#9ca3af" ? `jlg-${jointIdx}` : `jg-${jointIdx}`;
        const labelR = length + 14;
        const lx = CX + Math.cos(arrow.angle) * labelR;
        const ly = CY - Math.sin(arrow.angle) * labelR;
        const textAnchor = Math.cos(arrow.angle) > 0.2 ? "start" : Math.cos(arrow.angle) < -0.2 ? "end" : "middle";
        const textDy = Math.sin(arrow.angle) > 0.2 ? -2 : Math.sin(arrow.angle) < -0.2 ? 10 : 4;
        const dxLine = x2 - x1; const dyLine = y2 - y1;
        const Lline = Math.hypot(dxLine, dyLine) || 1;
        const ex = x2 - (dxLine / Lline); const ey = y2 - (dyLine / Lline);
        return (
          <g key={idx}>
            <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={arrow.color} strokeWidth={2.2} strokeDasharray={arrow.dashed ? "5,3" : undefined} markerEnd={`url(#${markerId})`} />
            <text x={lx} y={ly + textDy} textAnchor={textAnchor} fontSize={9} fill={arrow.color} fontWeight="600">{arrow.label}</text>
          </g>
        );
      })}

      <circle cx={CX} cy={CY} r={7} fill="white" stroke="#1e40af" strokeWidth={2.5} />
      <text x={CX} y={CY + 4} textAnchor="middle" fontSize={10} fontWeight="800" fill="#1e3a8a">{jLabel}</text>
      <text x={SIZE / 2} y={14} textAnchor="middle" fontSize={10} fontWeight="700" fill="#374151">FBD — Joint {jLabel}</text>
      <g transform={`translate(4, ${SIZE - 22})`}>
        <line x1={0} y1={8} x2={14} y2={8} stroke="#2563eb" strokeWidth={2} /><text x={17} y={11} fontSize={7.5} fill="#2563eb">Tension</text>
        <line x1={52} y1={8} x2={66} y2={8} stroke="#dc2626" strokeWidth={2} /><text x={69} y={11} fontSize={7.5} fill="#dc2626">Compression</text>
        <line x1={122} y1={8} x2={136} y2={8} stroke="#6b7280" strokeWidth={2} strokeDasharray="4,2" /><text x={139} y={11} fontSize={7.5} fill="#6b7280">Unknown</text>
        <line x1={185} y1={8} x2={199} y2={8} stroke="#16a34a" strokeWidth={2} /><text x={202} y={11} fontSize={7.5} fill="#16a34a">Reaction</text>
      </g>
    </svg>
  );
}

/* ===================== MAIN COMPONENT ===================== */
export default function TrussSolverUI() {
  const [supports, setSupports] = useState<Support[]>([{ x: "", y: "", type: "Pinned" }, { x: "", y: "", type: "Roller" }]);
  const [nodes, setNodes] = useState<Joint[]>([{ x: "", y: "" }]);
  const [members, setMembers] = useState<Member[]>([{ start: 0, end: 1 }]);
  const [forces, setForces] = useState<Force[]>([{ Joint: 0, magnitude: "", angle: "" }]);
  const [solution, setSolution] = useState<Solution | null>(null);

  const allNodes: Joint[] = [...supports.map(s => ({ x: s.x, y: s.y })), ...nodes];
  const numericNodes = allNodes.map(n => ({ x: parseFloat(n.x || "0"), y: parseFloat(n.y || "0") }));

  const inputClass = "w-full mt-1 rounded-lg border border-gray-300 text-[18px] p-2 outline-none focus:ring-0";
  const redButtonClass = "w-10 px-2 py-0.5 bg-red-500 text-white rounded-md hover:bg-red-600 text-[20px]";
  const greenButtonClass = "px-3 py-1 bg-[#008409] text-white rounded-lg hover:bg-[#15711b] transition text-[18px]";

  function handleChange<T extends GenericObject>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, index: number, field: keyof T, value: T[keyof T]) {
    const a = [...arr]; a[index][field] = value; setArr(a);
  }
  function addItem<T>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, tpl: T) { setArr([...arr, tpl]); }
  function removeItem<T>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, i: number) { setArr(arr.filter((_, j) => j !== i)); }

  const handleSolve = () => {
    setSolution(solveTruss(supports, nodes, members, forces));
  };

  const resultRows = solution ? [
    ...solution.memberForces.map((f, i) => {
      const tol = 1e-6;
      const type = Math.abs(f) < tol ? "Zero-force" : f > 0 ? "Tension" : "Compression";
      return {
        label: `Member ${nodeLabel(members[i].start)}${nodeLabel(members[i].end)}`,
        value: `${f > 0 ? "+" : ""}${fmt(f)} kN  (${type})`,
      };
    }),
    ...solution.reactions.filter(r => Math.abs(r.x) > 1e-6 || Math.abs(r.y) > 1e-6).flatMap(r => {
      const rows = [];
      if (Math.abs(r.x) > 1e-6) rows.push({ label: `R${nodeLabel(r.node)}x`, value: `${fmt(r.x)} kN` });
      if (Math.abs(r.y) > 1e-6) rows.push({ label: `R${nodeLabel(r.node)}y`, value: `${fmt(r.y)} kN` });
      return rows;
    }),
  ] : [];

  return (
    <div className="relative flex flex-col min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <main className="flex-grow px-6 py-10 max-w-6xl mx-auto w-full relative">
        <h1 className="text-3xl font-bold text-center mb-2">Truss Calculator</h1>
        <h2 className="text-xl font-semibold text-center mb-6">Real-Time Free Body Diagram</h2>

        <div className="relative rounded-xl shadow h-[420px] mb-8 overflow-hidden bg-white">
          <MainFBD numericNodes={numericNodes} members={members} supports={supports} forces={forces} solution={solution} allNodes={allNodes} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Supports */}
          <div className="bg-white rounded-xl shadow p-4 relative z-10">
            <h3 className="text-xl font-semibold mb-2">Supports</h3>
            {supports.map((s, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 items-end mb-2">
                <span className="font-medium text-[18px]">Joint {nodeLabel(i)}</span>
                <input type="number" placeholder="x" value={s.x} onChange={e => handleChange(supports, setSupports, i, "x", e.target.value)} className={inputClass} />
                <input type="number" placeholder="y" value={s.y} onChange={e => handleChange(supports, setSupports, i, "y", e.target.value)} className={inputClass} />
                <select value={s.type} onChange={e => handleChange(supports, setSupports, i, "type", e.target.value)} className={inputClass}>
                  <option>Pinned</option><option>Roller</option>
                </select>
                {supports.length > 1 && <button onClick={() => removeItem(supports, setSupports, i)} className={redButtonClass}>–</button>}
              </div>
            ))}
            <button onClick={() => addItem(supports, setSupports, { x: "", y: "", type: "Pinned" })} className={greenButtonClass}>+ Add Support</button>
          </div>

          {/* Nodes */}
          <div className="bg-white rounded-xl shadow p-4 relative z-10">
            <h3 className="text-xl font-semibold mb-2">Nodes</h3>
            {nodes.map((n, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-end mb-2">
                <span className="font-medium text-[18px]">Joint {nodeLabel(supports.length + i)}</span>
                <input type="number" placeholder="x" value={n.x} onChange={e => handleChange(nodes, setNodes, i, "x", e.target.value)} className={inputClass} />
                <input type="number" placeholder="y" value={n.y} onChange={e => handleChange(nodes, setNodes, i, "y", e.target.value)} className={inputClass} />
                {nodes.length > 1 && <button onClick={() => removeItem(nodes, setNodes, i)} className={redButtonClass}>–</button>}
              </div>
            ))}
            <button onClick={() => addItem(nodes, setNodes, { x: "", y: "" })} className={greenButtonClass}>+ Add Joint</button>
          </div>

          {/* Members */}
          <div className="bg-white rounded-xl shadow p-4 relative z-10">
            <h3 className="text-xl font-semibold mb-2">Members</h3>
            <div className="grid grid-cols-4 gap-2 items-end mb-2">
              <span className="text-[16px] font-medium text-gray-700"> </span>
              <span className="text-[16px] font-medium text-gray-700">Start Joint</span>
              <span className="text-[16px] font-medium text-gray-700">End Joint</span>
              <span className="text-[16px] font-medium text-gray-700"> </span>
            </div>
            {members.map((m, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-end mb-2">
                <span className="font-medium text-[18px]">Member {nodeLabel(m.start)}{nodeLabel(m.end)}</span>
                <select value={m.start} onChange={e => handleChange(members, setMembers, i, "start", Number(e.target.value))} className={inputClass}>
                  {allNodes.map((_, idx) => <option key={idx} value={idx}>Joint {nodeLabel(idx)}</option>)}
                </select>
                <select value={m.end} onChange={e => handleChange(members, setMembers, i, "end", Number(e.target.value))} className={inputClass}>
                  {allNodes.map((_, idx) => <option key={idx} value={idx}>Joint {nodeLabel(idx)}</option>)}
                </select>
                {members.length > 1 ? <button onClick={() => removeItem(members, setMembers, i)} className={redButtonClass}>–</button> : <div />}
              </div>
            ))}
            <button onClick={() => addItem(members, setMembers, { start: 0, end: 0 })} className={greenButtonClass}>+ Add Member</button>
          </div>

          {/* Forces */}
          <div className="bg-white rounded-xl shadow p-4 relative z-10">
            <h3 className="text-xl font-semibold mb-2">Forces</h3>
            {forces.map((f, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-end mb-2">
                <select value={f.Joint} onChange={e => handleChange(forces, setForces, i, "Joint", Number(e.target.value))} className={inputClass}>
                  {allNodes.map((_, idx) => <option key={idx} value={idx}>Joint {nodeLabel(idx)}</option>)}
                </select>
                <input type="number" placeholder="kN" value={f.magnitude} onChange={e => handleChange(forces, setForces, i, "magnitude", e.target.value)} className={inputClass} />
                <input type="number" placeholder="deg" value={f.angle} onChange={e => handleChange(forces, setForces, i, "angle", e.target.value)} className={inputClass} />
                {forces.length > 1 && <button onClick={() => removeItem(forces, setForces, i)} className={redButtonClass}>–</button>}
              </div>
            ))}
            <button onClick={() => addItem(forces, setForces, { Joint: 0, magnitude: "", angle: "" })} className={greenButtonClass}>+ Add Force</button>
          </div>
        </div>

        <button className="w-full bg-[#1848a0] hover:bg-[#163d8a] text-white py-3 rounded-lg font-semibold mb-6 transition" onClick={handleSolve}>
          Calculate
        </button>

        {solution && (
          <>
            {/* Member Forces */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-[15px] font-semibold text-gray-800 tracking-wide">Member Forces</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {solution.memberForces.map((f, i) => {
                  const tol = 1e-6;
                  const type = Math.abs(f) < tol ? "Zero-force" : f > 0 ? "Tension" : "Compression";
                  const lS = nodeLabel(members[i].start), lE = nodeLabel(members[i].end);
                  const color = Math.abs(f) < tol ? "text-gray-400" : f > 0 ? "text-blue-600" : "text-red-600";
                  const badge = Math.abs(f) < tol ? "bg-gray-100 text-gray-500" : f > 0 ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600";
                  return (
                    <div key={i} className="flex items-center justify-between px-5 py-3">
                      <div><span className="text-[13px] text-gray-500 uppercase tracking-wider">Member </span><span className="text-[15px] font-semibold text-gray-800">{lS}{lE}</span></div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[15px] font-mono font-semibold ${color}`}>{f > 0 ? "+" : ""}{fmt(f)} kN</span>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badge}`}>{type}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Support Reactions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-[15px] font-semibold text-gray-800 tracking-wide">Support Reactions</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {solution.reactions.map((r, i) => {
                  if (Math.abs(r.x) < 1e-6 && Math.abs(r.y) < 1e-6) return null;
                  const hasRx = Math.abs(r.x) > 1e-6;
                  const hasRy = Math.abs(r.y) > 1e-6;
                  const label = nodeLabel(i);
                  const sType = i < supports.length ? supports[i].type : "";
                  return (
                    <div key={i} className="px-5 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[14px] font-semibold text-gray-800">Joint {label}</span>
                        <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{sType}</span>
                      </div>
                      <div className="flex gap-8">
                        {hasRx && <div><p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Horizontal (R<sub>x</sub>)</p><KaTeXInline tex={`${fmt(r.x)}\\ \\text{kN}`} /></div>}
                        {hasRy && <div><p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Vertical (R<sub>y</sub>)</p><KaTeXInline tex={`${fmt(r.y)}\\ \\text{kN}`} /></div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step-by-Step */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-[15px] font-semibold text-gray-800 tracking-wide">Step-by-Step Solution</h3>
              </div>
              <div className="px-6 py-5">
                <PDFExportButton lines={solution.lines} resultRows={resultRows} title="Truss Analysis — Step-by-Step Solution" filename="truss-solution.pdf" />
                <TrussStepRenderer lines={solution.lines} solution={solution} members={members} allNodes={allNodes} supports={supports} forces={forces} />
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}