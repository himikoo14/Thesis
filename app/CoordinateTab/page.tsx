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
type SolLine = { t: "h"; text: string } | { t: "m"; tex: string };

function n(v: number, d = 2): string {
  return parseFloat(v.toFixed(d)).toString();
}

function vec(x: number, y: number, z: number, d = 2): string {
  let s = `${n(x, d)}\\hat{i}`;
  s += y < 0 ? ` - ${n(Math.abs(y), d)}\\hat{j}` : ` + ${n(y, d)}\\hat{j}`;
  s += z < 0 ? ` - ${n(Math.abs(z), d)}\\hat{k}` : ` + ${n(z, d)}\\hat{k}`;
  return s;
}

function buildSolution(details: any[], Rx: number, Ry: number, Rz: number, R: number): SolLine[] {
  const out: SolLine[] = [];
  const H = (text: string) => out.push({ t: "h", text });
  const M = (tex: string)  => out.push({ t: "m", tex  });

  // 1. Position Vectors
  H("1. Position Vectors");
  details.forEach(d => {
    const diffTeX =
      `(${n(d.bx,0)}-${n(d.ax,0)})\\hat{i} + ` +
      `(${n(d.by,0)}-${n(d.ay,0)})\\hat{j} + ` +
      `(${n(d.bz,0)}-${n(d.az,0)})\\hat{k}`;
    M(`\\vec{r}_{${d.from}${d.to}} = \\vec{r}_{${d.to}} - \\vec{r}_{${d.from}} = ${diffTeX} = ${vec(d.dx, d.dy, d.dz, 0)}`);
  });

  // 2. Magnitudes
  H("2. Magnitudes");
  details.forEach(d => {
    M(
      `|\\vec{r}_{${d.from}${d.to}}| = ` +
      `\\sqrt{(${n(d.dx,0)})^2+(${n(d.dy,0)})^2+(${n(d.dz,0)})^2} = ` +
      `\\sqrt{${d.dx*d.dx}+${d.dy*d.dy}+${d.dz*d.dz}} = ${n(d.len, 2)}`
    );
  });

  // 3. Unit Vectors
  H("3. Unit Vectors");
  details.forEach(d => {
    const L = n(d.len, 2);
    const fi = `\\dfrac{${n(d.dx,0)}}{${L}}`;
    const fj = d.dy < 0 ? ` - \\dfrac{${n(Math.abs(d.dy),0)}}{${L}}` : ` + \\dfrac{${n(d.dy,0)}}{${L}}`;
    const fk = d.dz < 0 ? ` - \\dfrac{${n(Math.abs(d.dz),0)}}{${L}}` : ` + \\dfrac{${n(d.dz,0)}}{${L}}`;
    M(`\\hat{u}_{${d.from}${d.to}} = \\dfrac{${vec(d.dx,d.dy,d.dz,0)}}{${L}} = ${fi}\\,\\hat{i}${fj}\\,\\hat{j}${fk}\\,\\hat{k}`);
  });

  // 4. Force Vectors
  H("4. Force Vectors");
  details.forEach(d => {
    const L = n(d.len, 2);
    const fi = `\\dfrac{${n(d.dx,0)}}{${L}}`;
    const fj = d.dy < 0 ? ` - \\dfrac{${n(Math.abs(d.dy),0)}}{${L}}` : ` + \\dfrac{${n(d.dy,0)}}{${L}}`;
    const fk = d.dz < 0 ? ` - \\dfrac{${n(Math.abs(d.dz),0)}}{${L}}` : ` + \\dfrac{${n(d.dz,0)}}{${L}}`;
    M(
      `\\vec{F}_{${d.to}} = ${n(d.mag,0)}` +
      `\\left(${fi}\\,\\hat{i}${fj}\\,\\hat{j}${fk}\\,\\hat{k}\\right) = ` +
      `${vec(d.Fx, d.Fy, d.Fz, 2)}`
    );
  });

  // 5. Resultant
  H("5. Resultant");
  const iG = details.map(d => n(d.Fx, 2)).join(" + ");
  const jG = details.map(d => n(d.Fy, 2)).join(" + ");
  const kG = details.map(d => n(d.Fz, 2)).join(" + ");
  M(`\\vec{R} = (${iG})\\hat{i} + (${jG})\\hat{j} + (${kG})\\hat{k}`);
  M(`\\vec{R} = ${vec(Rx, Ry, Rz, 2)}`);
  M(`R = \\sqrt{(${n(Rx,2)})^2+(${n(Ry,2)})^2+(${n(Rz,2)})^2} = \\sqrt{${n(Rx*Rx,2)}+${n(Ry*Ry,2)}+${n(Rz*Rz,2)}} = ${n(R,2)}\\text{ N}`);

  // 6. Direction Angles
  if (R > 0.001) {
    H("6. Direction Angles");
    const α = Math.acos(Rx / R) * 180 / Math.PI;
    const β = Math.acos(Ry / R) * 180 / Math.PI;
    const γ = Math.acos(Rz / R) * 180 / Math.PI;
    M(`\\cos\\alpha = \\dfrac{R_x}{R}, \\qquad \\cos\\beta = \\dfrac{R_y}{R}, \\qquad \\cos\\gamma = \\dfrac{R_z}{R}`);
    M(`\\cos\\alpha = \\dfrac{${n(Rx,2)}}{${n(R,2)}}, \\qquad \\cos\\beta = \\dfrac{${n(Ry,2)}}{${n(R,2)}}, \\qquad \\cos\\gamma = \\dfrac{${n(Rz,2)}}{${n(R,2)}}`);
    M(`\\alpha = ${n(α,2)}^\\circ, \\qquad \\beta = ${n(β,2)}^\\circ, \\qquad \\gamma = ${n(γ,2)}^\\circ`);
  }

  return out;
}

/* ================================================================
   SOLUTION PANEL
================================================================ */
function SolutionPanel({ result }: { result: any }) {
  const katexOk = useKatex();
  return (
    <div style={{ marginTop: 4 }}>
      {/* Summary banner */}
      <div style={{ background: "linear-gradient(135deg, #1848a0 0%, #0e7490 100%)", borderRadius: 12, padding: "18px 20px", marginBottom: 20, textAlign: "center", color: "#fff" }}>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>Resultant Force</div>
        <div style={{ fontSize: 32, fontWeight: 700 }}>R = {result.R.toFixed(2)} N</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 10, fontSize: 13, opacity: 0.9 }}>
          <span>ΣFx = {result.Rx.toFixed(2)} N</span>
          <span>ΣFy = {result.Ry.toFixed(2)} N</span>
          <span>ΣFz = {result.Rz.toFixed(2)} N</span>
        </div>
      </div>
      {/* PDF-style lines */}
      {result.solLines.map((ln: SolLine, i: number) => {
        if (ln.t === "h") return (
          <p key={i} style={{ fontWeight: 700, fontSize: 15, color: "#1848a0", margin: "22px 0 6px", paddingBottom: 5, borderBottom: "2px solid #c8d8ff" }}>
            {ln.text}
          </p>
        );
        if (ln.t === "m") {
          if (katexOk) return <KTX key={i} tex={ln.tex} />;
          return <pre key={i} style={{ fontSize: 12, color: "#555", overflowX: "auto" }}>{ln.tex}</pre>;
        }
        return null;
      })}
    </div>
  );
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
    setResult({ details, Rx, Ry, Rz, R, solLines: buildSolution(details, Rx, Ry, Rz, R) });
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
          {showSolution && <SolutionPanel result={result} />}
        </div>
      )}
    </div>
  );
}