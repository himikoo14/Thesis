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
  magnitude?: number; // undefined = unknown
  angle?: number;     // undefined = unknown
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
   MAIN SOLVER
================================================================ */
export function solveEquilibrium2D(
  knownForces: KnownForce[],
  unknownForces: UnknownForce[]
): Eq2Result {
  const steps: string[] = [];

  const dof = unknownForces.reduce((acc, u) => {
    if (u.magnitude === undefined) acc++;
    if (u.angle === undefined) acc++;
    return acc;
  }, 0);

  if (dof === 0) throw new Error("No unknowns provided.");
  if (dof > 2) throw new Error("More than 2 unknowns — cannot solve with 2 equations.");

  /* ── Step 1: Resolve known forces ── */
  steps.push("\\textbf{Step 1: Resolve Known Forces into Components}");
  steps.push("\\text{Each force: } F_x = F\\cos\\theta, \\quad F_y = F\\sin\\theta");

  let sumKx = 0;
  let sumKy = 0;

  for (const f of knownForces) {
    const fx = clean(f.magnitude * cosd(f.angle));
    const fy = clean(f.magnitude * sind(f.angle));
    sumKx += fx;
    sumKy += fy;
    steps.push(`${f.label}_x = ${fmt(f.magnitude)}\\cos(${fmt(f.angle)}^\\circ) = ${fmt(fx)}\\text{ kN}`);
    steps.push(`${f.label}_y = ${fmt(f.magnitude)}\\sin(${fmt(f.angle)}^\\circ) = ${fmt(fy)}\\text{ kN}`);
  }

  sumKx = clean(sumKx);
  sumKy = clean(sumKy);

  steps.push(`\\Sigma F_{x,\\text{known}} = ${fmt(sumKx)}\\text{ kN}`);
  steps.push(`\\Sigma F_{y,\\text{known}} = ${fmt(sumKy)}\\text{ kN}`);

  /* ================================================================
     CASE 1: One fully unknown force (magnitude AND angle both unknown)
     ΣFx = 0 → Fu_x = -ΣFx_known
     ΣFy = 0 → Fu_y = -ΣFy_known
     |Fu| = √(Fu_x² + Fu_y²),  θ = atan2(Fu_y, Fu_x)
  ================================================================ */
  const fullyUnknown = unknownForces.find(
    u => u.magnitude === undefined && u.angle === undefined
  );

  if (fullyUnknown) {
    steps.push("\\textbf{Step 2: Apply Equilibrium Conditions}");
    steps.push(
      `\\Sigma F_x = 0: \\quad ${fmt(sumKx)} + ${fullyUnknown.label}_x = 0`
    );
    steps.push(
      `\\Sigma F_y = 0: \\quad ${fmt(sumKy)} + ${fullyUnknown.label}_y = 0`
    );

    steps.push("\\textbf{Step 3: Solve for Components}");
    const Fx = clean(-sumKx);
    const Fy = clean(-sumKy);
    steps.push(`${fullyUnknown.label}_x = ${fmt(Fx)}\\text{ kN}`);
    steps.push(`${fullyUnknown.label}_y = ${fmt(Fy)}\\text{ kN}`);

    steps.push("\\textbf{Step 4: Magnitude and Angle}");
    const mag = clean(Math.sqrt(Fx ** 2 + Fy ** 2));
    const ang = atan2d(Fy, Fx);
    steps.push(
      `|${fullyUnknown.label}| = \\sqrt{(${fmt(Fx)})^2 + (${fmt(Fy)})^2} = ${fmt(mag)}\\text{ kN}`
    );
    steps.push(
      `\\theta = \\tan^{-1}\\!\\left(\\frac{${fmt(Fy)}}{${fmt(Fx)}}\\right) = ${fmt(ang)}^\\circ`
    );

    steps.push("\\textbf{Step 5: Verify}");
    steps.push(
      `\\Sigma F_x = ${fmt(sumKx)} + ${fmt(Fx)} = ${fmt(clean(sumKx + Fx))}\\text{ kN} \\approx 0 \\checkmark`
    );
    steps.push(
      `\\Sigma F_y = ${fmt(sumKy)} + ${fmt(Fy)} = ${fmt(clean(sumKy + Fy))}\\text{ kN} \\approx 0 \\checkmark`
    );

    return {
      unknowns: [{ label: fullyUnknown.label, magnitude: mag, angle: ang, value: mag }],
      steps,
    };
  }

  /* ================================================================
     CASE 2: One unknown magnitude (angle known)
     Use ΣFx = 0 or ΣFy = 0 — whichever has the larger coefficient
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

      steps.push("\\textbf{Step 2: Apply Equilibrium Conditions}");
      steps.push(
        `\\Sigma F_x = 0: \\quad ${fmt(sumKx)} + ${uMag.label}\\cos(${fmt(uMag.angle)}^\\circ) = 0`
      );
      steps.push(
        `\\Sigma F_y = 0: \\quad ${fmt(sumKy)} + ${uMag.label}\\sin(${fmt(uMag.angle)}^\\circ) = 0`
      );

      steps.push(`\\textbf{Step 3: Solve from } \\Sigma F_${axis} = 0`);
      steps.push(`${fmt(sumK)} + ${uMag.label}(${fmt(coeff)}) = 0`);
      steps.push(
        `${uMag.label} = \\frac{-${fmt(sumK)}}{${fmt(coeff)}} = ${fmt(clean(-sumK / coeff))}\\text{ kN}`
      );

      const val = clean(-sumK / coeff);
      const mag = Math.abs(val);
      const ang = val >= 0 ? uMag.angle : atan2d(clean(-sumKy), clean(-sumKx));

      if (val < 0) {
        steps.push(`\\text{Negative result — force acts opposite to assumed direction.}`);
        steps.push(`\\text{True angle} = ${fmt(ang)}^\\circ`);
      }

      steps.push("\\textbf{Step 4: Verify}");
      steps.push(
        `\\Sigma F_x = ${fmt(sumKx)} + ${fmt(mag)}\\cos(${fmt(ang)}^\\circ) = ${fmt(clean(sumKx + mag * cosd(ang)))}\\text{ kN} \\approx 0 \\checkmark`
      );
      steps.push(
        `\\Sigma F_y = ${fmt(sumKy)} + ${fmt(mag)}\\sin(${fmt(ang)}^\\circ) = ${fmt(clean(sumKy + mag * sind(ang)))}\\text{ kN} \\approx 0 \\checkmark`
      );

      return {
        unknowns: [{ label: uMag.label, magnitude: mag, angle: ang, value: val }],
        steps,
      };
    }

    /* ── 2b: Unknown angle ── */
    if (uAng && uAng.magnitude !== undefined) {
      steps.push("\\textbf{Step 2: Apply Equilibrium Conditions}");
      steps.push(
        `\\Sigma F_x = 0: \\quad ${fmt(sumKx)} + ${fmt(uAng.magnitude)}\\cos\\theta = 0`
      );
      steps.push(
        `\\Sigma F_y = 0: \\quad ${fmt(sumKy)} + ${fmt(uAng.magnitude)}\\sin\\theta = 0`
      );

      steps.push("\\textbf{Step 3: Solve for Angle}");
      const Fx = clean(-sumKx);
      const Fy = clean(-sumKy);
      steps.push(`${uAng.label}\\cos\\theta = ${fmt(Fx)}`);
      steps.push(`${uAng.label}\\sin\\theta = ${fmt(Fy)}`);
      steps.push(
        `\\theta = \\tan^{-1}\\!\\left(\\frac{\\Sigma F_y}{\\Sigma F_x}\\right) = \\tan^{-1}\\!\\left(\\frac{${fmt(Fy)}}{${fmt(Fx)}}\\right) = ${fmt(atan2d(Fy, Fx))}^\\circ`
      );

      const ang = atan2d(Fy, Fx);
      const required = clean(Math.sqrt(Fx ** 2 + Fy ** 2));

      steps.push("\\textbf{Step 4: Check Magnitude}");
      steps.push(
        `\\text{Required} = \\sqrt{(${fmt(Fx)})^2 + (${fmt(Fy)})^2} = ${fmt(required)}\\text{ kN}`
      );
      if (Math.abs(required - uAng.magnitude) > 0.01 * uAng.magnitude + 1e-6) {
        throw new Error(
          `No valid angle: given magnitude ${fmt(uAng.magnitude)} kN ≠ required ${fmt(required)} kN.`
        );
      }
      steps.push(`${fmt(required)} \\approx ${fmt(uAng.magnitude)} \\checkmark`);

      steps.push("\\textbf{Step 5: Verify}");
      steps.push(
        `\\Sigma F_x = ${fmt(sumKx)} + ${fmt(uAng.magnitude)}\\cos(${fmt(ang)}^\\circ) = ${fmt(clean(sumKx + uAng.magnitude * cosd(ang)))}\\text{ kN} \\approx 0 \\checkmark`
      );
      steps.push(
        `\\Sigma F_y = ${fmt(sumKy)} + ${fmt(uAng.magnitude)}\\sin(${fmt(ang)}^\\circ) = ${fmt(clean(sumKy + uAng.magnitude * sind(ang)))}\\text{ kN} \\approx 0 \\checkmark`
      );

      return {
        unknowns: [{ label: uAng.label, magnitude: uAng.magnitude, angle: ang, value: uAng.magnitude }],
        steps,
      };
    }
  }

  /* ================================================================
     CASE 3: Two unknown magnitudes, both angles known
     ΣFx = 0: sumKx + u1*c1x + u2*c2x = 0
     ΣFy = 0: sumKy + u1*c1y + u2*c2y = 0

     Strategy (pure statics):
     - If one equation has only ONE unknown → solve it directly,
       then substitute into the other equation.
     - Otherwise → express u1 from ΣFx, substitute into ΣFy.
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

    steps.push("\\textbf{Step 2: Write Equilibrium Equations}");
    steps.push(
      `\\Sigma F_x = 0: \\quad ${fmt(sumKx)} + ${fmt(c1x)}\\,${u1.label} + ${fmt(c2x)}\\,${u2.label} = 0`
    );
    steps.push(
      `\\Sigma F_y = 0: \\quad ${fmt(sumKy)} + ${fmt(c1y)}\\,${u1.label} + ${fmt(c2y)}\\,${u2.label} = 0`
    );

    let val1: number, val2: number;

    /* Check if any coefficient is zero → one equation has only one unknown */
    if (Math.abs(c2x) < 1e-9) {
      // ΣFx: only u1
      steps.push("\\textbf{Step 3: ΣFx has only " + u1.label + " — solve directly}");
      steps.push(`${fmt(c1x)}\\,${u1.label} = ${fmt(rhsX)}`);
      val1 = clean(rhsX / c1x);
      steps.push(`${u1.label} = ${fmt(val1)}\\text{ kN}`);
      steps.push("\\textbf{Step 4: Substitute into ΣFy}");
      steps.push(
        `${fmt(sumKy)} + ${fmt(c1y)}(${fmt(val1)}) + ${fmt(c2y)}\\,${u2.label} = 0`
      );
      val2 = clean((rhsY - c1y * val1) / c2y);
      steps.push(`${u2.label} = ${fmt(val2)}\\text{ kN}`);

    } else if (Math.abs(c2y) < 1e-9) {
      // ΣFy: only u1
      steps.push("\\textbf{Step 3: ΣFy has only " + u1.label + " — solve directly}");
      steps.push(`${fmt(c1y)}\\,${u1.label} = ${fmt(rhsY)}`);
      val1 = clean(rhsY / c1y);
      steps.push(`${u1.label} = ${fmt(val1)}\\text{ kN}`);
      steps.push("\\textbf{Step 4: Substitute into ΣFx}");
      steps.push(
        `${fmt(sumKx)} + ${fmt(c1x)}(${fmt(val1)}) + ${fmt(c2x)}\\,${u2.label} = 0`
      );
      val2 = clean((rhsX - c1x * val1) / c2x);
      steps.push(`${u2.label} = ${fmt(val2)}\\text{ kN}`);

    } else if (Math.abs(c1x) < 1e-9) {
      // ΣFx: only u2
      steps.push("\\textbf{Step 3: ΣFx has only " + u2.label + " — solve directly}");
      steps.push(`${fmt(c2x)}\\,${u2.label} = ${fmt(rhsX)}`);
      val2 = clean(rhsX / c2x);
      steps.push(`${u2.label} = ${fmt(val2)}\\text{ kN}`);
      steps.push("\\textbf{Step 4: Substitute into ΣFy}");
      steps.push(
        `${fmt(sumKy)} + ${fmt(c1y)}\\,${u1.label} + ${fmt(c2y)}(${fmt(val2)}) = 0`
      );
      val1 = clean((rhsY - c2y * val2) / c1y);
      steps.push(`${u1.label} = ${fmt(val1)}\\text{ kN}`);

    } else if (Math.abs(c1y) < 1e-9) {
      // ΣFy: only u2
      steps.push("\\textbf{Step 3: ΣFy has only " + u2.label + " — solve directly}");
      steps.push(`${fmt(c2y)}\\,${u2.label} = ${fmt(rhsY)}`);
      val2 = clean(rhsY / c2y);
      steps.push(`${u2.label} = ${fmt(val2)}\\text{ kN}`);
      steps.push("\\textbf{Step 4: Substitute into ΣFx}");
      steps.push(
        `${fmt(sumKx)} + ${fmt(c1x)}\\,${u1.label} + ${fmt(c2x)}(${fmt(val2)}) = 0`
      );
      val1 = clean((rhsX - c2x * val2) / c1x);
      steps.push(`${u1.label} = ${fmt(val1)}\\text{ kN}`);

    } else {
      /* General: express u1 from ΣFx, substitute into ΣFy */
      steps.push("\\textbf{Step 3: Express " + u1.label + " from ΣFx = 0}");
      steps.push(
        `${u1.label} = \\frac{${fmt(rhsX)} - ${fmt(c2x)}\\,${u2.label}}{${fmt(c1x)}}`
      );

      steps.push("\\textbf{Step 4: Substitute into ΣFy = 0, solve for " + u2.label + "}");
      // sumKy + c1y*(rhsX - c2x*u2)/c1x + c2y*u2 = 0
      // u2*(c2y - c1y*c2x/c1x) = -sumKy - c1y*rhsX/c1x
      const coeff_u2 = clean(c2y - (c1y * c2x) / c1x);
      const rhs_sub = clean(-sumKy - (c1y * rhsX) / c1x);

      if (Math.abs(coeff_u2) < 1e-9)
        throw new Error("System is singular — the two unknown forces are parallel.");

      steps.push(
        `${u2.label}\\left(${fmt(c2y)} - \\frac{${fmt(c1y)} \\cdot ${fmt(c2x)}}{${fmt(c1x)}}\\right) = ${fmt(rhs_sub)}`
      );
      steps.push(`${u2.label}(${fmt(coeff_u2)}) = ${fmt(rhs_sub)}`);
      val2 = clean(rhs_sub / coeff_u2);
      steps.push(`${u2.label} = ${fmt(val2)}\\text{ kN}`);

      steps.push("\\textbf{Step 5: Back-substitute to find " + u1.label + "}");
      steps.push(
        `${u1.label} = \\frac{${fmt(rhsX)} - ${fmt(c2x)}(${fmt(val2)})}{${fmt(c1x)}}`
      );
      val1 = clean((rhsX - c2x * val2) / c1x);
      steps.push(`${u1.label} = ${fmt(val1)}\\text{ kN}`);
    }

    /* Handle negatives — find true direction */
    const resolve = (
      label: string, val: number,
      cx: number, cy: number, assumedAngle: number
    ) => {
      if (val < 0) {
        const trueAngle = atan2d(val * cy, val * cx);
        steps.push(
          `\\text{${label} is negative — acts opposite to assumed ${fmt(assumedAngle)}°}`
        );
        steps.push(`\\text{True angle} = ${fmt(trueAngle)}^\\circ`);
        return { magnitude: Math.abs(val), angle: trueAngle };
      }
      return { magnitude: val, angle: assumedAngle };
    };

    const r1 = resolve(u1.label, val1, c1x, c1y, u1.angle!);
    const r2 = resolve(u2.label, val2, c2x, c2y, u2.angle!);

    steps.push("\\textbf{Verify Equilibrium}");
    steps.push(
      `\\Sigma F_x = ${fmt(clean(sumKx + val1 * c1x + val2 * c2x))}\\text{ kN} \\approx 0 \\checkmark`
    );
    steps.push(
      `\\Sigma F_y = ${fmt(clean(sumKy + val1 * c1y + val2 * c2y))}\\text{ kN} \\approx 0 \\checkmark`
    );

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
     3 unknowns (u_mag, ang_x, ang_y) but 3 equations:
       ΣFx = 0 → u_mag*cx + ang_x = -sumKx
       ΣFy = 0 → u_mag*cy + ang_y = -sumKy
       magnitude constraint → ang_x² + ang_y² = |angForce|²

     Steps:
     1. Express ang_x and ang_y in terms of u_mag from the first two equations.
     2. Substitute into the magnitude constraint → quadratic in u_mag.
     3. Solve quadratic → get u_mag.
     4. ang_x and ang_y follow → θ = atan2(ang_y, ang_x).
  ================================================================ */
  const uMag2 = unknownForces.find(u => u.magnitude === undefined && u.angle !== undefined);
  const uAng2 = unknownForces.find(u => u.angle === undefined && u.magnitude !== undefined);

  if (uMag2 && uAng2) {
    const cx = clean(cosd(uMag2.angle!));
    const cy = clean(sind(uMag2.angle!));
    const M = uAng2.magnitude!;

    steps.push("\\textbf{Step 2: Write Equilibrium Equations}");
    steps.push(
      `\\Sigma F_x = 0: \\quad ${fmt(sumKx)} + ${uMag2.label}\\cos(${fmt(uMag2.angle!)}^\\circ) + ${uAng2.label}_x = 0`
    );
    steps.push(
      `\\Sigma F_y = 0: \\quad ${fmt(sumKy)} + ${uMag2.label}\\sin(${fmt(uMag2.angle!)}^\\circ) + ${uAng2.label}_y = 0`
    );
    steps.push(
      `\\text{Magnitude constraint: } {${uAng2.label}_x}^2 + {${uAng2.label}_y}^2 = ${fmt(M)}^2`
    );

    steps.push("\\textbf{Step 3: Express unknown-angle components in terms of " + uMag2.label + "}");
    steps.push(`${uAng2.label}_x = -(${fmt(sumKx)}) - ${uMag2.label}(${fmt(cx)})`);
    steps.push(`${uAng2.label}_y = -(${fmt(sumKy)}) - ${uMag2.label}(${fmt(cy)})`);

    steps.push("\\textbf{Step 4: Substitute into magnitude constraint → quadratic}");
    // (sumKx + M*cx)² + (sumKy + M*cy)² = |M_ang|²
    // Let F = uMag2.label for brevity
    // (sumKx + F*cx)² + (sumKy + F*cy)² = M²
    // F²(cx²+cy²) + 2F(sumKx*cx + sumKy*cy) + (sumKx²+sumKy²) - M² = 0
    // Since cx²+cy² = 1:
    const a = 1;
    const b = clean(2 * (sumKx * cx + sumKy * cy));
    const c_coeff = clean(sumKx ** 2 + sumKy ** 2 - M ** 2);

    steps.push(
      `(${fmt(sumKx)} + ${uMag2.label}\\cdot${fmt(cx)})^2 + (${fmt(sumKy)} + ${uMag2.label}\\cdot${fmt(cy)})^2 = ${fmt(M)}^2`
    );
    steps.push(
      `${uMag2.label}^2 + ${fmt(b)}\\,${uMag2.label} + ${fmt(c_coeff)} = 0`
    );

    const disc = clean(b ** 2 - 4 * a * c_coeff);

    if (disc < -1e-9) {
      throw new Error("No real solution: given magnitude cannot satisfy equilibrium.");
    }

    steps.push(`\\text{Discriminant} = ${fmt(b)}^2 - 4(${fmt(c_coeff)}) = ${fmt(disc)}`);

    const sqrtDisc = Math.sqrt(Math.max(0, disc));
    const sol1 = clean((-b + sqrtDisc) / 2);
    const sol2 = clean((-b - sqrtDisc) / 2);

    steps.push(
      `${uMag2.label} = \\frac{-${fmt(b)} \\pm \\sqrt{${fmt(disc)}}}{2}`
    );
    steps.push(
      `${uMag2.label} = ${fmt(sol1)}\\text{ kN} \\quad \\text{or} \\quad ${uMag2.label} = ${fmt(sol2)}\\text{ kN}`
    );

    // Prefer positive solution
    const valMag = sol1 >= 0 ? sol1 : sol2 >= 0 ? sol2 : sol1;
    steps.push(`\\text{Taking: } ${uMag2.label} = ${fmt(valMag)}\\text{ kN}`);

    steps.push("\\textbf{Step 5: Find Unknown Angle via atan2}");
    const au_x = clean(-sumKx - valMag * cx);
    const au_y = clean(-sumKy - valMag * cy);
    steps.push(`${uAng2.label}_x = -(${fmt(sumKx)}) - (${fmt(valMag)})(${fmt(cx)}) = ${fmt(au_x)}\\text{ kN}`);
    steps.push(`${uAng2.label}_y = -(${fmt(sumKy)}) - (${fmt(valMag)})(${fmt(cy)}) = ${fmt(au_y)}\\text{ kN}`);

    const ang = atan2d(au_y, au_x);
    steps.push(
      `\\theta = \\tan^{-1}\\!\\left(\\frac{${fmt(au_y)}}{${fmt(au_x)}}\\right) = ${fmt(ang)}^\\circ`
    );

    steps.push("\\textbf{Step 6: Verify Equilibrium}");
    const checkFx = clean(sumKx + valMag * cx + M * cosd(ang));
    const checkFy = clean(sumKy + valMag * cy + M * sind(ang));
    steps.push(`\\Sigma F_x = ${fmt(checkFx)}\\text{ kN} \\approx 0 \\checkmark`);
    steps.push(`\\Sigma F_y = ${fmt(checkFy)}\\text{ kN} \\approx 0 \\checkmark`);

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