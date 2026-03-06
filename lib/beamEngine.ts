/* =====================================================================
   beamEngine.ts
   Full statics solver for a simply-supported beam with:
     - Two supports (Pinned + Roller, any positions)
     - Multiple point loads (downward positive)
     - Multiple distributed loads (trapezoidal / uniform / triangular)
   ===================================================================== */

/* ===================== TYPES ===================== */

export type SupportType = "Pinned" | "Roller";

export type Support = {
  type: SupportType;
  location: number; // metres from left end
};

export type PointLoad = {
  magnitude: number; // kN, downward positive
  location: number;  // metres from left end
};

export type DistributedLoad = {
  start: number;    // metres from left end
  end: number;      // metres from left end
  startMag: number; // kN/m at start, downward positive
  endMag: number;   // kN/m at end,   downward positive
};

export type BeamInput = {
  beamLength: number;
  supports: Support[];
  pointLoads: PointLoad[];
  distributedLoads: DistributedLoad[];
};

export type Reaction = {
  location: number;
  type: SupportType;
  vertical: number;   // kN, upward positive
  horizontal: number; // kN (only Pinned can have horizontal; 0 if no horizontal loads)
};

export type EquivalentLoad = {
  magnitude: number; // kN
  location: number;  // metres (centroid of the distributed load patch)
};

export type BeamResult = {
  reactions: Reaction[];
  equivalentLoads: EquivalentLoad[]; // one per distributed load
  shearForce: { x: number; v: number }[];   // kN   — dense sample points
  bendingMoment: { x: number; m: number }[]; // kN·m — dense sample points
  maxShear: number;       // kN  (absolute)
  maxMoment: number;      // kN·m (absolute)
  maxMomentLocation: number; // metres
  steps: string[];        // LaTeX / plain-text solution steps
};

/* ===================== HELPERS ===================== */

/**
 * Convert a trapezoidal distributed load into its equivalent point load
 * and centroid location.
 *
 *   Uniform  (w1 == w2): F = w·L,  x̄ = midpoint
 *   Triangle (w1 == 0):  F = ½w2·L, x̄ = start + 2L/3
 *   Triangle (w2 == 0):  F = ½w1·L, x̄ = start + L/3
 *   Trapezoid:           split into rectangle + triangle
 */
function equivalentPointLoad(d: DistributedLoad): EquivalentLoad {
  const L = d.end - d.start;
  if (L <= 0) return { magnitude: 0, location: d.start };

  const w1 = d.startMag;
  const w2 = d.endMag;

  // Rectangle part (min intensity over length)
  const wRect = Math.min(w1, w2);
  const Frect = wRect * L;
  const xRect = d.start + L / 2;

  // Triangle part (the extra intensity)
  const wTri = Math.abs(w2 - w1);
  const Ftri = 0.5 * wTri * L;
  // If w2 > w1 the triangle grows toward the end → centroid at 2L/3 from start
  // If w1 > w2 the triangle grows toward the start → centroid at L/3 from start
  const xTri = w2 >= w1
    ? d.start + (2 * L) / 3
    : d.start + L / 3;

  const Ftotal = Frect + Ftri;
  if (Ftotal === 0) return { magnitude: 0, location: d.start + L / 2 };

  const xBar = (Frect * xRect + Ftri * xTri) / Ftotal;
  return { magnitude: Ftotal, location: xBar };
}

/* ===================== MAIN SOLVER ===================== */

export function solveBeam(input: BeamInput): BeamResult {
  const { beamLength, supports, pointLoads, distributedLoads } = input;
  const steps: string[] = [];

  /* ---- 0. Validate ---- */
  if (supports.length !== 2) {
    throw new Error("Exactly two supports are required for a statically determinate beam.");
  }

  const [supA, supB] = [...supports].sort((a, b) => a.location - b.location);
  const xA = supA.location;
  const xB = supB.location;
  const span = xB - xA;

  if (span <= 0) {
    throw new Error("The two supports must be at different locations.");
  }

  /* ---- 1. Convert distributed loads to equivalent point loads ---- */
  steps.push("Step 1: Convert distributed loads to equivalent point loads:");

  const equivLoads: EquivalentLoad[] = distributedLoads.map((d, i) => {
    const eq = equivalentPointLoad(d);
    const L = (d.end - d.start).toFixed(3);
    steps.push(
      `\\text{DL ${i + 1}: } w_1=${d.startMag}\\,\\tfrac{\\text{kN}}{\\text{m}},\\; w_2=${d.endMag}\\,\\tfrac{\\text{kN}}{\\text{m}},\\; L=${L}\\,\\text{m}`
    );
    steps.push(`
      \\begin{align*}
      F_{eq${i + 1}} &= ${eq.magnitude.toFixed(3)}\\,\\text{kN} \\\\
      \\bar{x}_{${i + 1}} &= ${eq.location.toFixed(3)}\\,\\text{m from left end}
      \\end{align*}
    `);
    return eq;
  });

  /* ---- 2. Sum all vertical loads ---- */
  steps.push("Step 2: Sum all external vertical loads:");

  const allLoads: { F: number; x: number; label: string }[] = [];

  pointLoads.forEach((p, i) => {
    allLoads.push({ F: p.magnitude, x: p.location, label: `P_{${i + 1}}` });
  });

  equivLoads.forEach((eq, i) => {
    allLoads.push({ F: eq.magnitude, x: eq.location, label: `F_{eq${i + 1}}` });
  });

  const totalLoad = allLoads.reduce((s, l) => s + l.F, 0);

  steps.push(`
    \\begin{align*}
    \\Sigma F_{ext} &= ${allLoads.map(l => `${l.F.toFixed(3)}`).join(" + ")} \\\\
                   &= ${totalLoad.toFixed(3)}\\,\\text{kN}
    \\end{align*}
  `);

  /* ---- 3. Reactions via equilibrium ---- */
  steps.push("Step 3: Apply equilibrium equations (\\(\\Sigma M = 0\\), \\(\\Sigma F_y = 0\\)):");

  // ΣM_A = 0  →  solve for R_B
  // Sum of moments of all loads about A, then divide by span
  const momentAboutA = allLoads.reduce((sum, l) => sum + l.F * (l.x - xA), 0);
  const RB = momentAboutA / span;
  const RA = totalLoad - RB;

  steps.push(`
    \\begin{align*}
    \\Sigma M_A &= 0 \\\\
    R_B &= \\frac{\\sum F_i (x_i - x_A)}{x_B - x_A} = \\frac{${momentAboutA.toFixed(3)}}{${span.toFixed(3)}} = ${RB.toFixed(3)}\\,\\text{kN} \\\\[6pt]
    \\Sigma F_y &= 0 \\\\
    R_A &= \\Sigma F_{ext} - R_B = ${totalLoad.toFixed(3)} - ${RB.toFixed(3)} = ${RA.toFixed(3)}\\,\\text{kN}
    \\end{align*}
  `);

  const reactions: Reaction[] = [
    { location: xA, type: supA.type, vertical: RA, horizontal: 0 },
    { location: xB, type: supB.type, vertical: RB, horizontal: 0 },
  ];

  /* ---- 4. Shear Force & Bending Moment Diagrams ---- */
  steps.push("Step 4: Compute Shear Force (V) and Bending Moment (M) along the beam:");

  const N = 500; // number of sample points
  const dx = beamLength / N;

  const sfPoints: { x: number; v: number }[] = [];
  const bmPoints: { x: number; m: number }[] = [];

  for (let i = 0; i <= N; i++) {
    const x = i * dx;

    // Start with zero; add contributions from left side
    let V = 0;
    let M = 0;

    // Reactions to the left of x (upward → positive shear convention: upward left = +V)
    reactions.forEach((r) => {
      if (r.location <= x) {
        V += r.vertical;          // upward reaction adds to V
        M += r.vertical * (x - r.location);
      }
    });

    // Point loads to the left of x (downward → subtract)
    pointLoads.forEach((p) => {
      if (p.location <= x) {
        V -= p.magnitude;
        M -= p.magnitude * (x - p.location);
      }
    });

    // Distributed loads: integrate from start to min(end, x)
    distributedLoads.forEach((d) => {
      if (d.start >= x) return; // entirely to the right
      const xEnd = Math.min(d.end, x);
      const L = xEnd - d.start;
      if (L <= 0) return;

      // Interpolate intensity at xEnd
      const totalDLLen = d.end - d.start;
      const wAtXEnd = totalDLLen > 0
        ? d.startMag + (d.endMag - d.startMag) * (L / totalDLLen)
        : d.startMag;

      // Rectangle (uniform = startMag over L)
      const Frect = d.startMag * L;
      const xBarRect = d.start + L / 2;

      // Triangle (additional intensity)
      const wTri = wAtXEnd - d.startMag;
      const Ftri = 0.5 * wTri * L;
      const xBarTri = d.start + (2 * L) / 3;

      const Ftotal = Frect + Ftri;
      const xBar = Ftotal !== 0
        ? (Frect * xBarRect + Ftri * xBarTri) / Ftotal
        : d.start + L / 2;

      V -= Ftotal;
      M -= Ftotal * (x - xBar);
    });

    sfPoints.push({ x: parseFloat(x.toFixed(6)), v: parseFloat(V.toFixed(6)) });
    bmPoints.push({ x: parseFloat(x.toFixed(6)), m: parseFloat(M.toFixed(6)) });
  }

  /* ---- 5. Max values ---- */
  const maxShear = Math.max(...sfPoints.map((p) => Math.abs(p.v)));
  const maxMomentPoint = bmPoints.reduce((best, p) =>
    Math.abs(p.m) > Math.abs(best.m) ? p : best
  );

  steps.push(`
    \\begin{align*}
    V_{max} &= ${maxShear.toFixed(3)}\\,\\text{kN} \\\\
    M_{max} &= ${maxMomentPoint.m.toFixed(3)}\\,\\text{kN·m at } x = ${maxMomentPoint.x.toFixed(3)}\\,\\text{m}
    \\end{align*}
  `);

  return {
    reactions,
    equivalentLoads: equivLoads,
    shearForce: sfPoints,
    bendingMoment: bmPoints,
    maxShear,
    maxMoment: Math.abs(maxMomentPoint.m),
    maxMomentLocation: maxMomentPoint.x,
    steps,
  };
}
