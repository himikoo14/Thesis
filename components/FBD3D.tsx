"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

/* ================================================================
   TYPES
================================================================ */
export type Force3D = {
    magnitude: string;
    azimuth: string;
    elevation: string;
};

/* ================================================================
   DARK MODE HOOK
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
   CONSTANTS
================================================================ */
const FORCE_COLORS = [0x1848a0, 0xd63031, 0xe17055, 0x6c5ce7, 0x00b894, 0xfdcb6e];

/* ================================================================
   HELPERS
================================================================ */
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
    const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        state.radius = Math.max(3, Math.min(16, state.radius + e.deltaY * 0.012));
    }; const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) { state.isDragging = true; state.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
    };
    const onTouchEnd = () => { state.isDragging = false; };
    const onTouchMove = (e: TouchEvent) => {
        if (!state.isDragging || e.touches.length !== 1) return;
        e.preventDefault();
        state.theta -= (e.touches[0].clientX - state.prevMouse.x) * 0.012;
        state.phi = Math.max(0.15, Math.min(Math.PI - 0.15, state.phi + (e.touches[0].clientY - state.prevMouse.y) * 0.012));
        state.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("wheel", onWheel as any, { passive: false }); canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
        canvas.removeEventListener("mousedown", onDown);
        canvas.removeEventListener("wheel", onWheel as any);
        canvas.removeEventListener("touchstart", onTouchStart);
        canvas.removeEventListener("touchend", onTouchEnd);
        canvas.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
    };
}

function buildForceObjects(
    scene: THREE.Scene,
    forces: Force3D[],
    arrowsRef: React.MutableRefObject<any[]>,
    labelsRef: React.MutableRefObject<CSS2DObject[]>,
    darkMode: boolean
) {
    // Clear old
    arrowsRef.current.forEach(a => scene.remove(a));
    arrowsRef.current = [];
    labelsRef.current.forEach(l => scene.remove(l));
    labelsRef.current = [];

    const maxMag = Math.max(1, ...forces.map(f => parseFloat(f.magnitude) || 0));
    const scale = 2.5 / maxMag;

    forces.forEach((f, i) => {
        const m = parseFloat(f.magnitude);
        const az = parseFloat(f.azimuth);
        const el = parseFloat(f.elevation);
        if (isNaN(m) || isNaN(az) || isNaN(el) || m === 0) return;

        const azR = az * Math.PI / 180;
        const elR = el * Math.PI / 180;
        const color = FORCE_COLORS[i % FORCE_COLORS.length];
        const hexColor = "#" + color.toString(16).padStart(6, "0");
        const len = m * scale;
        const arcR = len * 0.35;

        // ── Main arrow ──
        const vec = new THREE.Vector3(
            m * Math.cos(elR) * Math.cos(azR),
            m * Math.sin(elR),
            m * Math.cos(elR) * Math.sin(azR)
        );
        const arr = new THREE.ArrowHelper(vec.clone().normalize(), new THREE.Vector3(), len, color, len * 0.2, len * 0.12);
        scene.add(arr);
        arrowsRef.current.push(arr);

        const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 });

        const makeLabel = (text: string, pos: THREE.Vector3) => {
            const div = document.createElement("div");
            div.textContent = text;
            // AFTER
            div.style.cssText = `
  color: ${hexColor};
  font-size: 11px;
  font-weight: 700;
  font-family: monospace;
  white-space: nowrap;
  pointer-events: none;
`;
            const obj = new CSS2DObject(div);
            obj.position.copy(pos);
            scene.add(obj);
            labelsRef.current.push(obj);
        };

        // ── Azimuth arc + label ──
        if (Math.abs(az) > 1) {
            const pts: THREE.Vector3[] = [];
            for (let s = 0; s <= 32; s++) {
                const t = (s / 32) * azR;
                pts.push(new THREE.Vector3(arcR * Math.cos(t), 0, arcR * Math.sin(t)));
            }
            const azArc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
            scene.add(azArc);
            arrowsRef.current.push(azArc);

            const midAz = azR / 2;
            makeLabel(`φ=${az.toFixed(1)}°`, new THREE.Vector3(
                (arcR + 0.25) * Math.cos(midAz), 0.15, (arcR + 0.25) * Math.sin(midAz)
            ));
        }

        // ── Elevation arc + label ──
        if (Math.abs(el) > 1) {
            const pts: THREE.Vector3[] = [];
            for (let s = 0; s <= 32; s++) {
                const t = (s / 32) * elR;
                pts.push(new THREE.Vector3(
                    arcR * Math.cos(t) * Math.cos(azR),
                    arcR * Math.sin(t),
                    arcR * Math.cos(t) * Math.sin(azR)
                ));
            }
            const elArc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
            scene.add(elArc);
            arrowsRef.current.push(elArc);

            const midEl = elR / 2;
            makeLabel(`α=${el.toFixed(1)}°`, new THREE.Vector3(
                (arcR + 0.25) * Math.cos(midEl) * Math.cos(azR),
                (arcR + 0.25) * Math.sin(midEl) + 0.1,
                (arcR + 0.25) * Math.cos(midEl) * Math.sin(azR)
            ));
        }

        // ── Force label at tip ──
        const tipPos = new THREE.Vector3(
            len * Math.cos(elR) * Math.cos(azR),
            len * Math.sin(elR),
            len * Math.cos(elR) * Math.sin(azR)
        );
        makeLabel(`F${i + 1}=${m} kN`, tipPos);

        // ── XZ projection line ──
        const projLen = len * Math.cos(elR);
        const projVec = new THREE.Vector3(Math.cos(azR) * projLen, 0, Math.sin(azR) * projLen);
        scene.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), projVec]),
            new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 })
        ));

        // ── Vertical line from projection to tip ──
        scene.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([projVec, tipPos]),
            new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 })
        ));
    });
}

/* ================================================================
   COMPONENT PROPS
================================================================ */
type FBD3DProps = {
    forces: Force3D[];
    height?: string;         // e.g. "300px" — default "260px sm:300px"
    showResultant?: boolean;
    resultant?: { sumFx: number; sumFy: number; sumFz: number; R: number };
};

/* ================================================================
   MAIN COMPONENT
================================================================ */
import { useState } from "react";

export default function FBD3DComponent({ forces, height, showResultant = false, resultant }: FBD3DProps) {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendRef = useRef<THREE.WebGLRenderer | null>(null);
    const labelRendRef = useRef<CSS2DRenderer | null>(null);
    const arrowsRef = useRef<any[]>([]);
    const labelsRef = useRef<CSS2DObject[]>([]);
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

        const labelRenderer = new CSS2DRenderer();
        labelRenderer.setSize(W, H);
        labelRenderer.domElement.style.position = "absolute";
        labelRenderer.domElement.style.top = "0";
        labelRenderer.domElement.style.pointerEvents = "none";
        el.appendChild(labelRenderer.domElement);
        labelRendRef.current = labelRenderer;

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
            labelRenderer.render(scene, camera);
        };
        animate();
        const cleanup = attachOrbit(renderer.domElement, orbit);
        return () => {
            cancelAnimationFrame(raf);
            cleanup();
            renderer.dispose();
            if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
            if (el.contains(labelRenderer.domElement)) el.removeChild(labelRenderer.domElement);
        };
    }, []);

    // Dark mode reactive
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
        // Rebuild labels with new dark mode colors
        const scene2 = sceneRef.current!;
        buildForceObjects(scene2, forces, arrowsRef, labelsRef, darkMode);
    }, [darkMode]);

    // Update forces
    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene) return;
        buildForceObjects(scene, forces, arrowsRef, labelsRef, darkMode);

        // Add resultant arrow if needed
        if (showResultant && resultant && resultant.R > 0.001) {
            const rv = new THREE.Vector3(resultant.sumFx, resultant.sumFz, resultant.sumFy);
            const maxMag = Math.max(1, ...forces.map(f => parseFloat(f.magnitude) || 0), resultant.R);
            const scale = 2.5 / maxMag;
            const resArr = new THREE.ArrowHelper(
                rv.clone().normalize(),
                new THREE.Vector3(),
                resultant.R * scale,
                0x009900,
                resultant.R * scale * 0.2,
                resultant.R * scale * 0.12
            );
            scene.add(resArr);
            arrowsRef.current.push(resArr);
        }
    }, [forces, showResultant, resultant]);

    return (
        <div
            className="relative w-full rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden mt-2"
            style={{ height: height ?? undefined }}
        >
            <div
                ref={mountRef}
                className={`w-full cursor-grab ${height ? "" : "h-[260px] sm:h-[300px]"}`}
                style={height ? { height } : undefined}
            />

            {/* Axis legend */}
            <div className="absolute top-2 left-2.5 text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 pointer-events-none font-mono">
                <span className="text-[#ff4444]">■</span> X &nbsp;
                <span className="text-[#22bb44]">■</span> Y &nbsp;
                <span className="text-[#2266ff]">■</span> Z
            </div>

            {/* Resultant badge */}
            {showResultant && (
                <div className="absolute top-2 right-2.5 text-[11px] font-bold text-[#009900] pointer-events-none">
                    — Resultant (R)
                </div>
            )}

            {/* Hint */}
            <div className="absolute bottom-2 right-2.5 text-[10px] text-gray-400 pointer-events-none">
                Drag to rotate · Scroll to zoom
            </div>
        </div>
    );
}