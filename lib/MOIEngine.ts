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

// 🔧 Sort points around centroid (prevents self-intersections)
const cx =
  pts.reduce((s, p) => s + p.x, 0) / pts.length;

const cy =
  pts.reduce((s, p) => s + p.y, 0) / pts.length;

pts.sort(
  (a, b) =>
    Math.atan2(a.y - cy, a.x - cx) -
    Math.atan2(b.y - cy, b.x - cx)
);

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
    if (A === 0) return null;

    const orientation = Math.sign(A) || 1;

    A = Math.abs(A);

    Cx /= (6 * orientation * A);
    Cy /= (6 * orientation * A);

    Ix = Math.abs(Ix / 12);
    Iy = Math.abs(Iy / 12);

    return { A, Cx, Cy, Ix, Iy };
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

    const d = r - (4 * r) / (3 * Math.PI);

    let Cx = cx;
    let Cy = cy;

    if (shape.type === "Semi-circle-1") Cy += d;
    if (shape.type === "Semi-circle-2") Cx += d;
    if (shape.type === "Semi-circle-3") Cy -= d;
    if (shape.type === "Semi-circle-4") Cx -= d;

    const Ix = (Math.PI * r ** 4) / 8;
    const Iy = Ix;

    return { A, Cx, Cy, Ix, Iy };
  }

  function computeQuarterCircle(shape: ShapeData): ShapeResult | null {
    const r = Number(shape.radius);
    const cx = Number(shape.x);
    const cy = Number(shape.y);
    if (isNaN(r) || isNaN(cx) || isNaN(cy)) return null;

    const A = (Math.PI * r * r) / 4;
    const d = (4 * r) / (3 * Math.PI);

    let Cx = cx;
    let Cy = cy;

    if (shape.type === "Quarter-circle-1") { Cx += r - d; Cy += r - d; }
    if (shape.type === "Quarter-circle-2") { Cx -= r - d; Cy += r - d; }
    if (shape.type === "Quarter-circle-3") { Cx -= r - d; Cy -= r - d; }
    if (shape.type === "Quarter-circle-4") { Cx += r - d; Cy -= r - d; }

    const Ix = (Math.PI * r ** 4) / 16;
    const Iy = Ix;

    return { A, Cx, Cy, Ix, Iy };
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

    // Push to step1 BEFORE sign so KaTeX can show true geometry values
    step1.push({
      index: index + 1,
      type: shape.type,
      hollow: shape.hollow,
      // raw unsigned geometry
      area: raw.A,           // always positive magnitude
      cx: raw.Cx,
      cy: raw.Cy,
      Ix_own: raw.Ix,        // own-axis MOI (always positive)
      Iy_own: raw.Iy,
      // signed values used in summation
      signedArea: sign * raw.A,
      signedIx: sign * raw.Ix,
      signedIy: sign * raw.Iy,
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

    const Ix_transferred = r.Ix + r.A * dy * dy;
    const Iy_transferred = r.Iy + r.A * dx * dx;

    Ix_final += Ix_transferred;
    Iy_final += Iy_transferred;

    const s1 = step1[index];

    step3Results.push({
      shape: index + 1,
      hollow: s1?.hollow ?? "Solid",
      // own-axis MOI (unsigned magnitude for display)
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