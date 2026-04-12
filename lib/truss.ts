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
    // Node order: support nodes first, then free joints
    const allNodes: Joint[] = [
        ...supports.map(s => ({ x: s.x, y: s.y })),
        ...nodes,
    ];
    const numericNodes = allNodes.map(n => ({
        x: parseFloat(n.x || "0"),
        y: parseFloat(n.y || "0"),
    }));

    const nJoints = numericNodes.length;
    const nMembers = members.length;
    const tolerance = 1e-6;

    const memberForces: number[] = Array(nMembers).fill(NaN);
    const solvedMembers: boolean[] = Array(nMembers).fill(false);

    // Build adjacency list: which members connect to each joint
    const jointMembers: number[][] = Array.from({ length: nJoints }, () => []);
    members.forEach((mb, idx) => {
        jointMembers[mb.start].push(idx);
        jointMembers[mb.end].push(idx);
    });

    const lines: StepLine[] = [];
    const H = (text: string) => lines.push({ kind: "heading", text });
    const SH = (text: string) => lines.push({ kind: "subheading", text });
    const T = (text: string) => lines.push({ kind: "text", text });
    const E = (tex: string) => lines.push({ kind: "eq", tex });
    const R = (tex: string) => lines.push({ kind: "result", tex });
    const W = (text: string) => lines.push({ kind: "warn", text });
    const SP = () => lines.push({ kind: "spacer" });

    const fmtNum = (v: number) => (v < 0 ? `-${fmt(Math.abs(v))}` : `${fmt(v)}`);
    const cosTex = (cos: number, lbl: string) =>
        `${fmtNum(cos)} F_{${lbl}}`;

    /* ─────────────────────────────────────────────────────────────────────────
       STEP 1 — DETERMINACY CHECK
    ──────────────────────────────────────────────────────────────────────────*/
    H("Step 1: Determinacy Check");

    const m_val = nMembers;
    const j_val = nJoints;
    const r_val = supports.reduce(
        (a, s) => a + (s.type === "Pinned" ? 2 : 1),
        0
    );
    const det_val = m_val + r_val - 2 * j_val;

    T(`Members: m = ${m_val},  Joints: j = ${j_val},  Reactions: r = ${r_val}`);
    E(`m + r - 2j = ${m_val} + ${r_val} - 2(${j_val}) = ${det_val}`);

    if (det_val === 0)
        R("\\checkmark\\ \\text{Statically Determinate and stable}");
    else if (det_val < 0)
        W("✘  Mechanism (unstable) — check inputs.");
    else
        W("✘  Statically Indeterminate — this solver handles determinate trusses only.");
    SP();

    /* ─────────────────────────────────────────────────────────────────────────
       STEP 2 — SUPPORT REACTIONS
       Strategy (standard textbook approach):
         • Identify the PIN support and ROLLER support(s).
         • Take ΣM about the PIN = 0  → solve for roller reaction(s).
         • ΣFy = 0                    → solve for pin vertical reaction.
         • ΣFx = 0                    → solve for pin horizontal reaction.
       This works for the common simply-supported case (1 pin + 1 roller).
       For other configurations we fall back to simultaneous equations.
    ──────────────────────────────────────────────────────────────────────────*/
    H("Step 2: Support Reactions");

    // Compute total applied external load components
    let totalFx = 0;
    let totalFy = 0;

    SH("Applied External Loads:");
    forces.forEach((f, i) => {
        const mag = parseFloat(f.magnitude) || 0;
        const ang = (parseFloat(f.angle) || 0) * (Math.PI / 180);
        const fx = mag * Math.cos(ang);
        const fy = mag * Math.sin(ang);
        totalFx += fx;
        totalFy += fy;
        E(
            `F_{${i + 1}} \\text{ at Joint ${nodeLabel(f.Joint)}: ${fmt(mag)} kN @ ${fmt(
                parseFloat(f.angle) || 0
            )}°}`
        );
        E(
            `F_{x${i + 1}} = ${fmt(mag)}\\cos(${fmt(
                parseFloat(f.angle) || 0
            )}^\\circ) = ${fmtN(fx)}\\ \\text{kN}`
        );
        E(
            `F_{y${i + 1}} = ${fmt(mag)}\\sin(${fmt(
                parseFloat(f.angle) || 0
            )}^\\circ) = ${fmtN(fy)}\\ \\text{kN}`
        );
    });
    E(
        `\\Sigma F_x^{\\text{ext}} = ${fmtN(totalFx)}\\ \\text{kN}, \\quad \\Sigma F_y^{\\text{ext}} = ${fmtN(
            totalFy
        )}\\ \\text{kN}`
    );
    SP();

    // Reaction storage (x and y per node)
    const reactions: { x: number; y: number }[] = numericNodes.map(() => ({
        x: 0,
        y: 0,
    }));

    // Find pin and roller supports
    const pinIdx = supports.findIndex(s => s.type === "Pinned");
    const rollerIndices = supports
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => s.type === "Roller")
        .map(({ i }) => i);

    const hasPin = pinIdx !== -1;
    const hasRollers = rollerIndices.length > 0;

    if (hasPin && hasRollers && rollerIndices.length === 1) {
        /*
         * STANDARD CASE: 1 pin (Ay, Ax) + 1 roller (By — vertical only)
         * ─────────────────────────────────────────────────────────────
         * (1) ΣM_A = 0  (moments about pin A, CCW positive)
         *       sum of (F_ext * perp-arm) + By * dx_AB = 0
         *       → By = -ΣM_ext_about_A / dx_AB
         *
         * (2) ΣFy = 0
         *       Ay + By + ΣF_y_ext = 0
         *       → Ay = -By - ΣF_y_ext
         *
         * (3) ΣFx = 0
         *       Ax + ΣF_x_ext = 0
         *       → Ax = -ΣF_x_ext
         */

        const pNode = numericNodes[pinIdx];   // Pin node
        const rIdx = rollerIndices[0];
        const rNode = numericNodes[rIdx];     // Roller node

        const pinLabel = nodeLabel(pinIdx);
        const rollerLabel = nodeLabel(rIdx);

        SH(`Pin at ${pinLabel} (${fmt(pNode.x)}, ${fmt(pNode.y)}),  Roller at ${rollerLabel} (${fmt(rNode.x)}, ${fmt(rNode.y)})`);
        SP();

        // ── (1) ΣM about pin = 0 → solve for roller reaction ──
        E(`\\text{(1) } \\Sigma M_{${pinLabel}} = 0 \\quad \\text{(moments about pin ${pinLabel}, CCW +)}`);
        E(`\\text{Convention: } M = d_x \\cdot F_y - d_y \\cdot F_x \\quad \\text{(CCW positive)}`);

        let momentAboutPin = 0;
        const momentTerms: string[] = [];

        forces.forEach((f, i) => {
            const mag = parseFloat(f.magnitude) || 0;
            const ang = (parseFloat(f.angle) || 0) * (Math.PI / 180);
            const fx = mag * Math.cos(ang);
            const fy = mag * Math.sin(ang);
            const fNode = numericNodes[f.Joint];

            // Moment arm from pin to force application point
            const dx = fNode.x - pNode.x;   // horizontal distance
            const dy = fNode.y - pNode.y;   // vertical distance

            // M = dx·Fy − dy·Fx  (cross product z-component, CCW +)
            const m = dx * fy - dy * fx;
            momentAboutPin += m;

            momentTerms.push(
                `(${fmtN(dx)})(${fmtN(fy)}) - (${fmtN(dy)})(${fmtN(fx)}) = ${fmtN(m)}`
            );
            E(
                `F_{${i + 1}}:\\quad d_x = ${fmtN(dx)}\\ \\text{m},\\ d_y = ${fmtN(
                    dy
                )}\\ \\text{m},\\ M = (${fmtN(dx)})(${fmtN(fy)}) - (${fmtN(
                    dy
                )})(${fmtN(fx)}) = ${fmtN(m)}\\ \\text{kN}\\cdot\\text{m}`
            );
        });

        E(
            `\\Sigma M_{${pinLabel}} = ${fmtN(momentAboutPin)}\\ \\text{kN}\\cdot\\text{m}`
        );

        // Roller contributes: R_B · (x_B - x_A)  assuming vertical roller
        const dx_AB = rNode.x - pNode.x;
        const dy_AB = rNode.y - pNode.y;

        // General roller reaction direction: rollers resist perpendicular to surface.
        // Here we assume vertical roller reaction (most common).
        // Moment from roller about pin = R_B · dx_AB  (if horizontal span)
        // For inclined span: we handle the general case via cross product
        // M_roller = dx_AB * R_By - dy_AB * R_Bx; roller has no x-reaction, so:
        //   = dx_AB * R_By
        // Solve: momentAboutPin + dx_AB * R_By = 0

        if (Math.abs(dx_AB) > tolerance) {
            const R_By = -momentAboutPin / dx_AB;
            reactions[rIdx].y = R_By;

            E(
                `\\Sigma M_{${pinLabel}} = 0:\\quad ${fmtN(momentAboutPin)} + R_{y${rollerLabel}} \\cdot (${fmtN(
                    dx_AB
                )}) = 0`
            );
            R(
                `R_{y${rollerLabel}} = \\dfrac{${fmtN(-momentAboutPin)}}{${fmtN(
                    dx_AB
                )}} = ${fmtN(R_By)}\\ \\text{kN}`
            );
        } else if (Math.abs(dy_AB) > tolerance) {
            // Roller is directly above/below pin — use horizontal distance component
            const R_By = -momentAboutPin / dy_AB;
            reactions[rIdx].y = R_By;
            E(
                `\\Sigma M_{${pinLabel}} = 0:\\quad ${fmtN(momentAboutPin)} + R_{y${rollerLabel}} \\cdot (${fmtN(
                    dy_AB
                )}) = 0`
            );
            R(
                `R_{y${rollerLabel}} = \\dfrac{${fmtN(-momentAboutPin)}}{${fmtN(
                    dy_AB
                )}} = ${fmtN(R_By)}\\ \\text{kN}`
            );
        } else {
            W(`✘  Pin and Roller are at the same location — check coordinates.`);
        }
        SP();

        // ── (2) ΣFy = 0 → solve for pin vertical ──
        E(`\\text{(2) } \\Sigma F_y = 0 \\quad \\rightarrow \\quad R_{${pinLabel}y}`);
        const R_Ay = -totalFy - reactions[rIdx].y;
        reactions[pinIdx].y = R_Ay;

        E(
            `R_{y${pinLabel}} + R_{y${rollerLabel}} + \\Sigma F_y^{\\text{ext}} = 0`
        );
        E(
            `R_{y${pinLabel}} + (${fmtN(reactions[rIdx].y)}) + (${fmtN(
                totalFy
            )}) = 0`
        );
        R(`R_{y${pinLabel}} = ${fmtN(R_Ay)}\\ \\text{kN}`);
        SP();

        // ── (3) ΣFx = 0 → solve for pin horizontal ──
        E(`\\text{(3) } \\Sigma F_x = 0 \\quad \\rightarrow \\quad R_{${pinLabel}x}`);
        const R_Ax = -totalFx;
        reactions[pinIdx].x = R_Ax;

        E(`R_{x${pinLabel}} + \\Sigma F_x^{\\text{ext}} = 0`);
        E(`R_{x${pinLabel}} + (${fmtN(totalFx)}) = 0`);
        R(`R_{x${pinLabel}} = ${fmtN(R_Ax)}\\ \\text{kN}`);
        SP();

    } else {
        /*
         * FALLBACK: General simultaneous equations for other configurations
         * (two pins, multiple rollers, etc.)
         */
        W("Non-standard support configuration — solving reactions via simultaneous equilibrium equations.");
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
        const refNodeFallback = numericNodes[0];

        let momentApplied = 0;
        forces.forEach(f => {
            const mag = parseFloat(f.magnitude) || 0;
            const ang = (parseFloat(f.angle) || 0) * (Math.PI / 180);
            const fx = mag * Math.cos(ang);
            const fy = mag * Math.sin(ang);
            const dx = numericNodes[f.Joint].x - refNodeFallback.x;
            const dy = numericNodes[f.Joint].y - refNodeFallback.y;
            momentApplied += dx * fy - dy * fx;
        });

        const Aeq: number[][] = [
            unknownReactions.map(u => (u.dir === "x" ? 1 : 0)),
            unknownReactions.map(u => (u.dir === "y" ? 1 : 0)),
            unknownReactions.map(u => {
                const n = numericNodes[u.jointIdx];
                const dx = n.x - refNodeFallback.x;
                const dy = n.y - refNodeFallback.y;
                return u.dir === "x" ? -dy : dx;
            }),
        ];
        const beq = [-totalFx, -totalFy, -momentApplied];

        let Asq: number[][];
        let bsq: number[];
        if (nUnk >= 3) {
            Asq = Aeq.slice(0, 3).map(r => [...r]);
            bsq = beq.slice(0, 3);
        } else if (nUnk === 2) {
            Asq = [Aeq[0].slice(), Aeq[1].slice()];
            bsq = [beq[0], beq[1]];
            const detTest =
                Asq[0][0] * Asq[1][1] - Asq[0][1] * Asq[1][0];
            if (Math.abs(detTest) < 1e-10) {
                Asq = [Aeq[0].slice(), Aeq[2].slice()];
                bsq = [beq[0], beq[2]];
            }
        } else {
            Asq = [Aeq[0].slice()];
            bsq = [beq[0]];
        }

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
                if (s.type === "Pinned")
                    R(`R_{x${la}} = ${fmtN(reactions[i].x)}\\ \\text{kN}`);
                else
                    T(`(Roller — no horizontal reaction)`);
                R(`R_{y${la}} = ${fmtN(reactions[i].y)}\\ \\text{kN}`);
            });
        } else {
            W("✘  Could not solve reactions — check support configuration.");
        }
        SP();
    }

    /* ── Equilibrium verification ── */
    SH("Equilibrium Verification:");
    let chkFx = totalFx;
    let chkFy = totalFy;
    let chkM = 0;
    const refNode = numericNodes[0];

    // Moment of applied loads about node 0
    forces.forEach(f => {
        const mag = parseFloat(f.magnitude) || 0;
        const ang = (parseFloat(f.angle) || 0) * (Math.PI / 180);
        const fx = mag * Math.cos(ang);
        const fy = mag * Math.sin(ang);
        const dx = numericNodes[f.Joint].x - refNode.x;
        const dy = numericNodes[f.Joint].y - refNode.y;
        chkM += dx * fy - dy * fx;
    });

    for (let i = 0; i < supports.length; i++) {
        chkFx += reactions[i].x;
        chkFy += reactions[i].y;
        const n = numericNodes[i];
        chkM +=
            (n.x - refNode.x) * reactions[i].y -
            (n.y - refNode.y) * reactions[i].x;
    }

    if (
        Math.abs(chkFx) < 1e-4 &&
        Math.abs(chkFy) < 1e-4 &&
        Math.abs(chkM) < 1e-4
    ) {
        R(
            "\\checkmark\\ \\text{Equilibrium verified: } \\Sigma F_x = \\Sigma F_y = \\Sigma M = 0"
        );
    } else {
        W(
            `⚠ Equilibrium check failed: ΣFx=${fmtN(chkFx)}, ΣFy=${fmtN(
                chkFy
            )}, ΣM=${fmtN(chkM)}`
        );
    }
    SP();

    /* ─────────────────────────────────────────────────────────────────────────
       STEP 3 — METHOD OF JOINTS
       At each joint:  ΣFx = 0  and  ΣFy = 0
       Sign convention: Positive member force = Tension (member pulls joint)
                        Negative member force = Compression (member pushes joint)
       For each unknown member force F_ij, its contribution at joint i is:
         x-component: F_ij · (cos θ) = F_ij · (x_j - x_i) / L
         y-component: F_ij · (sin θ) = F_ij · (y_j - y_i) / L
    ──────────────────────────────────────────────────────────────────────────*/
    H("Step 3: Method of Joints");
    T("Sign convention: Positive = Tension (T),  Negative = Compression (C)");
    T("At each joint, resolve all member forces and external loads:");
    T("  ΣFx = 0 : Σ(cos θ · F_member) + F_ext,x = 0");
    T("  ΣFy = 0 : Σ(sin θ · F_member) + F_ext,y = 0");
    SP();

    // Build combined external force at each joint (reactions + applied loads)
    const extF: { x: number; y: number }[] = numericNodes.map((_, idx) => ({
        x: reactions[idx]?.x || 0,
        y: reactions[idx]?.y || 0,
    }));
    forces.forEach(f => {
        const mag = parseFloat(f.magnitude) || 0;
        const ang = (parseFloat(f.angle) || 0) * (Math.PI / 180);
        extF[f.Joint].x += mag * Math.cos(ang);
        extF[f.Joint].y += mag * Math.sin(ang);
    });

    let progress = true;
    let iter = 0;

    while (progress && iter < nJoints * 3) {
        progress = false;
        iter++;

        for (let jIdx = 0; jIdx < nJoints; jIdx++) {
            const connected = jointMembers[jIdx];
            const unknowns = connected.filter(i => !solvedMembers[i]);

            // Only process joints with 1 or 2 unknown member forces
            if (unknowns.length === 0 || unknowns.length > 2) continue;

            const lbl = nodeLabel(jIdx);
            SH(`Joint ${lbl}`);
            lines.push({ kind: "jointFBD", joint: jIdx, members: connected });

            T(
                `Members at ${lbl}: ${connected
                    .map(u => {
                        const mb = members[u];
                        return `${nodeLabel(mb.start)}${nodeLabel(mb.end)}`;
                    })
                    .join(", ")}`
            );
            E(
                `\\text{Unknown(s): } ${unknowns
                    .map(u => {
                        const mb = members[u];
                        return `F_{${nodeLabel(mb.start)}${nodeLabel(mb.end)}}`;
                    })
                    .join(",\\ ")}`
            );
            SP();

            // Accumulate the "known" side: start with external force at joint
            let fxK = extF[jIdx].x;
            let fyK = extF[jIdx].y;

            // Subtract contributions of already-solved members
            connected.forEach(mIdx => {
                if (solvedMembers[mIdx]) {
                    const mb = members[mIdx];
                    const other = mb.start === jIdx ? mb.end : mb.start;
                    const dx = numericNodes[other].x - numericNodes[jIdx].x;
                    const dy = numericNodes[other].y - numericNodes[jIdx].y;
                    const L = Math.hypot(dx, dy);
                    if (L < tolerance) return;
                    const F = memberForces[mIdx];
                    // F contributes F*(dx/L) to ΣFx and F*(dy/L) to ΣFy at this joint
                    fxK += F * (dx / L);   // ← FIXED: add contribution
                    fyK += F * (dy / L);
                }
            });

            // Direction cosines for each unknown member
            const rowX: number[] = [];
            const rowY: number[] = [];
            const cosines: { dx: number; dy: number; L: number; label: string }[] =
                [];

            unknowns.forEach(mIdx => {
                const mb = members[mIdx];
                const other = mb.start === jIdx ? mb.end : mb.start;
                const dx = numericNodes[other].x - numericNodes[jIdx].x;
                const dy = numericNodes[other].y - numericNodes[jIdx].y;
                const L = Math.hypot(dx, dy);
                rowX.push(L > tolerance ? dx / L : 0);
                rowY.push(L > tolerance ? dy / L : 0);
                cosines.push({
                    dx,
                    dy,
                    L,
                    label: `${nodeLabel(mb.start)}${nodeLabel(mb.end)}`,
                });
            });

            if (unknowns.length === 1) {
                const c = cosines[0];

                E(
                    `L_{${c.label}} = \\sqrt{(${fmtN(c.dx)})^2+(${fmtN(
                        c.dy
                    )})^2} = ${fmtN(c.L)}\\ \\text{m}`
                );
                E(
                    `\\cos\\theta_x = \\dfrac{${fmtN(c.dx)}}{${fmtN(c.L)}}, \\quad \\cos\\theta_y = \\dfrac{${fmtN(c.dy)}}{${fmtN(c.L)}}`
                );

                SP();
                E(
                    `\\Sigma F_x = 0: \\quad ${cosTex(rowX[0], c.label)} + (${fmtN(
                        fxK
                    )}) = 0`
                );
                E(
                    `\\Sigma F_y = 0: \\quad ${cosTex(rowY[0], c.label)} + (${fmtN(
                        fyK
                    )}) = 0`
                );

                let F: number;
                // Use the equation with the larger coefficient for numerical stability
                if (
                    Math.abs(rowX[0]) >= Math.abs(rowY[0]) &&
                    Math.abs(rowX[0]) > tolerance
                ) {
                    F = -fxK / rowX[0];
                    E(
                        `\\text{From } \\Sigma F_x = 0: \\quad F_{${c.label}} = \\dfrac{${fmtN(
                            -fxK
                        )}}{${fmtN(rowX[0])}} = ${fmtN(F)}\\ \\text{kN}`
                    );
                } else if (Math.abs(rowY[0]) > tolerance) {
                    F = -fyK / rowY[0];
                    E(
                        `\\text{From } \\Sigma F_y = 0: \\quad F_{${c.label}} = \\dfrac{${fmtN(
                            -fyK
                        )}}{${fmtN(rowY[0])}} = ${fmtN(F)}\\ \\text{kN}`
                    );
                } else {
                    W(
                        `✘  Zero-length member or degenerate geometry at Joint ${lbl}.`
                    );
                    SP();
                    continue;
                }

                memberForces[unknowns[0]] = F;
                solvedMembers[unknowns[0]] = true;
                progress = true;

                const type =
                    Math.abs(F) < tolerance
                        ? "\\text{Zero-force member}"
                        : F > 0
                            ? "\\text{Tension}"
                            : "\\text{Compression}";
                R(`F_{${c.label}} = ${fmtN(F)}\\ \\text{kN} \\quad (${type})`);

            } else {
                /* unknowns.length === 2 */
                const [c0, c1] = cosines;

                E(
                    `L_{${c0.label}} = ${fmtN(c0.L)}\\ \\text{m}, \\quad \\cos\\theta_x = \\dfrac{${fmtN(c0.dx)}}{${fmtN(c0.L)}}, \\quad \\cos\\theta_y = \\dfrac{${fmtN(c0.dy)}}{${fmtN(c0.L)}}`
                );
                E(
                    `L_{${c1.label}} = ${fmtN(c1.L)}\\ \\text{m}, \\quad \\cos\\theta_x = \\dfrac{${fmtN(c1.dx)}}{${fmtN(c1.L)}}, \\quad \\cos\\theta_y = \\dfrac{${fmtN(c1.dy)}}{${fmtN(c1.L)}}`
                );

                SP();
                E(
                    `\\Sigma F_x = 0: \\quad ${cosTex(rowX[0], c0.label)} + ${cosTex(
                        rowX[1],
                        c1.label
                    )} + (${fmtN(fxK)}) = 0`
                );
                E(
                    `\\Sigma F_y = 0: \\quad ${cosTex(rowY[0], c0.label)} + ${cosTex(
                        rowY[1],
                        c1.label
                    )} + (${fmtN(fyK)}) = 0`
                );
                SP();

                // Solve 2×2 system by Cramer's rule
                // [rowX[0]  rowX[1]] [F0]   [-fxK]
                // [rowY[0]  rowY[1]] [F1] = [-fyK]
                const det = rowX[0] * rowY[1] - rowX[1] * rowY[0];
                E(
                    `\\Delta = (${fmtN(rowX[0])})(${fmtN(rowY[1])}) - (${fmtN(
                        rowX[1]
                    )})(${fmtN(rowY[0])}) = ${fmtN(det)}`
                );

                if (Math.abs(det) < tolerance) {
                    W(
                        `✘  Singular system at Joint ${lbl} (Δ ≈ 0) — members are parallel or collinear. Skipping.`
                    );
                    SP();
                    continue;
                }

                // Cramer's rule:
                //   F0 = det([−fxK, rowX[1]; −fyK, rowY[1]]) / det
                //   F1 = det([rowX[0], −fxK; rowY[0], −fyK]) / det
                const F0 = ((-fxK) * rowY[1] - rowX[1] * (-fyK)) / det;
                const F1 = (rowX[0] * (-fyK) - (-fxK) * rowY[0]) / det;

                E(
                    `F_{${c0.label}} = \\dfrac{(${fmtN(-fxK)})(${fmtN(
                        rowY[1]
                    )}) - (${fmtN(rowX[1])})(${fmtN(-fyK)})}{${fmtN(det)}} = ${fmtN(
                        F0
                    )}\\ \\text{kN}`
                );
                E(
                    `F_{${c1.label}} = \\dfrac{(${fmtN(rowX[0])})(${fmtN(
                        -fyK
                    )}) - (${fmtN(-fxK)})(${fmtN(rowY[0])})}{${fmtN(det)}} = ${fmtN(
                        F1
                    )}\\ \\text{kN}`
                );

                memberForces[unknowns[0]] = F0;
                memberForces[unknowns[1]] = F1;
                solvedMembers[unknowns[0]] = true;
                solvedMembers[unknowns[1]] = true;
                progress = true;

                const t0 =
                    Math.abs(F0) < tolerance
                        ? "\\text{Zero-force}"
                        : F0 > 0
                            ? "\\text{Tension}"
                            : "\\text{Compression}";
                const t1 =
                    Math.abs(F1) < tolerance
                        ? "\\text{Zero-force}"
                        : F1 > 0
                            ? "\\text{Tension}"
                            : "\\text{Compression}";
                R(`F_{${c0.label}} = ${fmtN(F0)}\\ \\text{kN} \\quad (${t0})`);
                R(`F_{${c1.label}} = ${fmtN(F1)}\\ \\text{kN} \\quad (${t1})`);
            }

            SP();
        }
    }

    /* ── Warn about any unsolved members ── */
    const unsolvedIdx = members
        .map((_, i) => i)
        .filter(i => !solvedMembers[i]);

    if (unsolvedIdx.length > 0) {
        W(
            `⚠  Could not solve members: ${unsolvedIdx
                .map(i => {
                    const mb = members[i];
                    return `${nodeLabel(mb.start)}${nodeLabel(mb.end)}`;
                })
                .join(", ")}. Verify that the truss is determinate and all geometry is correct.`
        );
    }

    const finalForces = memberForces.map(f => (isNaN(f) ? 0 : f));

    const formattedReactions: Reaction[] = reactions.map((r, i) => ({
        dir:
            Math.abs(r.x) > tolerance && Math.abs(r.y) > tolerance
                ? "xy"
                : Math.abs(r.x) > tolerance
                    ? "x"
                    : "y",
        node: i,
        x: r.x,
        y: r.y,
    }));

    return { lines, memberForces: finalForces, reactions: formattedReactions };
}
