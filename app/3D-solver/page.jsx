"use client";

import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useRouter } from "next/navigation";

/* ===================== Force System Logic (3D) ===================== */
class ForceSystem3D {
  constructor() { this.vectors = []; }

  addForce(magnitude, azimuthDeg, elevationDeg) {
    const az = (azimuthDeg * Math.PI) / 180;
    const el = (elevationDeg * Math.PI) / 180;
    const fx = magnitude * Math.cos(el) * Math.cos(az);
    const fy = magnitude * Math.cos(el) * Math.sin(az);
    const fz = magnitude * Math.sin(el);
    this.vectors.push({ fx, fy, fz, magnitude, azimuthDeg, elevationDeg });
  }

  stepByStepSolution() {
    const steps = [];
    steps.push("Step 1: Resolve each force into 3D components:");

    let sumFx = 0, sumFy = 0, sumFz = 0;

    this.vectors.forEach((v, i) => {
      steps.push(
        `\\text{Force ${i + 1}: } |F|=${v.magnitude}\\,\\text{kN},\\; \\phi=${v.azimuthDeg}^\\circ,\\; \\alpha=${v.elevationDeg}^\\circ`
      );
      steps.push(`
        \\begin{align*}
        F_{x${i + 1}} &= ${v.magnitude}\\cos(${v.elevationDeg}^\\circ)\\cos(${v.azimuthDeg}^\\circ) = ${v.fx.toFixed(3)}\\,\\text{kN} \\\\
        F_{y${i + 1}} &= ${v.magnitude}\\cos(${v.elevationDeg}^\\circ)\\sin(${v.azimuthDeg}^\\circ) = ${v.fy.toFixed(3)}\\,\\text{kN} \\\\
        F_{z${i + 1}} &= ${v.magnitude}\\sin(${v.elevationDeg}^\\circ) = ${v.fz.toFixed(3)}\\,\\text{kN}
        \\end{align*}
      `);
      sumFx += v.fx; sumFy += v.fy; sumFz += v.fz;
    });

    steps.push("Step 2: Sum of components:");
    steps.push(`
      \\begin{align*}
      \\Sigma F_x &= ${sumFx.toFixed(3)}\\,\\text{kN} \\\\
      \\Sigma F_y &= ${sumFy.toFixed(3)}\\,\\text{kN} \\\\
      \\Sigma F_z &= ${sumFz.toFixed(3)}\\,\\text{kN}
      \\end{align*}
    `);

    const R = Math.sqrt(sumFx ** 2 + sumFy ** 2 + sumFz ** 2);
    const azimuth = (Math.atan2(sumFy, sumFx) * 180) / Math.PI;
    const elevation = (Math.asin(sumFz / (R || 1)) * 180) / Math.PI;

    steps.push("Step 3: Resultant force:");
    steps.push(`
      \\begin{align*}
      R &= \\sqrt{(\\Sigma F_x)^2+(\\Sigma F_y)^2+(\\Sigma F_z)^2} \\\\
        &= ${R.toFixed(3)}\\,\\text{kN} \\\\
      \\phi &= \\tan^{-1}\\!\\left(\\tfrac{\\Sigma F_y}{\\Sigma F_x}\\right) = ${azimuth.toFixed(2)}^\\circ \\\\
      \\alpha &= \\sin^{-1}\\!\\left(\\tfrac{\\Sigma F_z}{R}\\right) = ${elevation.toFixed(2)}^\\circ
      \\end{align*}
    `);

    return { steps, sumFx, sumFy, sumFz, R, azimuth, elevation };
  }
}

/* ===================== Three.js helpers ===================== */
const FORCE_COLORS = [0x1848a0, 0xd63031, 0xe17055, 0x6c5ce7, 0x00b894, 0xfdcb6e];

function addArrow(scene, dir, length, color) {
  const n = dir.clone().normalize();
  const a = new THREE.ArrowHelper(n, new THREE.Vector3(0, 0, 0), Math.max(length, 0.01), color, length * 0.2, length * 0.12);
  scene.add(a);
  return a;
}

function buildBaseScene() {
  const scene = new THREE.Scene();
  scene.add(new THREE.GridHelper(6, 12, 0xcccccc, 0xe8e8e8));
  const axLen = 3;
  const mkAxis = (a, b, c) => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([a, b]),
    new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.5 })
  );
  scene.add(mkAxis(new THREE.Vector3(-axLen, 0, 0), new THREE.Vector3(axLen, 0, 0), 0xff4444));
  scene.add(mkAxis(new THREE.Vector3(0, -axLen, 0), new THREE.Vector3(0, axLen, 0), 0x22bb44));
  scene.add(mkAxis(new THREE.Vector3(0, 0, -axLen), new THREE.Vector3(0, 0, axLen), 0x2266ff));
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), new THREE.MeshBasicMaterial({ color: 0x333333 })));
  scene.add(new THREE.AmbientLight(0xffffff, 1));
  return scene;
}

function attachOrbit(canvas, state) {
  const onDown = (e) => { state.isDragging = true; state.prevMouse = { x: e.clientX, y: e.clientY }; };
  const onUp = () => { state.isDragging = false; };
  const onMove = (e) => {
    if (!state.isDragging) return;
    const dx = e.clientX - state.prevMouse.x;
    const dy = e.clientY - state.prevMouse.y;
    state.theta -= dx * 0.012;
    state.phi = Math.max(0.15, Math.min(Math.PI - 0.15, state.phi + dy * 0.012));
    state.prevMouse = { x: e.clientX, y: e.clientY };
  };
  const onWheel = (e) => { state.radius = Math.max(3, Math.min(16, state.radius + e.deltaY * 0.012)); };
  canvas.addEventListener("mousedown", onDown);
  canvas.addEventListener("wheel", onWheel, { passive: true });
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  return () => {
    canvas.removeEventListener("mousedown", onDown);
    canvas.removeEventListener("wheel", onWheel);
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };
}

/* ===================== Live FBD ===================== */
function FBD3D({ forces }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const arrowsRef = useRef([]);
  const orbitRef = useRef({ theta: 0.6, phi: 0.9, radius: 7, isDragging: false, prevMouse: { x: 0, y: 0 } });

  useEffect(() => {
    const el = mountRef.current;
    const W = el.clientWidth, H = el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);
    const scene = buildBaseScene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    const orbit = orbitRef.current;
    let raf;
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
    return () => {
      cancelAnimationFrame(raf);
      cleanup();
      renderer.dispose();
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current)
        mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

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
      const azR = (az * Math.PI) / 180, elR = (el * Math.PI) / 180;
      const vec = new THREE.Vector3(
        m * Math.cos(elR) * Math.cos(azR),
        m * Math.sin(elR),
        m * Math.cos(elR) * Math.sin(azR)
      );
      arrowsRef.current.push(addArrow(scene, vec, m * scale, FORCE_COLORS[i % FORCE_COLORS.length]));
    });
  }, [forces]);

  return (
    <div style={{ position: "relative", width: "100%", height: 300, background: "#f8f9fa", borderRadius: 8, border: "1px solid #dee2e6", overflow: "hidden" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%", cursor: "grab" }} />
      <div style={{ position: "absolute", top: 8, left: 10, fontSize: 11, color: "#666", lineHeight: 1.7, pointerEvents: "none", fontFamily: "monospace" }}>
        <span style={{ color: "#ff4444" }}>■</span> X &nbsp;
        <span style={{ color: "#22bb44" }}>■</span> Y &nbsp;
        <span style={{ color: "#2266ff" }}>■</span> Z
      </div>
      <div style={{ position: "absolute", bottom: 8, right: 10, fontSize: 10, color: "#aaa", pointerEvents: "none" }}>Drag to rotate · Scroll to zoom</div>
    </div>
  );
}

/* ===================== Resultant FBD ===================== */
function ResultantFBD3D({ forces, result }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);
    const scene = buildBaseScene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    const maxMag = Math.max(1, ...forces.map(f => parseFloat(f.magnitude) || 0), result.R);
    const scale = 2.5 / maxMag;
    forces.forEach((f, i) => {
      const m = parseFloat(f.magnitude), az = parseFloat(f.azimuth), el = parseFloat(f.elevation);
      if (isNaN(m) || isNaN(az) || isNaN(el) || m === 0) return;
      const azR = (az * Math.PI) / 180, elR = (el * Math.PI) / 180;
      const vec = new THREE.Vector3(m * Math.cos(elR) * Math.cos(azR), m * Math.sin(elR), m * Math.cos(elR) * Math.sin(azR));
      addArrow(scene, vec, m * scale, FORCE_COLORS[i % FORCE_COLORS.length]);
    });
    if (result.R > 0.001) {
      const rVec = new THREE.Vector3(result.sumFx, result.sumFz, result.sumFy);
      addArrow(scene, rVec, result.R * scale, 0x009900);
    }
    const orbit = { theta: 0.6, phi: 0.9, radius: 7, isDragging: false, prevMouse: { x: 0, y: 0 } };
    let raf;
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
    return () => {
      cancelAnimationFrame(raf);
      cleanup();
      renderer.dispose();
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current)
        mountRef.current.removeChild(renderer.domElement);
    };
  }, [forces, result]);

  return (
    <div style={{ position: "relative", width: "100%", height: 300, background: "#f8f9fa", borderRadius: 8, border: "1px solid #dee2e6", overflow: "hidden", marginTop: 8 }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%", cursor: "grab" }} />
      <div style={{ position: "absolute", top: 8, left: 10, fontSize: 11, color: "#009900", fontWeight: "bold", pointerEvents: "none" }}>— Resultant (R)</div>
      <div style={{ position: "absolute", bottom: 8, right: 10, fontSize: 10, color: "#aaa", pointerEvents: "none" }}>Drag to rotate · Scroll to zoom</div>
    </div>
  );
}

/* ===================== KaTeX renderer ===================== */
function MathBlock({ children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !window.katex) return;
    try {
      window.katex.render(children.trim(), ref.current, { displayMode: true, throwOnError: false });
    } catch (e) { }
  }, [children]);
  return <div ref={ref} style={{ overflowX: "auto", margin: "4px 0" }} />;
}

/* ===================== MAIN COMPONENT ===================== */
export default function Solver3D() {
  const router = useRouter();
  const [forces, setForces] = useState([{ magnitude: "", azimuth: "", elevation: "" }]);
  const [result, setResult] = useState(null);
  const [katexLoaded, setKatexLoaded] = useState(false);

  useEffect(() => {
    if (window.katex) { setKatexLoaded(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js";
    script.onload = () => setKatexLoaded(true);
    document.head.appendChild(script);
  }, []);

  const handleInputChange = (index, field, value) => {
    const newForces = [...forces];
    newForces[index][field] = value;
    setForces(newForces);
  };

  const calculateResultant = () => {
    const system = new ForceSystem3D();
    forces.forEach(f => {
      const m = parseFloat(f.magnitude), az = parseFloat(f.azimuth), el = parseFloat(f.elevation);
      if (!isNaN(m) && !isNaN(az) && !isNaN(el)) system.addForce(m, az, el);
    });
    setResult(system.stepByStepSolution());
  };

  const inputStyle = {
    width: "100%", marginTop: 4, borderRadius: 8, border: "1px solid #d1d5db",
    fontSize: 16, padding: "8px 10px", outline: "none", boxSizing: "border-box",
    fontFamily: "inherit",
  };
  const labelStyle = { display: "block", fontWeight: 500, fontSize: 16 };
  const cardStyle = {
    width: "100%", maxWidth: 580, background: "#fff", borderRadius: 16,
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)", padding: 24, marginTop: 20,
  };
  const navBtnStyle = (bg) => ({
    flex: 1,
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "12px 0",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "opacity 0.15s",
  });

  // NOTE: No <Header> or <Footer> here — this component is rendered inside
  // the 2D solver page which already provides the full page layout.
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", paddingBottom: 40 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", marginTop: 8, marginBottom: 20 }}>
        3D Resultant Force Calculator
      </h1>

      <div style={{ width: "100%", maxWidth: 580 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, textAlign: "center", marginBottom: 8 }}>Real-Time Free Body Diagram</h2>
        <FBD3D forces={forces} />

        {/* Inner navigation tabs */}
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button
            style={navBtnStyle("#1848a0")}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            3D Resultant (Angles)
          </button>
          <button
            style={navBtnStyle("#008409")}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            onClick={() => router.push("/3D-coordinate")}
          >
            3D Coordinate
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, marginTop: 0 }}>Force Setup</h2>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
          Enter each force with its <strong>azimuth</strong> (horizontal angle from +X, 0–360°) and <strong>elevation</strong> (vertical tilt, −90° to 90°).
        </div>

        {forces.map((f, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "end", marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Force {i + 1} (kN)</label>
              <input type="number" placeholder="Magnitude" value={f.magnitude}
                onChange={e => handleInputChange(i, "magnitude", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Azimuth (°)</label>
              <input type="number" placeholder="0–360°" value={f.azimuth}
                onChange={e => handleInputChange(i, "azimuth", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Elevation (°)</label>
              <input type="number" placeholder="−90–90°" value={f.elevation}
                onChange={e => handleInputChange(i, "elevation", e.target.value)} style={inputStyle} />
            </div>
            {forces.length > 1 && (
              <button onClick={() => setForces(forces.filter((_, idx) => idx !== i))}
                style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 18, marginBottom: 1 }}>–</button>
            )}
          </div>
        ))}

        <button onClick={() => setForces([...forces, { magnitude: "", azimuth: "", elevation: "" }])}
          style={{ width: "100%", background: "#008409", color: "#fff", border: "none", borderRadius: 8, padding: "12px 0", fontSize: 16, cursor: "pointer", marginBottom: 10, fontFamily: "inherit" }}>
          + Add Force
        </button>
        <button onClick={calculateResultant}
          style={{ width: "100%", background: "#1848a0", color: "#fff", border: "none", borderRadius: 8, padding: "12px 0", fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}>
          Calculate
        </button>
      </div>

      {result && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 14 }}>Resultant Force (kN)</h2>
          {[
            ["X component (Fx)", `${result.sumFx.toFixed(3)} kN`],
            ["Y component (Fy)", `${result.sumFy.toFixed(3)} kN`],
            ["Z component (Fz)", `${result.sumFz.toFixed(3)} kN`],
            ["Magnitude (R)", `${result.R.toFixed(3)} kN`],
            ["Azimuth angle (φ)", `${result.azimuth.toFixed(2)}°`],
            ["Elevation angle (α)", `${result.elevation.toFixed(2)}°`],
          ].map(([lbl, val]) => (
            <div key={lbl} style={{ marginBottom: 10 }}>
              <label style={labelStyle}>{lbl}</label>
              <input type="text" readOnly value={val} style={{ ...inputStyle, background: "#f9fafb", color: "#374151" }} />
            </div>
          ))}
        </div>
      )}

      {result && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>Step-by-Step Solution</h2>
          <div style={{ lineHeight: 1.8 }}>
            {result.steps.map((line, i) =>
              line.startsWith("Step") ? (
                <p key={i} style={{ fontWeight: 600, fontSize: 16, marginTop: 14, marginBottom: 4 }}>{line}</p>
              ) : katexLoaded ? (
                <MathBlock key={i}>{line}</MathBlock>
              ) : (
                <pre key={i} style={{ fontSize: 13, color: "#555" }}>{line}</pre>
              )
            )}
          </div>

          <div style={{ marginTop: 24 }}>
            <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
              Step 4: Final Free Body Diagram (All Forces + Resultant)
            </p>
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