/**
 * Equilibriumconc.ts
 * ─────────────────────────────────────────────────────────────────
 * 2D Concurrent Force Equilibrium Solver
 *
 * Method: Standard statics approach only —
 *   ΣFx = 0  →  solve for one unknown
 *   ΣFy = 0  →  solve for the other unknown
 *   θ = atan2(ΣFy, ΣFx) for angle unknowns
 *
 * No Cramer's Rule, no matrices — just equilibrium equations.
 * ─────────────────────────────────────────────────────────────────
 */

export type KnownForce = {
  magnitude: number;
  angle: number;
  label: string;
};

export type UnknownForce = {
  magnitude?: number;
  angle?: number;
  label: string;
};

export type Eq2Result = {
  unknowns: {
    label: string;
    magnitude: number;
    angle: number;
    value: number;
  }[];
  steps: string[];
};

/* ================================================================
   HELPERS
================================================================ */
const DEG = Math.PI / 180;
const cosd = (d: number) => Math.cos(d * DEG);
const sind = (d: number) => Math.sin(d * DEG);
const atan2d = (y: number, x: number) => {
  const deg = Math.atan2(y, x) / DEG;
  return ((deg % 360) + 360) % 360;
};
const clean = (n: number) => Math.abs(n) < 1e-9 ? 0 : parseFloat(n.toPrecision(6));
const fmt = (n: number) => parseFloat(n.toFixed(2)).toString();

/* ================================================================
   FORMATTING HELPERS
================================================================ */

/** Format angle as trig token: \cos(150^\circ) */
const fmtCos = (angle: number) => `\\cos(${fmt(angle)}^\\circ)`;
const fmtSin = (angle: number) => `\\sin(${fmt(angle)}^\\circ)`;

/**
 * Format a signed term for summation.
 * Returns "+ value" or "- value" strings, simplifying "+(-..." into "-..."
 */
const signedTerm = (val: string, isFirst = false): string => {
  const trimmed = val.trim();
  // If the value itself starts with a minus, show as "- ..." not "+ -..."
  if (trimmed.startsWith("-")) {
    return `- ${trimmed.slice(1).trim()}`;
  }
  if (isFirst) return trimmed;
  return `+ ${trimmed}`;
};

/**
 * Build a summation line like: "A + B - C = 0"
 * Each term is a string; negative terms auto-become subtraction.
 */
const buildSum = (terms: string[]): string => {
  let result = "";
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i].trim();
    if (i === 0) {
      result = t;
    } else if (t.startsWith("-")) {
      result += ` - ${t.slice(1).trim()}`;
    } else {
      result += ` + ${t}`;
    }
  }
  return result;
};

/**
 * Format a numeric coefficient for display in steps.
 * Returns trig form if an angle is provided, else the decimal.
 * level: 0 = (), 1 = [], 2 = {}
 */
const bracket = (inner: string, level = 0): string => {
  if (level === 0) return `(${inner})`;
  if (level === 1) return `[${inner}]`;
  return `\\{${inner}\\}`;
};

/**
 * Format multiplication of a trig coeff and a force label.
 * e.g. cos(150°) · F₂  →  \cos(150^\circ)(F_{2})  [no dot]
 */
const trigTimes = (trigStr: string, label: string): string =>
  `${trigStr}${bracket(label)}`;

/**
 * Format a known force's component term for the equilibrium equation.
 * e.g. magnitude=600, angle=270 → "600\sin(270^\circ)"
 */
const knownTermX = (f: KnownForce): string =>
  `${fmt(f.magnitude)}${fmtCos(f.angle)}`;
const knownTermY = (f: KnownForce): string =>
  `${fmt(f.magnitude)}${fmtSin(f.angle)}`;

/**
 * Evaluate numeric value and format it, keeping trig label in steps.
 * Returns: { numericVal, stepStr }
 */
const evalTrig = (mag: number, angle: number, axis: "x" | "y"): { val: number; trigStr: string } => {
  const val = clean(axis === "x" ? mag * cosd(angle) : mag * sind(angle));
  const trigStr = axis === "x" ? fmtCos(angle) : fmtSin(angle);
  return { val, trigStr };
};

/* ================================================================
   SIGN SIMPLIFIER
   Cleans up any residual "+ (-" patterns in a step string.
================================================================ */
const cleanSigns = (s: string): string =>
  s
    .replace(/\+\s*\(-/g, "- ")
    .replace(/\+\s*-\s*/g, "- ")
    .replace(/\-\s*\(-/g, "+ ")
    .replace(/\-\s*-\s*/g, "+ ");

/* ================================================================
   MAIN SOLVER
================================================================ */
export function solveEquilibrium2D(
  knownForces: KnownForce[],
  unknownForces: UnknownForce[]
): Eq2Result {
  const steps: string[] = [];
  const push = (s: string) => steps.push(cleanSigns(s));

  const dof = unknownForces.reduce((acc, u) => {
    if (u.magnitude === undefined) acc++;
    if (u.angle === undefined) acc++;
    return acc;
  }, 0);

  if (dof === 0) throw new Error("No unknowns provided.");
  if (dof > 2) throw new Error("More than 2 unknowns — cannot solve with 2 equations.");

  /* ── Step 1: Resolve known forces ── */
  push("\\textbf{Step 1: Resolve Known Forces into Components}");
  push("\\text{Each force: } F_x = F\\cos\\theta, \\quad F_y = F\\sin\\theta");

  let sumKx = 0;
  let sumKy = 0;

  for (const f of knownForces) {
    const fx = clean(f.magnitude * cosd(f.angle));
    const fy = clean(f.magnitude * sind(f.angle));
    sumKx += fx;
    sumKy += fy;
    push(`${f.label}_x = ${fmt(f.magnitude)}${fmtCos(f.angle)} = ${fmt(fx)}\\text{ kN}`);
    push(`${f.label}_y = ${fmt(f.magnitude)}${fmtSin(f.angle)} = ${fmt(fy)}\\text{ kN}`);
  }

  sumKx = clean(sumKx);
  sumKy = clean(sumKy);

  push(`\\Sigma F_{x,\\text{known}} = ${fmt(sumKx)}\\text{ kN}`);
  push(`\\Sigma F_{y,\\text{known}} = ${fmt(sumKy)}\\text{ kN}`);

  /* ================================================================
     CASE 1: One fully unknown force (magnitude AND angle both unknown)
  ================================================================ */
  const fullyUnknown = unknownForces.find(
    u => u.magnitude === undefined && u.angle === undefined
  );

  if (fullyUnknown) {
    push("\\textbf{Step 2: Apply Equilibrium Conditions}");
    push(cleanSigns(`\\Sigma F_x = 0: \\quad ${buildSum([fmt(sumKx), `${fullyUnknown.label}_x`])} = 0`));
    push(cleanSigns(`\\Sigma F_y = 0: \\quad ${buildSum([fmt(sumKy), `${fullyUnknown.label}_y`])} = 0`));

    push("\\textbf{Step 3: Solve for Components}");
    const Fx = clean(-sumKx);
    const Fy = clean(-sumKy);
    push(`${fullyUnknown.label}_x = ${fmt(Fx)}\\text{ kN}`);
    push(`${fullyUnknown.label}_y = ${fmt(Fy)}\\text{ kN}`);

    push("\\textbf{Step 4: Magnitude and Angle}");
    const mag = clean(Math.sqrt(Fx ** 2 + Fy ** 2));
    const ang = atan2d(Fy, Fx);
    push(
      `|${fullyUnknown.label}| = \\sqrt{${bracket(fmt(Fx))}^2 + ${bracket(fmt(Fy))}^2} = ${fmt(mag)}\\text{ kN}`
    );
    push(
      `\\theta = \\tan^{-1}\\!\\left(\\frac{${fmt(Fy)}}{${fmt(Fx)}}\\right) = ${fmt(ang)}^\\circ`
    );

    push("\\textbf{Step 5: Verify}");
    push(cleanSigns(
      `\\Sigma F_x = ${buildSum([fmt(sumKx), fmt(Fx)])} = ${fmt(clean(sumKx + Fx))}\\text{ kN} \\approx 0 \\checkmark`
    ));
    push(cleanSigns(
      `\\Sigma F_y = ${buildSum([fmt(sumKy), fmt(Fy)])} = ${fmt(clean(sumKy + Fy))}\\text{ kN} \\approx 0 \\checkmark`
    ));

    return {
      unknowns: [{ label: fullyUnknown.label, magnitude: mag, angle: ang, value: mag }],
      steps,
    };
  }

  /* ================================================================
     CASE 2: One unknown (magnitude OR angle)
  ================================================================ */
  if (dof === 1) {
    const uMag = unknownForces.find(u => u.magnitude === undefined);
    const uAng = unknownForces.find(u => u.angle === undefined);

    /* ── 2a: Unknown magnitude ── */
    if (uMag && uMag.angle !== undefined) {
      const cx = clean(cosd(uMag.angle));
      const cy = clean(sind(uMag.angle));
      const useX = Math.abs(cx) >= Math.abs(cy);
      const coeff = useX ? cx : cy;
      const sumK = useX ? sumKx : sumKy;
      const axis = useX ? "x" : "y";
      const trigFn = useX ? fmtCos(uMag.angle) : fmtSin(uMag.angle);

      push("\\textbf{Step 2: Apply Equilibrium Conditions}");

      // Build ΣFx = 0 with trig forms for known forces + unknown
      const xTerms = knownForces.map(f => `${fmt(f.magnitude)}${fmtCos(f.angle)}`);
      xTerms.push(`${uMag.label}${fmtCos(uMag.angle)}`);
      push(`\\Sigma F_x = 0: \\quad ${buildSum(xTerms)} = 0`);

      const yTerms = knownForces.map(f => `${fmt(f.magnitude)}${fmtSin(f.angle)}`);
      yTerms.push(`${uMag.label}${fmtSin(uMag.angle)}`);
      push(`\\Sigma F_y = 0: \\quad ${buildSum(yTerms)} = 0`);

      push(`Step 3: Solve from ΣF${axis} = 0`);
      push(cleanSigns(`${fmt(sumK)} + ${uMag.label}${bracket(fmt(coeff))} = 0`));
      push(
        `${uMag.label} = \\frac{${fmt(-sumK)}}{${fmt(coeff)}} = ${fmt(clean(-sumK / coeff))}\\text{ kN}`
      );

      const val = clean(-sumK / coeff);
      const mag = Math.abs(val);
      const ang = val >= 0 ? uMag.angle : atan2d(clean(-sumKy), clean(-sumKx));

      if (val < 0) {
        push(`\\text{Negative result — force acts opposite to assumed direction.}`);
        push(`\\text{True angle} = ${fmt(ang)}^\\circ`);
      }

      push("\\textbf{Step 4: Verify}");
      push(cleanSigns(
        `\\Sigma F_x = ${buildSum([fmt(sumKx), `${fmt(mag)}${fmtCos(ang)}`])} = ${fmt(clean(sumKx + mag * cosd(ang)))}\\text{ kN} \\approx 0 \\checkmark`
      ));
      push(cleanSigns(
        `\\Sigma F_y = ${buildSum([fmt(sumKy), `${fmt(mag)}${fmtSin(ang)}`])} = ${fmt(clean(sumKy + mag * sind(ang)))}\\text{ kN} \\approx 0 \\checkmark`
      ));

      return {
        unknowns: [{ label: uMag.label, magnitude: mag, angle: ang, value: val }],
        steps,
      };
    }

    /* ── 2b: Unknown angle ── */
    if (uAng && uAng.magnitude !== undefined) {
      push("\\textbf{Step 2: Apply Equilibrium Conditions}");
      push(cleanSigns(
        `\\Sigma F_x = 0: \\quad ${buildSum([fmt(sumKx), `${fmt(uAng.magnitude)}\\cos\\theta`])} = 0`
      ));
      push(cleanSigns(
        `\\Sigma F_y = 0: \\quad ${buildSum([fmt(sumKy), `${fmt(uAng.magnitude)}\\sin\\theta`])} = 0`
      ));

      push("\\textbf{Step 3: Solve for Angle}");
      const Fx = clean(-sumKx);
      const Fy = clean(-sumKy);
      push(`${uAng.label}\\cos\\theta = ${fmt(Fx)}`);
      push(`${uAng.label}\\sin\\theta = ${fmt(Fy)}`);
      push(
        `\\theta = \\tan^{-1}\\!\\left(\\frac{\\Sigma F_y}{\\Sigma F_x}\\right) = \\tan^{-1}\\!\\left(\\frac{${fmt(Fy)}}{${fmt(Fx)}}\\right) = ${fmt(atan2d(Fy, Fx))}^\\circ`
      );

      const ang = atan2d(Fy, Fx);
      const required = clean(Math.sqrt(Fx ** 2 + Fy ** 2));

      push("\\textbf{Step 4: Check Magnitude}");
      push(
        `\\text{Required} = \\sqrt{${bracket(fmt(Fx))}^2 + ${bracket(fmt(Fy))}^2} = ${fmt(required)}\\text{ kN}`
      );
      if (Math.abs(required - uAng.magnitude) > 0.01 * uAng.magnitude + 1e-6) {
        throw new Error(
          `No valid angle: given magnitude ${fmt(uAng.magnitude)} kN ≠ required ${fmt(required)} kN.`
        );
      }
      push(`${fmt(required)} \\approx ${fmt(uAng.magnitude)} \\checkmark`);

      push("\\textbf{Step 5: Verify}");
      push(cleanSigns(
        `\\Sigma F_x = ${buildSum([fmt(sumKx), `${fmt(uAng.magnitude)}${fmtCos(ang)}`])} = ${fmt(clean(sumKx + uAng.magnitude * cosd(ang)))}\\text{ kN} \\approx 0 \\checkmark`
      ));
      push(cleanSigns(
        `\\Sigma F_y = ${buildSum([fmt(sumKy), `${fmt(uAng.magnitude)}${fmtSin(ang)}`])} = ${fmt(clean(sumKy + uAng.magnitude * sind(ang)))}\\text{ kN} \\approx 0 \\checkmark`
      ));

      return {
        unknowns: [{ label: uAng.label, magnitude: uAng.magnitude, angle: ang, value: uAng.magnitude }],
        steps,
      };
    }
  }

  /* ================================================================
     CASE 3: Two unknown magnitudes, both angles known
  ================================================================ */
  const bothMag =
    unknownForces.length === 2 &&
    unknownForces.every(u => u.magnitude === undefined && u.angle !== undefined);

  if (bothMag) {
    const u1 = unknownForces[0];
    const u2 = unknownForces[1];
    const c1x = clean(cosd(u1.angle!));
    const c1y = clean(sind(u1.angle!));
    const c2x = clean(cosd(u2.angle!));
    const c2y = clean(sind(u2.angle!));
    const rhsX = clean(-sumKx);
    const rhsY = clean(-sumKy);

    // Trig tokens
    const cos1 = fmtCos(u1.angle!);
    const sin1 = fmtSin(u1.angle!);
    const cos2 = fmtCos(u2.angle!);
    const sin2 = fmtSin(u2.angle!);

    push("\\textbf{Step 2: Write Equilibrium Equations}");

    // Build full ΣFx with trig forms for known forces + unknowns
    const xTerms = knownForces.map(f => `${fmt(f.magnitude)}${fmtCos(f.angle)}`);
    xTerms.push(`${u1.label}${cos1}`);
    xTerms.push(`${u2.label}${cos2}`);
    push(`\\Sigma F_x = 0: \\quad ${buildSum(xTerms)} = 0`);

    const yTerms = knownForces.map(f => `${fmt(f.magnitude)}${fmtSin(f.angle)}`);
    yTerms.push(`${u1.label}${sin1}`);
    yTerms.push(`${u2.label}${sin2}`);
    push(`\\Sigma F_y = 0: \\quad ${buildSum(yTerms)} = 0`);

    // Simplified with numeric known sums
    push(cleanSigns(`\\Sigma F_x = 0: \\quad ${buildSum([fmt(sumKx), `${u1.label}${cos1}`, `${u2.label}${cos2}`])} = 0`));
    push(cleanSigns(`\\Sigma F_y = 0: \\quad ${buildSum([fmt(sumKy), `${u1.label}${sin1}`, `${u2.label}${sin2}`])} = 0`));

    let val1: number, val2: number;

    if (Math.abs(c2x) < 1e-9) {
      push(`Step 3: ΣFx has only ${u1.label} — solve directly`);
      push(`${u1.label}${cos1} = ${fmt(rhsX)}`);
      val1 = clean(rhsX / c1x);
      push(`${u1.label} = \\frac{${fmt(rhsX)}}{${cos1}} = ${fmt(val1)}\\text{ kN}`);
      push("\\textbf{Step 4: Substitute into ΣFy = 0}");
      push(cleanSigns(
        `${fmt(sumKy)} + ${sin1}${bracket(fmt(val1))} + ${u2.label}${sin2} = 0`
      ));
      val2 = clean((rhsY - c1y * val1) / c2y);
      push(`${u2.label} = ${fmt(val2)}\\text{ kN}`);

    } else if (Math.abs(c2y) < 1e-9) {
      push(`Step 3: ΣFy has only ${u1.label} — solve directly`);
      push(`${u1.label}${sin1} = ${fmt(rhsY)}`);
      val1 = clean(rhsY / c1y);
      push(`${u1.label} = \\frac{${fmt(rhsY)}}{${sin1}} = ${fmt(val1)}\\text{ kN}`);
      push("\\textbf{Step 4: Substitute into ΣFx = 0}");
      push(cleanSigns(
        `${fmt(sumKx)} + ${cos1}${bracket(fmt(val1))} + ${u2.label}${cos2} = 0`
      ));
      val2 = clean((rhsX - c1x * val1) / c2x);
      push(`${u2.label} = ${fmt(val2)}\\text{ kN}`);

    } else if (Math.abs(c1x) < 1e-9) {
      push(`Step 3: ΣFx has only ${u2.label} — solve directly`);
      push(`${u2.label}${cos2} = ${fmt(rhsX)}`);
      val2 = clean(rhsX / c2x);
      push(`${u2.label} = \\frac{${fmt(rhsX)}}{${cos2}} = ${fmt(val2)}\\text{ kN}`);
      push("\\textbf{Step 4: Substitute into ΣFy = 0}");
      push(cleanSigns(
        `${fmt(sumKy)} + ${u1.label}${sin1} + ${sin2}${bracket(fmt(val2))} = 0`
      ));
      val1 = clean((rhsY - c2y * val2) / c1y);
      push(`${u1.label} = ${fmt(val1)}\\text{ kN}`);

    } else if (Math.abs(c1y) < 1e-9) {
      push(`Step 3: ΣFy has only ${u2.label} — solve directly`);
      push(`${u2.label}${sin2} = ${fmt(rhsY)}`);
      val2 = clean(rhsY / c2y);
      push(`${u2.label} = \\frac{${fmt(rhsY)}}{${sin2}} = ${fmt(val2)}\\text{ kN}`);
      push("\\textbf{Step 4: Substitute into ΣFx = 0}");
      push(cleanSigns(
        `${fmt(sumKx)} + ${u1.label}${cos1} + ${cos2}${bracket(fmt(val2))} = 0`
      ));
      val1 = clean((rhsX - c2x * val2) / c1x);
      push(`${u1.label} = ${fmt(val1)}\\text{ kN}`);

    } else {
      /* General: express u1 from ΣFx, substitute into ΣFy */
      push(`Step 3: Express ${u1.label} from ΣFx = 0`);
      push(cleanSigns(
        `${u1.label} = \\frac{${fmt(rhsX)} - ${u2.label}${cos2}}{${cos1}}`
      ));

      push(`Step 4: Substitute into ΣFy = 0, solve for ${u2.label}`);

      const coeff_u2 = clean(c2y - (c1y * c2x) / c1x);
      const rhs_sub = clean(-sumKy - (c1y * rhsX) / c1x);

      if (Math.abs(coeff_u2) < 1e-9)
        throw new Error("System is singular — the two unknown forces are parallel.");

      // Show substituted equation symbolically
      push(cleanSigns(
        `${u2.label}\\left[${sin2} - \\frac{${sin1} \\cdot ${cos2}}{${cos1}}\\right] = ${fmt(rhs_sub)}`
      ));
      push(`${u2.label}\\left(${fmt(coeff_u2)}\\right) = ${fmt(rhs_sub)}`);
      val2 = clean(rhs_sub / coeff_u2);
      push(`${u2.label} = \\frac{${fmt(rhs_sub)}}{${fmt(coeff_u2)}} = ${fmt(val2)}\\text{ kN}`);

      push(`Step 5: Back-substitute to find ${u1.label}`);
      push(cleanSigns(
        `${u1.label} = \\frac{${fmt(rhsX)} - ${cos2}${bracket(fmt(val2))}}{${cos1}}`
      ));
      val1 = clean((rhsX - c2x * val2) / c1x);
      push(`${u1.label} = ${fmt(val1)}\\text{ kN}`);
    }

    /* Handle negatives */
    const resolve = (
      label: string, val: number,
      cx: number, cy: number, assumedAngle: number
    ) => {
      if (val < 0) {
        const trueAngle = atan2d(val * cy, val * cx);
        push(`\\text{${label} is negative — acts opposite to assumed direction.}`);
        push(`\\text{True angle} = ${fmt(trueAngle)}^\\circ`);
        return { magnitude: Math.abs(val), angle: trueAngle };
      }
      return { magnitude: val, angle: assumedAngle };
    };

    const r1 = resolve(u1.label, val1, c1x, c1y, u1.angle!);
    const r2 = resolve(u2.label, val2, c2x, c2y, u2.angle!);

    push("\\textbf{Verify Equilibrium}");
    push(`\\Sigma F_x = ${fmt(clean(sumKx + val1 * c1x + val2 * c2x))}\\text{ kN} \\approx 0 \\checkmark`);
    push(`\\Sigma F_y = ${fmt(clean(sumKy + val1 * c1y + val2 * c2y))}\\text{ kN} \\approx 0 \\checkmark`);

    return {
      unknowns: [
        { label: u1.label, ...r1, value: r1.magnitude },
        { label: u2.label, ...r2, value: r2.magnitude },
      ],
      steps,
    };
  }

  /* ================================================================
     CASE 4: One unknown magnitude + one unknown angle (different forces)
  ================================================================ */
  const uMag2 = unknownForces.find(u => u.magnitude === undefined && u.angle !== undefined);
  const uAng2 = unknownForces.find(u => u.angle === undefined && u.magnitude !== undefined);

  if (uMag2 && uAng2) {
    const cx = clean(cosd(uMag2.angle!));
    const cy = clean(sind(uMag2.angle!));
    const M = uAng2.magnitude!;
    const cos_u = fmtCos(uMag2.angle!);
    const sin_u = fmtSin(uMag2.angle!);

    push("\\textbf{Step 2: Write Equilibrium Equations}");

    const xTerms2 = knownForces.map(f => `${fmt(f.magnitude)}${fmtCos(f.angle)}`);
    xTerms2.push(`${uMag2.label}${cos_u}`);
    xTerms2.push(`${uAng2.label}_x`);
    push(`\\Sigma F_x = 0: \\quad ${buildSum(xTerms2)} = 0`);

    const yTerms2 = knownForces.map(f => `${fmt(f.magnitude)}${fmtSin(f.angle)}`);
    yTerms2.push(`${uMag2.label}${sin_u}`);
    yTerms2.push(`${uAng2.label}_y`);
    push(`\\Sigma F_y = 0: \\quad ${buildSum(yTerms2)} = 0`);

    push(`\\text{Magnitude constraint: } {${uAng2.label}_x}^2 + {${uAng2.label}_y}^2 = ${fmt(M)}^2`);

    push(`Step 3: Express unknown-angle components in terms of ${uMag2.label}`);
    push(cleanSigns(`${uAng2.label}_x = ${fmt(-sumKx)} - ${uMag2.label}${cos_u}`));
    push(cleanSigns(`${uAng2.label}_y = ${fmt(-sumKy)} - ${uMag2.label}${sin_u}`));

    push("\\textbf{Step 4: Substitute into magnitude constraint → quadratic}");

    const a = 1;
    const b = clean(2 * (sumKx * cx + sumKy * cy));
    const c_coeff = clean(sumKx ** 2 + sumKy ** 2 - M ** 2);

    push(cleanSigns(
      `${bracket(`${fmt(sumKx)} + ${uMag2.label}${cos_u}`)}^2 + ${bracket(`${fmt(sumKy)} + ${uMag2.label}${sin_u}`)}^2 = ${fmt(M)}^2`
    ));
    push(cleanSigns(`${uMag2.label}^2 + ${fmt(b)}\\,${uMag2.label} + ${fmt(c_coeff)} = 0`));

    const disc = clean(b ** 2 - 4 * a * c_coeff);

    if (disc < -1e-9) {
      throw new Error("No real solution: given magnitude cannot satisfy equilibrium.");
    }

    push(`\\text{Discriminant} = ${fmt(b)}^2 - 4${bracket(fmt(c_coeff))} = ${fmt(disc)}`);

    const sqrtDisc = Math.sqrt(Math.max(0, disc));
    const sol1 = clean((-b + sqrtDisc) / 2);
    const sol2 = clean((-b - sqrtDisc) / 2);

    push(
      `${uMag2.label} = \\frac{${fmt(-b)} \\pm \\sqrt{${fmt(disc)}}}{2}`
    );
    push(
      `${uMag2.label} = ${fmt(sol1)}\\text{ kN} \\quad \\text{or} \\quad ${uMag2.label} = ${fmt(sol2)}\\text{ kN}`
    );

    const valMag = sol1 >= 0 ? sol1 : sol2 >= 0 ? sol2 : sol1;
    push(`\\text{Taking: } ${uMag2.label} = ${fmt(valMag)}\\text{ kN}`);

    push("\\textbf{Step 5: Find Unknown Angle via atan2}");
    const au_x = clean(-sumKx - valMag * cx);
    const au_y = clean(-sumKy - valMag * cy);
    push(cleanSigns(
      `${uAng2.label}_x = ${fmt(-sumKx)} - ${cos_u}${bracket(fmt(valMag))} = ${fmt(au_x)}\\text{ kN}`
    ));
    push(cleanSigns(
      `${uAng2.label}_y = ${fmt(-sumKy)} - ${sin_u}${bracket(fmt(valMag))} = ${fmt(au_y)}\\text{ kN}`
    ));

    const ang = atan2d(au_y, au_x);
    push(
      `\\theta = \\tan^{-1}\\!\\left(\\frac{${fmt(au_y)}}{${fmt(au_x)}}\\right) = ${fmt(ang)}^\\circ`
    );

    push("\\textbf{Step 6: Verify Equilibrium}");
    const checkFx = clean(sumKx + valMag * cx + M * cosd(ang));
    const checkFy = clean(sumKy + valMag * cy + M * sind(ang));
    push(`\\Sigma F_x = ${fmt(checkFx)}\\text{ kN} \\approx 0 \\checkmark`);
    push(`\\Sigma F_y = ${fmt(checkFy)}\\text{ kN} \\approx 0 \\checkmark`);

    return {
      unknowns: [
        { label: uMag2.label, magnitude: valMag, angle: uMag2.angle!, value: valMag },
        { label: uAng2.label, magnitude: M, angle: ang, value: M },
      ],
      steps,
    };
  }

  throw new Error("Unsupported unknown configuration.");
}