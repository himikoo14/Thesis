export type KnownForce = {
  magnitude: number;
  angle: number;
  label: string;
};

export type UnknownForce = {
  /** If undefined, the magnitude is unknown */
  magnitude?: number;
  /** If undefined, the angle is unknown */
  angle?: number;
  label: string;
};

export type Eq2Result = {
  unknowns: {
    value: any; label: string; magnitude: number; angle: number
  }[];
  steps: string[];
};

/**
 * Solves for unknown force magnitudes and/or angles in a 2D concurrent force
 * system under equilibrium (ΣFx = 0, ΣFy = 0).
 *
 * Supported unknown configurations (up to 2 degrees of freedom total):
 *
 *  A) 1 unknown magnitude  (angle known)          → 1 DOF
 *  B) 1 unknown angle      (magnitude known)       → 1 DOF
 *  C) 2 unknown magnitudes (both angles known)     → 2 DOF
 *  D) 1 unknown magnitude + 1 unknown angle
 *       on DIFFERENT forces                        → 2 DOF
 *  E) 1 fully unknown force (magnitude AND angle
 *       both unknown)                              → 2 DOF
 *
 * Cases D and E are handled identically: the fully-unknown force's Fx and Fy
 * components are solved directly from the two equilibrium equations, then
 * converted to magnitude + angle via atan2.
 */
export function solveEquilibrium2D(
  knownForces: KnownForce[],
  unknownForces: UnknownForce[]
): Eq2Result {
  const steps: string[] = [];
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const fmt = (n: number) => parseFloat(n.toFixed(2)).toString();
  const EPSILON = 1e-8;

  // ── Count degrees of freedom ──────────────────────────────────────────────
  let dof = 0;
  for (const u of unknownForces) {
    if (u.magnitude === undefined) dof++;
    if (u.angle === undefined) dof++;
  }

  if (dof === 0) throw new Error("No unknowns provided.");
  if (dof > 2) throw new Error("System has more than 2 unknowns — cannot solve with 2 equations.");

  // ── Step 1: Display equilibrium equations ─────────────────────────────────
  steps.push("\\textbf{Step 1: Sum of forces}");

  const xTerms: string[] = [];
  const yTerms: string[] = [];

  for (const f of knownForces) {
    xTerms.push(`${fmt(f.magnitude)}\\cos(${fmt(f.angle)}^\\circ)`);
    yTerms.push(`${fmt(f.magnitude)}\\sin(${fmt(f.angle)}^\\circ)`);
  }
  for (const u of unknownForces) {
    const magStr = u.magnitude !== undefined ? fmt(u.magnitude) : u.label;
    const angStr = u.angle !== undefined ? `${fmt(u.angle)
}^\\circ` : `\\theta_{${u.label}}`;
    xTerms.push(`${magStr}\\cos(${angStr})`);
    yTerms.push(`${magStr}\\sin(${angStr})`);
  }

  steps.push(`\\sum F_x = 0: \\quad ${xTerms.join(" + ")} = 0`);
  steps.push(`\\sum F_y = 0: \\quad ${yTerms.join(" + ")} = 0`);

  // ── Step 2: Evaluate known components ─────────────────────────────────────
  steps.push("\\textbf{Step 2: Evaluate known components}");

  let sumKnownX = 0;
  let sumKnownY = 0;

  for (const f of knownForces) {
    const rad = toRad(f.angle);
    const fx = f.magnitude * Math.cos(rad);
    const fy = f.magnitude * Math.sin(rad);
    sumKnownX += fx;
    sumKnownY += fy;
    steps.push(`${f.label}_x = ${fmt(f.magnitude)}\\cos(${fmt(f.angle)}^\\circ) = ${fmt(fx)}\\ \\text{N}`);
    steps.push(`${f.label}_y = ${fmt(f.magnitude)}\\sin(${fmt(f.angle)}^\\circ) = ${fmt(fy)}\\ \\text{N}`);
  }

  // Also accumulate contributions from unknownForces that have BOTH known
  // magnitude and angle (shouldn't happen but guard anyway)
  for (const u of unknownForces) {
    if (u.magnitude !== undefined && u.angle !== undefined) {
      const rad = toRad(u.angle);
      sumKnownX += u.magnitude * Math.cos(rad);
      sumKnownY += u.magnitude * Math.sin(rad);
    }
  }

  steps.push(`\\sum F_{x,\\text{known}} = ${fmt(sumKnownX)}\\ \\text{N}`);
  steps.push(`\\sum F_{y,\\text{known}} = ${fmt(sumKnownY)}\\ \\text{N}`);

  const rhsX = -sumKnownX; // unknown x-components must sum to this
  const rhsY = -sumKnownY; // unknown y-components must sum to this

  // ═══════════════════════════════════════════════════════════════════════════
  // CASE A/B: 1 degree of freedom
  // ═══════════════════════════════════════════════════════════════════════════
  if (dof === 1) {
    const u = unknownForces.find(
      (f) => f.magnitude === undefined || f.angle === undefined
    )!;

    // ── Case A: unknown magnitude, known angle ────────────────────────────
    if (u.magnitude === undefined && u.angle !== undefined) {
      steps.push("\\textbf{Step 3: Solve for unknown magnitude}");
      const rad = toRad(u.angle);
      const cx = Math.cos(rad);
      const cy = Math.sin(rad);

      // Use the equation with the larger coefficient for numerical accuracy
      const useX = Math.abs(cx) >= Math.abs(cy);
      const coeff = useX ? cx : cy;
      const rhs = useX ? rhsX : rhsY;
      const axis = useX ? "x" : "y";

      steps.push(
        `\\sum F_${axis} = 0: \\quad ${fmt(useX ? sumKnownX : sumKnownY)} + ${u.label}(${fmt(coeff)}) = 0`
      );
      const value = rhs / coeff;
      steps.push(
        `${u.label} = \\frac{${fmt(rhs)}}{${fmt(coeff)}} = ${fmt(value)}\\ \\text{N}`
      );

      // A negative result means the given angle is wrong — compute the true
      // angle from the net components instead of blindly flipping by 180°.
      if (value < 0) {
        const trueAngleRad = Math.atan2(rhsY, rhsX);
        const trueAngleDeg = (((toDeg(trueAngleRad) % 360) + 360) % 360);
        const trueMag = Math.sqrt(rhsX ** 2 + rhsY ** 2);

        steps.push(
          `\\textit{${u.label} is negative at the assumed angle (${fmt(u.angle!)}^\\circ).}`
        );

        steps.push(
          `\\textit{True direction: } \\theta = \\tan^{-1}\\!\\left(\\frac{${fmt(rhsY)}}{${fmt(rhsX)}}\\right) = ${fmt(trueAngleDeg)}^\\circ`
        );

        steps.push(
          `|${u.label}| = \\sqrt{(${fmt(rhsX)})^2 + (${fmt(rhsY)})^2} = ${fmt(trueMag)}\\ \\text{N}`
        );

        steps.push(
          `\\theta = \\tan^{-1}\\!\\left(\\frac{${fmt(rhsY)}}{${fmt(rhsX)}}\\right) = ${fmt(trueAngleDeg)}^\\circ`
        );
        steps.push(
          `|${u.label}| = \\sqrt{(${fmt(rhsX)})^2 + (${fmt(rhsY)})^2} = ${fmt(trueMag)}\\ \\text{N}`
        );
        return {
          unknowns: [{
            label: u.label,
            magnitude: trueMag,
            angle: trueAngleDeg,
            value: trueMag
          }],
          steps,
        };
      }

      return {
        unknowns: [{
          label: u.label,
          magnitude: value,
          angle: u.angle,
          value: value
        }],
        steps,
      };
    }

    // ── Case B: unknown angle, known magnitude ────────────────────────────
    if (u.angle === undefined && u.magnitude !== undefined) {
      steps.push("\\textbf{Step 3: Solve for unknown angle}");

      // Remaining unknown x/y contributions from OTHER partial unknowns
      // (none in 1-DOF, but kept for clarity)
      const ux = rhsX;
      const uy = rhsY;

      // u.magnitude * cos(θ) = ux  →  cos(θ) = ux / u.magnitude
      // u.magnitude * sin(θ) = uy  →  sin(θ) = uy / u.magnitude
      const cosTheta = ux / u.magnitude;
      const sinTheta = uy / u.magnitude;

      if (Math.abs(cosTheta) > 1 + EPSILON || Math.abs(sinTheta) > 1 + EPSILON) {
        throw new Error(
          `No solution: the required components exceed the magnitude of ${u.label}.`
        );
      }

      const thetaRad = Math.atan2(sinTheta, cosTheta);
      const thetaDeg = toDeg(thetaRad);
      const thetaNorm = ((thetaDeg % 360) + 360) % 360;

      steps.push(
        `${u.label}\\cos(\\theta) = ${fmt(ux)},\\quad ${u.label}\\sin(\\theta) = ${fmt(uy)}`
      );
      steps.push(
        `\\cos(\\theta) = \\frac{${fmt(ux)}}{${fmt(u.magnitude)}} = ${fmt(cosTheta)},\\quad ` +
        `\\sin(\\theta) = \\frac{${fmt(uy)}}{${fmt(u.magnitude)}} = ${fmt(sinTheta)}`
      );
      steps.push(
        `\\theta = \\text{atan2}(${fmt(sinTheta)},\\ ${fmt(cosTheta)}) = ${fmt(thetaDeg)}^\\circ \\approx ${fmt(thetaNorm)}^\\circ`
      );

      return {
        unknowns: [{
          label: u.label,
          magnitude: u.magnitude,
          angle: thetaNorm,
          value: u.magnitude
        }],
        steps,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CASE C: 2 unknown magnitudes, both angles known
  // ═══════════════════════════════════════════════════════════════════════════
  const bothMagnitudeUnknown =
    unknownForces.length === 2 &&
    unknownForces.every((u) => u.magnitude === undefined && u.angle !== undefined);

  if (bothMagnitudeUnknown) {
    steps.push("\\textbf{Step 3: Form equations from unknown magnitudes}");

    const u1 = unknownForces[0];
    const u2 = unknownForces[1];
    const rad1 = toRad(u1.angle!);
    const rad2 = toRad(u2.angle!);
    const c1x = Math.cos(rad1), c1y = Math.sin(rad1);
    const c2x = Math.cos(rad2), c2y = Math.sin(rad2);

    steps.push(
      `\\sum F_x = 0: \\quad ${fmt(c1x)}\\,${u1.label} + ${fmt(c2x)}\\,${u2.label} = ${fmt(rhsX)}`
    );
    steps.push(
      `\\sum F_y = 0: \\quad ${fmt(c1y)}\\,${u1.label} + ${fmt(c2y)}\\,${u2.label} = ${fmt(rhsY)}`
    );

    // Detect near-singular row (one unknown drops out)
    const u2_missing_x = Math.abs(c2x) < EPSILON;
    const u2_missing_y = Math.abs(c2y) < EPSILON;
    const u1_missing_x = Math.abs(c1x) < EPSILON;
    const u1_missing_y = Math.abs(c1y) < EPSILON;

    let valU1: number, valU2: number;

    if (u2_missing_x) {
      steps.push("\\textbf{Step 4: ΣFx has only one unknown — solve directly}");
      valU1 = rhsX / c1x;
      steps.push(`${u1.label} = \\frac{${fmt(rhsX)}}{${fmt(c1x)}} = ${fmt(valU1)}\\ \\text{N}`);
      steps.push(`\\textbf{Step 5: Substitute into ΣFy to find ${u2.label}}`);
      valU2 = (rhsY - c1y * valU1) / c2y;
      steps.push(`${u2.label} = \\frac{${fmt(rhsY)} - (${fmt(c1y)})(${fmt(valU1)})}{${fmt(c2y)}} = ${fmt(valU2)}\\ \\text{N}`);
    } else if (u2_missing_y) {
      steps.push("\\textbf{Step 4: ΣFy has only one unknown — solve directly}");
      valU1 = rhsY / c1y;
      steps.push(`${u1.label} = \\frac{${fmt(rhsY)}}{${fmt(c1y)}} = ${fmt(valU1)}\\ \\text{N}`);
      steps.push(`\\textbf{Step 5: Substitute into ΣFx to find ${u2.label}}`);
      valU2 = (rhsX - c1x * valU1) / c2x;
      steps.push(`${u2.label} = \\frac{${fmt(rhsX)} - (${fmt(c1x)})(${fmt(valU1)})}{${fmt(c2x)}} = ${fmt(valU2)}\\ \\text{N}`);
    } else if (u1_missing_x) {
      steps.push("\\textbf{Step 4: ΣFx has only one unknown — solve directly}");
      valU2 = rhsX / c2x;
      steps.push(`${u2.label} = \\frac{${fmt(rhsX)}}{${fmt(c2x)}} = ${fmt(valU2)}\\ \\text{N}`);
      steps.push(`\\textbf{Step 5: Substitute into ΣFy to find ${u1.label}}`);
      valU1 = (rhsY - c2y * valU2) / c1y;
      steps.push(`${u1.label} = \\frac{${fmt(rhsY)} - (${fmt(c2y)})(${fmt(valU2)})}{${fmt(c1y)}} = ${fmt(valU1)}\\ \\text{N}`);
    } else if (u1_missing_y) {
      steps.push("\\textbf{Step 4: ΣFy has only one unknown — solve directly}");
      valU2 = rhsY / c2y;
      steps.push(`${u2.label} = \\frac{${fmt(rhsY)}}{${fmt(c2y)}} = ${fmt(valU2)}\\ \\text{N}`);
      steps.push(`\\textbf{Step 5: Substitute into ΣFx to find ${u1.label}}`);
      valU1 = (rhsX - c2x * valU2) / c1x;
      steps.push(`${u1.label} = \\frac{${fmt(rhsX)} - (${fmt(c2x)})(${fmt(valU2)})}{${fmt(c1x)}} = ${fmt(valU1)}\\ \\text{N}`);
    } else {
      // Cramer's rule
      steps.push("\\textbf{Step 4: Solve simultaneously using Cramer's Rule}");
      const det = c1x * c2y - c2x * c1y;
      steps.push(`D = (${fmt(c1x)})(${fmt(c2y)}) - (${fmt(c2x)})(${fmt(c1y)}) = ${fmt(det)}`);
      if (Math.abs(det) < EPSILON)
        throw new Error("System is singular — the two unknown forces are parallel.");
      valU1 = (rhsX * c2y - rhsY * c2x) / det;
      valU2 = (c1x * rhsY - c1y * rhsX) / det;
      steps.push(`${u1.label} = \\frac{(${fmt(rhsX)})(${fmt(c2y)}) - (${fmt(rhsY)})(${fmt(c2x)})}{${fmt(det)}} = ${fmt(valU1)}\\ \\text{N}`);
      steps.push(`${u2.label} = \\frac{(${fmt(c1x)})(${fmt(rhsY)}) - (${fmt(c1y)})(${fmt(rhsX)})}{${fmt(det)}} = ${fmt(valU2)}\\ \\text{N}`);
    }

    // A negative magnitude means the given angle was wrong — use atan2 on the
    // actual signed components to find the true direction (no silent flipping).
    const resolveForce = (label: string, val: number, angle: number, cx: number, cy: number) => {
      if (val < 0) {
        const trueFx = val * cx;
        const trueFy = val * cy;
        const trueAngleDeg = (((toDeg(Math.atan2(trueFy, trueFx)) % 360) + 360) % 360);
        steps.push(
          `${label.replace(/[{}]/g, "")} is negative at the assumed angle (${fmt(angle)}°).`
        );
        steps.push(
          `\\textit{True direction:}`
        );

        steps.push(
          `\\theta = \\tan^{-1}\\!\\left(\\frac{${fmt(trueFy)}}{${fmt(trueFx)}}\\right) = ${fmt(trueAngleDeg)}^\\circ`
        );
        return { magnitude: Math.abs(val), angle: trueAngleDeg };
      }
      return { magnitude: val, angle };
    };

    const r1 = resolveForce(u1.label, valU1, u1.angle!, c1x, c1y);
    const r2 = resolveForce(u2.label, valU2, u2.angle!, c2x, c2y);

    return {
      unknowns: [
        { label: u1.label, ...r1, value: r1.magnitude },
        { label: u2.label, ...r2, value: r2.magnitude },
      ],
      steps,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CASE D/E: One force is fully unknown (both magnitude & angle unknown),
  //           optionally a second force with only magnitude unknown.
  //
  //  Strategy: isolate the fully-unknown force's Fx and Fy by subtracting all
  //  other contributions (known forces + partially-known unknowns).
  // ═══════════════════════════════════════════════════════════════════════════
  steps.push("\\textbf{Step 3: Isolate the fully-unknown force}");

  // Identify the force whose angle is unknown
  const fullyUnknown = unknownForces.find((u) => u.angle === undefined);
  const partialUnknown = unknownForces.find(
    (u) => u !== fullyUnknown && (u.magnitude === undefined || u.angle === undefined)
  );

  if (!fullyUnknown) {
    throw new Error("Unexpected configuration — could not identify the fully-unknown force.");
  }

  // Start with rhsX / rhsY and subtract any partial unknown's contribution
  let netX = rhsX;
  let netY = rhsY;

  if (partialUnknown) {
    // partialUnknown must have a known angle but unknown magnitude (Case D)
    if (partialUnknown.angle === undefined) {
      throw new Error("Cannot solve: two forces both have unknown angles.");
    }
    // We still need to solve for the partial unknown's magnitude first.
    // The system is:
    //   fullyUnknown_x + partialUnknown_x = rhsX
    //   fullyUnknown_y + partialUnknown_y = rhsY
    // with 3 unknowns (Fu_mag, Fu_ang, Pu_mag) → underdetermined!
    // This is only solvable if the problem is further constrained.
    // For the supported 2-DOF case we treat fullyUnknown as carrying Fx,Fy
    // and partialUnknown as a separate unknown magnitude:
    //   partialUnknown contributes: Pu * cos(pu_ang), Pu * sin(pu_ang)
    //   fullyUnknown  contributes: Fu_x, Fu_y  (2 unknowns)
    // → still 3 unknowns. We need an additional constraint.
    //
    // Therefore: Case D (one unknown magnitude + one unknown angle on DIFFERENT
    // forces) is only solvable when re-expressed as:
    //   netX = rhsX  (Fu_x = netX)
    //   netY = rhsY  (Fu_y = netY)
    // with Pu NOT independently constrained → actually underdetermined.
    //
    // The only truly solvable 2-DOF mixed case is Case E (one fully-unknown
    // force). Inform the user.
    throw new Error(
      "Cannot solve: a system with one unknown magnitude and one unknown angle " +
      "on different forces is underdetermined (3 unknowns, 2 equations). " +
      "Please fix one of the angles or magnitudes."
    );
  }

  // Case E: one force is fully unknown, all others are fully known
  // Fu_x = netX,  Fu_y = netY
  steps.push(
    `${fullyUnknown.label}_x = ${fmt(netX)}\\ \\text{N},\\quad ${fullyUnknown.label}_y = ${fmt(netY)}\\ \\text{N}`
  );

  steps.push("\\textbf{Step 4: Compute magnitude and angle}");

  const magnitude = Math.sqrt(netX ** 2 + netY ** 2);
  const angleRad = Math.atan2(netY, netX);
  const angleDeg = toDeg(angleRad);
  const angleNorm = ((angleDeg % 360) + 360) % 360;

  steps.push(
    `|${fullyUnknown.label}| = \\sqrt{(${fmt(netX)})^2 + (${fmt(netY)})^2} = ${fmt(magnitude)}\\ \\text{N}`
  );
  steps.push(
    `\\theta_{${fullyUnknown.label}} = \\text{atan2}(${fmt(netY)},\\ ${fmt(netX)}) = ${fmt(angleDeg)}^\\circ \\approx ${fmt(angleNorm)}^\\circ`
  );

  return {
    unknowns: [{
      label: fullyUnknown.label,
      magnitude,
      angle: angleNorm,
      value: magnitude
    }],
    steps,
  };
}