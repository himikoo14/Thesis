"use client";

import { useRef, useEffect, useState, useCallback, ReactNode } from "react";
import * as THREE from "three";

/* ================================================================
   THREE.JS CANVAS
================================================================ */
function CoordThreeCanvas({ points, forces }: { points: any[]; forces: any[] }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const dynamicGroupRef = useRef<THREE.Group | null>(null);
  const orbitRef = useRef({ theta: Math.PI * 1.25, phi: 0.65, r: 6, isDragging: false, prev: { x: 0, y: 0 } });
  const rafRef = useRef(0);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth || 500, H = el.clientHeight || 320;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    scene.add(new THREE.GridHelper(6, 12, 0xdddddd, 0xeeeeee));
    scene.add(new THREE.HemisphereLight(0xffffff, 0xe0e0e0, 1.2));
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 24, 24), new THREE.MeshStandardMaterial({ color: 0x222222 })));
    // Axis lines (no arrows)
    const axes: [number[], number][] = [
      [[1, 0, 0], 0x2a9d8f],  // THREE X → labeled Y (teal)
      [[0, 1, 0], 0x4361ee],  // THREE Y → labeled Z (blue)
      [[0, 0, 1], 0xe63946],  // THREE Z → labeled X (red)
    ];
    axes.forEach(([dir, color]) => {
      const material = new THREE.LineBasicMaterial({ color });
      const [dx, dy, dz] = dir;

      const points = [
        new THREE.Vector3(-dx * 2, -dy * 2, -dz * 2),
        new THREE.Vector3(dx * 2, dy * 2, dz * 2)
      ];

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);

      scene.add(line);
    });
    // Axis arrows: direction stays the same in 3D space, but labels are remapped
    // THREE.js X-axis [1,0,0] is now labeled "Y" (red)
    // THREE.js Y-axis [0,1,0] is now labeled "Z" (teal)
    // THREE.js Z-axis [0,0,1] is now labeled "X" (blue)
    const dynGroup = new THREE.Group();
    scene.add(dynGroup);
    dynamicGroupRef.current = dynGroup;

    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    const orbit = orbitRef.current;

    const onDown = (e: MouseEvent) => { orbit.isDragging = true; orbit.prev = { x: e.clientX, y: e.clientY }; };
    const onUp = () => { orbit.isDragging = false; };
    const onMove = (e: MouseEvent) => {
      if (!orbit.isDragging) return;
      orbit.theta -= (e.clientX - orbit.prev.x) * 0.014;
      orbit.phi = Math.max(0.12, Math.min(Math.PI - 0.12, orbit.phi + (e.clientY - orbit.prev.y) * 0.014));
      orbit.prev = { x: e.clientX, y: e.clientY };
    };
    const onWheel = (e: WheelEvent) => { orbit.r = Math.max(3, Math.min(12, orbit.r + e.deltaY * 0.01)); };

    renderer.domElement.addEventListener("mousedown", onDown);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      camera.position.set(
        orbit.r * Math.sin(orbit.phi) * Math.cos(orbit.theta),
        orbit.r * Math.cos(orbit.phi),
        orbit.r * Math.sin(orbit.phi) * Math.sin(orbit.theta)
      );
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      renderer.domElement.removeEventListener("mousedown", onDown);
      renderer.domElement.removeEventListener("wheel", onWheel);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const group = dynamicGroupRef.current;
    if (!group) return;
    while (group.children.length) group.remove(group.children[0]);
    const COLORS = [0xe63946, 0x2a9d8f, 0x4361ee, 0xf4a261, 0xa8dadc, 0x9b5de5];
    points.forEach((p, i) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 16, 16),
        new THREE.MeshStandardMaterial({ color: COLORS[i % COLORS.length] })
      );
      mesh.position.set(parseFloat(p.y) || 0, parseFloat(p.z) || 0, parseFloat(p.x) || 0);
      group.add(mesh);
    });
    forces.forEach((f) => {
      const mag = parseFloat(f.mag);
      if (!mag) return;
      const a = points[f.from], b = points[f.to];
      if (!a || !b) return;
      const from = new THREE.Vector3(parseFloat(a.y) || 0, parseFloat(a.z) || 0, parseFloat(a.x) || 0);
      const to = new THREE.Vector3(parseFloat(b.y) || 0, parseFloat(b.z) || 0, parseFloat(b.x) || 0);
      const len = from.distanceTo(to);
      if (len < 0.001) return;
      group.add(new THREE.ArrowHelper(new THREE.Vector3().subVectors(to, from).normalize(), from, len, 0xf4a261, 0.25, 0.14));
    });
  }, [points, forces]);

  return (
    <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: "1px solid #e8e8e8", background: "transparent" }}>
      <div ref={mountRef} style={{ width: "100%", height: 320, cursor: "grab" }} />
      <div style={{ position: "absolute", top: 10, left: 12, display: "flex", gap: 6, pointerEvents: "none" }}>
        {/* Labels remapped: THREE X→Y (red), THREE Y→Z (teal), THREE Z→X (blue) */}
        {([["X", "#e63946", "#fff0f1"], ["Y", "#2a9d8f", "#f0faf9"], ["Z", "#4361ee", "#f0f2ff"]] as [string, string, string][]).map(([l, c, bg]) => (
          <span key={l} style={{ background: bg, color: c, border: `1.5px solid ${c}33`, borderRadius: 6, padding: "2px 8px", fontSize: 13, fontWeight: 700 }}>{l}</span>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 8, right: 12, fontSize: 10, color: "#bbb", pointerEvents: "none" }}>Drag to rotate · Scroll to zoom</div>
    </div>
  );
}

/* ================================================================
   KATEX (inline renderer for solution panel)
================================================================ */
function useKatex() {
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
  const katexReady = useKatex();
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
   STEP LINE TYPES  (from StepByStep.tsx)
================================================================ */
type StepLine =
  | { type: "heading"; text: string }
  | { type: "math"; tex: string }
  | { type: "text"; text: string }
  | { type: "diagram"; label?: string; node: ReactNode };

/** Converts the legacy string[] from buildSolution into StepLine[] */
function fromLegacySteps(steps: string[]): StepLine[] {
  return steps.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("Step")) return { type: "heading", text: trimmed };
    return { type: "math", tex: trimmed };
  });
}

/* ================================================================
   STEP-BY-STEP SOLUTION RENDERER  (from StepByStep.tsx)
================================================================ */
function StepByStepSolution({
  steps,
  title = "Step-by-Step Solution",
  containerRef,
}: {
  steps: StepLine[];
  title?: string;
  containerRef?: React.RefObject<HTMLDivElement>;
}) {
  const card: React.CSSProperties = {
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #ebebeb",
    padding: "18px 20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  };

  return (
    <div ref={containerRef} style={card}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, marginTop: 0 }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map((line, i) => {
          switch (line.type) {
            case "heading":
              return (
                <p key={i} style={{ fontWeight: 600, fontSize: 16, marginTop: 10, marginBottom: 2, color: "#111" }}>
                  {line.text}
                </p>
              );
            case "math":
              return <KTX key={i} tex={line.tex} />;
            case "text":
              return (
                <p key={i} style={{ fontSize: 15, color: "#444", margin: 0 }}>
                  {line.text}
                </p>
              );
            case "diagram":
              return (
                <div key={i} style={{ marginTop: 16 }}>
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

/* ================================================================
   PDF EXPORT  (from ToPDF/Page.tsx — self-contained inline version)
================================================================ */
declare global {
  interface Window {
    jspdf: { jsPDF: new (opts: Record<string, unknown>) => any };
    katex: any;
  }
}

const JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
const MM_PER_PX = 0.264583;
const RENDER_SCALE = 3;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = () => resolve(); s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function upgradeFracs(tex: string): string {
  if (!tex.includes("\\frac") || tex.includes("\\displaystyle")) return tex;
  return `{\\displaystyle ${tex.replace(/\\tfrac(?=\{)/g, "\\dfrac").replace(/(?<![dt])\\frac(?=\{)/g, "\\dfrac")}}`;
}

async function latexToPng(tex: string): Promise<{ dataUrl: string; wMm: number; hMm: number } | null> {
  // Dynamically import html2canvas only when needed
  const html2canvas = (await import("html2canvas")).default;
  try {
    const processedTex = upgradeFracs(tex);
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position:absolute;left:-9999px;top:0;background:#ffffff;color:#000000;padding:0;margin:0;display:inline-block;";
    const inner = document.createElement("span");
    inner.style.cssText = "display:inline-block;padding:10px 14px;";
    wrapper.appendChild(inner);
    document.body.appendChild(wrapper);

    window.katex.render(processedTex, inner, { displayMode: true, throwOnError: false, output: "html" });

    const targetEl = (inner.querySelector(".katex-html") as HTMLElement) || (inner.querySelector(".katex") as HTMLElement) || inner;
    const innerRect = targetEl.getBoundingClientRect();
    const wrapRect = wrapper.getBoundingClientRect();
    const offsetLeft = innerRect.left - wrapRect.left;

    const canvas = await html2canvas(wrapper, { backgroundColor: "#ffffff", scale: RENDER_SCALE, useCORS: true, logging: false });
    document.body.removeChild(wrapper);

    const PAD = 18, EXTRA_LEFT = -8;
    const sx = Math.max(0, Math.round(offsetLeft * RENDER_SCALE) - PAD - EXTRA_LEFT);
    const sw = Math.round(innerRect.width * RENDER_SCALE) + PAD * 2 + EXTRA_LEFT;
    const cropped = document.createElement("canvas");
    cropped.width = sw; cropped.height = canvas.height;
    const ctx = cropped.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(canvas, sx, 0, sw, canvas.height, 0, 0, sw, canvas.height);
    return { dataUrl: cropped.toDataURL("image/png"), wMm: (cropped.width / RENDER_SCALE) * MM_PER_PX, hMm: (cropped.height / RENDER_SCALE) * MM_PER_PX };
  } catch (e) {
    console.warn("latexToPng failed:", tex, e);
    return null;
  }
}

async function writePDF(p: { steps: string[]; resultRows?: { label: string; value: string }[]; title: string; filename: string }) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210, PH = 297, M = 18, CW = PW - M * 2, MAXY = PH - 22;
  let y = 0;

  const guard = (need: number) => { if (y + need > MAXY) { pdf.addPage(); y = M; } };

  const mathLine = async (tex: string) => {
    const r = await latexToPng(tex);
    if (!r) return;
    const MAX_WIDTH = CW * 0.9;
    let { wMm: width, hMm: height } = r;
    if (width > MAX_WIDTH) { const sc = MAX_WIDTH / width; width *= sc; height *= sc; }
    guard(height + 6);
    pdf.addImage(r.dataUrl, "PNG", (PW - width) / 2, y, width, height);
    y += height + 6;
  };

  // Header
  pdf.setFillColor(24, 72, 160);
  pdf.rect(0, 0, PW, 10, "F");
  y = 18;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(14); pdf.setTextColor(24, 72, 160);
  pdf.text(p.title, M, y); y += 6;
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(100, 116, 139);
  pdf.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, M, y); y += 5;
  pdf.setDrawColor(220, 228, 245); pdf.setLineWidth(0.4); pdf.line(M, y, PW - M, y); y += 9;

  pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.setTextColor(20, 20, 20);
  pdf.text("Step-by-Step Solution", M, y); y += 10;

  for (const raw of p.steps) {
    const s = raw.trim();
    if (s.startsWith("Step")) {
      guard(10); y += 2;
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(24, 72, 160);
      pdf.text(s, M, y); y += 14;
      continue;
    }
    await mathLine(s); y += 2;
  }

  if (p.resultRows && p.resultRows.length > 0) {
    guard(20 + p.resultRows.length * 11); y += 4;
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

function PDFExportButton({ steps, resultRows, title, filename }: {
  steps: string[];
  resultRows?: { label: string; value: string }[];
  title: string;
  filename: string;
}) {
  const [libReady, setLibReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");

  useEffect(() => {
    loadScript(JSPDF_URL).then(() => setLibReady(true)).catch(console.error);
  }, []);

  const handleExport = useCallback(async () => {
    if (!libReady || status === "generating") return;
    setStatus("generating");
    try {
      await writePDF({ steps, resultRows, title, filename });
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      console.error("PDF export failed:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [libReady, status, steps, resultRows, title, filename]);

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
        width: "100%", padding: "13px 0", border: "none", borderRadius: 10,
        fontSize: 15, fontWeight: 600, transition: "all 0.2s",
        background: "linear-gradient(135deg, #0f2d6b, #1848a0)",
        color: "#fff", boxShadow: "0 4px 14px rgba(24,72,160,0.25)",
        marginBottom: 12, opacity: off ? 0.65 : 1, cursor: off ? "not-allowed" : "pointer",
      }}
      onClick={handleExport}
      disabled={off}
    >
      {labels[status]}
    </button>
  );
}

/* ================================================================
   SOLUTION BUILDER
================================================================ */
function buildSolution(details: any[], Rx: number, Ry: number, Rz: number, R: number): string[] {
  const steps: string[] = [];

  steps.push("Step 1: Determine position vectors");
  details.forEach(d => {
    steps.push(
      `\\vec r_{${d.from}${d.to}} = (${d.bx}-${d.ax})\\hat i + (${d.by}-${d.ay})\\hat j + (${d.bz}-${d.az})\\hat k`
    );
  });

  steps.push("Step 2: Magnitudes");
  details.forEach(d => {
    steps.push(
      `|\\vec r_{${d.from}${d.to}}| = \\sqrt{${d.dx}^2+${d.dy}^2+${d.dz}^2} = ${d.len.toFixed(2)}`
    );
  });

  steps.push("Step 3: Unit vectors");
  details.forEach(d => {
    steps.push(
      `\\hat u_{${d.from}${d.to}} = \\frac{${d.dx}\\hat i+${d.dy}\\hat j+${d.dz}\\hat k}{${d.len.toFixed(2)}}`
    );
  });

  steps.push("Step 4: Force vectors");
  details.forEach(d => {
    steps.push(
      `\\vec F_{${d.to}} = ${d.mag}\\,\\hat u_{${d.from}${d.to}} = ${d.Fx.toFixed(2)}\\hat i + ${d.Fy.toFixed(2)}\\hat j + ${d.Fz.toFixed(2)}\\hat k`
    );
  });

  steps.push("Step 5: Resultant");
  steps.push(
    `\\vec R = ${Rx.toFixed(2)}\\hat i + ${Ry.toFixed(2)}\\hat j + ${Rz.toFixed(2)}\\hat k`
  );
  steps.push(
    `R = \\sqrt{(${Rx.toFixed(2)})^2+(${Ry.toFixed(2)})^2+(${Rz.toFixed(2)})^2} = ${R.toFixed(2)}`
  );

  // Step 6: Direction angles
  if (R > 0.0001) {
    const alpha = (Math.acos(Rx / R) * 180) / Math.PI;
    const beta  = (Math.acos(Ry / R) * 180) / Math.PI;
    const gamma = (Math.acos(Rz / R) * 180) / Math.PI;

    steps.push("Step 6: Direction angles (α, β, γ)");
    steps.push(
      `\\alpha = \\cos^{-1}\\!\\left(\\frac{R_x}{R}\\right) = \\cos^{-1}\\!\\left(\\frac{${Rx.toFixed(2)}}{${R.toFixed(2)}}\\right) = ${alpha.toFixed(2)}^\\circ`
    );
    steps.push(
      `\\beta = \\cos^{-1}\\!\\left(\\frac{R_y}{R}\\right) = \\cos^{-1}\\!\\left(\\frac{${Ry.toFixed(2)}}{${R.toFixed(2)}}\\right) = ${beta.toFixed(2)}^\\circ`
    );
    steps.push(
      `\\gamma = \\cos^{-1}\\!\\left(\\frac{R_z}{R}\\right) = \\cos^{-1}\\!\\left(\\frac{${Rz.toFixed(2)}}{${R.toFixed(2)}}\\right) = ${gamma.toFixed(2)}^\\circ`
    );
    steps.push(
      `\\cos^2\\alpha + \\cos^2\\beta + \\cos^2\\gamma = ${((Rx/R)**2 + (Ry/R)**2 + (Rz/R)**2).toFixed(3)} \\approx 1 \\checkmark`
    );
  }

  return steps;
}

/* ================================================================
   MAIN EXPORT
================================================================ */
export default function CoordinateTab() {
  const ptLabel = (i: number) => String.fromCharCode(65 + i);
  const [points, setPoints] = useState([{ label: "A", x: "", y: "", z: "" }, { label: "B", x: "", y: "", z: "" }]);
  const [forces, setForces] = useState([{ mag: "", from: 0, to: 1 }]);
  const [result, setResult] = useState<any>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "generating" | "done" | "error"
  >("idle");

  const off = status === "generating";

  const labels: Record<typeof status, string> = {
    idle: "⬇ Download Solution as PDF",
    generating: "⏳ Generating PDF…",
    done: "✅ Downloaded!",
    error: "❌ Export failed — try again",
  };

  const addPoint = () => setPoints(p => [...p, { label: ptLabel(p.length), x: "", y: "", z: "" }]);
  const removePoint = (i: number) => {
    if (points.length <= 2) return;
    setPoints(p => p.filter((_, j) => j !== i).map((v, j) => ({ ...v, label: ptLabel(j) })));
  };
  const updatePoint = (i: number, field: string, val: string) =>
    setPoints(p => p.map((v, j) => j === i ? { ...v, [field]: val } : v));

  const addForce = () => setForces(f => [...f, { mag: "", from: 0, to: Math.min(1, points.length - 1) }]);
  const removeForce = (i: number) => { if (forces.length <= 1) return; setForces(f => f.filter((_, j) => j !== i)); };
  const updateForce = (i: number, field: string, val: any) =>
    setForces(f => f.map((v, j) => j === i ? { ...v, [field]: val } : v));

  const calculate = () => {
    let Rx = 0, Ry = 0, Rz = 0;
    const details: any[] = [];
    forces.forEach((f) => {
      const mag = parseFloat(f.mag);
      if (!mag) return;
      const a = points[f.from], b = points[f.to];
      if (!a || !b) return;
      const ax = parseFloat(a.x) || 0, ay = parseFloat(a.y) || 0, az = parseFloat(a.z) || 0;
      const bx = parseFloat(b.x) || 0, by = parseFloat(b.y) || 0, bz = parseFloat(b.z) || 0;
      const dx = bx - ax, dy = by - ay, dz = bz - az;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (!len) return;
      const Fx = mag * dx / len, Fy = mag * dy / len, Fz = mag * dz / len;
      Rx += Fx; Ry += Fy; Rz += Fz;
      details.push({ mag, from: points[f.from].label, to: points[f.to].label, ax, ay, az, bx, by, bz, dx, dy, dz, Fx, Fy, Fz, len });
    });

const R = Math.sqrt(Rx * Rx + Ry * Ry + Rz * Rz);
const rawSteps = buildSolution(details, Rx, Ry, Rz, R);

const alpha = (Math.acos(Rx / R) * 180) / Math.PI;
const beta  = (Math.acos(Ry / R) * 180) / Math.PI;
const gamma = (Math.acos(Rz / R) * 180) / Math.PI;

  setResult({
    details, Rx, Ry, Rz, R,
    steps: rawSteps,
    stepLines: fromLegacySteps(rawSteps),
    resultRows: [
      { label: "Resultant Rx", value: `${Rx.toFixed(3)} N` },
      { label: "Resultant Ry", value: `${Ry.toFixed(3)} N` },
      { label: "Resultant Rz", value: `${Rz.toFixed(3)} N` },
      { label: "Magnitude |R|", value: `${R.toFixed(3)} N` },
      { label: "α (angle with X)", value: `${alpha.toFixed(2)}°` },
      { label: "β (angle with Y)", value: `${beta.toFixed(2)}°` },
      { label: "γ (angle with Z)", value: `${gamma.toFixed(2)}°` },
    ],
  });
  setShowSolution(true);
};

const inp: React.CSSProperties = { background: "white", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 8px", fontSize: 13, width: "100%", outline: "none" };
  const sel: React.CSSProperties = { ...inp, width: "auto", minWidth: 90 };
  const card: React.CSSProperties = { background: "#fff", borderRadius: 14, border: "1px solid #ebebeb", padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" };

  return (
    <div style={{ width: "100%", background: "transparent" }}>

      {/* 3D Canvas */}
      <div style={{ width: "100%", maxWidth: 580, margin: "0 auto 20px" }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, textAlign: "center", marginBottom: 8 }}>Cartesian Vector Method</h2>
        <p style={{ color: "#888", fontSize: 13, textAlign: "center", marginTop: 0, marginBottom: 12 }}>Real-Time Free Body Diagram</p>
        <CoordThreeCanvas points={points} forces={forces} />
      </div>

      {/* Inputs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Points */}
        <div style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}>Coordinates of Points</h3>
          <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 1fr 1fr 32px", gap: 6, marginBottom: 6 }}>
            <span />{["x", "y", "z"].map(l => <span key={l} style={{ fontSize: 11, color: "#999", textAlign: "center" }}>{l}</span>)}<span />
          </div>
          {points.map((p, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "52px 1fr 1fr 1fr 32px", gap: 6, alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "#555" }}>Point {p.label}</span>
              {["x", "y", "z"].map(field => (
                <input key={field} style={inp} placeholder={field} value={(p as any)[field]} onChange={e => updatePoint(i, field, e.target.value)} />
              ))}
              <button onClick={() => removePoint(i)} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 7, width: 30, height: 30, cursor: "pointer", fontWeight: 700 }}>–</button>
            </div>
          ))}
          <button onClick={addPoint} style={{ background: "#008409", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer", marginTop: 4 }}>+ Add Point</button>
        </div>

        {/* Forces */}
        <div style={card}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}>Forces</h3>
          {forces.map((f, i) => (
            <div key={i} style={{ background: "white", borderRadius: 10, border: "1px solid #ebebeb", padding: "10px 12px", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <span style={{ fontSize: 13, color: "#555", flex: 1 }}>Magnitude (kN):</span>
                <input style={{ ...inp, width: 80 }} placeholder="kN" value={f.mag} onChange={e => updateForce(i, "mag", e.target.value)} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <span style={{ fontSize: 13, color: "#555", flex: 1 }}>From:</span>
                <select style={sel} value={f.from} onChange={e => updateForce(i, "from", +e.target.value)}>
                  {points.map((p, j) => <option key={j} value={j}>Point {p.label}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#555", flex: 1 }}>To:</span>
                <select style={sel} value={f.to} onChange={e => updateForce(i, "to", +e.target.value)}>
                  {points.map((p, j) => <option key={j} value={j}>Point {p.label}</option>)}
                </select>
              </div>
              {forces.length > 1 && (
                <div style={{ textAlign: "right", marginTop: 8 }}>
                  <button onClick={() => removeForce(i)} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 7, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>– Remove</button>
                </div>
              )}
            </div>
          ))}
          <button onClick={addForce} style={{ background: "#008409", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer" }}>+ Add Force</button>
        </div>
      </div>

      {/* Calculate */}
      <button onClick={calculate} style={{ width: "100%", background: "#1848a0", color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontSize: 16, fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>
        Calculate
      </button>

      {/* Solution — now uses StepByStepSolution + toggle + PDF export */}
      {result && (
        <div>
          {/* Toggle header */}
          <div style={card}>
            <button
              onClick={() => setShowSolution(s => !s)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
                fontSize: 16, fontWeight: 600, color: "#111",
                padding: 0, width: "100%",
              }}
            >
              <span style={{ background: "#1848a0", color: "#fff", borderRadius: 8, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
                {showSolution ? "▲ Hide" : "▼ Show"}
              </span>
              <span>Step-by-Step Solution</span>
            </button>

            {showSolution && (
              <div style={{ marginTop: 20 }}>
                {/* PDF export button */}
                <button
                  onClick={async () => {
                    if (off) return;

                    try {
                      setStatus("generating");

                      const payload = {
                        steps: result.steps,
                        resultRows: result.resultRows,
                        points,
                        forces,
                        result: {
                          Rx: result.Rx,
                          Ry: result.Ry,
                          Rz: result.Rz,
                          R: result.R,
                          details: result.details,
                        },
                      };

                      const res = await fetch("/api/export-pdf-3dcoordinates", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                      });

                      if (!res.ok) {
                        throw new Error("Failed to export PDF");
                      }

                      const blob = await res.blob();
                      const url = window.URL.createObjectURL(blob);

                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "coordinate-solution.pdf";
                      a.click();

                      window.URL.revokeObjectURL(url);

                      setStatus("done");
                      setTimeout(() => setStatus("idle"), 2500);
                    } catch (err) {
                      console.error(err);
                      setStatus("error");
                      setTimeout(() => setStatus("idle"), 3000);
                    }
                  }}
                  disabled={off}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    width: "100%",
                    padding: "13px 0",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 600,
                    transition: "all 0.2s",
                    background: "linear-gradient(135deg, #0f2d6b, #1848a0)",
                    color: "#fff",
                    boxShadow: "0 4px 14px rgba(24,72,160,0.25)",
                    marginBottom: 12,
                    opacity: off ? 0.65 : 1,
                    cursor: off ? "not-allowed" : "pointer",
                  }}
                >
                  {labels[status]}
                </button>

                {/* Results summary strip */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {result.resultRows.map((row: { label: string; value: string }, i: number) => (
                    <div key={i} style={{ background: "#f5f8ff", borderRadius: 10, border: "1px solid #dce8ff", padding: "10px 14px" }}>
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>{row.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#1848a0" }}>{row.value}</div>
                    </div>
                  ))}
                </div>

                {/* StepByStepSolution renderer */}
                <StepByStepSolution
                  steps={result.stepLines}
                  title=""
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    );
}
