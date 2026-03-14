"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { useRouter } from "next/navigation";

/* ===================== TYPES ===================== */
type Point = { label: string; x: string; y: string; z: string };
type Force = { mag: string; from: number; to: number };

/* ===================== THREE.JS SCENE ===================== */
function buildBaseScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfafafa);

  const grid = new THREE.GridHelper(6, 12, 0xdddddd, 0xeeeeee);
  scene.add(grid);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe0e0e0, 1.2));

  const origin = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
  );
  scene.add(origin);

  const AXES = [
    { dir: [1, 0, 0], color: 0xe63946 },
    { dir: [0, 1, 0], color: 0x2a9d8f },
    { dir: [0, 0, 1], color: 0x4361ee },
  ];
  AXES.forEach(({ dir, color }) => {
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(...(dir as [number, number, number])),
      new THREE.Vector3(0, 0, 0),
      1.8, color, 0.3, 0.18
    );
    scene.add(arrow);

    const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(-dir[0] * 0.8, -dir[1] * 0.8, -dir[2] * 0.8)];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({ color, dashSize: 0.08, gapSize: 0.06, opacity: 0.3, transparent: true });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    scene.add(line);
  });

  return scene;
}

/* ===================== CANVAS COMPONENT ===================== */
function ThreeCanvas({ points, forces }: { points: Point[]; forces: Force[] }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orbitRef = useRef({ theta: 0.7, phi: 1.1, r: 6, isDragging: false, prev: { x: 0, y: 0 } });
  const dynamicGroupRef = useRef<THREE.Group | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth || 500;
    const H = el.clientHeight || 320;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = buildBaseScene();
    sceneRef.current = scene;

    const dynGroup = new THREE.Group();
    scene.add(dynGroup);
    dynamicGroupRef.current = dynGroup;

    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    cameraRef.current = camera;

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
      const x = parseFloat(p.x) || 0;
      const y = parseFloat(p.y) || 0;
      const z = parseFloat(p.z) || 0;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 16, 16),
        new THREE.MeshStandardMaterial({ color: COLORS[i % COLORS.length] })
      );
      mesh.position.set(x, y, z);
      group.add(mesh);
    });

    forces.forEach((f) => {
      const mag = parseFloat(f.mag);
      if (!mag) return;
      const a = points[f.from], b = points[f.to];
      if (!a || !b) return;
      const ax = parseFloat(a.x) || 0, ay = parseFloat(a.y) || 0, az = parseFloat(a.z) || 0;
      const bx = parseFloat(b.x) || 0, by = parseFloat(b.y) || 0, bz = parseFloat(b.z) || 0;
      const from = new THREE.Vector3(ax, ay, az);
      const to = new THREE.Vector3(bx, by, bz);
      const dir = new THREE.Vector3().subVectors(to, from).normalize();
      const len = from.distanceTo(to);
      if (len < 0.001) return;
      const arrow = new THREE.ArrowHelper(dir, from, len, 0xf4a261, 0.25, 0.14);
      group.add(arrow);
    });
  }, [points, forces]);

  return (
    <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: "1px solid #e8e8e8", background: "#fafafa" }}>
      <div ref={mountRef} style={{ width: "100%", height: 320, cursor: "grab" }} />
      <div style={{ position: "absolute", top: 10, left: 12, display: "flex", gap: 6, pointerEvents: "none" }}>
        {[["X","#e63946","#fff0f1"],["Y","#2a9d8f","#f0faf9"],["Z","#4361ee","#f0f2ff"]].map(([l,c,bg])=>(
          <span key={l} style={{ background: bg, color: c, border: `1.5px solid ${c}33`, borderRadius: 6, padding: "2px 8px", fontSize: 13, fontWeight: 700 }}>{l}</span>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 8, right: 12, fontSize: 10, color: "#bbb", fontFamily: "monospace", pointerEvents: "none" }}>
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}

/* ===================== MAIN COMPONENT ===================== */
export default function ResultantCalculator() {
  const router = useRouter();
  const [points, setPoints] = useState<Point[]>([
    { label: "A", x: "", y: "", z: "" },
    { label: "B", x: "", y: "", z: "" },
  ]);
  const [forces, setForces] = useState<Force[]>([{ mag: "", from: 0, to: 1 }]);
  const [result, setResult] = useState<any>(null);
  const [showSolution, setShowSolution] = useState(false);

  const ptLabel = (i: number) => String.fromCharCode(65 + i);

  const addPoint = () => setPoints(prev => [...prev, { label: ptLabel(prev.length), x: "", y: "", z: "" }]);
  const removePoint = (i: number) => {
    if (points.length <= 2) return;
    setPoints(prev => prev.filter((_, j) => j !== i).map((p, j) => ({ ...p, label: ptLabel(j) })));
    setForces(prev => prev.map(f => ({
      ...f,
      from: Math.min(f.from, points.length - 2),
      to: Math.min(f.to, points.length - 2),
    })));
  };
  const updatePoint = (i: number, field: keyof Point, val: string) => {
    setPoints(prev => prev.map((p, j) => j === i ? { ...p, [field]: val } : p));
  };

  const addForce = () => setForces(prev => [...prev, { mag: "", from: 0, to: Math.min(1, points.length - 1) }]);
  const removeForce = (i: number) => { if (forces.length <= 1) return; setForces(prev => prev.filter((_, j) => j !== i)); };
  const updateForce = (i: number, field: keyof Force, val: any) => {
    setForces(prev => prev.map((f, j) => j === i ? { ...f, [field]: val } : f));
  };

  const calculate = () => {
    let Rx = 0, Ry = 0, Rz = 0;
    const details: any[] = [];

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
      details.push({ i: i + 1, mag, from: points[f.from].label, to: points[f.to].label, Fx, Fy, Fz, len });
    });

    const R = Math.sqrt(Rx * Rx + Ry * Ry + Rz * Rz);
    setResult({ details, Rx, Ry, Rz, R });
    setShowSolution(true);
  };

  const inputStyle: React.CSSProperties = {
    background: "#f5f5f5", border: "1px solid #e0e0e0", borderRadius: 8,
    padding: "6px 8px", fontSize: 13, color: "#111", width: "100%", outline: "none",
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, width: "auto", minWidth: 90 };
  const cardStyle: React.CSSProperties = {
    background: "#fff", borderRadius: 14, border: "1px solid #ebebeb",
    padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  };
  const navBtnStyle = (bg: string): React.CSSProperties => ({
    flex: 1, background: bg, color: "#fff", border: "none", borderRadius: 10,
    padding: "12px 0", fontSize: 15, fontWeight: 600, cursor: "pointer",
    fontFamily: "Georgia, 'Times New Roman', serif",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f8", fontFamily: "Georgia, 'Times New Roman', serif", padding: "28px 16px 48px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111", margin: 0 }}>3D Resultant Calculator</h1>
          <p style={{ color: "#888", fontSize: 13, marginTop: 6 }}>Real-Time Free Body Diagram</p>
        </div>

        {/* Canvas + nav buttons */}
        <div style={{ marginBottom: 20 }}>
          <ThreeCanvas points={points} forces={forces} />

          {/* ✅ Navigation buttons below canvas */}
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button
              style={navBtnStyle("#1848a0")}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              onClick={() => router.push("/3D-solver")}
            >
              3D Resultant (Angles)
            </button>
            <button
              style={navBtnStyle("#008409")}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              onClick={() => router.push("/resultant/coordinate")}
            >
              3D Coordinate
            </button>
          </div>
        </div>

        {/* Inputs row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

          {/* Points */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px", color: "#111" }}>Coordinates of Points</h3>
            <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 1fr 1fr 32px", gap: 6, alignItems: "center", marginBottom: 6 }}>
              <span />
              {["x","y","z"].map(l => <span key={l} style={{ fontSize: 11, color: "#999", textAlign: "center" }}>{l}</span>)}
              <span />
            </div>
            {points.map((p, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "52px 1fr 1fr 1fr 32px", gap: 6, alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "#555" }}>Point {p.label}</span>
                {(["x","y","z"] as (keyof Point)[]).map(field => (
                  <input key={field} style={inputStyle} placeholder={field} value={p[field]}
                    onChange={e => updatePoint(i, field, e.target.value)} />
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
                  <input style={{ ...inputStyle, width: 80 }} placeholder="kN" value={f.mag}
                    onChange={e => updateForce(i, "mag", e.target.value)} />
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

        {/* Calculate */}
        <button onClick={calculate} style={{ width: "100%", background: "#1848a0", color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontSize: 16, fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>
          Calculate
        </button>

        {/* Solution */}
        {result && (
          <div style={cardStyle}>
            <button onClick={() => setShowSolution(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600, color: "#111", padding: 0, marginBottom: showSolution ? 16 : 0 }}>
              <span style={{ fontSize: 13 }}>{showSolution ? "▼" : "▶"}</span> Solution
            </button>
            {showSolution && (
              <>
                {result.details.map((d: any, i: number) => (
                  <div key={i} style={{ background: "#f5f7ff", borderRadius: 10, border: "1px solid #dde3f5", padding: "10px 14px", marginBottom: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 5, color: "#1848a0" }}>Force {d.i} ({d.mag} kN, {d.from} → {d.to})</div>
                    <div style={{ fontSize: 12, color: "#555", display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <span>Length = {d.len.toFixed(3)}</span>
                      <span>F<sub>x</sub> = {d.Fx.toFixed(3)} kN</span>
                      <span>F<sub>y</sub> = {d.Fy.toFixed(3)} kN</span>
                      <span>F<sub>z</sub> = {d.Fz.toFixed(3)} kN</span>
                    </div>
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 }}>
                  {[["ΣFx", result.Rx], ["ΣFy", result.Ry], ["ΣFz", result.Rz]].map(([l, v]: any) => (
                    <div key={l} style={{ background: "#f5f5f5", borderRadius: 10, padding: "10px", textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{l} (kN)</div>
                      <div style={{ fontSize: 18, fontWeight: 600 }}>{v.toFixed(3)}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: "#e8f0fe", borderRadius: 12, padding: "14px", textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>Resultant R</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#1848a0" }}>{result.R.toFixed(3)} kN</div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
