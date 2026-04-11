// =============================================================================
// Lat.ts — Lateral Earth Pressure Calculator (Rewritten for from/to/base UI)
// =============================================================================

export type AnalysisMethod = "Rankine's Method" | "Coulomb's Method";

/* ─────────────────────────── INPUT TYPES ───────────────────────────────────── */

export type XY = { x: string; y: string };
export type ShapeType = "Polygon" | "Circle" | "Semi-circle-1" | "Semi-circle-2"
    | "Quarter-circle-1" | "Quarter-circle-2" | "Quarter-circle-3" | "Quarter-circle-4";
export type MaterialType = "Concrete" | "Soil";

export type ShapeData = {
    type: ShapeType;
    material: MaterialType;
    isOpen: boolean;
    visible: boolean;
    isSaturated?: boolean;
    hollow: "Hollow" | "Solid";
    nodes: XY[];
    sides: { a: number; b: number }[];
    radius: string;
    x: string;
    y: string;
    gamma: string;
    phi: string;
    cohesion: string;
    // New fields from UI
    from?: string;
    to?: string;
    base?: string;
    side?: "Active" | "Passive";
};

export type DistributedLoad = {
    startX: string;
    startY: string;
    endX: string;
    endY: string;
    startMag: string;
    endMag: string;
};

/* ─────────────────────────── RESULT TYPES ──────────────────────────────────── */

export type SoilLayer = {
    shapeIndex: number;
    gamma: number;
    phi: number;
    phiRad: number;
    cohesion: number;
    Ka: number;
    Kp: number;
    topY: number;
    bottomY: number;
    thickness: number;
    base: number;
    side: "Active" | "Passive";
};

export type ForceResult = {
    label: string;
    magnitude: number;
    armFromBase: number;
    moment: number;
    isActive: boolean;
};

export type WeightComponent = {
    label: string;
    weight: number;
    armFromToe: number;
    moment: number;
};

export type PressureDiagramPoint = {
    depth: number;
    sigmaV: number;
    sigmaH_active: number;
    sigmaH_passive: number;
    surcharge: number;
};

export type LateralEarthPressureResult = {
    method: AnalysisMethod;
    layers: SoilLayer[];
    pressureDiagram: PressureDiagramPoint[];
    activeForces: ForceResult[];
    passiveForces: ForceResult[];
    totalActiveForce: number;
    totalPassiveForce: number;
    totalActiveMomentAboutBase: number;
    totalPassiveMomentAboutBase: number;
    netForce: number;
    netMoment: number;
    surchargeForces: ForceResult[];
    totalSurchargeForce: number;
    totalSurchargeMoment: number;
    warnings: string[];
};

export type StabilityResult = {
    weightComponents: WeightComponent[];
    totalVerticalLoad: number;
    totalStabilisingMoment: number;
    mu: number;
    frictionForce: number;
    passiveResistance: number;
    slidingResistingForce: number;
    drivingForce: number;
    FS_sliding: number;
    overturnigMoment: number;
    FS_overturning: number;
    B: number;
    xbar: number;
    e: number;
    eLimit: number;
    isWithinKern: boolean;
    qmax: number;
    qmin: number;
    warnings: string[];
};

export type StabilityOptions = {
    baseWidth?: number;
    toeX?: number;
    basePhiDeg?: number;
    baseCohesion?: number;
};

/* ─────────────────────────── MATH HELPERS ──────────────────────────────────── */

const toRad = (deg: number) => (deg * Math.PI) / 180;
const GAMMA_W = 9.81;

function rankineKa(phi: number) { return Math.tan(toRad(45 - phi / 2)) ** 2; }
function rankineKp(phi: number) { return Math.tan(toRad(45 + phi / 2)) ** 2; }

function coulombKa(phi: number, alpha = 90, delta?: number, beta = 0): number {
    const p = toRad(phi), a = toRad(alpha), d = toRad(delta ?? phi / 2), b = toRad(beta);
    const num = Math.sin(a + p) ** 2;
    const sq = Math.sqrt((Math.sin(p + d) * Math.sin(p - b)) / (Math.sin(a - d) * Math.sin(a + b)));
    const den = Math.sin(a) ** 2 * Math.sin(a - d) * (1 + sq) ** 2;
    return den === 0 ? 1 : num / den;
}

function coulombKp(phi: number, alpha = 90, delta?: number, beta = 0): number {
    const p = toRad(phi), a = toRad(alpha), d = toRad(delta ?? phi / 2), b = toRad(beta);
    const num = Math.sin(a - p) ** 2;
    const sq = Math.sqrt((Math.sin(p + d) * Math.sin(p + b)) / (Math.sin(a + d) * Math.sin(a + b)));
    const den = Math.sin(a) ** 2 * Math.sin(a + d) * (1 - sq) ** 2;
    return den === 0 || isNaN(den) ? 1 : num / den;
}

/* ─────────────────────────── LAYER BUILDER ─────────────────────────────────── */

/**
 * Reads each ShapeData's from/to/base/side fields to build SoilLayer objects.
 * Active layers → Pa; Passive layers → Pp.
 */
function buildSoilLayers(
    shapes: ShapeData[],
    method: AnalysisMethod
): { activeLayers: SoilLayer[]; passiveLayers: SoilLayer[]; allLayers: SoilLayer[]; warnings: string[] } {
    const warnings: string[] = [];
    const activeLayers: SoilLayer[] = [];
    const passiveLayers: SoilLayer[] = [];

    for (let i = 0; i < shapes.length; i++) {
        const s = shapes[i];
        if (s.material !== "Soil") continue;
        if (!s.visible) continue;

        const from = parseFloat(s.from ?? "");
        const to = parseFloat(s.to ?? "");
        const base = parseFloat(s.base ?? "0") || 0;
        let gamma = parseFloat(s.gamma);
        const phi = parseFloat(s.phi);
        const cohesion = parseFloat(s.cohesion) || 0;
        const side = s.side ?? "Active";

        if (isNaN(from) || isNaN(to) || to <= from) {
            warnings.push(`Shape ${i + 1}: Invalid from/to values — layer skipped.`);
            continue;
        }
        if (isNaN(gamma) || isNaN(phi)) {
            warnings.push(`Shape ${i + 1}: Missing γ or φ — layer skipped.`);
            continue;
        }

        if (s.isSaturated) gamma -= GAMMA_W;

        const Ka = method === "Rankine's Method" ? rankineKa(phi) : coulombKa(phi);
        const Kp = method === "Rankine's Method" ? rankineKp(phi) : coulombKp(phi);
        const thickness = to - from;

        const layer: SoilLayer = {
            shapeIndex: i,
            gamma,
            phi,
            phiRad: toRad(phi),
            cohesion,
            Ka,
            Kp,
            topY: from,      // depth at top of layer (m from surface)
            bottomY: to,     // depth at bottom of layer
            thickness,
            base,
            side,
        };

        if (side === "Active") activeLayers.push(layer);
        else passiveLayers.push(layer);
    }

    // Sort each set top-to-bottom by topY (shallowest first)
    activeLayers.sort((a, b) => a.topY - b.topY);
    passiveLayers.sort((a, b) => a.topY - b.topY);

    return {
        activeLayers,
        passiveLayers,
        allLayers: [...activeLayers, ...passiveLayers],
        warnings,
    };
}

/* ─────────────────────────── PRESSURE & FORCE HELPERS ──────────────────────── */

/**
 * Computes vertical effective stress at a given depth,
 * walking through an ordered (top→bottom) set of layers.
 */
function sigmaVAtDepth(depth: number, layers: SoilLayer[]): number {
    let sv = 0;
    for (const layer of layers) {
        if (depth <= layer.topY) break;
        const contribution = Math.min(depth, layer.bottomY) - layer.topY;
        sv += layer.gamma * contribution;
    }
    return sv;
}

/**
 * Finds the layer that contains the given depth.
 */
function layerAtDepth(depth: number, layers: SoilLayer[]): SoilLayer | null {
    for (const layer of layers) {
        if (depth >= layer.topY && depth <= layer.bottomY) return layer;
    }
    return layers.length > 0 ? layers[layers.length - 1] : null;
}

/**
 * For a set of layers (active or passive), integrate trapezoidal pressure
 * blocks into discrete ForceResult entries.
 *
 * Active:  σhA = Ka·σv − 2c√Ka  (clamped ≥ 0)
 * Passive: σhP = Kp·σv + 2c√Kp
 *
 * Each layer → rectangle + triangle decomposition.
 * armFromBase = height above bottom of the deepest layer (wall base).
 */
function computeForcesForLayers(
    layers: SoilLayer[],
    isActive: boolean,
    method: AnalysisMethod,
    surchargeQ: number = 0  // uniform surcharge in kPa added to σv
): ForceResult[] {
    if (layers.length === 0) return [];

    const forces: ForceResult[] = [];
    const totalDepth = layers[layers.length - 1].bottomY; // wall base depth

    layers.forEach((layer, idx) => {
        const depthTop = layer.topY;
        const depthBot = layer.bottomY;
        const H = layer.thickness;
        const { Ka, Kp, cohesion } = layer;

        // σv at top and bottom of this layer
        const svTop = sigmaVAtDepth(depthTop, layers) + surchargeQ;
        const svBot = sigmaVAtDepth(depthBot, layers) + surchargeQ;

        let sTop: number;
        let sBot: number;

        if (isActive) {
            sTop = Ka * svTop - 2 * cohesion * Math.sqrt(Ka);
            sBot = Ka * svBot - 2 * cohesion * Math.sqrt(Ka);
            if (sTop < 0) sTop = 0;
            if (sBot < 0) sBot = 0;
        } else {
            sTop = Kp * svTop + 2 * cohesion * Math.sqrt(Kp);
            sBot = Kp * svBot + 2 * cohesion * Math.sqrt(Kp);
        }

        // Moment arms measured from wall base (bottom of deepest layer)
        const elevTop = totalDepth - depthTop;  // height of layer top above base
        const elevBot = totalDepth - depthBot;  // height of layer bottom above base (≥ 0)

        // Rectangle: F = σTop × H, arm = elevBot + H/2
        const F_rect = sTop * H;
        const arm_rect = elevBot + H / 2;

        // Triangle: F = ½ × (σBot − σTop) × H, arm = elevBot + H/3
        const delta = sBot - sTop;
        const F_tri = 0.5 * delta * H;
        const arm_tri = elevBot + H / 3;

        const prefix = isActive ? `Pa${idx + 1}` : `Pp${idx + 1}`;

        if (Math.abs(F_rect) > 1e-6) {
            forces.push({
                label: `${prefix}r`,
                magnitude: F_rect,
                armFromBase: arm_rect,
                moment: F_rect * arm_rect,
                isActive,
            });
        }
        if (Math.abs(F_tri) > 1e-6) {
            forces.push({
                label: `${prefix}t`,
                magnitude: F_tri,
                armFromBase: arm_tri,
                moment: F_tri * arm_tri,
                isActive,
            });
        }
    });

    return forces;
}

/* ─────────────────────────── SURCHARGE ─────────────────────────────────────── */

function computeSurchargeForces(
    distLoads: DistributedLoad[],
    activeLayers: SoilLayer[],
    method: AnalysisMethod
): ForceResult[] {
    if (activeLayers.length === 0) return [];
    const totalDepth = activeLayers[activeLayers.length - 1].bottomY;
    const forces: ForceResult[] = [];

    distLoads.forEach((load, i) => {
        const sM = parseFloat(load.startMag);
        const eM = parseFloat(load.endMag);
        if (isNaN(sM) || isNaN(eM)) return;

        const q = (sM + eM) / 2;
        if (q <= 0) return;

        // Surcharge acts over the full active height
        const layer = layerAtDepth(0, activeLayers) ?? activeLayers[0];
        const Ka = layer.Ka;

        // Uniform surcharge → uniform lateral pressure = Ka × q over full height H
        const H = totalDepth;
        const F = Ka * q * H;
        const arm = H / 2;  // centroid at mid-height

        forces.push({
            label: `Pq${i + 1}`,
            magnitude: F,
            armFromBase: arm,
            moment: F * arm,
            isActive: true,
        });
    });

    return forces;
}

/* ─────────────────────────── PRESSURE DIAGRAM ──────────────────────────────── */

const STEPS = 200;

function buildPressureDiagram(
    activeLayers: SoilLayer[],
    passiveLayers: SoilLayer[],
    method: AnalysisMethod
): PressureDiagramPoint[] {
    const totalDepth = Math.max(
        activeLayers.length > 0 ? activeLayers[activeLayers.length - 1].bottomY : 0,
        passiveLayers.length > 0 ? passiveLayers[passiveLayers.length - 1].bottomY : 0,
        1
    );

    const points: PressureDiagramPoint[] = [];
    for (let i = 0; i <= STEPS; i++) {
        const depth = (i / STEPS) * totalDepth;

        const svA = sigmaVAtDepth(depth, activeLayers);
        const svP = sigmaVAtDepth(depth, passiveLayers);

        const aLayer = layerAtDepth(depth, activeLayers);
        const pLayer = layerAtDepth(depth, passiveLayers);

        let sigmaH_active = 0;
        let sigmaH_passive = 0;

        if (aLayer) {
            sigmaH_active = aLayer.Ka * svA - 2 * aLayer.cohesion * Math.sqrt(aLayer.Ka);
            if (sigmaH_active < 0) sigmaH_active = 0;
        }
        if (pLayer) {
            sigmaH_passive = pLayer.Kp * svP + 2 * pLayer.cohesion * Math.sqrt(pLayer.Kp);
        }

        points.push({ depth, sigmaV: svA, sigmaH_active, sigmaH_passive, surcharge: 0 });
    }
    return points;
}

/* ─────────────────────────── MAIN ENTRY POINT ──────────────────────────────── */

export function computeLateralEarthPressure(
    shapes: ShapeData[],
    distLoads: DistributedLoad[],
    method: AnalysisMethod
): LateralEarthPressureResult {

    const { activeLayers, passiveLayers, allLayers, warnings } = buildSoilLayers(shapes, method);

    if (activeLayers.length === 0 && passiveLayers.length === 0) {
        return emptyLateral(method, warnings);
    }

    // Uniform surcharge from distributed loads
    const surchargeQ = distLoads.reduce((sum, dl) => {
        const sM = parseFloat(dl.startMag);
        const eM = parseFloat(dl.endMag);
        if (isNaN(sM) || isNaN(eM)) return sum;
        return sum + (sM + eM) / 2;
    }, 0);

    const activeForces = computeForcesForLayers(activeLayers, true, method, surchargeQ);
    const passiveForces = computeForcesForLayers(passiveLayers, false, method, 0);
    const surchargeForces = computeSurchargeForces(distLoads, activeLayers, method);
    const pressureDiagram = buildPressureDiagram(activeLayers, passiveLayers, method);

    const totalActiveForce = activeForces.reduce((s, f) => s + f.magnitude, 0);
    const totalPassiveForce = passiveForces.reduce((s, f) => s + f.magnitude, 0);
    const totalActiveMomentAboutBase = activeForces.reduce((s, f) => s + f.moment, 0);
    const totalPassiveMomentAboutBase = passiveForces.reduce((s, f) => s + f.moment, 0);
    const totalSurchargeForce = surchargeForces.reduce((s, f) => s + f.magnitude, 0);
    const totalSurchargeMoment = surchargeForces.reduce((s, f) => s + f.moment, 0);

    return {
        method,
        layers: allLayers,
        pressureDiagram,
        activeForces,
        passiveForces,
        totalActiveForce,
        totalPassiveForce,
        totalActiveMomentAboutBase,
        totalPassiveMomentAboutBase,
        netForce: (totalActiveForce + totalSurchargeForce) - totalPassiveForce,
        netMoment: (totalActiveMomentAboutBase + totalSurchargeMoment) - totalPassiveMomentAboutBase,
        surchargeForces,
        totalSurchargeForce,
        totalSurchargeMoment,
        warnings,
    };
}

function emptyLateral(method: AnalysisMethod, warnings: string[]): LateralEarthPressureResult {
    return {
        method, layers: [], pressureDiagram: [],
        activeForces: [], passiveForces: [],
        totalActiveForce: 0, totalPassiveForce: 0,
        totalActiveMomentAboutBase: 0, totalPassiveMomentAboutBase: 0,
        netForce: 0, netMoment: 0,
        surchargeForces: [], totalSurchargeForce: 0, totalSurchargeMoment: 0,
        warnings: [...warnings, "No valid soil layers found."],
    };
}

/* ─────────────────────────── STABILITY ─────────────────────────────────────── */

export function computeStability(
    lateralResult: LateralEarthPressureResult,
    shapes: ShapeData[],
    distLoads: DistributedLoad[],
    options: StabilityOptions = {}
): StabilityResult {
    const warnings: string[] = [...lateralResult.warnings];
    const weightComponents: WeightComponent[] = [];
    let totalVerticalLoad = 0;
    let totalStabilisingMoment = 0;

    // ── Concrete wall weight ──────────────────────────────────────────────────
    // For each shape with gamma defined (concrete), weight = gamma × area
    // area = (from/to height) × base  for soil shapes
    // For concrete shapes we still use geometry if available, or skip
    let toeX = options.toeX ?? 0;
    let B = options.baseWidth ?? 0;

    // Infer B from the widest base among all layers if not provided
    if (B <= 0) {
        for (const s of shapes) {
            const base = parseFloat(s.base ?? "0");
            if (!isNaN(base) && base > B) B = base;
        }
    }

    // ── Soil layer weights ────────────────────────────────────────────────────
    for (let i = 0; i < shapes.length; i++) {
        const s = shapes[i];
        if (!s.visible) continue;

        const gamma = parseFloat(s.gamma);
        const from = parseFloat(s.from ?? "");
        const to = parseFloat(s.to ?? "");
        const base = parseFloat(s.base ?? "0") || 0;

        if (isNaN(gamma) || isNaN(from) || isNaN(to) || to <= from || base <= 0) continue;

        const height = to - from;
        const area = height * base;           // rectangular block (m²)
        const weight = gamma * area;          // kN/m
        const arm = base / 2 + toeX;         // centroid: mid-width from toe

        const label = `W${i + 1} (${s.material === "Soil" ? s.side ?? "Active" : "Concrete"})`;
        const moment = weight * arm;

        weightComponents.push({ label, weight, armFromToe: arm, moment });
        totalVerticalLoad += weight;
        totalStabilisingMoment += moment;
    }

    // ── Vertical component of surcharge ──────────────────────────────────────
    for (let i = 0; i < distLoads.length; i++) {
        const dl = distLoads[i];
        const sx = parseFloat(dl.startX);
        const ex = parseFloat(dl.endX);
        const sM = parseFloat(dl.startMag);
        const eM = parseFloat(dl.endMag);
        if ([sx, ex, sM, eM].some(isNaN)) continue;

        const width = Math.abs(ex - sx);
        const qAvg = (sM + eM) / 2;
        const Fv = qAvg * width;
        const arm = (sx + ex) / 2 - toeX;
        const moment = Fv * arm;

        weightComponents.push({ label: `Pv_surcharge${i + 1}`, weight: Fv, armFromToe: arm, moment });
        totalVerticalLoad += Fv;
        totalStabilisingMoment += moment;
    }

    if (B <= 0) {
        warnings.push("Base width B ≤ 0 — stability calculation aborted.");
        return emptyStability(B, warnings);
    }

    // ── Overturning moment ────────────────────────────────────────────────────
    const overturnigMoment =
        lateralResult.totalActiveMomentAboutBase + lateralResult.totalSurchargeMoment;

    // ── Base friction ─────────────────────────────────────────────────────────
    const activeLayers = lateralResult.layers.filter(l => l.side === "Active");
    let basePhiDeg = options.basePhiDeg;
    if (basePhiDeg === undefined) {
        const bottomActive = activeLayers[activeLayers.length - 1];
        basePhiDeg = bottomActive?.phi ?? 0;
    }
    const mu = Math.tan(toRad(basePhiDeg));
    const baseCohesion = options.baseCohesion ?? 0;

    // ── FS Sliding ────────────────────────────────────────────────────────────
    const frictionForce = mu * totalVerticalLoad + baseCohesion * B;
    const passiveResistance = lateralResult.totalPassiveForce;
    const slidingResistingForce = frictionForce + passiveResistance;
    const drivingForce = lateralResult.totalActiveForce + lateralResult.totalSurchargeForce;
    const FS_sliding = drivingForce > 0 ? slidingResistingForce / drivingForce : Infinity;

    // ── FS Overturning ────────────────────────────────────────────────────────
    const FS_overturning = overturnigMoment > 0
        ? totalStabilisingMoment / overturnigMoment
        : Infinity;

    // ── Eccentricity ──────────────────────────────────────────────────────────
    const xbar = totalVerticalLoad > 0
        ? (totalStabilisingMoment - overturnigMoment) / totalVerticalLoad
        : B / 2;
    const e = B / 2 - xbar;
    const eLimit = B / 6;
    const isWithinKern = Math.abs(e) <= eLimit;

    if (!isWithinKern) {
        warnings.push(
            `Eccentricity |e| = ${round(Math.abs(e), 3)} m exceeds kern limit B/6 = ${round(eLimit, 3)} m. Tension at heel.`
        );
    }

    // ── Bearing pressures ─────────────────────────────────────────────────────
    let qmax: number, qmin: number;
    if (isWithinKern) {
        qmax = (totalVerticalLoad / B) * (1 + (6 * Math.abs(e)) / B);
        qmin = (totalVerticalLoad / B) * (1 - (6 * Math.abs(e)) / B);
    } else {
        const effLen = 3 * Math.max(xbar, 0);
        qmax = effLen > 0 ? (2 * totalVerticalLoad) / effLen : 0;
        qmin = 0;
    }

    return {
        weightComponents,
        totalVerticalLoad,
        totalStabilisingMoment,
        mu,
        frictionForce,
        passiveResistance,
        slidingResistingForce,
        drivingForce,
        FS_sliding,
        overturnigMoment,
        FS_overturning,
        B,
        xbar,
        e,
        eLimit,
        isWithinKern,
        qmax,
        qmin,
        warnings,
    };
}

function emptyStability(B: number, warnings: string[]): StabilityResult {
    return {
        weightComponents: [], totalVerticalLoad: 0, totalStabilisingMoment: 0,
        mu: 0, frictionForce: 0, passiveResistance: 0,
        slidingResistingForce: 0, drivingForce: 0, FS_sliding: 0,
        overturnigMoment: 0, FS_overturning: 0,
        B, xbar: 0, e: 0, eLimit: B / 6, isWithinKern: false,
        qmax: 0, qmin: 0, warnings,
    };
}

/* ─────────────────────────── SHAPE HELPERS (kept for compatibility) ─────────── */

export function computeShapeArea(shape: ShapeData): number {
    const from = parseFloat(shape.from ?? "");
    const to = parseFloat(shape.to ?? "");
    const base = parseFloat(shape.base ?? "0") || 0;
    if (!isNaN(from) && !isNaN(to) && to > from && base > 0) {
        return (to - from) * base;
    }
    return 0;
}

export function computeShapeCentroidX(shape: ShapeData): number {
    const base = parseFloat(shape.base ?? "0") || 0;
    return base / 2;
}

/* ─────────────────────────── FORMATTING ────────────────────────────────────── */

export const round = (v: number, n = 3): number =>
    Math.round(v * 10 ** n) / 10 ** n;

export const fmt = (v: number, unit: string, n = 3): string =>
    `${round(v, n)} ${unit}`;

export function formatResult(r: LateralEarthPressureResult): string {
    return [
        `=== Lateral Earth Pressure (${r.method}) ===`,
        `Active layers : ${r.layers.filter(l => l.side === "Active").length}`,
        `Passive layers: ${r.layers.filter(l => l.side === "Passive").length}`,
        `Total Pa      : ${fmt(r.totalActiveForce, "kN/m")}`,
        `Total Pp      : ${fmt(r.totalPassiveForce, "kN/m")}`,
        `Net force     : ${fmt(r.netForce, "kN/m")}`,
        r.warnings.length > 0 ? "\nWarnings:\n" + r.warnings.map(w => `  ⚠ ${w}`).join("\n") : "",
    ].join("\n");
}