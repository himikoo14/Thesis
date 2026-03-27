"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";

/* ===================== TYPES (for coordinate tab) ===================== */
// Point: { label, x, y, z }
// Force: { mag, from, to }

/* ===================== Force System Logic (Angles tab) ===================== */
class ForceSystem3D {
  constructor() { this.vectors = []; }
  addForce(magnitude, azimuthDeg, elevationDeg) {
    const az = (azimuthDeg * Math.PI) / 180;
    const el = (elevationDeg * Math.PI) / 180;
    this.vectors.push({
      fx: magnitude * Math.cos(el) * Math.cos(az),
      fy: magnitude * Math.cos(el) * Math.sin(az),
      fz: magnitude * Math.sin(el),
      magnitude, azimuthDeg, elevationDeg,
    });
  }
  stepByStepSolution() {
    const steps = [];
    steps.push("Step 1: Resolve each force into 3D components:");
    let sumFx = 0, sumFy = 0, sumFz = 0;
    this.vectors.forEach((v, i) => {
      steps.push(`\\text{Force ${i + 1}: } |F|=${v.magnitude}\\,\\text{kN},\\; \\phi=${v.azimuthDeg}^\\circ,\\; \\alpha=${v.elevationDeg}^\\circ`);
      steps.push(`\\begin{align*}F_{x${i + 1}}&=${v.magnitude}\\cos(${v.elevationDeg}^\\circ)\\cos(${v.azimuthDeg}^\\circ)=${v.fx.toFixed(3)}\\,\\text{kN}\\\\F_{y${i + 1}}&=${v.magnitude}\\cos(${v.elevationDeg}^\\circ)\\sin(${v.azimuthDeg}^\\circ)=${v.fy.toFixed(3)}\\,\\text{kN}\\\\F_{z${i + 1}}&=${v.magnitude}\\sin(${v.elevationDeg}^\\circ)=${v.fz.toFixed(3)}\\,\\text{kN}\\end{align*}`);
      sumFx += v.fx; sumFy += v.fy; sumFz += v.fz;
    });
    steps.push("Step 2: Sum of components:");
    steps.push(`\\begin{align*}\\Sigma F_x&=${sumFx.toFixed(3)}\\,\\text{kN}\\\\\\Sigma F_y&=${sumFy.toFixed(3)}\\,\\text{kN}\\\\\\Sigma F_z&=${sumFz.toFixed(3)}\\,\\text{kN}\\end{align*}`);
    const R = Math.sqrt(sumFx ** 2 + sumFy ** 2 + sumFz ** 2);
    const azimuth = (Math.atan2(sumFy, sumFx) * 180) / Math.PI;
    const elevation = (Math.asin(sumFz / (R || 1)) * 180) / Math.PI;
    steps.push("Step 3: Resultant force:");
    steps.push(`\\begin{align*}R&=\\sqrt{(\\Sigma F_x)^2+(\\Sigma F_y)^2+(\\Sigma F_z)^2}=${R.toFixed(3)}\\,\\text{kN}\\\\\\phi&=\\tan^{-1}\\!\\left(\\tfrac{\\Sigma F_y}{\\Sigma F_x}\\right)=${azimuth.toFixed(2)}^\\circ\\\\\\alpha&=\\sin^{-1}\\!\\left(\\tfrac{\\Sigma F_z}{R}\\right)=${elevation.toFixed(2)}^\\circ\\end{align*}`);
    return { steps, sumFx, sumFy, sumFz, R, azimuth, elevation };
  }
}

/* ===================== Shared Three.js helpers ===================== */
const FORCE_COLORS = [0x1848a0, 0xd63031, 0xe17055, 0x6c5ce7, 0x00b894, 0xfdcb6e];

function addArrow(scene, dir, length, color) {
  const n = dir.clone().normalize();
  const a = new THREE.ArrowHelper(n, new THREE.Vector3(0, 0, 0), Math.max(length, 0.01), color, length * 0.2, length * 0.12);
  scene.add(a);
  return a;
}

function buildBaseScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfafafa);
  scene.add(new THREE.GridHelper(6, 12, 0xdddddd, 0xeeeeee));
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
    state.theta -= (e.clientX - state.prevMouse.x) * 0.012;
    state.phi = Math.max(0.15, Math.min(Math.PI - 0.15, state.phi + (e.clientY - state.prevMouse.y) * 0.012));
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

/* ===================== Angles Tab — Live FBD ===================== */
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
      camera.position.set(orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta), orbit.radius * Math.cos(orbit.phi), orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta));
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();
    const cleanup = attachOrbit(renderer.domElement, orbit);
    return () => { cancelAnimationFrame(raf); cleanup(); renderer.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement); };
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
      const vec = new THREE.Vector3(m * Math.cos(elR) * Math.cos(azR), m * Math.sin(elR), m * Math.cos(elR) * Math.sin(azR));
      arrowsRef.current.push(addArrow(scene, vec, m * scale, FORCE_COLORS[i % FORCE_COLORS.length]));
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

function ResultantFBD3D({ forces, result }) {
  const mountRef = useRef(null);
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
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
      const azR = (az * Math.PI) / 180, elR = (el * Math.PI) / 180;
      addArrow(scene, new THREE.Vector3(m * Math.cos(elR) * Math.cos(azR), m * Math.sin(elR), m * Math.cos(elR) * Math.sin(azR)), m * scale, FORCE_COLORS[i % FORCE_COLORS.length]);
    });
    if (result.R > 0.001) addArrow(scene, new THREE.Vector3(result.sumFx, result.sumFz, result.sumFy), result.R * scale, 0x009900);
    const orbit = { theta: 0.6, phi: 0.9, radius: 7, isDragging: false, prevMouse: { x: 0, y: 0 } };
    let raf;
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

function MathBlock({ children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !window.katex) return;
    try { window.katex.render(children.trim(), ref.current, { displayMode: true, throwOnError: false }); } catch (e) { }
  }, [children]);
  return <div ref={ref} style={{ overflowX: "auto", margin: "4px 0" }} />;
}

/* ===================== Angles Tab Content ===================== */
function AnglesTab() {
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

  const inputStyle = { width: "100%", marginTop: 4, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 16, padding: "8px 10px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  const labelStyle = { display: "block", fontWeight: 500, fontSize: 16 };
  const cardStyle = { width: "100%", background: "#fff", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", padding: 24, marginTop: 20 };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      <div style={{ width: "100%", maxWidth: 580 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, textAlign: "center", marginBottom: 8 }}>Azimuth-Elevation Method</h2>
        <p style={{ color: "#888", fontSize: 13, marginTop: 6, textAlign: "center" }}>Real-Time Free Body Diagram</p>
        <FBD3D forces={forces} />
      </div>

      <div style={{ ...cardStyle, maxWidth: 580 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, marginTop: 0 }}>Force Setup</h2>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
          Enter each force with its <strong>azimuth</strong> (horizontal angle from +X, 0–360°) and <strong>elevation</strong> (vertical tilt, −90° to 90°).
        </div>
        {forces.map((f, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "end", marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Force {i + 1} (kN)</label>
              <input type="number" placeholder="Magnitude" value={f.magnitude} onChange={e => handleInputChange(i, "magnitude", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Azimuth (°)</label>
              <input type="number" placeholder="0–360°" value={f.azimuth} onChange={e => handleInputChange(i, "azimuth", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Elevation (°)</label>
              <input type="number" placeholder="−90–90°" value={f.elevation} onChange={e => handleInputChange(i, "elevation", e.target.value)} style={inputStyle} />
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
        <div style={{ ...cardStyle, maxWidth: 580 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 14 }}>Resultant Force (kN)</h2>
          {[["X component (Fx)", `${result.sumFx.toFixed(3)} kN`], ["Y component (Fy)", `${result.sumFy.toFixed(3)} kN`], ["Z component (Fz)", `${result.sumFz.toFixed(3)} kN`], ["Magnitude (R)", `${result.R.toFixed(3)} kN`], ["Azimuth angle (φ)", `${result.azimuth.toFixed(2)}°`], ["Elevation angle (α)", `${result.elevation.toFixed(2)}°`]].map(([lbl, val]) => (
            <div key={lbl} style={{ marginBottom: 10 }}>
              <label style={labelStyle}>{lbl}</label>
              <input type="text" readOnly value={val} style={{ ...inputStyle, background: "#f9fafb", color: "#374151" }} />
            </div>
          ))}
        </div>
      )}

      {result && (
        <div style={{ ...cardStyle, maxWidth: 580 }}>
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

/* ===================== Coordinate Tab — Three.js Canvas ===================== */
function CoordThreeCanvas({ points, forces }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const orbitRef = useRef({ theta: 0.7, phi: 1.1, r: 6, isDragging: false, prev: { x: 0, y: 0 } });
  const dynamicGroupRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth || 500, H = el.clientHeight || 320;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H); renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfafafa);
    scene.add(new THREE.GridHelper(6, 12, 0xdddddd, 0xeeeeee));
    scene.add(new THREE.HemisphereLight(0xffffff, 0xe0e0e0, 1.2));
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 24, 24), new THREE.MeshStandardMaterial({ color: 0x222222 })));
    [[[1, 0, 0], 0xe63946], [[0, 1, 0], 0x2a9d8f], [[0, 0, 1], 0x4361ee]].forEach(([dir, color]) => {
      scene.add(new THREE.ArrowHelper(new THREE.Vector3(...dir), new THREE.Vector3(0, 0, 0), 1.8, color, 0.3, 0.18));
    });
    sceneRef.current = scene;

    const dynGroup = new THREE.Group();
    scene.add(dynGroup);
    dynamicGroupRef.current = dynGroup;

    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    cameraRef.current = camera;

    const orbit = orbitRef.current;
    const onDown = (e) => { orbit.isDragging = true; orbit.prev = { x: e.clientX, y: e.clientY }; };
    const onUp = () => { orbit.isDragging = false; };
    const onMove = (e) => {
      if (!orbit.isDragging) return;
      orbit.theta -= (e.clientX - orbit.prev.x) * 0.014;
      orbit.phi = Math.max(0.12, Math.min(Math.PI - 0.12, orbit.phi + (e.clientY - orbit.prev.y) * 0.014));
      orbit.prev = { x: e.clientX, y: e.clientY };
    };
    const onWheel = (e) => { orbit.r = Math.max(3, Math.min(12, orbit.r + e.deltaY * 0.01)); };
    renderer.domElement.addEventListener("mousedown", onDown);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      camera.position.set(orbit.r * Math.sin(orbit.phi) * Math.cos(orbit.theta), orbit.r * Math.cos(orbit.phi), orbit.r * Math.sin(orbit.phi) * Math.sin(orbit.theta));
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
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), new THREE.MeshStandardMaterial({ color: COLORS[i % COLORS.length] }));
      mesh.position.set(parseFloat(p.x) || 0, parseFloat(p.y) || 0, parseFloat(p.z) || 0);
      group.add(mesh);
    });
    forces.forEach((f) => {
      const mag = parseFloat(f.mag);
      if (!mag) return;
      const a = points[f.from], b = points[f.to];
      if (!a || !b) return;
      const from = new THREE.Vector3(parseFloat(a.x) || 0, parseFloat(a.y) || 0, parseFloat(a.z) || 0);
      const to = new THREE.Vector3(parseFloat(b.x) || 0, parseFloat(b.y) || 0, parseFloat(b.z) || 0);
      const dir = new THREE.Vector3().subVectors(to, from).normalize();
      const len = from.distanceTo(to);
      if (len < 0.001) return;
      group.add(new THREE.ArrowHelper(dir, from, len, 0xf4a261, 0.25, 0.14));
    });
  }, [points, forces]);

  return (
    <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: "1px solid #e8e8e8", background: "#fafafa" }}>
      <div ref={mountRef} style={{ width: "100%", height: 320, cursor: "grab" }} />
      <div style={{ position: "absolute", top: 10, left: 12, display: "flex", gap: 6, pointerEvents: "none" }}>
        {[["X", "#e63946", "#fff0f1"], ["Y", "#2a9d8f", "#f0faf9"], ["Z", "#4361ee", "#f0f2ff"]].map(([l, c, bg]) => (
          <span key={l} style={{ background: bg, color: c, border: `1.5px solid ${c}33`, borderRadius: 6, padding: "2px 8px", fontSize: 13, fontWeight: 700 }}>{l}</span>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 8, right: 12, fontSize: 10, color: "#bbb", fontFamily: "monospace", pointerEvents: "none" }}>Drag to rotate · Scroll to zoom</div>
    </div>
  );
}

/* ===================== Step-by-Step Solution Component ===================== */
function CoordStepSolution({ result }) {
  const [openSteps, setOpenSteps] = useState({ 0: true, 1: true, 2: true, 3: true, 4: true });

  const toggleStep = (i) => setOpenSteps(prev => ({ ...prev, [i]: !prev[i] }));

  const stepColors = ["#1848a0", "#008409", "#7c3aed", "#b45309", "#0e7490"];
  const stepBg = ["#eff6ff", "#f0fdf4", "#f5f3ff", "#fffbeb", "#ecfeff"];
  const stepBorder = ["#bfdbfe", "#bbf7d0", "#ddd6fe", "#fde68a", "#a5f3fc"];

  const steps = [
    {
      title: "Step 1 — Identify the Position Vector (r)",
      content: result.details.map((d, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#1848a0", marginBottom: 6 }}>
            Force {d.i}: {d.mag} kN &nbsp;(Point {d.from} → Point {d.to})
          </div>
          <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #dbeafe", padding: "10px 14px", fontFamily: "monospace", fontSize: 13, lineHeight: 2 }}>
            <div>r = (x<sub>B</sub> − x<sub>A</sub>)î + (y<sub>B</sub> − y<sub>A</sub>)ĵ + (z<sub>B</sub> − z<sub>A</sub>)k̂</div>
            <div style={{ color: "#374151" }}>
              r = ({d._dx >= 0 ? "" : ""}{d._dx.toFixed(3)})î + ({d._dy >= 0 ? "" : ""}{d._dy.toFixed(3)})ĵ + ({d._dz >= 0 ? "" : ""}{d._dz.toFixed(3)})k̂
            </div>
          </div>
        </div>
      ))
    },
    {
      title: "Step 2 — Compute the Distance / Length (d)",
      content: result.details.map((d, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#008409", marginBottom: 6 }}>
            Force {d.i} ({d.from} → {d.to})
          </div>
          <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #bbf7d0", padding: "10px 14px", fontFamily: "monospace", fontSize: 13, lineHeight: 2 }}>
            <div>d = √(Δx² + Δy² + Δz²)</div>
            <div>d = √(({d._dx.toFixed(3)})² + ({d._dy.toFixed(3)})² + ({d._dz.toFixed(3)})²)</div>
            <div>d = √({(d._dx**2).toFixed(4)} + {(d._dy**2).toFixed(4)} + {(d._dz**2).toFixed(4)})</div>
            <div style={{ color: "#008409", fontWeight: 700 }}>d = {d.len.toFixed(4)}</div>
          </div>
        </div>
      ))
    },
    {
      title: "Step 3 — Find the Unit Vector (û) and Force Components",
      content: result.details.map((d, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#7c3aed", marginBottom: 6 }}>
            Force {d.i}: {d.mag} kN ({d.from} → {d.to})
          </div>
          <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #ddd6fe", padding: "10px 14px", fontFamily: "monospace", fontSize: 13, lineHeight: 2 }}>
            <div>û = r / d</div>
            <div>û = ({d._dx.toFixed(3)}/{d.len.toFixed(3)})î + ({d._dy.toFixed(3)}/{d.len.toFixed(3)})ĵ + ({d._dz.toFixed(3)}/{d.len.toFixed(3)})k̂</div>
            <div style={{ borderTop: "1px dashed #ddd6fe", marginTop: 6, paddingTop: 6 }}>F = |F| × û = {d.mag} × û</div>
            <div>F<sub>x</sub> = {d.mag} × ({d._dx.toFixed(3)}/{d.len.toFixed(3)}) = <strong style={{ color: "#7c3aed" }}>{d.Fx.toFixed(4)} kN</strong></div>
            <div>F<sub>y</sub> = {d.mag} × ({d._dy.toFixed(3)}/{d.len.toFixed(3)}) = <strong style={{ color: "#7c3aed" }}>{d.Fy.toFixed(4)} kN</strong></div>
            <div>F<sub>z</sub> = {d.mag} × ({d._dz.toFixed(3)}/{d.len.toFixed(3)}) = <strong style={{ color: "#7c3aed" }}>{d.Fz.toFixed(4)} kN</strong></div>
          </div>
        </div>
      ))
    },
    {
      title: "Step 4 — Sum All Components (ΣF)",
      content: (
        <div>
          <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #fde68a", padding: "12px 14px", fontFamily: "monospace", fontSize: 13, lineHeight: 2.2 }}>
            {/* Summation table */}
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr", gap: "2px 16px", marginBottom: 8 }}>
              <span style={{ fontWeight: 700, color: "#555" }}>Force</span>
              <span style={{ fontWeight: 700, color: "#e63946", textAlign: "right" }}>Fx (kN)</span>
              <span style={{ fontWeight: 700, color: "#2a9d8f", textAlign: "right" }}>Fy (kN)</span>
              <span style={{ fontWeight: 700, color: "#4361ee", textAlign: "right" }}>Fz (kN)</span>
              {result.details.map((d, i) => (
                <>
                  <span key={`lbl-${i}`} style={{ color: "#555" }}>F{d.i} ({d.from}→{d.to})</span>
                  <span key={`fx-${i}`} style={{ color: "#e63946", textAlign: "right" }}>{d.Fx.toFixed(4)}</span>
                  <span key={`fy-${i}`} style={{ color: "#2a9d8f", textAlign: "right" }}>{d.Fy.toFixed(4)}</span>
                  <span key={`fz-${i}`} style={{ color: "#4361ee", textAlign: "right" }}>{d.Fz.toFixed(4)}</span>
                </>
              ))}
            </div>
            <div style={{ borderTop: "2px solid #b45309", paddingTop: 8, display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr", gap: "2px 16px" }}>
              <span style={{ fontWeight: 700 }}>Σ</span>
              <span style={{ color: "#e63946", fontWeight: 700, textAlign: "right" }}>{result.Rx.toFixed(4)}</span>
              <span style={{ color: "#2a9d8f", fontWeight: 700, textAlign: "right" }}>{result.Ry.toFixed(4)}</span>
              <span style={{ color: "#4361ee", fontWeight: 700, textAlign: "right" }}>{result.Rz.toFixed(4)}</span>
            </div>
          </div>
          <div style={{ marginTop: 10, background: "#fff", borderRadius: 8, border: "1px solid #fde68a", padding: "10px 14px", fontFamily: "monospace", fontSize: 13, lineHeight: 2 }}>
            <div>ΣFx = {result.Rx.toFixed(4)} kN</div>
            <div>ΣFy = {result.Ry.toFixed(4)} kN</div>
            <div>ΣFz = {result.Rz.toFixed(4)} kN</div>
          </div>
        </div>
      )
    },
    {
      title: "Step 5 — Calculate the Resultant Force (R)",
      content: (
        <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #a5f3fc", padding: "12px 14px", fontFamily: "monospace", fontSize: 13, lineHeight: 2.2 }}>
          <div>R = √(ΣFx² + ΣFy² + ΣFz²)</div>
          <div>R = √(({result.Rx.toFixed(4)})² + ({result.Ry.toFixed(4)})² + ({result.Rz.toFixed(4)})²)</div>
          <div>R = √({(result.Rx**2).toFixed(4)} + {(result.Ry**2).toFixed(4)} + {(result.Rz**2).toFixed(4)})</div>
          <div>R = √({(result.Rx**2 + result.Ry**2 + result.Rz**2).toFixed(4)})</div>
          <div style={{ color: "#0e7490", fontWeight: 700, fontSize: 16, marginTop: 6, borderTop: "1px dashed #a5f3fc", paddingTop: 8 }}>
            R = {result.R.toFixed(4)} kN
          </div>
        </div>
      )
    }
  ];

  return (
    <div style={{ marginTop: 0 }}>
      {/* Final answer banner */}
      <div style={{ background: "linear-gradient(135deg, #1848a0 0%, #0e7490 100%)", borderRadius: 12, padding: "18px 20px", marginBottom: 20, textAlign: "center", color: "#fff" }}>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>Resultant Force</div>
        <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.5px" }}>R = {result.R.toFixed(4)} kN</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 10, fontSize: 13, opacity: 0.9 }}>
          <span>ΣFx = {result.Rx.toFixed(3)} kN</span>
          <span>ΣFy = {result.Ry.toFixed(3)} kN</span>
          <span>ΣFz = {result.Rz.toFixed(3)} kN</span>
        </div>
      </div>

      {/* Expandable steps */}
      {steps.map((step, i) => (
        <div key={i} style={{ marginBottom: 12, borderRadius: 12, border: `1.5px solid ${stepBorder[i]}`, overflow: "hidden" }}>
          <button
            onClick={() => toggleStep(i)}
            style={{
              width: "100%", background: stepBg[i], border: "none", padding: "13px 16px",
              display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left"
            }}
          >
            <span style={{
              background: stepColors[i], color: "#fff", borderRadius: "50%",
              width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, flexShrink: 0
            }}>{i + 1}</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: "#111", flex: 1 }}>{step.title}</span>
            <span style={{ fontSize: 12, color: "#888" }}>{openSteps[i] ? "▲" : "▼"}</span>
          </button>
          {openSteps[i] && (
            <div style={{ padding: "14px 16px", background: "#fff" }}>
              {step.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ===================== Coordinate Tab Content ===================== */
function CoordinateTab() {
  const ptLabel = (i) => String.fromCharCode(65 + i);
  const [points, setPoints] = useState([{ label: "A", x: "", y: "", z: "" }, { label: "B", x: "", y: "", z: "" }]);
  const [forces, setForces] = useState([{ mag: "", from: 0, to: 1 }]);
  const [result, setResult] = useState(null);
  const [showSolution, setShowSolution] = useState(false);

  const addPoint = () => setPoints(prev => [...prev, { label: ptLabel(prev.length), x: "", y: "", z: "" }]);
  const removePoint = (i) => {
    if (points.length <= 2) return;
    setPoints(prev => prev.filter((_, j) => j !== i).map((p, j) => ({ ...p, label: ptLabel(j) })));
    setForces(prev => prev.map(f => ({ ...f, from: Math.min(f.from, points.length - 2), to: Math.min(f.to, points.length - 2) })));
  };
  const updatePoint = (i, field, val) => setPoints(prev => prev.map((p, j) => j === i ? { ...p, [field]: val } : p));
  const addForce = () => setForces(prev => [...prev, { mag: "", from: 0, to: Math.min(1, points.length - 1) }]);
  const removeForce = (i) => { if (forces.length <= 1) return; setForces(prev => prev.filter((_, j) => j !== i)); };
  const updateForce = (i, field, val) => setForces(prev => prev.map((f, j) => j === i ? { ...f, [field]: val } : f));

  const calculate = () => {
    let Rx = 0, Ry = 0, Rz = 0;
    const details = [];
    forces.forEach((f, i) => {
      const mag = parseFloat(f.mag);
      if (!mag) return;
      const a = points[f.from], b = points[f.to];
      if (!a || !b) return;
      const dx = (parseFloat(b.x) || 0) - (parseFloat(a.x) || 0);
      const dy = (parseFloat(b.y) || 0) - (parseFloat(a.y) || 0);
      const dz = (parseFloat(b.z) || 0) - (parseFloat(a.z) || 0);
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (!len) return;
      const Fx = mag * dx / len, Fy = mag * dy / len, Fz = mag * dz / len;
      Rx += Fx; Ry += Fy; Rz += Fz;
      // store deltas for step-by-step
      details.push({ i: i + 1, mag, from: points[f.from].label, to: points[f.to].label, Fx, Fy, Fz, len, _dx: dx, _dy: dy, _dz: dz });
    });
    const R = Math.sqrt(Rx * Rx + Ry * Ry + Rz * Rz);
    setResult({ details, Rx, Ry, Rz, R });
    setShowSolution(true);
  };

  const inputStyle = { background: "#f5f5f5", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 8px", fontSize: 13, color: "#111", width: "100%", outline: "none" };
  const selectStyle = { ...inputStyle, width: "auto", minWidth: 90 };
  const cardStyle = { background: "#fff", borderRadius: 14, border: "1px solid #ebebeb", padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" };

  return (
    <div style={{ width: "100%" }}>
      <div style={{ width: "100%", maxWidth: 580, margin: "0 auto" }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, textAlign: "center", marginBottom: 8 }}>Cartesian Vector Method</h2>
        <p style={{ color: "#888", fontSize: 13, marginTop: 6, textAlign: "center" }}>Real-Time Free Body Diagram</p>
        <div style={{ marginBottom: 20 }}>
          <CoordThreeCanvas points={points} forces={forces} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Points */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px", color: "#111" }}>Coordinates of Points</h3>
          <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 1fr 1fr 32px", gap: 6, alignItems: "center", marginBottom: 6 }}>
            <span />{["x", "y", "z"].map(l => <span key={l} style={{ fontSize: 11, color: "#999", textAlign: "center" }}>{l}</span>)}<span />
          </div>
          {points.map((p, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "52px 1fr 1fr 1fr 32px", gap: 6, alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "#555" }}>Point {p.label}</span>
              {["x", "y", "z"].map(field => (
                <input key={field} style={inputStyle} placeholder={field} value={p[field]} onChange={e => updatePoint(i, field, e.target.value)} />
              ))}
              <button onClick={() => removePoint(i)} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 7, width: 30, height: 30, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>–</button>
            </div>
          ))}
          <button onClick={addPoint} style={{ background: "#008409", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer", marginTop: 4 }}>+ Add Point</button>
        </div>

        {/* Forces */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px", color: "#111" }}>Forces</h3>
          {forces.map((f, i) => (
            <div key={i} style={{ background: "#f9f9f9", borderRadius: 10, border: "1px solid #ebebeb", padding: "10px 12px", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <span style={{ fontSize: 13, color: "#555", flex: 1 }}>Force Magnitude (kN):</span>
                <input style={{ ...inputStyle, width: 80 }} placeholder="kN" value={f.mag} onChange={e => updateForce(i, "mag", e.target.value)} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <span style={{ fontSize: 13, color: "#555", flex: 1 }}>From Point:</span>
                <select style={selectStyle} value={f.from} onChange={e => updateForce(i, "from", +e.target.value)}>
                  {points.map((p, j) => <option key={j} value={j}>Point {p.label}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#555", flex: 1 }}>To Point:</span>
                <select style={selectStyle} value={f.to} onChange={e => updateForce(i, "to", +e.target.value)}>
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

      <button onClick={calculate} style={{ width: "100%", background: "#1848a0", color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontSize: 16, fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>
        Calculate
      </button>

      {result && (
        <div style={cardStyle}>
          <button
            onClick={() => setShowSolution(s => !s)}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600, color: "#111", padding: 0, marginBottom: showSolution ? 20 : 0, width: "100%" }}
          >
            <span style={{
              background: "#1848a0", color: "#fff", borderRadius: 8, padding: "2px 10px",
              fontSize: 12, fontWeight: 700
            }}>
              {showSolution ? "▲ Hide" : "▼ Show"}
            </span>
            <span>Step-by-Step Solution</span>
          </button>

          {showSolution && <CoordStepSolution result={result} />}
        </div>
      )}
    </div>
  );
}

/* ===================== MAIN COMPONENT WITH TABS ===================== */
export default function Solver3D() {
  const [activeTab, setActiveTab] = useState("coordinate");

  const tabBtnStyle = (id) => ({
    flex: 1,
    background: activeTab === id ? (id === "angles" ? "#008409" : "#1848a0") : "#f0f0f0",
    color: activeTab === id ? "#fff" : "#555",
    border: "none",
    borderRadius: 10,
    padding: "12px 0",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "Georgia, 'Times New Roman', serif",
    transition: "all 0.18s ease",
    boxShadow: activeTab === id ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f8", fontFamily: "Georgia, 'Times New Roman', serif", padding: "28px 16px 48px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111", margin: 0 }}>3D Resultant Force Calculator</h1>
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <button style={tabBtnStyle("coordinate")} onClick={() => setActiveTab("coordinate")}>3D Coordinate</button>
          <button style={tabBtnStyle("angles")} onClick={() => setActiveTab("angles")}>3D Resultant (Angles)</button>
        </div>
        {activeTab === "angles" && <AnglesTab />}
        {activeTab === "coordinate" && <CoordinateTab />}
      </div>
    </div>
  );
}