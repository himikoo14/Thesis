"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";

/* ================================================================
   THREE.JS CANVAS
================================================================ */
function CoordThreeCanvas({ points, forces }: { points: any[]; forces: any[] }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const dynamicGroupRef = useRef<THREE.Group | null>(null);
  const orbitRef = useRef({ theta: 0.7, phi: 1.1, r: 6, isDragging: false, prev: { x: 0, y: 0 } });
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
    scene.background = new THREE.Color(0xfafafa);
    scene.add(new THREE.GridHelper(6, 12, 0xdddddd, 0xeeeeee));
    scene.add(new THREE.HemisphereLight(0xffffff, 0xe0e0e0, 1.2));
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 24, 24), new THREE.MeshStandardMaterial({ color: 0x222222 })));
    ([[[1,0,0], 0xe63946], [[0,1,0], 0x2a9d8f], [[0,0,1], 0x4361ee]] as [[number,number,number], number][]).forEach(([dir, color]) => {
      scene.add(new THREE.ArrowHelper(new THREE.Vector3(...dir), new THREE.Vector3(0, 0, 0), 1.8, color, 0.3, 0.18));
    });
    sceneRef.current = scene;

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
      mesh.position.set(parseFloat(p.x) || 0, parseFloat(p.y) || 0, parseFloat(p.z) || 0);
      group.add(mesh);
    });
    forces.forEach((f) => {
      const mag = parseFloat(f.mag);
      if (!mag) return;
      const a = points[f.from], b = points[f.to];
      if (!a || !b) return;
      const from = new THREE.Vector3(parseFloat(a.x) || 0, parseFloat(a.y) || 0, parseFloat(a.z) || 0);
      const to   = new THREE.Vector3(parseFloat(b.x) || 0, parseFloat(b.y) || 0, parseFloat(b.z) || 0);
      const len  = from.distanceTo(to);
      if (len < 0.001) return;
      group.add(new THREE.ArrowHelper(new THREE.Vector3().subVectors(to, from).normalize(), from, len, 0xf4a261, 0.25, 0.14));
    });
  }, [points, forces]);

  return (
    <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: "1px solid #e8e8e8", background: "#fafafa" }}>
      <div ref={mountRef} style={{ width: "100%", height: 320, cursor: "grab" }} />
      <div style={{ position: "absolute", top: 10, left: 12, display: "flex", gap: 6, pointerEvents: "none" }}>
        {([["X","#e63946","#fff0f1"],["Y","#2a9d8f","#f0faf9"],["Z","#4361ee","#f0f2ff"]] as [string,string,string][]).map(([l,c,bg]) => (
          <span key={l} style={{ background: bg, color: c, border: `1.5px solid ${c}33`, borderRadius: 6, padding: "2px 8px", fontSize: 13, fontWeight: 700 }}>{l}</span>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 8, right: 12, fontSize: 10, color: "#bbb", pointerEvents: "none" }}>Drag to rotate · Scroll to zoom</div>
    </div>
  );
}

/* ================================================================
   KATEX
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
  useEffect(() => {
    if (!el.current) return;
    const katex = (window as any).katex;
    if (!katex) return;
    try { katex.render(tex, el.current, { displayMode: true, throwOnError: false }); }
    catch (_) { el.current.innerText = tex; }
  }, [tex]);
  return <div ref={el} style={{ margin: "3px 0", overflowX: "auto" }} />;
}

/* ================================================================
   SOLUTION BUILDER  — mirrors PDF exactly
================================================================ */

function n(v: number, d = 2): string {
  return parseFloat(v.toFixed(d)).toString();
}

function vec(x: number, y: number, z: number, d = 2): string {
  let s = `${n(x, d)}\\hat{i}`;
  s += y < 0 ? ` - ${n(Math.abs(y), d)}\\hat{j}` : ` + ${n(y, d)}\\hat{j}`;
  s += z < 0 ? ` - ${n(Math.abs(z), d)}\\hat{k}` : ` + ${n(z, d)}\\hat{k}`;
  return s;
}

function buildSolution(details: any[], Rx: number, Ry: number, Rz: number, R: number): string[] {
  const steps: string[] = [];

steps.push("Step 1: Determine position vectors");

details.forEach(d=>{
  steps.push(
    `\\vec r_{${d.from}${d.to}} =
    (${d.bx}-${d.ax})\\hat i +
    (${d.by}-${d.ay})\\hat j +
    (${d.bz}-${d.az})\\hat k`
  );
});

steps.push("Step 2: Magnitudes");

details.forEach(d=>{
  steps.push(
    `|\\vec r_{${d.from}${d.to}}|=
    \\sqrt{${d.dx}^2+${d.dy}^2+${d.dz}^2}
    =${d.len.toFixed(2)}`
  );
});

steps.push("Step 3: Unit vectors");

details.forEach(d=>{
  steps.push(
    `\\hat u_{${d.from}${d.to}}=
    \\frac{${d.dx}\\hat i+${d.dy}\\hat j+${d.dz}\\hat k}
    {${d.len.toFixed(2)}}`
  );
});

steps.push("Step 4: Force vectors");

details.forEach(d=>{
  steps.push(
    `\\vec F_{${d.to}}=${d.mag}
    \\hat u_{${d.from}${d.to}}
    =${d.Fx.toFixed(2)}\\hat i+
    ${d.Fy.toFixed(2)}\\hat j+
    ${d.Fz.toFixed(2)}\\hat k`
  );
});

steps.push("Step 5: Resultant");

steps.push(
  `\\vec R=
  ${Rx.toFixed(2)}\\hat i+
  ${Ry.toFixed(2)}\\hat j+
  ${Rz.toFixed(2)}\\hat k`
);

steps.push(
  `R=
  \\sqrt{${Rx.toFixed(2)}^2+
  ${Ry.toFixed(2)}^2+
  ${Rz.toFixed(2)}^2}
  =${R.toFixed(2)}`
);

return steps;
}

/* ================================================================
   SOLUTION PANEL
================================================================ */

/* ================================================================
   MAIN EXPORT
================================================================ */
export default function CoordinateTab() {
  const ptLabel = (i: number) => String.fromCharCode(65 + i);
  const [points, setPoints] = useState([{ label: "A", x: "", y: "", z: "" }, { label: "B", x: "", y: "", z: "" }]);
  const [forces, setForces] = useState([{ mag: "", from: 0, to: 1 }]);
  const [result, setResult] = useState<any>(null);
  const [showSolution, setShowSolution] = useState(false);

  const addPoint    = () => setPoints(p => [...p, { label: ptLabel(p.length), x: "", y: "", z: "" }]);
  const removePoint = (i: number) => {
    if (points.length <= 2) return;
    setPoints(p => p.filter((_, j) => j !== i).map((v, j) => ({ ...v, label: ptLabel(j) })));
  };
  const updatePoint = (i: number, field: string, val: string) =>
    setPoints(p => p.map((v, j) => j === i ? { ...v, [field]: val } : v));

  const addForce    = () => setForces(f => [...f, { mag: "", from: 0, to: Math.min(1, points.length - 1) }]);
  const removeForce = (i: number) => { if (forces.length <= 1) return; setForces(f => f.filter((_, j) => j !== i)); };
  const updateForce = (i: number, field: string, val: any) =>
    setForces(f => f.map((v, j) => j === i ? { ...v, [field]: val } : v));

  const calculate = () => {
    let Rx = 0, Ry = 0, Rz = 0;
    const details: any[] = [];
    forces.forEach((f, i) => {
      const mag = parseFloat(f.mag);
      if (!mag) return;
      const a = points[f.from], b = points[f.to];
      if (!a || !b) return;
      const ax = parseFloat(a.x)||0, ay = parseFloat(a.y)||0, az = parseFloat(a.z)||0;
      const bx = parseFloat(b.x)||0, by = parseFloat(b.y)||0, bz = parseFloat(b.z)||0;
      const dx = bx-ax, dy = by-ay, dz = bz-az;
      const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (!len) return;
      const Fx = mag*dx/len, Fy = mag*dy/len, Fz = mag*dz/len;
      Rx += Fx; Ry += Fy; Rz += Fz;
      details.push({ i: i+1, mag, from: points[f.from].label, to: points[f.to].label, ax, ay, az, bx, by, bz, dx, dy, dz, Fx, Fy, Fz, len });
    });
    const R = Math.sqrt(Rx*Rx + Ry*Ry + Rz*Rz);
    setResult({ details, Rx, Ry, Rz, R, steps: buildSolution(details, Rx, Ry, Rz, R) });
    setShowSolution(true);
  };

  const inp:  React.CSSProperties = { background: "#f5f5f5", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 8px", fontSize: 13, width: "100%", outline: "none" };
  const sel:  React.CSSProperties = { ...inp, width: "auto", minWidth: 90 };
  const card: React.CSSProperties = { background: "#fff", borderRadius: 14, border: "1px solid #ebebeb", padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" };

  return (
    <div style={{ width: "100%" }}>

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
            <span />{["x","y","z"].map(l => <span key={l} style={{ fontSize: 11, color: "#999", textAlign: "center" }}>{l}</span>)}<span />
          </div>
          {points.map((p, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "52px 1fr 1fr 1fr 32px", gap: 6, alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "#555" }}>Point {p.label}</span>
              {["x","y","z"].map(field => (
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
            <div key={i} style={{ background: "#f9f9f9", borderRadius: 10, border: "1px solid #ebebeb", padding: "10px 12px", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <span style={{ fontSize: 13, color: "#555", flex: 1 }}>Magnitude (N):</span>
                <input style={{ ...inp, width: 80 }} placeholder="N" value={f.mag} onChange={e => updateForce(i, "mag", e.target.value)} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <span style={{ fontSize: 13, color: "#555", flex: 1 }}>From:</span>
                <select style={sel} value={f.from} onChange={e => updateForce(i, "from", +e.target.value)}>
                  {points.map((p, j) => <option key={j} value={j}>Pt {p.label}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#555", flex: 1 }}>To:</span>
                <select style={sel} value={f.to} onChange={e => updateForce(i, "to", +e.target.value)}>
                  {points.map((p, j) => <option key={j} value={j}>Pt {p.label}</option>)}
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
        <div style={card}>
          <button
            onClick={() => setShowSolution(s => !s)}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600, color: "#111", padding: 0, marginBottom: showSolution ? 20 : 0, width: "100%" }}
          >
            <span style={{ background: "#1848a0", color: "#fff", borderRadius: 8, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
              {showSolution ? "▲ Hide" : "▼ Show"}
            </span>
            <span>Step-by-Step Solution</span>
          </button>
          {showSolution && (
  <div style={{ lineHeight: 1.8 }}>
    {result.steps.map((line: string, i: number) =>
      line.startsWith("Step") ? (
        <p key={i} style={{
          fontWeight: 600,
          fontSize: 16,
          marginTop: 14
        }}>
          {line}
        </p>
      ) : (
        <KTX key={i} tex={line}/>
      )
    )}
  </div>
)}
        </div>
      )}
    </div>
  );
}