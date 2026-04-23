type XY = { x: string; y: string };

type ShapeType =
  | "Polygon"
  | "Circle"
  | "Semi-circle-1"
  | "Semi-circle-2"
  | "Semi-circle-3"
  | "Semi-circle-4"
  | "Quarter-circle-1"
  | "Quarter-circle-2"
  | "Quarter-circle-3"
  | "Quarter-circle-4";

type ShapeData = {
  type: ShapeType;
  hollow: "Hollow" | "Solid";
  nodes: XY[];
  radius: string;
  x: string;
  y: string;
};

type ShapeResult = {
  A: number;
  Cx: number;
  Cy: number;
  Ix: number;
  Iy: number;
};

export function computeMOI(shapes: ShapeData[]) {

  /* 🔷 Helper Functions */

  function computePolygon(shape: ShapeData): ShapeResult | null {
    if (!shape.nodes || shape.nodes.length < 3) return null;

    const pts = shape.nodes
      .map(p => ({
        x: Number(p.x),
        y: Number(p.y),
      }))
      .filter(p => !isNaN(p.x) && !isNaN(p.y));

    if (pts.length < 3) return null;

    let A = 0, Cx = 0, Cy = 0, Ix = 0, Iy = 0;

    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;

      const xi = pts[i].x;
      const yi = pts[i].y;
      const xj = pts[j].x;
      const yj = pts[j].y;

      const cross = xi * yj - xj * yi;

      A += cross;
      Cx += (xi + xj) * cross;
      Cy += (yi + yj) * cross;

      Ix += (yi * yi + yi * yj + yj * yj) * cross;
      Iy += (xi * xi + xi * xj + xj * xj) * cross;
    }

    A /= 2;
    if (Math.abs(A) < 1e-9) return null;

    const sign = Math.sign(A);
    const absA = Math.abs(A);

    Cx /= (6 * sign * absA);
    Cy /= (6 * sign * absA);

    Ix = Math.abs(Ix) / 12;
    Iy = Math.abs(Iy) / 12;

    // Transfer from origin to centroidal axis (parallel axis theorem in reverse)
    Ix = Ix - absA * Cy * Cy;
    Iy = Iy - absA * Cx * Cx;

    return { A: absA, Cx, Cy, Ix, Iy };
  }

  function computeCircle(shape: ShapeData): ShapeResult | null {
    const r = Number(shape.radius);
    const cx = Number(shape.x);
    const cy = Number(shape.y);
    if (isNaN(r) || isNaN(cx) || isNaN(cy)) return null;

    const A = Math.PI * r * r;
    const Ix = (Math.PI * r ** 4) / 4;
    const Iy = Ix;

    return { A, Cx: cx, Cy: cy, Ix, Iy };
  }

  function computeSemiCircle(shape: ShapeData): ShapeResult | null {
    const r = Number(shape.radius);
    const cx = Number(shape.x);
    const cy = Number(shape.y);
    if (isNaN(r) || isNaN(cx) || isNaN(cy)) return null;

    const A = (Math.PI * r * r) / 2;

    // Distance from diameter to centroid
    const d = (4 * r) / (3 * Math.PI);

    // Centroidal MOI:
    // I_parallel  = MOI about axis parallel to flat edge (through centroid)
    //             = πr⁴/8 − A·d²   ≡ (π/8 − 8/9π)r⁴
    // I_perp      = MOI about axis perpendicular to flat edge (through centroid)
    //             = πr⁴/8  (no offset correction needed on this axis)
    const I_parallel = (Math.PI * r ** 4) / 8 - A * d * d;
    const I_perp = (Math.PI * r ** 4) / 8;

    let Cx = cx;
    let Cy = cy;
    let Ix: number;
    let Iy: number;

    if (shape.type === "Semi-circle-1") {
      // Flat bottom, curves up → centroid shifts up
      Cy += d;
      Ix = I_parallel;
      Iy = I_perp;
    } else if (shape.type === "Semi-circle-2") {
      // Flat top, curves down → centroid shifts down
      Cy -= d;
      Ix = I_parallel;
      Iy = I_perp;
    } else if (shape.type === "Semi-circle-3") {
      // Flat right, curves left → centroid shifts left
      Cx -= d;
      Ix = I_perp;
      Iy = I_parallel;
    } else {
      // Semi-circle-4: flat left, curves right → centroid shifts right
      Cx += d;
      Ix = I_perp;
      Iy = I_parallel;
    }

    return { A, Cx, Cy, Ix, Iy };
  }

  function computeQuarterCircle(shape: ShapeData): ShapeResult | null {
    const r = Number(shape.radius);
    const cx = Number(shape.x);
    const cy = Number(shape.y);
    if (isNaN(r) || isNaN(cx) || isNaN(cy)) return null;

    const A = (Math.PI * r * r) / 4;

    // Distance from each straight edge to centroid along that axis
    const d = (4 * r) / (3 * Math.PI);

    // Centroidal MOI (same for both axes by symmetry):
    // I_centroidal = πr⁴/16 − A·d²   ≡ (π/16 − 4/9π)r⁴
    const I_centroidal = (Math.PI * r ** 4) / 16 - A * d * d;

    let Cx = cx;
    let Cy = cy;
    
    if (shape.type === "Quarter-circle-1") { Cx -= d; Cy -= d; } // corner at top-right
    if (shape.type === "Quarter-circle-2") { Cx += d; Cy -= d; } // corner at top-left
    if (shape.type === "Quarter-circle-3") { Cx += d; Cy += d; } // corner at bottom-left
    if (shape.type === "Quarter-circle-4") { Cx -= d; Cy += d; } // corner at bottom-right
    return { A, Cx, Cy, Ix: I_centroidal, Iy: I_centroidal };
  }

  function fmtR(r: number): string {
    return Number.isInteger(r) ? r.toString() : r.toFixed(2);
  }

  function getFormulas(shape: ShapeData, r: number): { Ix_formula: string | null; Iy_formula: string | null } {
    if (shape.type === "Polygon") {
      const pts = shape.nodes.map(p => ({ x: Number(p.x), y: Number(p.y) }));
      const xs = pts.map(p => p.x);
      const ys = pts.map(p => p.y);
      const b = Math.max(...xs) - Math.min(...xs);
      const h = Math.max(...ys) - Math.min(...ys);
      return {
        Ix_formula: `\\dfrac{${fmtR(b)}(${fmtR(h)})^3}{12}`,
        Iy_formula: `\\dfrac{(${fmtR(b)})^3 ${fmtR(h)}}{12}`,
      };
    }

    if (shape.type === "Circle") {
      return {
        Ix_formula: `\\dfrac{\\pi (${fmtR(r)})^4}{4}`,
        Iy_formula: `\\dfrac{\\pi (${fmtR(r)})^4}{4}`,
      };
    }

    if (shape.type === "Semi-circle-1" || shape.type === "Semi-circle-3") {
      // Flat edge horizontal → Ix uses (π/8 - 8/9π)r⁴, Iy uses πr⁴/8
      return {
        Ix_formula: `\\left(\\dfrac{\\pi}{8} - \\dfrac{8}{9\\pi}\\right)(${fmtR(r)})^4`,
        Iy_formula: `\\dfrac{\\pi (${fmtR(r)})^4}{8}`,
      };
    }

    if (shape.type === "Semi-circle-2" || shape.type === "Semi-circle-4") {
      // Flat edge vertical → axes swapped: Ix uses πr⁴/8, Iy uses (π/8 - 8/9π)r⁴
      return {
        Ix_formula: `\\dfrac{\\pi (${fmtR(r)})^4}{8}`,
        Iy_formula: `\\left(\\dfrac{\\pi}{8} - \\dfrac{8}{9\\pi}\\right)(${fmtR(r)})^4`,
      };
    }

    if (shape.type.startsWith("Quarter")) {
      // Both axes identical for all quarter-circle orientations
      const f = `\\left(\\dfrac{\\pi}{16} - \\dfrac{4}{9\\pi}\\right)(${fmtR(r)})^4`;
      return { Ix_formula: f, Iy_formula: f };
    }

    return { Ix_formula: null, Iy_formula: null };
  }

  /* 🔷 MAIN CALCULATION */

  const results: ShapeResult[] = [];

  // step1: per-shape raw properties (before sign flip)
  const step1: any[] = [];

  shapes.forEach((shape, index) => {
    let raw: ShapeResult | null = null;

    if (shape.type === "Polygon") raw = computePolygon(shape);
    else if (shape.type === "Circle") raw = computeCircle(shape);
    else if (shape.type.startsWith("Semi")) raw = computeSemiCircle(shape);
    else if (shape.type.startsWith("Quarter")) raw = computeQuarterCircle(shape);

    if (!raw) return;

    const sign = shape.hollow === "Hollow" ? -1 : 1;

    const formulas = getFormulas(shape, Number(shape.radius));

    step1.push({
      index: index + 1,
      type: shape.type,
      hollow: shape.hollow,
      area: raw.A,
      cx: raw.Cx,
      cy: raw.Cy,
      Ix_own: raw.Ix,
      Iy_own: raw.Iy,
      signedArea: sign * raw.A,
      signedIx: sign * raw.Ix,
      signedIy: sign * raw.Iy,
      Ix_formula: formulas.Ix_formula,
      Iy_formula: formulas.Iy_formula,
    });

    results.push({
      A: sign * raw.A,
      Cx: raw.Cx,
      Cy: raw.Cy,
      Ix: sign * raw.Ix,
      Iy: sign * raw.Iy,
    });
  });

  /* 🔷 Centroid */

  let totalArea = 0;
  let sumX = 0;
  let sumY = 0;

  results.forEach(r => {
    totalArea += r.A;
    sumX += r.A * r.Cx;
    sumY += r.A * r.Cy;
  });

  if (totalArea === 0) {
    return {
      step1: [],
      centroid: { totalArea: 0, centroidX: 0, centroidY: 0 },
      step3: [],
      final: { Ix: 0, Iy: 0 },
    };
  }

  const centroidX = sumX / totalArea;
  const centroidY = sumY / totalArea;

  /* 🔷 Parallel Axis Theorem */

  let Ix_final = 0;
  let Iy_final = 0;

  const step3Results: any[] = [];

  results.forEach((r, index) => {
    const dx = r.Cx - centroidX;
    const dy = r.Cy - centroidY;

    const sign = step1[index].hollow === "Hollow" ? -1 : 1;
    const Ix_transferred = r.Ix + sign * Math.abs(r.A) * dy * dy;
    const Iy_transferred = r.Iy + sign * Math.abs(r.A) * dx * dx;

    Ix_final += Ix_transferred;
    Iy_final += Iy_transferred;

    const s1 = step1[index];

    step3Results.push({
      shape: index + 1,
      hollow: s1?.hollow ?? "Solid",
      // own-axis centroidal MOI (unsigned magnitude for display)
      Ix_own: s1?.Ix_own ?? Math.abs(r.Ix),
      Iy_own: s1?.Iy_own ?? Math.abs(r.Iy),
      // signed area (for d² term)
      area: r.A,
      // centroid of this shape
      cx: r.Cx,
      cy: r.Cy,
      // transfer distances
      dx,
      dy,
      // final transferred values (signed, because hollow shapes subtract)
      Ix_transferred,
      Iy_transferred,
      // formulas for display
      Ix_formula: s1?.Ix_formula ?? null,
      Iy_formula: s1?.Iy_formula ?? null,
    });
  });

  return {
    step1,
    centroid: {
      totalArea,
      centroidX,
      centroidY,
    },
    step3: step3Results,
    final: {
      Ix: Ix_final,
      Iy: Iy_final,
    },
  };
}