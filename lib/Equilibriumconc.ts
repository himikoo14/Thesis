export type EquilibrantResult = {
  steps: string[];
  sumFx: number;
  sumFy: number;
  resultantMagnitude: number;
  resultantAngle: number;
  equilibrantMagnitude: number;
  equilibrantAngle: number;
};

export function computeEquilibrant(forces: {
  magnitude: number;
  angle: number;
}[]): EquilibrantResult {

  let sumFx = 0;
  let sumFy = 0;
  const steps: string[] = [];

  steps.push("Step 1: Resolve known forces into components:");

  forces.forEach((f, i) => {
    const rad = (f.angle * Math.PI) / 180;
    const fx = f.magnitude * Math.cos(rad);
    const fy = f.magnitude * Math.sin(rad);

    sumFx += fx;
    sumFy += fy;

    steps.push(`
      \\begin{align*}
      F_{x${i+1}} &= ${f.magnitude}\\cos(${f.angle}^\\circ) = ${fx.toFixed(3)} \\\\
      F_{y${i+1}} &= ${f.magnitude}\\sin(${f.angle}^\\circ) = ${fy.toFixed(3)}
      \\end{align*}
    `);
  });

  steps.push("Step 2: Apply equilibrium equations:");

  steps.push(`
    \\begin{align*}
    \\Sigma F_x &= ${sumFx.toFixed(3)} \\\\
    \\Sigma F_y &= ${sumFy.toFixed(3)}
    \\end{align*}
  `);

  const R = Math.hypot(sumFx, sumFy);
  const theta = (Math.atan2(sumFy, sumFx) * 180) / Math.PI;

  steps.push("Step 3: Compute resultant of known forces:");

  steps.push(`
    \\begin{align*}
    R &= \\sqrt{(\\Sigma F_x)^2 + (\\Sigma F_y)^2} \\\\
      &= ${R.toFixed(3)} \\\\
    \\theta &= \\tan^{-1}\\left(\\frac{\\Sigma F_y}{\\Sigma F_x}\\right) \\\\
           &= ${theta.toFixed(2)}^\\circ
    \\end{align*}
  `);

  let equilibrantAngle = theta + 180;
  equilibrantAngle = ((equilibrantAngle % 360) + 360) % 360;

  steps.push("Step 4: Equilibrant is opposite of resultant:");

  steps.push(`
    \\begin{align*}
    E &= R = ${R.toFixed(3)} \\\\
    \\theta_E &= ${equilibrantAngle.toFixed(2)}^\\circ
    \\end{align*}
  `);

return {
  steps,
  sumFx,
  sumFy,
  resultantMagnitude: R,
  resultantAngle: theta,
  equilibrantMagnitude: R,
  equilibrantAngle
};
}