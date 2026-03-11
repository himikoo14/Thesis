"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";

const AXIS_CONFIG = [
  {
    label: "î",
    sublabel: "x-axis",
    dir: [1, 0, 0],
    color: 0xe63946,
    colorHex: "#e63946",
    bg: "#fff0f1",
  },
  {
    label: "ĵ",
    sublabel: "y-axis",
    dir: [0, 1, 0],
    color: 0x2a9d8f,
    colorHex: "#2a9d8f",
    bg: "#f0faf9",
  },
  {
    label: "k̂",
    sublabel: "z-axis",
    dir: [0, 0, 1],
    color: 0x4361ee,
    colorHex: "#4361ee",
    bg: "#f0f2ff",
  },
];

function buildScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfafafa);

  // Subtle grid
  const grid = new THREE.GridHelper(4, 8, 0xdddddd, 0xeeeeee);
  scene.add(grid);

  // Hemisphere light
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe0e0e0, 1.2));

  // Origin sphere
  const origin = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3 })
  );
  scene.add(origin);

  const arrows = [];
  AXIS_CONFIG.forEach(({ dir, color }) => {
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(...dir),
      new THREE.Vector3(0, 0, 0),
      1.6,
      color,
      0.28,
      0.16
    );
    scene.add(arrow);
    arrows.push(arrow);
  });

  // Dashed negative axis guides
  AXIS_CONFIG.forEach(({ dir, color }) => {
    const pts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-dir[0] * 0.8, -dir[1] * 0.8, -dir[2] * 0.8),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color,
      dashSize: 0.08,
      gapSize: 0.06,
      opacity: 0.3,
      transparent: true,
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    scene.add(line);
  });

  return scene;
}

function attachOrbit(
  canvas: HTMLCanvasElement,
  state: {
    theta: number;
    phi: number;
    r: number;
    isDragging: boolean;
    prev: { x: number; y: number };
  }
) {
  const onDown = (e: MouseEvent) => {
    state.isDragging = true;
    state.prev = { x: e.clientX, y: e.clientY };
  };

  const onUp = () => {
    state.isDragging = false;
  };

  const onMove = (e: MouseEvent) => {
    if (!state.isDragging) return;

    state.theta -= (e.clientX - state.prev.x) * 0.014;
    state.phi = Math.max(
      0.12,
      Math.min(Math.PI - 0.12, state.phi + (e.clientY - state.prev.y) * 0.014)
    );

    state.prev = { x: e.clientX, y: e.clientY };
  };

  const onWheel = (e: WheelEvent) => {
    state.r = Math.max(2.5, Math.min(10, state.r + e.deltaY * 0.01));
  };

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

export default function CoordinateSystemIJK() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [angle, setAngle] = useState({ theta: 0.7, phi: 1.1 });

  useEffect(() => {
const el = mountRef.current;
if (!el) return;

const W = el.clientWidth;
const H = el.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);

    const scene = buildScene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    const orbit = { theta: 0.7, phi: 1.1, r: 5, isDragging: false, prev: { x: 0, y: 0 } };

    let raf: number;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      camera.position.set(
        orbit.r * Math.sin(orbit.phi) * Math.cos(orbit.theta),
        orbit.r * Math.cos(orbit.phi),
        orbit.r * Math.sin(orbit.phi) * Math.sin(orbit.theta)
      );
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();

    const cleanup = attachOrbit(renderer.domElement as HTMLCanvasElement, orbit);

    return () => {
      cancelAnimationFrame(raf);
      cleanup();
      renderer.dispose();
      if (el && renderer.domElement.parentNode === el)
        el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8f9ff 0%, #fff8f8 100%)",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 16px 48px",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div
          style={{
            fontSize: 11,
            fontFamily: "monospace",
            letterSpacing: "0.18em",
            color: "#999",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Cartesian · Right-Hand Rule
        </div>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 700,
            margin: 0,
            letterSpacing: "-0.01em",
            color: "#111",
          }}
        >
          î ĵ k̂ &nbsp;Coordinate System
        </h1>
        <p style={{ color: "#777", fontSize: 14, marginTop: 8, marginBottom: 0 }}>
          Standard orthonormal unit vectors in 3D space
        </p>
      </div>

      {/* 3D Viewer */}
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 4px 32px rgba(0,0,0,0.10)",
          border: "1px solid #e8e8e8",
          position: "relative",
          background: "#fafafa",
        }}
      >
        <div
          ref={mountRef}
          style={{ width: "100%", height: 340, cursor: "grab" }}
        />
        {/* Floating axis labels */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 14,
            display: "flex",
            gap: 8,
            pointerEvents: "none",
          }}
        >
          {AXIS_CONFIG.map(({ label, colorHex, bg }) => (
            <span
              key={label}
              style={{
                background: bg,
                color: colorHex,
                border: `1.5px solid ${colorHex}33`,
                borderRadius: 6,
                padding: "2px 9px",
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              {label}
            </span>
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 10,
            right: 14,
            fontSize: 10,
            color: "#bbb",
            pointerEvents: "none",
            fontFamily: "monospace",
          }}
        >
          Drag to rotate · Scroll to zoom
        </div>
      </div>

      {/* Legend cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
          marginTop: 24,
          width: "100%",
          maxWidth: 560,
        }}
      >
        {AXIS_CONFIG.map(({ label, sublabel, colorHex, bg, dir }) => (
          <div
            key={label}
            style={{
              background: "#fff",
              borderRadius: 14,
              border: `2px solid ${colorHex}22`,
              padding: "18px 14px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: colorHex,
                lineHeight: 1,
                marginBottom: 6,
              }}
            >
              {label}
            </div>
            <div
              style={{ fontSize: 12, color: "#999", fontFamily: "monospace", marginBottom: 10 }}
            >
              {sublabel}
            </div>
            <div
              style={{
                background: bg,
                borderRadius: 8,
                padding: "6px 4px",
                fontSize: 12,
                color: colorHex,
                fontFamily: "monospace",
                fontWeight: 600,
              }}
            >
              [{dir.join(", ")}]
            </div>
          </div>
        ))}
      </div>

      {/* Identity matrix */}
      <div
        style={{
          marginTop: 24,
          width: "100%",
          maxWidth: 560,
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #e8e8e8",
          padding: "20px 24px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontFamily: "monospace",
            letterSpacing: "0.14em",
            color: "#aaa",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Key Relationships
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px 24px",
            fontFamily: "monospace",
            fontSize: 14,
          }}
        >
          {[
            ["î × ĵ", "=", "k̂", "#4361ee"],
            ["ĵ × k̂", "=", "î", "#e63946"],
            ["k̂ × î", "=", "ĵ", "#2a9d8f"],
            ["î · î", "=", "1", "#555"],
            ["î · ĵ", "=", "0", "#555"],
            ["ĵ · k̂", "=", "0", "#555"],
          ].map(([lhs, eq, rhs, c]) => (
            <div
              key={lhs}
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                color: "#444",
                padding: "4px 0",
              }}
            >
              <span style={{ minWidth: 54 }}>{lhs}</span>
              <span style={{ color: "#bbb" }}>{eq}</span>
              <span style={{ color: c, fontWeight: 700 }}>{rhs}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right-hand rule reminder */}
      <div
        style={{
          marginTop: 16,
          width: "100%",
          maxWidth: 560,
          background: "linear-gradient(90deg, #fff8f0 0%, #fff 100%)",
          borderRadius: 14,
          border: "1px solid #ffe0b2",
          padding: "14px 20px",
          fontSize: 13,
          color: "#b06000",
          fontFamily: "monospace",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 22 }}>✋</span>
        <span>
          <strong>Right-Hand Rule:</strong> Point fingers along î, curl toward ĵ — thumb points in
          k̂ direction.
        </span>
      </div>
    </div>
  );
}