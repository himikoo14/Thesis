"use client";

/* =====================================================================
   ShapeCanvas — Lateral Earth Pressure live diagram
   Active soil → RIGHT of wall   |   Passive soil → LEFT of wall
   ===================================================================== */

import { useMemo } from "react";

/* ── Types mirrored from page.tsx ── */
type WallType = "Wall 1" | "Wall 2" | "Wall 3" | "Sheet Pile";

interface SoilLayer {
    gamma: string;
    phi: string;
    cohesion: string;
    beta: string;
    isSaturated: boolean;
    from: string;
    to: string;
    base: string;
}

interface ShapeCardData {
    material: "Active Soil" | "Passive Soil";
    isOpen: boolean;
    visible: boolean;
    layers: SoilLayer[];
}

interface ConcreteData {
    gammaConcrete: string;
    wallType: WallType;
    wall1: { a: string; b: string };
    wall2: { a: string; b: string };
    wall3: { A: string; B: string; C: string; D: string; E: string; F: string };
    sheetPile: { a: string };
}

interface DistLoad {
    side: "Active" | "Passive";
    q: string;
}

interface Props {
    concrete: ConcreteData;
    shapes: ShapeCardData[];
    distLoads: DistLoad[];
}

/* ── Palette ── */
const COLORS = {
    activeSoil: "#C68642",
    activeSoilBg: "rgba(198,134,66,0.22)",
    passiveSoil: "#6B8E50",
    passiveSoilBg: "rgba(107,142,80,0.22)",
    concrete: "#8A9BB0",
    concreteDark: "#5a6b80",
    water: "rgba(59,130,246,0.18)",
    waterStroke: "#3b82f6",
    grid: "#e5e7eb",
    axis: "#9ca3af",
    text: "#374151",
    dim: "#1d4ed8",
    load: "#dc2626",
    loadArrow: "#dc2626",
    passiveLoad: "#7c3aed",
};

/* ── SVG constants ── */
const W = 900;
const H = 700;
const PAD = 60;          // outer padding
const WALL_X = 380;      // x-centre of wall zone (left edge of active zone)
const GROUND_Y = 120;    // y of ground surface

/* ── Helpers ── */
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function getWallDims(c: ConcreteData): { width: number; height: number; baseWidth: number; footingH: number; stemTopW: number; stemBaseW: number; toeW: number } {
    const wt = c.wallType;
    if (wt === "Wall 1") {
        return { width: Number(c.wall1.a) || 0.5, height: Number(c.wall1.b) || 4, baseWidth: Number(c.wall1.a) || 0.5, footingH: 0, stemTopW: Number(c.wall1.a) || 0.5, stemBaseW: Number(c.wall1.a) || 0.5, toeW: 0 };
    }
    if (wt === "Wall 2") {
        return { width: Number(c.wall2.a) || 2, height: Number(c.wall2.b) || 4, baseWidth: Number(c.wall2.a) || 2, footingH: 0, stemTopW: Number(c.wall2.a) || 2, stemBaseW: Number(c.wall2.a) || 2, toeW: 0 };
    }
    if (wt === "Wall 3") {
        const A = Number(c.wall3.A) || 4;
        const B = Number(c.wall3.B) || 2.5;
        const C = Number(c.wall3.C) || 0.5;
        const D = Number(c.wall3.D) || 0.3;
        const E = Number(c.wall3.E) || 0.4;
        const F = Number(c.wall3.F) || 0.8;
        return { width: B, height: A, baseWidth: B, footingH: C, stemTopW: D, stemBaseW: E, toeW: F };
    }
    if (wt === "Sheet Pile") {
        return { width: 0.15, height: Number(c.sheetPile.a) || 5, baseWidth: 0.15, footingH: 0, stemTopW: 0.15, stemBaseW: 0.15, toeW: 0 };
    }
    return { width: 0.5, height: 4, baseWidth: 0.5, footingH: 0, stemTopW: 0.5, stemBaseW: 0.5, toeW: 0 };
}

/* get max depth across all soil layers */
function getMaxSoilDepth(shapes: ShapeCardData[]): number {
    let max = 0;
    shapes.forEach(s => {
        s.layers.forEach(l => {
            const to = Number(l.to);
            if (!isNaN(to) && to > max) max = to;
        });
    });
    return max || 4;
}

/* ── Soil stripe colours per layer index ── */
function soilStripeColor(material: "Active Soil" | "Passive Soil", idx: number, saturated: boolean): string {
    const isActive = material === "Active Soil";
    if (saturated) return isActive ? "rgba(198,134,66,0.38)" : "rgba(107,142,80,0.38)";
    const alphas = [0.18, 0.28, 0.20, 0.30];
    const a = alphas[idx % alphas.length];
    return isActive ? `rgba(198,134,66,${a})` : `rgba(107,142,80,${a})`;
}

/* ── Arrow marker id ── */
const ARROW_ACTIVE = "arrowActive";
const ARROW_PASSIVE = "arrowPassive";

export default function ShapeCanvas({ concrete, shapes, distLoads }: Props) {
    const dims = useMemo(() => getWallDims(concrete), [concrete]);
    const maxDepth = useMemo(() => {
        const soilMax = getMaxSoilDepth(shapes);
        return Math.max(soilMax, dims.height, 3);
    }, [shapes, dims]);

    /* scale: metres → SVG pixels */
    const availH = H - GROUND_Y - PAD;
    const scale = clamp(availH / maxDepth, 40, 140);

    /* wall geometry in SVG coords */
    const wallH = dims.height * scale;
    const wallBase = GROUND_Y + wallH;            // y of bottom of wall
    const wt = concrete.wallType;

    /* horizontal zones */
    const PASSIVE_RIGHT = wt === "Wall 3"
        ? WALL_X + dims.toeW * scale
        : WALL_X;
    const ACTIVE_LEFT = wt === "Wall 3"
        ? WALL_X + (dims.toeW + dims.stemBaseW) * scale
        : WALL_X + dims.width * scale;
    const PASSIVE_ZONE_LEFT = PAD;
    const ACTIVE_ZONE_RIGHT = W - PAD;

    /* ── Build wall SVG path ── */
    function wallPath(): string {
        const x0 = WALL_X;
        const wallWidthPx = dims.width * scale;

        if (wt === "Wall 1") {
            // simple rectangle
            return `M ${x0} ${GROUND_Y} h ${wallWidthPx} v ${wallH} h ${-wallWidthPx} Z`;
        }

        if (wt === "Wall 2") {
            // trapezoid: narrower at top (use 40% of base as top width)
            const topW = wallWidthPx * 0.4;
            const offset = (wallWidthPx - topW) / 2;
            return `M ${x0 + offset} ${GROUND_Y} h ${topW} L ${x0 + wallWidthPx} ${wallBase} h ${-wallWidthPx} Z`;
        }

        if (wt === "Wall 3") {
            // L-shaped retaining wall
            const B = dims.baseWidth * scale;
            const C = dims.footingH * scale;
            const D = dims.stemTopW * scale;
            const E = dims.stemBaseW * scale;
            const F = dims.toeW * scale;
            // stem: from (x0+F, stemTop) width E, height (wallH-C)
            // footing: from (x0, footTop) width B, height C
            const footingTop = wallBase - C;
            const stemBaseR = x0 + F + E;      // stem base right edge
            const stemBaseL = x0 + F;          // stem base left edge
            const stemTopR = stemBaseR;         // right side is vertical
            const stemTopL = stemBaseR - D;     // top-left shifted inward by D 
            return [
                `M ${stemTopL} ${GROUND_Y}`,       // trapezoid top-left
                `L ${stemTopR} ${GROUND_Y}`,       // trapezoid top-right
                `L ${stemBaseR} ${footingTop}`,    // trapezoid bottom-right
                `h ${F}`,                          // footing right overhang (heel side)
                `v ${C}`,                          // footing right down
                `h ${-B}`,                         // footing bottom
                `v ${-C}`,                         // footing left up
                `h ${B - F - E}`,                  // to stem base-left
                `L ${stemTopL} ${GROUND_Y}`,       // trapezoid left side up
                `Z`,
            ].join(" ");
        }

        if (wt === "Sheet Pile") {
            const tw = Math.max(wallWidthPx, 6);
            return `M ${x0} ${GROUND_Y} h ${tw} v ${wallH} h ${-tw} Z`;
        }

        return "";
    }

    /* ── Render soil layers ── */
    function renderSoilLayers() {
        const activeLayers = shapes.filter(s => s.material === "Active Soil" && s.visible);
        const passiveLayers = shapes.filter(s => s.material === "Passive Soil" && s.visible);

        const elements: JSX.Element[] = [];

        activeLayers.forEach((shape, si) => {
            shape.layers.forEach((layer, li) => {
                const from = Number(layer.from);
                const to = Number(layer.to);
                if (isNaN(from) || isNaN(to) || to <= from) return;
                const y1 = GROUND_Y + from * scale;
                const y2 = GROUND_Y + to * scale;
                const fill = soilStripeColor("Active Soil", li, layer.isSaturated);
                elements.push(
                    <rect key={`act-${si}-${li}`}
                        x={ACTIVE_LEFT} y={y1}
                        width={Number(layer.base) * scale || ACTIVE_ZONE_RIGHT - ACTIVE_LEFT} height={y2 - y1}
                        fill={fill} stroke={COLORS.activeSoil} strokeWidth={1} strokeDasharray="0"
                    />
                );
                if (layer.isSaturated) {
                    elements.push(
                        <rect key={`act-sat-${si}-${li}`}
                            x={ACTIVE_LEFT} y={y1}
                            width={Number(layer.base) * scale || ACTIVE_ZONE_RIGHT - ACTIVE_LEFT} height={y2 - y1}
                            fill={COLORS.water} stroke="none"
                        />
                    );
                }
                /* depth label */
                const midY = (y1 + y2) / 2;
                const phi = layer.phi ? `φ=${layer.phi}°` : "";
                const gam = layer.gamma ? `γ=${layer.gamma}` : "";
                elements.push(
                    <text key={`act-lbl-${si}-${li}`}
                        x={ACTIVE_LEFT + 10} y={midY}
                        fontSize="13" fill={COLORS.activeSoil} fontWeight="600"
                        dominantBaseline="middle"
                    >
                        {[gam, phi].filter(Boolean).join("  ")}
                    </text>
                );
            });
        });

        passiveLayers.forEach((shape, si) => {
            shape.layers.forEach((layer, li) => {
                const from = Number(layer.from);
                const to = Number(layer.to);
                if (isNaN(from) || isNaN(to) || to <= from) return;
                const y1 = GROUND_Y + from * scale;
                const y2 = GROUND_Y + to * scale;
                const fill = soilStripeColor("Passive Soil", li, layer.isSaturated);
                elements.push(
                    <rect key={`pas-${si}-${li}`}
                        x={PASSIVE_RIGHT - (Number(layer.base) * scale || PASSIVE_RIGHT - PASSIVE_ZONE_LEFT)} y={y1}
                        width={Number(layer.base) * scale || PASSIVE_RIGHT - PASSIVE_ZONE_LEFT} height={y2 - y1}
                        fill={fill} stroke={COLORS.passiveSoil} strokeWidth={1}
                    />
                );
                if (layer.isSaturated) {
                    elements.push(
                        <rect key={`pas-sat-${si}-${li}`}
                            x={PASSIVE_RIGHT - (Number(layer.base) * scale || PASSIVE_RIGHT - PASSIVE_ZONE_LEFT)} y={y1}
                            width={Number(layer.base) * scale || PASSIVE_RIGHT - PASSIVE_ZONE_LEFT} height={y2 - y1}
                            fill={COLORS.water} stroke="none"
                        />
                    );
                }
                const midY = (y1 + y2) / 2;
                const phi = layer.phi ? `φ=${layer.phi}°` : "";
                const gam = layer.gamma ? `γ=${layer.gamma}` : "";
                elements.push(
                    <text key={`pas-lbl-${si}-${li}`}
                        x={PASSIVE_RIGHT - 10} y={midY}
                        fontSize="13" fill={COLORS.passiveSoil} fontWeight="600"
                        textAnchor="end" dominantBaseline="middle"
                    >
                        {[gam, phi].filter(Boolean).join("  ")}
                    </text>
                );
            });
        });

        return elements;
    }

    /* ── Render distributed loads as arrow arrays ── */
    function renderDistLoads() {
        const elements: JSX.Element[] = [];
        const ARROW_H = 36;
        const ARROW_TOP = GROUND_Y - ARROW_H - 4;

        distLoads.forEach((load, i) => {
            const q = Number(load.q);
            if (!q || isNaN(q)) return;
            const isActive = load.side === "Active";
            const color = isActive ? COLORS.loadArrow : COLORS.passiveLoad;
            const markerId = isActive ? ARROW_ACTIVE : ARROW_PASSIVE;

            if (isActive) {
                /* arrows pointing down on active (right) side */
                const arrowXs = [ACTIVE_LEFT + 30, ACTIVE_LEFT + 80, ACTIVE_LEFT + 130, ACTIVE_LEFT + 180];
                arrowXs.forEach((ax, ai) => {
                    if (ax > ACTIVE_ZONE_RIGHT - 10) return;
                    elements.push(
                        <line key={`al-${i}-${ai}`}
                            x1={ax} y1={ARROW_TOP} x2={ax} y2={GROUND_Y - 4}
                            stroke={color} strokeWidth={2.5}
                            markerEnd={`url(#${markerId})`}
                        />
                    );
                });
                elements.push(
                    <line key={`al-bar-${i}`}
                        x1={ACTIVE_LEFT + 10} y1={ARROW_TOP}
                        x2={Math.min(ACTIVE_LEFT + 200, ACTIVE_ZONE_RIGHT - 10)} y2={ARROW_TOP}
                        stroke={color} strokeWidth={2}
                    />
                );
                elements.push(
                    <text key={`al-lbl-${i}`}
                        x={ACTIVE_LEFT + 100} y={ARROW_TOP - 8}
                        fontSize="14" fontWeight="700" fill={color} textAnchor="middle"
                    >
                        q = {q} kN/m²
                    </text>
                );
            } else {
                /* arrows pointing down on passive (left) side */
                const arrowXs = [PASSIVE_RIGHT - 30, PASSIVE_RIGHT - 80, PASSIVE_RIGHT - 130, PASSIVE_RIGHT - 180];
                arrowXs.forEach((ax, ai) => {
                    if (ax < PASSIVE_ZONE_LEFT + 10) return;
                    elements.push(
                        <line key={`pl-${i}-${ai}`}
                            x1={ax} y1={ARROW_TOP} x2={ax} y2={GROUND_Y - 4}
                            stroke={color} strokeWidth={2.5}
                            markerEnd={`url(#${markerId})`}
                        />
                    );
                });
                elements.push(
                    <line key={`pl-bar-${i}`}
                        x1={Math.max(PASSIVE_RIGHT - 200, PASSIVE_ZONE_LEFT + 10)} y1={ARROW_TOP}
                        x2={PASSIVE_RIGHT - 10} y2={ARROW_TOP}
                        stroke={color} strokeWidth={2}
                    />
                );
                elements.push(
                    <text key={`pl-lbl-${i}`}
                        x={PASSIVE_RIGHT - 100} y={ARROW_TOP - 8}
                        fontSize="14" fontWeight="700" fill={color} textAnchor="middle"
                    >
                        q = {q} kN/m²
                    </text>
                );
            }
        });

        return elements;
    }

    /* ── Depth ruler on the right ── */
    function renderRuler() {
        const ticks: JSX.Element[] = [];
        const rulerX = W - PAD + 10;
        const steps = Math.ceil(maxDepth);
        for (let d = 0; d <= steps; d++) {
            const y = GROUND_Y + d * scale;
            if (y > H - PAD + 10) break;
            ticks.push(
                <g key={`tick-${d}`}>
                    <line x1={rulerX} y1={y} x2={rulerX + 8} y2={y} stroke={COLORS.axis} strokeWidth={1.5} />
                    <text x={rulerX + 12} y={y} fontSize="12" fill={COLORS.axis} dominantBaseline="middle">{d}m</text>
                </g>
            );
        }
        return (
            <g>
                <line x1={rulerX} y1={GROUND_Y} x2={rulerX} y2={Math.min(GROUND_Y + steps * scale, H - PAD + 10)}
                    stroke={COLORS.axis} strokeWidth={1.5} />
                {ticks}
            </g>
        );
    }

    /* ── Wall dimension annotations ── */
    function renderWallDims() {
        const elems: JSX.Element[] = [];
        const wallWidthPx = dims.width * scale;
        const dimColor = COLORS.dim;

        /* height dimension line on the right of wall */
        const dimX = ACTIVE_LEFT + 14;
        elems.push(
            <g key="wall-h-dim">
                <line x1={dimX} y1={GROUND_Y} x2={dimX} y2={wallBase}
                    stroke={dimColor} strokeWidth={1.5} markerStart="url(#dimTick)" markerEnd="url(#dimTick)" />
                <text x={dimX + 10} y={(GROUND_Y + wallBase) / 2}
                    fontSize="13" fontWeight="700" fill={dimColor} dominantBaseline="middle">
                    H={dims.height}m
                </text>
            </g>
        );

        /* width dimension line below wall */
        if (wt !== "Sheet Pile") {
            const dimY = wallBase + 18;
            elems.push(
                <g key="wall-w-dim">
                    <line x1={WALL_X} y1={dimY} x2={WALL_X + wallWidthPx} y2={dimY}
                        stroke={dimColor} strokeWidth={1.5} />
                    <text x={WALL_X + wallWidthPx / 2} y={dimY + 14}
                        fontSize="13" fontWeight="700" fill={dimColor} textAnchor="middle">
                        {wt === "Wall 3" ? `B=${dims.baseWidth}m` : `a=${dims.width}m`}
                    </text>
                </g>
            );
        }

        return elems;
    }

    /* ── Legend ── */
    function renderLegend() {
        const items = [
            { color: COLORS.activeSoil, label: "Active Soil" },
            { color: COLORS.passiveSoil, label: "Passive Soil" },
            { color: COLORS.concrete, label: "Wall / Concrete" },
        ];
        return (
            <g transform={`translate(${PAD}, ${H - PAD + 18})`}>
                {items.map((item, i) => (
                    <g key={i} transform={`translate(${i * 160}, 0)`}>
                        <rect width={14} height={14} rx={3} fill={item.color} opacity={0.8} />
                        <text x={20} y={11} fontSize="13" fill={COLORS.text}>{item.label}</text>
                    </g>
                ))}
            </g>
        );
    }

    const path = wallPath();

    return (
        <div className="bg-white rounded-xl shadow w-full max-w-4xl mb-6 overflow-hidden mx-auto relative z-10">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
                <defs>
                    {/* arrow marker for loads — active */}
                    <marker id={ARROW_ACTIVE} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                        <path d="M0,0 L8,4 L0,8 Z" fill={COLORS.loadArrow} />
                    </marker>
                    {/* arrow marker for loads — passive */}
                    <marker id={ARROW_PASSIVE} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                        <path d="M0,0 L8,4 L0,8 Z" fill={COLORS.passiveLoad} />
                    </marker>
                    {/* tick for dimension lines */}
                    <marker id="dimTick" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                        <line x1="3" y1="0" x2="3" y2="6" stroke={COLORS.dim} strokeWidth={1.5} />
                    </marker>
                    {/* concrete hatch */}
                    <pattern id="concreteHatch" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
                        <line x1="0" y1="0" x2="0" y2="10" stroke={COLORS.concreteDark} strokeWidth={1.5} opacity={0.3} />
                    </pattern>
                </defs>

                {/* ── Background ── */}
                <rect width={W} height={H} fill="#f9fafb" />

                {/* ── Sky / above-ground area ── */}
                <rect x={PAD} y={PAD} width={W - 2 * PAD} height={GROUND_Y - PAD} fill="#f0f9ff" opacity={0.6} />

                {/* ── Soil layers ── */}
                {renderSoilLayers()}

                {/* ── Ground surface line ── */}
                <line x1={PAD} y1={GROUND_Y} x2={W - PAD} y2={GROUND_Y}
                    stroke="#6b7280" strokeWidth={2} strokeDasharray="6 3" />

                {/* "Ground" label */}
                <text x={PAD + 6} y={GROUND_Y - 6} fontSize="12" fill="#6b7280" fontStyle="italic">Ground</text>

                {/* ── Zone separators ── */}
                {/* passive label */}
                <text x={(PASSIVE_ZONE_LEFT + PASSIVE_RIGHT) / 2} y={GROUND_Y - 20}
                    fontSize="14" fontWeight="700" fill={COLORS.passiveSoil}
                    textAnchor="middle">PASSIVE</text>
                {/* active label */}
                <text x={(ACTIVE_LEFT + ACTIVE_ZONE_RIGHT) / 2} y={GROUND_Y - 20}
                    fontSize="14" fontWeight="700" fill={COLORS.activeSoil}
                    textAnchor="middle">ACTIVE</text>

                {/* ── Distributed loads ── */}
                {renderDistLoads()}

                {/* ── Wall ── */}
                {path && (
                    <>
                        <path d={path} fill={COLORS.concrete} stroke={COLORS.concreteDark} strokeWidth={2.5} />
                        <path d={path} fill="url(#concreteHatch)" />
                    </>
                )}

                {/* ── Dimension annotations ── */}
                {renderWallDims()}

                {/* ── Depth ruler ── */}
                {renderRuler()}

                {/* ── Legend ── */}
                {renderLegend()}

                {/* ── Outer border ── */}
                <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD}
                    fill="none" stroke={COLORS.axis} strokeWidth={1.5} rx={4} />
            </svg>
        </div>
    );
}