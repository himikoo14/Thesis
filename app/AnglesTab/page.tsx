"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { StepByStepPDFExport} from "../ToPDF/Page";

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
    return { steps, sumFx, sumFy, sumFz, R, azimuth, elevation };
  }
}

/* ================================================================
   THREE.JS HELPERS
================================================================ */
const FORCE_COLORS = [0x1848a0, 0xd63031, 0xe17055, 0x6c5ce7, 0x00b894, 0xfdcb6e];

function buildBaseScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfafafa);
  scene.add(new THREE.GridHelper(6, 12, 0xdddddd, 0xeeeeee));
  const axLen = 3;
  const mkAxis = (a: THREE.Vector3, b: THREE.Vector3, c: number) =>
    new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.5 }));
  scene.add(mkAxis(new THREE.Vector3(-axLen, 0, 0), new THREE.Vector3(axLen, 0, 0), 0xff4444));
  scene.add(mkAxis(new THREE.Vector3(0, -axLen, 0), new THREE.Vector3(0, axLen, 0), 0x22bb44));
  scene.add(mkAxis(new THREE.Vector3(0, 0, -axLen), new THREE.Vector3(0, 0, axLen), 0x2266ff));
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), new THREE.MeshBasicMaterial({ color: 0x333333 })));
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
   LIVE FBD CANVAS
================================================================ */
function FBD3D({ forces }: { forces: any[] }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const arrowsRef = useRef<THREE.ArrowHelper[]>([]);
  const orbitRef = useRef({ theta: 0.6, phi: 0.9, radius: 7, isDragging: false, prevMouse: { x: 0, y: 0 } });

  useEffect(() => {
    const el = mountRef.current!;
    const W = el.clientWidth, H = el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H); renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);
    const scene = buildBaseScene(); sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    const orbit = orbitRef.current;
    let raf: number;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      camera.position.set(orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta), orbit.radius * Math.cos(orbit.phi), orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta));
      camera.lookAt(0, 0, 0); renderer.render(scene, camera);
    };
    animate();
    const cleanup = attachOrbit(renderer.domElement, orbit);
    return () => { cancelAnimationFrame(raf); cleanup(); renderer.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement); };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current; if (!scene) return;
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
      scene.add(arr); arrowsRef.current.push(arr);
    });
  }, [forces]);

  return (
    <div style={{ position: "relative", width: "100%", height: 300, background: "#f8f9fa", borderRadius: 8, border: "1px solid #dee2e6", overflow: "hidden" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%", cursor: "grab" }} />
      <div style={{ position: "absolute", top: 8, left: 10, fontSize: 11, color: "#666", pointerEvents: "none", fontFamily: "monospace" }}>
        <span style={{ color: "#ff4444" }}>■</span> X &nbsp;<span style={{ color: "#22bb44" }}>■</span> Y &nbsp;<span style={{ color: "#2266ff" }}>■</span> Z
      </div>
      <div style={{ position: "absolute", bottom: 8, right: 10, fontSize: 10, color: "#aaa", pointerEvents: "none" }}>Drag to rotate · Scroll to zoom</div>
    </div>
  );
}

/* ================================================================
   RESULTANT FBD (shown after calculation)
================================================================ */
function ResultantFBD3D({ forces, result }: { forces: any[]; result: any }) {
  const mountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = mountRef.current; if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H); renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);
    const scene = buildBaseScene();
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
    const orbit = { theta: 0.6, phi: 0.9, radius: 7, isDragging: false, prevMouse: { x: 0, y: 0 } };
    let raf: number;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      camera.position.set(orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta), orbit.radius * Math.cos(orbit.phi), orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta));
      camera.lookAt(0, 0, 0); renderer.render(scene, camera);
    };
    animate();
    const cleanup = attachOrbit(renderer.domElement, orbit);
    return () => { cancelAnimationFrame(raf); cleanup(); renderer.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement); };
  }, [forces, result]);

  return (
    <div style={{ position: "relative", width: "100%", height: 300, background: "#f8f9fa", borderRadius: 8, border: "1px solid #dee2e6", overflow: "hidden", marginTop: 8 }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%", cursor: "grab" }} />
      <div style={{ position: "absolute", top: 8, left: 10, fontSize: 11, color: "#009900", fontWeight: "bold", pointerEvents: "none" }}>— Resultant (R)</div>
      <div style={{ position: "absolute", bottom: 8, right: 10, fontSize: 10, color: "#aaa", pointerEvents: "none" }}>Drag to rotate · Scroll to zoom</div>
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
  return <div ref={ref} style={{ overflowX: "auto", margin: "4px 0" }} />;
}

/* ================================================================
   MAIN EXPORT
================================================================ */
export default function AnglesTab() {
  const [forces, setForces] = useState([{ magnitude: "", azimuth: "", elevation: "" }]);
  const [result, setResult] = useState<any>(null);
  const katexOk = useMathJax();

  const resultRows = result ? [
    { label: "X component (Fx)", value: `${result.sumFx.toFixed(3)} kN` },
    { label: "Y component (Fy)", value: `${result.sumFy.toFixed(3)} kN` },
    { label: "Z component (Fz)", value: `${result.sumFz.toFixed(3)} kN` },
    { label: "Magnitude (R)", value: `${result.R.toFixed(3)} kN` },
    { label: "Azimuth (φ)", value: `${result.azimuth.toFixed(2)}°` },
    { label: "Elevation (α)", value: `${result.elevation.toFixed(2)}°` },
  ] : [];

  const update = (i: number, field: string, value: string) =>
    setForces(f => f.map((v, j) => j === i ? { ...v, [field]: value } : v));

  const calculate = () => {
    const sys = new ForceSystem3D();
    forces.forEach(f => {
      const m = parseFloat(f.magnitude), az = parseFloat(f.azimuth), el = parseFloat(f.elevation);
      if (!isNaN(m) && !isNaN(az) && !isNaN(el)) sys.addForce(m, az, el);
    });
    setResult(sys.solve());
  };

  const inp: React.CSSProperties = { width: "100%", marginTop: 4, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 16, padding: "8px 10px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  const lbl: React.CSSProperties = { display: "block", fontWeight: 500, fontSize: 16 };
  const card: React.CSSProperties = { width: "100%", background: "#fff", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", padding: 24, marginTop: 20 };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>

      {/* Canvas */}
      <div style={{ width: "100%", maxWidth: 580 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, textAlign: "center", marginBottom: 8 }}>Azimuth-Elevation Method</h2>
        <p style={{ color: "#888", fontSize: 13, textAlign: "center", marginTop: 0, marginBottom: 12 }}>Real-Time Free Body Diagram</p>
        <FBD3D forces={forces} />
      </div>

      {/* Inputs */}
      <div style={{ ...card, maxWidth: 580 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, marginTop: 0 }}>Force Setup</h2>
        <p style={{ fontSize: 13, color: "#666", marginBottom: 16, marginTop: 0 }}>
          Enter each force with its <strong>azimuth</strong> (horizontal angle from +X, 0–360°) and <strong>elevation</strong> (vertical tilt, −90° to 90°).
        </p>
        {forces.map((f, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "end", marginBottom: 14 }}>
            <div>
              <label style={lbl}>Force {i + 1} (kN)</label>
              <input type="number" placeholder="Magnitude" value={f.magnitude} onChange={e => update(i, "magnitude", e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Azimuth (°)</label>
              <input type="number" placeholder="0–360°" value={f.azimuth} onChange={e => update(i, "azimuth", e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Elevation (°)</label>
              <input type="number" placeholder="−90–90°" value={f.elevation} onChange={e => update(i, "elevation", e.target.value)} style={inp} />
            </div>
            {forces.length > 1 && (
              <button onClick={() => setForces(f => f.filter((_, j) => j !== i))}
                style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 18 }}>–</button>
            )}
          </div>
        ))}
        <button onClick={() => setForces(f => [...f, { magnitude: "", azimuth: "", elevation: "" }])}
          style={{ width: "100%", background: "#008409", color: "#fff", border: "none", borderRadius: 8, padding: "12px 0", fontSize: 16, cursor: "pointer", marginBottom: 10, fontFamily: "inherit" }}>
          + Add Force
        </button>
        <button onClick={calculate}
          style={{ width: "100%", background: "#1848a0", color: "#fff", border: "none", borderRadius: 8, padding: "12px 0", fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}>
          Calculate
        </button>
      </div>

      {/* Results */}
      {result && (


        <div style={{ ...card, maxWidth: 580 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 14 }}>Resultant Force</h2>
          {[
            ["X component (Fx)", `${result.sumFx.toFixed(3)} kN`],
            ["Y component (Fy)", `${result.sumFy.toFixed(3)} kN`],
            ["Z component (Fz)", `${result.sumFz.toFixed(3)} kN`],
            ["Magnitude (R)", `${result.R.toFixed(3)} kN`],
            ["Azimuth (φ)", `${result.azimuth.toFixed(2)}°`],
            ["Elevation (α)", `${result.elevation.toFixed(2)}°`],
          ].map(([label, val]) => (
            <div key={label} style={{ marginBottom: 10 }}>
              <label style={lbl}>{label}</label>
              <input readOnly value={val} style={{ ...inp, background: "#f9fafb", color: "#374151" }} />
            </div>
          ))}
        </div>
      )}

      {/* Step-by-step */}
      {result && (
        <div style={{ ...card, maxWidth: 580 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>Step-by-Step Solution</h2>

          <StepByStepPDFExport
            title="3D Resultant Force — Step-by-Step Solution"
            filename="resultant-3d.pdf"
            steps={result.steps}
            resultRows={resultRows}
          />

          <div style={{ lineHeight: 1.8 }}>
            {result.steps.map((line: string, i: number) =>
              line.startsWith("Step") ? (
                <p key={i} style={{ fontWeight: 600, fontSize: 16, marginTop: 14, marginBottom: 4 }}>{line}</p>
              ) : katexOk ? (
                <MathBlock key={i} tex={line} />
              ) : (
                <pre key={i} style={{ fontSize: 13, color: "#555" }}>{line}</pre>
              )
            )}
          </div>
          <div style={{ marginTop: 24 }}>
            <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Step 4: Final Free Body Diagram (All Forces + Resultant)</p>
            <ResultantFBD3D forces={forces} result={result} />
            <div style={{ marginTop: 8, fontSize: 13, color: "#666", textAlign: "center" }}>
              <span style={{ color: "#1848a0", fontWeight: 600 }}>■</span> Input Forces &nbsp;&nbsp;
              <span style={{ color: "#009900", fontWeight: 600 }}>■</span> Resultant R
            </div>
          </div>
        </div>
      )}
    </div>
  );
}