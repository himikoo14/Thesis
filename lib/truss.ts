// lib/truss.ts

/* ===================== TYPES ===================== */

export type SupportType = "Pinned" | "Roller";

export type Support = { x: string; y: string; type: SupportType };
export type Joint = { x: string; y: string };
export type Member = { start: number; end: number };
export type Force = { Joint: number; magnitude: string; angle: string };

export type StepLine =
  | { kind: "heading"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "text"; text: string }
  | { kind: "eq"; tex: string }
  | { kind: "result"; tex: string }
  | { kind: "warn"; text: string }
  | { kind: "jointFBD"; joint: number; members: number[] }
  | { kind: "spacer" };

export type Reaction = { dir: string; node: number; x: number; y: number };

export type Solution = {
  lines: StepLine[];
  memberForces: number[];
  reactions: Reaction[];
};

/* ── Smart number formatter ──────────────────────────────────────────────── */
export const fmt = (v: number): string => {
  if (Math.abs(v - Math.round(v)) < 1e-9) return Math.round(v).toString();
  const s = v.toFixed(2);
  return s.replace(/\.?0+$/, "");
};

export const fmtN = (v: number): string => fmt(v);

export const nodeLabel = (i: number): string => String.fromCharCode(65 + i);

/* ── Gaussian elimination with partial pivoting ─────────────────────────── */
export function gaussianElim(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  const M = A.map(r => [...r]);
  const bv = [...b];
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    [bv[col], bv[maxRow]] = [bv[maxRow], bv[col]];
    if (Math.abs(M[col][col]) < 1e-10) return null;
    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / M[col][col];
      bv[row] -= factor * bv[col];
      for (let k = col; k < n; k++) M[row][k] -= factor * M[col][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    x[row] = bv[row];
    for (let k = row + 1; k < n; k++) x[row] -= M[row][k] * x[k];
    x[row] /= M[row][row];
  }
  return x;
}

/* ===================== MAIN SOLVER ===================== */
export function solveTruss(
  supports: Support[],
  nodes: Joint[],
  members: Member[],
  forces: Force[]
): Solution {
  const allNodes: Joint[] = [...supports.map(s => ({ x: s.x, y: s.y })), ...nodes];
  const numericNodes = allNodes.map(n => ({
    x: parseFloat(n.x || "0"),
    y: parseFloat(n.y || "0"),
  }));

  const nJoints = numericNodes.length;
  const nMembers = members.length;
  const tolerance = 1e-6;

  const memberForces: number[] = Array(nMembers).fill(NaN);
  const solvedMembers: boolean[] = Array(nMembers).fill(false);
  const jointMembers: number[][] = Array.from({ length: nJoints }, () => []);
  members.forEach((mb, idx) => {
    jointMembers[mb.start].push(idx);
    jointMembers[mb.end].push(idx);
  });

  const lines: StepLine[] = [];
  const H  = (text: string) => lines.push({ kind: "heading",    text });
  const SH = (text: string) => lines.push({ kind: "subheading", text });
  const T  = (text: string) => lines.push({ kind: "text",       text });
  const E  = (tex:  string) => lines.push({ kind: "eq",         tex  });
  const R  = (tex:  string) => lines.push({ kind: "result",     tex  });
  const W  = (text: string) => lines.push({ kind: "warn",       text });
  const SP = ()              => lines.push({ kind: "spacer"          });

  const fmtNum = (v: number) => (v < 0 ? `-${fmt(Math.abs(v))}` : `${fmt(v)}`);
  const cosTex = (cos: number, lbl: string) => `${fmtNum(cos)} \\cdot F_{${lbl}}`;

  /* ── Step 1: Determinacy ── */
  H("Step 1: Determinacy Check");
  const m_val = nMembers;
  const j_val = nJoints;
  const r_val = supports.reduce((a, s) => a + (s.type === "Pinned" ? 2 : 1), 0);
  const det_val = m_val + r_val - 2 * j_val;
  T(`Members: m = ${m_val},  Joints: j = ${j_val},  Reactions: r = ${r_val}`);
  E(`m + r - 2j = ${m_val} + ${r_val} - 2(${j_val}) = ${det_val}`);
  if (det_val === 0) R("\\checkmark\\ \\text{Statically Determinate and stable}");
  else if (det_val < 0) W("✘  Mechanism (unstable) — check inputs.");
  else W("✘  Statically Indeterminate — this solver handles determinate trusses only.");
  SP();

  /* ── Step 2: Support Reactions ── */
  H("Step 2: Support Reactions");

  let totalFx = 0, totalFy = 0;
  forces.forEach(f => {
    const mag = parseFloat(f.magnitude) || 0;
    const ang = (parseFloat(f.angle) || 0) * Math.PI / 180;
    totalFx += mag * Math.cos(ang);
    totalFy += mag * Math.sin(ang);
  });

  SH("Applied external loads:");
  forces.forEach((f, i) => {
    const mag = parseFloat(f.magnitude) || 0;
    const ang = parseFloat(f.angle) || 0;
    const angR = ang * Math.PI / 180;
    T(`F${i + 1} at Joint ${nodeLabel(f.Joint)}: ${fmt(mag)} kN @ ${fmt(ang)}°`);
    E(`F_{x${i + 1}} = ${fmt(mag)}\\cos(${fmt(ang)}^\\circ) = ${fmtN(mag * Math.cos(angR))}\\ \\text{kN}`);
    E(`F_{y${i + 1}} = ${fmt(mag)}\\sin(${fmt(ang)}^\\circ) = ${fmtN(mag * Math.sin(angR))}\\ \\text{kN}`);
  });
  E(`\\Sigma F_x^{\\text{ext}} = ${fmtN(totalFx)}\\ \\text{kN}, \\quad \\Sigma F_y^{\\text{ext}} = ${fmtN(totalFy)}\\ \\text{kN}`);
  SP();

  type ReactionUnknown = { jointIdx: number; dir: "x" | "y" };
  const unknownReactions: ReactionUnknown[] = [];
  supports.forEach((s, i) => {
    if (s.type === "Pinned") {
      unknownReactions.push({ jointIdx: i, dir: "x" });
      unknownReactions.push({ jointIdx: i, dir: "y" });
    } else {
      unknownReactions.push({ jointIdx: i, dir: "y" });
    }
  });

  const nUnk = unknownReactions.length;
  const refNode = numericNodes[0];

  let momentApplied = 0;
  forces.forEach(f => {
    const mag = parseFloat(f.magnitude) || 0;
    const ang = (parseFloat(f.angle) || 0) * Math.PI / 180;
    const fx = mag * Math.cos(ang);
    const fy = mag * Math.sin(ang);
    const dx = numericNodes[f.Joint].x - refNode.x;
    const dy = numericNodes[f.Joint].y - refNode.y;
    momentApplied += dx * fy - dy * fx;
  });

  const Aeq: number[][] = [
    unknownReactions.map(u => u.dir === "x" ? 1 : 0),
    unknownReactions.map(u => u.dir === "y" ? 1 : 0),
    unknownReactions.map(u => {
      const n = numericNodes[u.jointIdx];
      const dx = n.x - refNode.x;
      const dy = n.y - refNode.y;
      return u.dir === "x" ? -dy : dx;
    }),
  ];
  const beq = [-totalFx, -totalFy, -momentApplied];

  let Asq: number[][];
  let bsq: number[];
  if (nUnk === 3) {
    Asq = Aeq.map(r => [...r]);
    bsq = [...beq];
  } else if (nUnk === 2) {
    Asq = [Aeq[0].slice(), Aeq[1].slice()];
    bsq = [beq[0], beq[1]];
    const detTest = Asq[0][0] * Asq[1][1] - Asq[0][1] * Asq[1][0];
    if (Math.abs(detTest) < 1e-10) {
      Asq = [Aeq[0].slice(), Aeq[2].slice()];
      bsq = [beq[0], beq[2]];
    }
  } else if (nUnk === 1) {
    const row = Math.abs(Aeq[1][0]) > Math.abs(Aeq[0][0]) ? 1 : 0;
    Asq = [Aeq[row].slice()];
    bsq = [beq[row]];
  } else {
    Asq = Aeq.slice(0, nUnk).map(r => [...r]);
    bsq = beq.slice(0, nUnk);
  }

  const reactions: { x: number; y: number }[] = numericNodes.map(() => ({ x: 0, y: 0 }));
  const solved = gaussianElim(Asq, bsq);

  if (solved) {
    solved.forEach((val, k) => {
      const u = unknownReactions[k];
      if (u.dir === "x") reactions[u.jointIdx].x = val;
      else reactions[u.jointIdx].y = val;
    });

    supports.forEach((s, i) => {
      const la = nodeLabel(i);
      SH(`Support ${la} (${s.type}):`);
      if (s.type === "Pinned") R(`R_{x${la}} = ${fmtN(reactions[i].x)}\\ \\text{kN}`);
      else T(`(Roller — no horizontal reaction)`);
      R(`R_{y${la}} = ${fmtN(reactions[i].y)}\\ \\text{kN}`);
    });
    SP();

    let chkFx = totalFx, chkFy = totalFy, chkM = momentApplied;
    for (let i = 0; i < supports.length; i++) {
      chkFx += reactions[i].x;
      chkFy += reactions[i].y;
      const n = numericNodes[i];
      chkM += (n.x - refNode.x) * reactions[i].y - (n.y - refNode.y) * reactions[i].x;
    }
    if (Math.abs(chkFx) < 1e-4 && Math.abs(chkFy) < 1e-4 && Math.abs(chkM) < 1e-4)
      R("\\checkmark\\ \\text{Equilibrium verified: } \\Sigma F_x = \\Sigma F_y = \\Sigma M = 0");
    else
      W(`⚠ Equilibrium check failed: ΣFx=${fmtN(chkFx)}, ΣFy=${fmtN(chkFy)}, ΣM=${fmtN(chkM)}`);
  } else {
    W("✘  Could not solve reactions — check support configuration.");
  }

  const extF: { x: number; y: number }[] = numericNodes.map((_, idx) => ({
    x: reactions[idx]?.x || 0,
    y: reactions[idx]?.y || 0,
  }));
  forces.forEach(f => {
    const mag = parseFloat(f.magnitude) || 0;
    const ang = (parseFloat(f.angle) || 0) * Math.PI / 180;
    extF[f.Joint].x += mag * Math.cos(ang);
    extF[f.Joint].y += mag * Math.sin(ang);
  });

  /* ── Step 3: Method of Joints ── */
  H("Step 3: Method of Joints");
  T("Convention: positive F = Tension,  negative F = Compression");
  T("Equilibrium at each joint: Σ(cos_x · F) + extFx = 0,  Σ(cos_y · F) + extFy = 0");
  SP();

  let progress = true;
  let iter = 0;
  while (progress && iter < nJoints * 3) {
    progress = false;
    iter++;
    for (let jIdx = 0; jIdx < nJoints; jIdx++) {
      const connected = jointMembers[jIdx];
      const unknowns = connected.filter(i => !solvedMembers[i]);
      if (unknowns.length === 0 || unknowns.length > 2) continue;

      const lbl = nodeLabel(jIdx);
      SH(`Joint ${lbl}`);
      lines.push({ kind: "jointFBD", joint: jIdx, members: connected });
      T(`Connected members: ${connected.map(u => {
        const mb = members[u];
        return `${nodeLabel(mb.start)}${nodeLabel(mb.end)}`;
      }).join(", ")}`);
      T(`Unknown forces: ${unknowns.map(u => {
        const mb = members[u];
        return `${nodeLabel(mb.start)}${nodeLabel(mb.end)}`;
      }).join(", ")}`);
      SP();

      let fxK = extF[jIdx].x;
      let fyK = extF[jIdx].y;

      connected.forEach(mIdx => {
        if (solvedMembers[mIdx]) {
          const mb = members[mIdx];
          const other = mb.start === jIdx ? mb.end : mb.start;
          const dx = numericNodes[other].x - numericNodes[jIdx].x;
          const dy = numericNodes[other].y - numericNodes[jIdx].y;
          const L = Math.hypot(dx, dy);
          if (L < tolerance) return;
          const f = memberForces[mIdx];
          fxK -= f * (dx / L);
          fyK -= f * (dy / L);
        }
      });

      const rowX: number[] = [];
      const rowY: number[] = [];
      const cosines: { dx: number; dy: number; L: number; label: string }[] = [];

      unknowns.forEach(mIdx => {
        const mb = members[mIdx];
        const other = mb.start === jIdx ? mb.end : mb.start;
        const dx = numericNodes[other].x - numericNodes[jIdx].x;
        const dy = numericNodes[other].y - numericNodes[jIdx].y;
        const L = Math.hypot(dx, dy);
        rowX.push(L > tolerance ? dx / L : 0);
        rowY.push(L > tolerance ? dy / L : 0);
        cosines.push({ dx, dy, L, label: `${nodeLabel(mb.start)}${nodeLabel(mb.end)}` });
      });

      if (unknowns.length === 1) {
        const c = cosines[0];
        E(`L_{${c.label}} = \\sqrt{(${fmtN(c.dx)})^2 + (${fmtN(c.dy)})^2} = ${fmtN(c.L)}\\ \\text{m}`);
        E(`\\cos_x = ${fmtN(rowX[0])},\\quad \\cos_y = ${fmtN(rowY[0])}`);
        E(`\\Sigma F_x = 0:\\quad ${cosTex(rowX[0], c.label)} + (${fmtN(fxK)}) = 0`);
        E(`\\Sigma F_y = 0:\\quad ${cosTex(rowY[0], c.label)} + (${fmtN(fyK)}) = 0`);

        let f: number;
        if (Math.abs(rowX[0]) >= Math.abs(rowY[0]) && Math.abs(rowX[0]) > tolerance) {
          f = -fxK / rowX[0];
        } else if (Math.abs(rowY[0]) > tolerance) {
          f = -fyK / rowY[0];
        } else {
          W(`✘  Zero-length member or degenerate geometry at Joint ${lbl}.`);
          SP();
          continue;
        }

        memberForces[unknowns[0]] = f;
        solvedMembers[unknowns[0]] = true;
        progress = true;

        const type = Math.abs(f) < tolerance
          ? "\\text{Zero-force}"
          : f > 0 ? "\\text{Tension}" : "\\text{Compression}";
        R(`F_{${c.label}} = ${fmtN(f)}\\ \\text{kN}\\quad (${type})`);

      } else if (unknowns.length === 2) {
        const [c0, c1] = cosines;
        E(`L_{${c0.label}} = ${fmtN(c0.L)}\\ \\text{m},\\quad \\cos_x = ${fmtN(rowX[0])},\\quad \\cos_y = ${fmtN(rowY[0])}`);
        E(`L_{${c1.label}} = ${fmtN(c1.L)}\\ \\text{m},\\quad \\cos_x = ${fmtN(rowX[1])},\\quad \\cos_y = ${fmtN(rowY[1])}`);
        E(`\\Sigma F_x = 0:\\quad ${cosTex(rowX[0], c0.label)} + ${cosTex(rowX[1], c1.label)} + (${fmtN(fxK)}) = 0`);
        E(`\\Sigma F_y = 0:\\quad ${cosTex(rowY[0], c0.label)} + ${cosTex(rowY[1], c1.label)} + (${fmtN(fyK)}) = 0`);

        const det = rowX[0] * rowY[1] - rowX[1] * rowY[0];
        E(`\\Delta = ${fmtN(rowX[0])} \\cdot ${fmtN(rowY[1])} - ${fmtN(rowX[1])} \\cdot ${fmtN(rowY[0])} = ${fmtN(det)}`);

        if (Math.abs(det) < tolerance) {
          W(`✘  Singular system at Joint ${lbl} (det ≈ 0) — skipping.`);
          SP();
          continue;
        }

        const f0 = (-fxK * rowY[1] + fyK * rowX[1]) / det;
        const f1 = (fxK * rowY[0] - fyK * rowX[0]) / det;

        memberForces[unknowns[0]] = f0;
        memberForces[unknowns[1]] = f1;
        solvedMembers[unknowns[0]] = true;
        solvedMembers[unknowns[1]] = true;
        progress = true;

        const t0 = Math.abs(f0) < tolerance ? "\\text{Zero-force}" : f0 > 0 ? "\\text{Tension}" : "\\text{Compression}";
        const t1 = Math.abs(f1) < tolerance ? "\\text{Zero-force}" : f1 > 0 ? "\\text{Tension}" : "\\text{Compression}";
        R(`F_{${c0.label}} = ${fmtN(f0)}\\ \\text{kN}\\quad (${t0})`);
        R(`F_{${c1.label}} = ${fmtN(f1)}\\ \\text{kN}\\quad (${t1})`);
      }
      SP();
    }
  }

  const unsolvedIdx = members.map((_, i) => i).filter(i => !solvedMembers[i]);
  if (unsolvedIdx.length > 0) {
    W(`⚠  Could not solve members: ${unsolvedIdx.map(i => {
      const mb = members[i];
      return `${nodeLabel(mb.start)}${nodeLabel(mb.end)}`;
    }).join(", ")}. Check that the truss is determinate and geometry is valid.`);
  }

  const finalForces = memberForces.map(f => isNaN(f) ? 0 : f);

  const formattedReactions: Reaction[] = reactions.map((r, i) => ({
    dir: Math.abs(r.x) > tolerance && Math.abs(r.y) > tolerance ? "xy"
      : Math.abs(r.x) > tolerance ? "x" : "y",
    node: i,
    x: r.x,
    y: r.y,
  }));

  return { lines, memberForces: finalForces, reactions: formattedReactions };
}