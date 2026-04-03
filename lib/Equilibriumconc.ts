export type KnownForce = {
  magnitude: number;
  angle: number;
  label: string;
};

export type UnknownForce = {
  angle: number;
  label: string;
};

export type Eq2Result = {
  unknowns: { label: string; value: number }[];
  steps: string[];
};

/**
 * Solves for unknown force magnitudes in a 2D concurrent force system
 * under equilibrium (ΣFx = 0, ΣFy = 0).
 *
 * Step 1: Sum all x-components = 0, sum all y-components = 0
 * Step 2: Write the equilibrium equations
 * Step 3: Solve
 *   - 1 unknown → pick the equation where it appears strongest, solve directly
 *   - 2 unknowns → detect if one equation has effectively 1 unknown (cos/sin ≈ 0),
 *                  solve that first then substitute; otherwise use Cramer's rule
 */
export function solveEquilibrium2D(
  knownForces: KnownForce[],
  unknownForces: UnknownForce[]
): Eq2Result {
  if (unknownForces.length === 0 || unknownForces.length > 2) {
    throw new Error("Provide 1 or 2 unknown forces.");
  }

  const steps: string[] = [];
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const fmt = (n: number, d = 4) => n.toFixed(d);

  // ─── Step 1: Write ΣFx = 0 and ΣFy = 0 ──────────────────────────────────
  steps.push("\\textbf{Step 1: Sum of forces}");

  // Build the full equation string for display (known + unknown terms)
  const xTerms: string[] = [];
  const yTerms: string[] = [];

  for (const f of knownForces) {
    xTerms.push(`${fmt(f.magnitude)}\\cos(${fmt(f.angle, 2)}^\\circ)`);
    yTerms.push(`${fmt(f.magnitude)}\\sin(${fmt(f.angle, 2)}^\\circ)`);
  }
  for (const u of unknownForces) {
    xTerms.push(`${u.label}\\cos(${fmt(u.angle, 2)}^\\circ)`);
    yTerms.push(`${u.label}\\sin(${fmt(u.angle, 2)}^\\circ)`);
  }

  steps.push(`\\sum F_x = 0: \\quad ${xTerms.join(" + ")} = 0`);
  steps.push(`\\sum F_y = 0: \\quad ${yTerms.join(" + ")} = 0`);

  // ─── Step 2: Evaluate known components ───────────────────────────────────
  steps.push("\\textbf{Step 2: Evaluate known components}");

  let sumKnownX = 0;
  let sumKnownY = 0;

  for (const f of knownForces) {
    const rad = toRad(f.angle);
    const fx = f.magnitude * Math.cos(rad);
    const fy = f.magnitude * Math.sin(rad);
    sumKnownX += fx;
    sumKnownY += fy;
    steps.push(
      `${f.label}_x = ${fmt(f.magnitude)}\\cos(${fmt(f.angle, 2)}^\\circ) = ${fmt(fx)}\\ \\text{N}`
    );
    steps.push(
      `${f.label}_y = ${fmt(f.magnitude)}\\sin(${fmt(f.angle, 2)}^\\circ) = ${fmt(fy)}\\ \\text{N}`
    );
  }

  steps.push(`\\sum F_{x,\\text{known}} = ${fmt(sumKnownX)}\\ \\text{N}`);
  steps.push(`\\sum F_{y,\\text{known}} = ${fmt(sumKnownY)}\\ \\text{N}`);

  // ─── Step 3: Write equations in terms of unknowns ─────────────────────────
  // ΣFx = 0 → sumKnownX + u1*cos(a1) + u2*cos(a2) = 0
  // ΣFy = 0 → sumKnownY + u1*sin(a1) + u2*sin(a2) = 0
  steps.push("\\textbf{Step 3: Form equations from unknowns}");

  const u1 = unknownForces[0];
  const rad1 = toRad(u1.angle);
  const c1x = Math.cos(rad1); // coefficient of u1 in ΣFx
  const c1y = Math.sin(rad1); // coefficient of u1 in ΣFy

  // RHS (move known sum to right side)
  const rhsX = -sumKnownX;
  const rhsY = -sumKnownY;

  // ─── 1 Unknown ────────────────────────────────────────────────────────────
  if (unknownForces.length === 1) {
    // Pick the equation where the coefficient is largest (more accurate)
    const useX = Math.abs(c1x) >= Math.abs(c1y);
    const coeff = useX ? c1x : c1y;
    const rhs = useX ? rhsX : rhsY;
    const axis = useX ? "x" : "y";

    steps.push(
      `\\sum F_${axis} = 0: \\quad ${fmt(sumKnownX * (useX ? 1 : 0) + sumKnownY * (useX ? 0 : 1))} + ${u1.label}(${fmt(coeff)}) = 0`
    );
    steps.push(
      `${u1.label} = \\frac{${fmt(rhs)}}{${fmt(coeff)}} = ${fmt(rhs / coeff)}\\ \\text{N}`
    );

    const value = rhs / coeff;

    if (value < 0) {
      steps.push(
        `\\textit{Note: ${u1.label} is negative — it acts opposite to the assumed direction (${fmt(u1.angle, 2)}°).}`
      );
    }

    return {
      unknowns: [{ label: u1.label, value }],
      steps,
    };
  }

  // ─── 2 Unknowns ───────────────────────────────────────────────────────────
  const u2 = unknownForces[1];
  const rad2 = toRad(u2.angle);
  const c2x = Math.cos(rad2); // coefficient of u2 in ΣFx
  const c2y = Math.sin(rad2); // coefficient of u2 in ΣFy

  steps.push(
    `\\sum F_x = 0: \\quad ${fmt(c1x)}\\,${u1.label} + ${fmt(c2x)}\\,${u2.label} = ${fmt(rhsX)}`
  );
  steps.push(
    `\\sum F_y = 0: \\quad ${fmt(c1y)}\\,${u1.label} + ${fmt(c2y)}\\,${u2.label} = ${fmt(rhsY)}`
  );

  // Detect if one equation effectively has only one unknown (coefficient ≈ 0)
  const EPSILON = 1e-8;
  const u2_missing_x = Math.abs(c2x) < EPSILON; // u2 drops out of ΣFx
  const u2_missing_y = Math.abs(c2y) < EPSILON; // u2 drops out of ΣFy
  const u1_missing_x = Math.abs(c1x) < EPSILON; // u1 drops out of ΣFx
  const u1_missing_y = Math.abs(c1y) < EPSILON; // u1 drops out of ΣFy

  let valU1: number;
  let valU2: number;

  if (u2_missing_x) {
    // ΣFx has only u1 → solve u1 from ΣFx, substitute into ΣFy
    steps.push("\\textbf{Step 4: ΣFx has only one unknown — solve directly}");
    valU1 = rhsX / c1x;
    steps.push(
      `${u1.label} = \\frac{${fmt(rhsX)}}{${fmt(c1x)}} = ${fmt(valU1)}\\ \\text{N}`
    );
    steps.push("\\textbf{Step 5: Substitute into ΣFy to find " + u2.label + "}");
    valU2 = (rhsY - c1y * valU1) / c2y;
    steps.push(
      `${u2.label} = \\frac{${fmt(rhsY)} - (${fmt(c1y)})(${fmt(valU1)})}{${fmt(c2y)}} = ${fmt(valU2)}\\ \\text{N}`
    );
  } else if (u2_missing_y) {
    // ΣFy has only u1 → solve u1 from ΣFy, substitute into ΣFx
    steps.push("\\textbf{Step 4: ΣFy has only one unknown — solve directly}");
    valU1 = rhsY / c1y;
    steps.push(
      `${u1.label} = \\frac{${fmt(rhsY)}}{${fmt(c1y)}} = ${fmt(valU1)}\\ \\text{N}`
    );
    steps.push("\\textbf{Step 5: Substitute into ΣFx to find " + u2.label + "}");
    valU2 = (rhsX - c1x * valU1) / c2x;
    steps.push(
      `${u2.label} = \\frac{${fmt(rhsX)} - (${fmt(c1x)})(${fmt(valU1)})}{${fmt(c2x)}} = ${fmt(valU2)}\\ \\text{N}`
    );
  } else if (u1_missing_x) {
    // ΣFx has only u2 → solve u2 from ΣFx, substitute into ΣFy
    steps.push("\\textbf{Step 4: ΣFx has only one unknown — solve directly}");
    valU2 = rhsX / c2x;
    steps.push(
      `${u2.label} = \\frac{${fmt(rhsX)}}{${fmt(c2x)}} = ${fmt(valU2)}\\ \\text{N}`
    );
    steps.push("\\textbf{Step 5: Substitute into ΣFy to find " + u1.label + "}");
    valU1 = (rhsY - c2y * valU2) / c1y;
    steps.push(
      `${u1.label} = \\frac{${fmt(rhsY)} - (${fmt(c2y)})(${fmt(valU2)})}{${fmt(c1y)}} = ${fmt(valU1)}\\ \\text{N}`
    );
  } else if (u1_missing_y) {
    // ΣFy has only u2 → solve u2 from ΣFy, substitute into ΣFx
    steps.push("\\textbf{Step 4: ΣFy has only one unknown — solve directly}");
    valU2 = rhsY / c2y;
    steps.push(
      `${u2.label} = \\frac{${fmt(rhsY)}}{${fmt(c2y)}} = ${fmt(valU2)}\\ \\text{N}`
    );
    steps.push("\\textbf{Step 5: Substitute into ΣFx to find " + u1.label + "}");
    valU1 = (rhsX - c2x * valU2) / c1x;
    steps.push(
      `${u1.label} = \\frac{${fmt(rhsX)} - (${fmt(c2x)})(${fmt(valU2)})}{${fmt(c1x)}} = ${fmt(valU1)}\\ \\text{N}`
    );
  } else {
    // General case: Cramer's rule
    steps.push("\\textbf{Step 4: Solve simultaneously using Cramer's Rule}");

    const det = c1x * c2y - c2x * c1y;
    steps.push(
      `D = (${fmt(c1x)})(${fmt(c2y)}) - (${fmt(c2x)})(${fmt(c1y)}) = ${fmt(det)}`
    );

    if (Math.abs(det) < EPSILON) {
      throw new Error(
        "System is singular — the two unknown forces are parallel and cannot be solved."
      );
    }

    valU1 = (rhsX * c2y - rhsY * c2x) / det;
    valU2 = (c1x * rhsY - c1y * rhsX) / det;

    steps.push(
      `${u1.label} = \\frac{(${fmt(rhsX)})(${fmt(c2y)}) - (${fmt(rhsY)})(${fmt(c2x)})}{${fmt(det)}} = ${fmt(valU1)}\\ \\text{N}`
    );
    steps.push(
      `${u2.label} = \\frac{(${fmt(c1x)})(${fmt(rhsY)}) - (${fmt(c1y)})(${fmt(rhsX)})}{${fmt(det)}} = ${fmt(valU2)}\\ \\text{N}`
    );
  }

  // Notes for negative values
  if (valU1 < 0) {
    steps.push(
      `\\textit{Note: ${u1.label} is negative — it acts opposite to the assumed direction (${fmt(u1.angle, 2)}°).}`
    );
  }
  if (valU2 < 0) {
    steps.push(
      `\\textit{Note: ${u2.label} is negative — it acts opposite to the assumed direction (${fmt(u2.angle, 2)}°).}`
    );
  }

  return {
    unknowns: [
      { label: u1.label, value: valU1 },
      { label: u2.label, value: valU2 },
    ],
    steps,
  };
}