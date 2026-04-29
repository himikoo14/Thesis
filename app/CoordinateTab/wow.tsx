"use client";

import { StepByStepSolution } from "<Ian>/components/StepByStep";
import { useRef, useEffect, useState } from "react";
import * as THREE from "three";

/* ================================================================
   DARK MODE HOOK — reactive to toggle
================================================================ */
function useDarkMode() {
  const [dark, setDark] = useState(
    typeof window !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark"))
    );
    obs.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/* ================================================================
   FORCE SYSTEM LOGIC
================================================================ */
class ForceSystem3D {
  vectors: any[] = [];

  addForce(magnitude: number, azimuthDeg: number, elevationDeg: number) {
    const az = (azimuthDeg * Math.PI) / 180;
    const el = (elevationDeg * Math.PI) / 180;
    this.vectors.push({
      fx: magnitude * Math.cos(el) * Math.cos(az),
      fy: magnitude * Math.cos(el) * Math.sin(az),
      fz: magnitude * Math.sin(el),
      magnitude, azimuthDeg, elevationDeg,
    });
  }

  solve() {
    const steps: string[] = [];
    steps.push("Step 1: Resolve each force into 3D components:");
    let sumFx = 0, sumFy = 0, sumFz = 0;
    this.vectors.forEach((v, i) => {
      steps.push(`\\text{Force ${i + 1}: }|F|=${v.magnitude}\\,\\text{kN},\\;\\phi=${v.azimuthDeg}^\\circ,\\;\\alpha=${v.elevationDeg}^\\circ`);
      steps.push(
        `\\begin{align*}` +
        `F_{x${i + 1}}&=${v.magnitude}\\cos(${v.elevationDeg}^\\circ)\\cos(${v.azimuthDeg}^\\circ)=${v.fx.toFixed(3)}\\,\\text{kN}\\\\` +
        `F_{y${i + 1}}&=${v.magnitude}\\cos(${v.elevationDeg}^\\circ)\\sin(${v.azimuthDeg}^\\circ)=${v.fy.toFixed(3)}\\,\\text{kN}\\\\` +
        `F_{z${i + 1}}&=${v.magnitude}\\sin(${v.elevationDeg}^\\circ)=${v.fz.toFixed(3)}\\,\\text{kN}` +
        `\\end{align*}`
      );
      sumFx += v.fx; sumFy += v.fy; sumFz += v.fz;
    });
    steps.push("Step 2: Sum of components:");
    steps.push(
      `\\begin{align*}` +
      `\\Sigma F_x&=${sumFx.toFixed(3)}\\,\\text{kN}\\\\` +
      `\\Sigma F_y&=${sumFy.toFixed(3)}\\,\\text{kN}\\\\` +
      `\\Sigma F_z&=${sumFz.toFixed(3)}\\,\\text{kN}` +
      `\\end{align*}`
    );
    const R = Math.sqrt(sumFx ** 2 + sumFy ** 2 + sumFz ** 2);
    const azimuth = (Math.atan2(sumFy, sumFx) * 180) / Math.PI;
    const elevation = (Math.asin(sumFz / (R || 1)) * 180) / Math.PI;
    steps.push("Step 3: Resultant force:");
    steps.push(
      `\\begin{align*}` +
      `R&=\\sqrt{(\\Sigma F_x)^2+(\\Sigma F_y)^2+(\\Sigma F_z)^2}=${R.toFixed(3)}\\,\\text{kN}\\\\` +
      `\\phi&=\\tan^{-1}\\!\\left(\\dfrac{\\Sigma F_y}{\\Sigma F_x}\\right)=${azimuth.toFixed(2)}^\\circ\\\\` +
      `\\alpha&=\\sin^{-1}\\!\\left(\\dfrac{\\Sigma F_z}{R}\\right)=${elevation.toFixed(2)}^\\circ` +
      `\\end{align*}`
    );
    if (R > 0.0001) {
      const alpha = (Math.acos(sumFx / R) * 180) / Math.PI;
      const beta = (Math.acos(sumFy / R) * 180) / Math.PI;
      const gamma = (Math.acos(sumFz / R) * 180) / Math.PI;
      steps.push("Step 4: Direction angles (α, β, γ):");
      steps.push(`\\alpha=\\cos^{-1}\\!\\left(\\dfrac{${sumFx.toFixed(3)}}{${R.toFixed(3)}}\\right)=${alpha.toFixed(2)}^\\circ`);
      steps.push(`\\beta=\\cos^{-1}\\!\\left(\\dfrac{${sumFy.toFixed(3)}}{${R.toFixed(3)}}\\right)=${beta.toFixed(2)}^\\circ`);
      steps.push(`\\gamma=\\cos^{-1}\\!\\left(\\dfrac{${sumFz.toFixed(3)}}{${R.toFixed(3)}}\\right)=${gamma.toFixed(2)}^\\circ`);
      steps.push(`\\cos^2\\alpha+\\cos^2\\beta+\\cos^2\\gamma=${((sumFx / R) ** 2 + (sumFy / R) ** 2 + (sumFz / R) ** 2).toFixed(3)}\\approx 1\\checkmark`);
    }
    return { steps, sumFx, sumFy, sumFz, R, azimuth, elevation };
  }
}

/* ================================================================
   THREE.JS HELPERS
================================================================ */
const FORCE_COLORS = [0x1848a0, 0xd63031, 0xe17055, 0x6c5ce7, 0x00b894, 0xfdcb6e];

function buildBaseScene(dark: boolean) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(dark ? 0x1f2937 : 0xffffff);
  scene.add(new THREE.GridHelper(6, 12, dark ? 0x4b5563 : 0xdddddd, dark ? 0x374151 : 0xeeeeee));
  const axLen = 3;
  const mkAxis = (a: THREE.Vector3, b: THREE.Vector3, c: number) =>
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([a, b]),
      new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.6 })
    );
  scene.add(mkAxis(new THREE.Vector3(-axLen, 0, 0), new THREE.Vector3(axLen, 0, 0), 0xff4444));
  scene.add(mkAxis(new THREE.Vector3(0, -axLen, 0), new THREE.Vector3(0, axLen, 0), 0x2266ff));
  scene.add(mkAxis(new THREE.Vector3(0, 0, -axLen), new THREE.Vector3(0, 0, axLen), 0x22bb44));
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 16, 16),
    new THREE.MeshBasicMaterial({ color: dark ? 0xffffff : 0x333333 })
  ));
  scene.add(new THREE.AmbientLight(0xffffff, 1));
  return scene;
}

function attachOrbit(canvas: HTMLElement, state: any) {
  const onDown = (e: MouseEvent) => { state.isDragging = true; state.prevMouse = { x: e.clientX, y: e.clientY }; };
  const onUp = () => { state.isDragging = false; };
  const onMove = (e: MouseEvent) => {
    if (!state.isDragging) return;
    state.theta -= (e.clientX - state.prevMouse.x) * 0.012;
    state.phi = Math.max(0.15, Math.min(Math.PI - 0.15, state.phi + (e.clientY - state.prevMouse.y) * 0.012));
    state.prevMouse = { x: e.clientX, y: e.clientY };
  };
  const onWheel = (e: WheelEvent) => { state.radius = Math.max(3, Math.min(16, state.radius + e.deltaY * 0.012)); };
  canvas.addEventListener("mousedown", onDown);
  canvas.addEventListener("wheel", onWheel as any, { passive: true });
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  return () => {
    canvas.removeEventListener("mousedown", onDown);
    canvas.removeEventListener("wheel", onWheel as any);
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };
}

/* ================================================================
   FBD3D — live canvas with reactive dark mode
================================================================ */
function FBD3D({ forces }: { forces: any[] }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendRef = useRef<THREE.WebGLRenderer | null>(null);
  const arrowsRef = useRef<THREE.ArrowHelper[]>([]);
  const orbitRef = useRef({ theta: -0.6, phi: 0.85, radius: 7, isDragging: false, prevMouse: { x: 0, y: 0 } });
  const darkMode = useDarkMode();

  // Mount once
  useEffect(() => {
    const el = mountRef.current!;
    const W = el.clientWidth, H = el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);
    rendRef.current = renderer;

    const scene = buildBaseScene(darkMode);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    const orbit = orbitRef.current;
    let raf: number;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      camera.position.set(
        orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta),
        orbit.radius * Math.cos(orbit.phi),
        orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta)
      );
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();
    const cleanup = attachOrbit(renderer.domElement, orbit);
    return () => { cancelAnimationFrame(raf); cleanup(); renderer.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement); };
  }, []);

  // React to dark mode toggle
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    (scene.background as THREE.Color).set(darkMode ? 0x1f2937 : 0xffffff);
    scene.children.forEach(child => {
      if (child instanceof THREE.GridHelper) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m: any) => m.color?.set(darkMode ? 0x4b5563 : 0xdddddd));
      }
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry) {
        (child.material as THREE.MeshBasicMaterial).color.set(darkMode ? 0xffffff : 0x333333);
      }
    });
  }, [darkMode]);

  // Update arrows when forces change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    arrowsRef.current.forEach(a => scene.remove(a));
    arrowsRef.current = [];
    const maxMag = Math.max(1, ...forces.map(f => parseFloat(f.magnitude) || 0));
    const scale = 2.5 / maxMag;
    forces.forEach((f, i) => {
      const m = parseFloat(f.magnitude), az = parseFloat(f.azimuth), el = parseFloat(f.elevation);
      if (isNaN(m) || isNaN(az) || isNaN(el) || m === 0) return;
      const azR = az * Math.PI / 180, elR = el * Math.PI / 180;
      const vec = new THREE.Vector3(m * Math.cos(elR) * Math.cos(azR), m * Math.sin(elR), m * Math.cos(elR) * Math.sin(azR));
      const arr = new THREE.ArrowHelper(vec.clone().normalize(), new THREE.Vector3(0, 0, 0), m * scale, FORCE_COLORS[i % FORCE_COLORS.length], m * scale * 0.2, m * scale * 0.12);
      scene.add(arr);
      arrowsRef.current.push(arr);
    });
  }, [forces]);

  return (
    <div className="relative w-full h-[260px] sm:h-[300px] rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden mt-2">
      <div ref={mountRef} className="w-full h-full cursor-grab" />
      <div className="absolute top-2 left-2.5 text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 pointer-events-none font-mono">
        <span className="text-[#ff4444]">■</span> X &nbsp;
        <span className="text-[#22bb44]">■</span> Y &nbsp;
        <span className="text-[#2266ff]">■</span> Z
      </div>
      <div className="absolute bottom-2 right-2.5 text-[10px] text-gray-400 pointer-events-none hidden sm:block">
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}

/* ================================================================
   RESULTANT FBD3D — with reactive dark mode
================================================================ */
function ResultantFBD3D({ forces, result }: { forces: any[]; result: any }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const darkMode = useDarkMode();

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);

    const scene = buildBaseScene(darkMode);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    const maxMag = Math.max(1, ...forces.map(f => parseFloat(f.magnitude) || 0), result.R);
    const scale = 2.5 / maxMag;

    forces.forEach((f, i) => {
      const m = parseFloat(f.magnitude), az = parseFloat(f.azimuth), el = parseFloat(f.elevation);
      if (isNaN(m) || isNaN(az) || isNaN(el) || m === 0) return;
      const azR = az * Math.PI / 180, elR = el * Math.PI / 180;
      const vec = new THREE.Vector3(m * Math.cos(elR) * Math.cos(azR), m * Math.sin(elR), m * Math.cos(elR) * Math.sin(azR));
      scene.add(new THREE.ArrowHelper(vec.clone().normalize(), new THREE.Vector3(0, 0, 0), m * scale, FORCE_COLORS[i % FORCE_COLORS.length], m * scale * 0.2, m * scale * 0.12));
    });
    if (result.R > 0.001) {
      const rv = new THREE.Vector3(result.sumFx, result.sumFz, result.sumFy);
      scene.add(new THREE.ArrowHelper(rv.clone().normalize(), new THREE.Vector3(0, 0, 0), result.R * scale, 0x009900, result.R * scale * 0.2, result.R * scale * 0.12));
    }

    const orbit = { theta: -0.6, phi: 0.85, radius: 7, isDragging: false, prevMouse: { x: 0, y: 0 } };
    let raf: number;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      camera.position.set(
        orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta),
        orbit.radius * Math.cos(orbit.phi),
        orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta)
      );
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();
    const cleanup = attachOrbit(renderer.domElement, orbit);
    return () => { cancelAnimationFrame(raf); cleanup(); renderer.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement); };
  }, [forces, result]);

  // React to dark mode toggle
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    (scene.background as THREE.Color).set(darkMode ? 0x1f2937 : 0xffffff);
    scene.children.forEach(child => {
      if (child instanceof THREE.GridHelper) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m: any) => m.color?.set(darkMode ? 0x4b5563 : 0xdddddd));
      }
    });
  }, [darkMode]);

  return (
    <div className="relative w-full h-[260px] sm:h-[300px] rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden mt-2">
      <div ref={mountRef} className="w-full h-full cursor-grab" />
      <div className="absolute top-2 left-2.5 text-[11px] font-bold text-[#009900] pointer-events-none">
        — Resultant (R)
      </div>
      <div className="absolute bottom-2 right-2.5 text-[10px] text-gray-400 pointer-events-none hidden sm:block">
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}

/* ================================================================
   KATEX
================================================================ */
function useMathJax() {
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

function MathBlock({ tex }: { tex: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !(window as any).katex) return;
    try { (window as any).katex.render(tex.trim(), ref.current, { displayMode: true, throwOnError: false }); } catch (_) { }
  }, [tex]);
  return <div ref={ref} className="overflow-x-auto my-1" />;
}

/* ================================================================
   MAIN EXPORT
================================================================ */
export default function AnglesTab() {
  const [forces, setForces] = useState([{ magnitude: "", azimuth: "", elevation: "" }]);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const katexOk = useMathJax();

  const off = status === "generating";
  const labels: Record<typeof status, string> = {
    idle: "⬇ Download Solution as PDF",
    generating: "⏳ Opening print view…",
    done: "✅ Done!",
    error: "❌ Export failed — try again",
  };

  const resultRows = result ? [
    { label: "X component (Fx)", value: `${result.sumFx.toFixed(3)} kN` },
    { label: "Y component (Fy)", value: `${result.sumFy.toFixed(3)} kN` },
    { label: "Z component (Fz)", value: `${result.sumFz.toFixed(3)} kN` },
    { label: "Magnitude (R)", value: `${result.R.toFixed(3)} kN` },
    { label: "Azimuth (φ)", value: `${result.azimuth.toFixed(2)}°` },
    { label: "Elevation (α)", value: `${result.elevation.toFixed(2)}°` },
    { label: "α (angle with X)", value: `${(Math.acos(result.sumFx / result.R) * 180 / Math.PI).toFixed(2)}°` },
    { label: "β (angle with Y)", value: `${(Math.acos(result.sumFy / result.R) * 180 / Math.PI).toFixed(2)}°` },
    { label: "γ (angle with Z)", value: `${(Math.acos(result.sumFz / result.R) * 180 / Math.PI).toFixed(2)}°` },
  ] : [];

  const handleExportPDF = () => {
    if (!result) return;
    setStatus("generating");
    const payload = { steps: result.steps, resultRows, forces, result: { sumFx: result.sumFx, sumFy: result.sumFy, sumFz: result.sumFz, R: result.R, azimuth: result.azimuth, elevation: result.elevation } };
    window.open(`/print/resultant-3dAzimuth?data=${encodeURIComponent(JSON.stringify(payload))}`, "_blank");
    setStatus("done");
    setTimeout(() => setStatus("idle"), 2500);
  };

  const update = (i: number, field: string, value: string) =>
    setForces(f => f.map((v, j) => j === i ? { ...v, [field]: value } : v));

const calculate = () => {
  const sys = new ForceSystem3D();
  forces.forEach(f => {
    const m = parseFloat(f.magnitude), az = parseFloat(f.azimuth), el = parseFloat(f.elevation);
    if (!isNaN(m) && !isNaN(az) && !isNaN(el)) sys.addForce(m, az, el);
  });
  const solved = sys.solve();
  const { sumFx, sumFy, sumFz, R, azimuth, elevation, steps } = solved;

  setResult({
    ...solved,
    stepLines: steps.map(line =>
      line.startsWith("Step")
        ? { type: "heading" as const, text: line }
        : { type: "math" as const, tex: line }
    ),
    resultRows: [
      { label: "X component (Fx)", value: `${sumFx.toFixed(3)} kN` },
      { label: "Y component (Fy)", value: `${sumFy.toFixed(3)} kN` },
      { label: "Z component (Fz)", value: `${sumFz.toFixed(3)} kN` },
      { label: "Magnitude (R)", value: `${R.toFixed(3)} kN` },
      { label: "Azimuth (φ)", value: `${azimuth.toFixed(2)}°` },
      { label: "Elevation (α)", value: `${elevation.toFixed(2)}°` },
      { label: "α (angle with X)", value: `${(Math.acos(sumFx / R) * 180 / Math.PI).toFixed(2)}°` },
      { label: "β (angle with Y)", value: `${(Math.acos(sumFy / R) * 180 / Math.PI).toFixed(2)}°` },
      { label: "γ (angle with Z)", value: `${(Math.acos(sumFz / R) * 180 / Math.PI).toFixed(2)}°` },
    ],
  });
};

  const inputCls = "w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-600 text-[15px] p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none";
  const labelCls = "block font-medium text-[14px] sm:text-[15px] text-gray-800 dark:text-gray-200";
  const h3Cls = "text-[15px] sm:text-[16px] font-semibold mb-3 text-gray-900 dark:text-white";
  const cardCls = "w-full bg-white dark:bg-gray-800 rounded-2xl shadow p-4 sm:p-6 mt-4";

  return (
<div className="flex flex-col items-center w-full" style={{ scrollbarGutter: "stable" }}>

  {/* Canvas */}
  <div className="w-full max-w-xl">
    <h2 className="text-[17px] sm:text-[18px] font-semibold text-center mb-2 text-gray-900 dark:text-white">
      Azimuth-Elevation Method
    </h2>
    <p className="text-[12px] sm:text-[13px] text-gray-500 dark:text-gray-400 text-center mb-3">
      Real-Time Free Body Diagram
    </p>
    <FBD3D forces={forces} />
  </div>

  {/* Inputs */}
  <div className={`${cardCls} max-w-xl`}>
    <h2 className="text-[17px] sm:text-[18px] font-semibold mb-3 mt-0 text-gray-900 dark:text-white">
      Force Setup
    </h2>
    <p className="text-[12px] sm:text-[13px] text-gray-500 dark:text-gray-400 mb-4 mt-0">
      Enter each force with its <strong>azimuth</strong> (0–360°) and <strong>elevation</strong> (−90° to 90°).
    </p>

    {forces.map((f, i) => (
      <div key={i} className="mb-4 p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
        <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 mb-2">
          <div>
            <label className={labelCls}>Force {i + 1} (kN)</label>
            <input type="number" placeholder="Magnitude" value={f.magnitude}
              onChange={e => update(i, "magnitude", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Azimuth (°)</label>
            <input type="number" placeholder="0–360°" value={f.azimuth}
              onChange={e => update(i, "azimuth", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Elevation (°)</label>
            <input type="number" placeholder="−90–90°" value={f.elevation}
              onChange={e => update(i, "elevation", e.target.value)} className={inputCls} />
          </div>
        </div>
        {forces.length > 1 && (
          <div className="flex justify-end">
            <button onClick={() => setForces(f => f.filter((_, j) => j !== i))}
              className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-1.5 text-[13px] transition">
              – Remove
            </button>
          </div>
        )}
      </div>
    ))}

    <button onClick={() => setForces(f => [...f, { magnitude: "", azimuth: "", elevation: "" }])}
      className="w-full bg-[#008409] hover:bg-[#15711b] text-white rounded-lg py-2.5 text-[15px] cursor-pointer mb-2.5 transition">
      + Add Force
    </button>
    <button onClick={calculate}
      className="w-full bg-[#1848a0] hover:bg-[#163d8a] text-white rounded-lg py-2.5 text-[15px] cursor-pointer transition">
      Calculate
    </button>
  </div>

  {/* Solution */}
  {result && (
    <>
      {/* ── WIDE SCREEN (sm+): stacked layout ── */}
      <div className="hidden sm:flex flex-col gap-4 mt-4 w-full max-w-xl">
        {/* Top: result grid */}
        <div className={cardCls}>
          <h3 className={h3Cls}>Results</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {result.resultRows.map((row: { label: string; value: string }, i: number) => (
              <div key={i} className="bg-blue-50 dark:bg-gray-700 rounded-[10px] border border-blue-100 dark:border-gray-600 px-3 py-2.5">
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">{row.label}</div>
                <div className="text-[15px] font-bold text-[#1848a0] dark:text-blue-400">{row.value}</div>
              </div>
            ))}
          </div>
          <button onClick={handleExportPDF} disabled={off}
            className={`w-full py-3 rounded-[10px] text-[14px] font-semibold text-white transition ${
              off ? "opacity-60 cursor-not-allowed bg-[#1848a0]" : "cursor-pointer bg-[#1848a0] hover:bg-[#163d8a]"
            }`}>
            {labels[status]}
          </button>
        </div>

        {/* Bottom: step-by-step */}
        <div className={cardCls}>
          <h3 className={h3Cls}>Step-by-Step Solution</h3>
          <div className="space-y-4">
            {result.steps.map((line: string, i: number) =>
              line.startsWith("Step") ? (
                <p key={i} className="font-medium text-[16px] text-gray-900 dark:text-white">{line}</p>
              ) : katexOk ? (
                <MathBlock key={i} tex={line} />
              ) : (
                <pre key={i} className="text-[13px] text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{line}</pre>
              )
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE (below sm): compact stacked layout ── */}
      <div className="flex sm:hidden flex-col gap-3 mt-4 w-full max-w-xl">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-3">
          <h3 className="text-[11px] font-semibold mb-2 text-gray-900 dark:text-white">Results</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {result.resultRows.map((row: { label: string; value: string }, i: number) => (
              <div key={i} className="bg-blue-50 dark:bg-gray-700 rounded-[6px] border border-blue-100 dark:border-gray-600 px-2 py-1.5">
                <div className="text-[9px] text-gray-500 dark:text-gray-400 mb-0.5 leading-tight">{row.label}</div>
                <div className="text-[12px] font-bold text-[#1848a0] dark:text-blue-400">{row.value}</div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleExportPDF} disabled={off}
          className={`w-full rounded-lg px-3 py-2 font-semibold text-white transition text-[12px] ${
            off ? "cursor-not-allowed bg-[#1848a0]/60" : "bg-[#1848a0] hover:bg-[#163d8a]"
          }`}>
          {labels[status]}
        </button>

        <div className="overflow-x-auto text-[11px]">
          <StepByStepSolution steps={result.stepLines} title="Step-by-Step Solution" />
        </div>
      </div>
    </>
  )}
</div>
  );
}