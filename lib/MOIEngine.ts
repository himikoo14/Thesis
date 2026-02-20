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

  const step1: any[] = [];
  const step3: any[] = [];

  /* 🔷 Helper Functions INSIDE computeMOI */

  function computePolygon(shape: ShapeData): ShapeResult | null {
    if (!shape.nodes || shape.nodes.length < 3) return null;

    const pts = shape.nodes.map(p => ({
      x: Number(p.x),
      y: Number(p.y),
    }));

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

    // Save orientation sign
    const orientation = Math.sign(A) || 1;

    // Make area positive
    A = Math.abs(A);

    // Centroid (still uses signed area in denominator)
    Cx /= (6 * orientation * A);
    Cy /= (6 * orientation * A);

    // MOI
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
    const d = (4 * r) / (3 * Math.PI);

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

    if (shape.type === "Quarter-circle-1") { Cx += d; Cy += d; }
    if (shape.type === "Quarter-circle-2") { Cx -= d; Cy += d; }
    if (shape.type === "Quarter-circle-3") { Cx -= d; Cy -= d; }
    if (shape.type === "Quarter-circle-4") { Cx += d; Cy -= d; }

    const Ix = (Math.PI * r ** 4) / 16;
    const Iy = Ix;

    return { A, Cx, Cy, Ix, Iy };
  }

  /* 🔷 MAIN CALCULATION */

  const results: ShapeResult[] = [];

  shapes.forEach(shape => {
    let result: ShapeResult | null = null;

    if (shape.type === "Polygon") result = computePolygon(shape);
    else if (shape.type === "Circle") result = computeCircle(shape);
    else if (shape.type.startsWith("Semi")) result = computeSemiCircle(shape);
    else if (shape.type.startsWith("Quarter")) result = computeQuarterCircle(shape);

    if (!result) return;

    const sign = shape.hollow === "Hollow" ? -1 : 1;

    results.push({
      A: sign * result.A,
      Cx: result.Cx,
      Cy: result.Cy,
      Ix: sign * result.Ix,
      Iy: sign * result.Iy,
    });
  });

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
      centroid: {
        totalArea: 0,
        centroidX: 0,
        centroidY: 0,
      },
      step3: [],
      final: {
        Ix: 0,
        Iy: 0,
      },
    };
  }


  const centroidX = sumX / totalArea;
  const centroidY = sumY / totalArea;

  let Ix_final = 0;
  let Iy_final = 0;

  const step3Results: any[] = [];

  results.forEach((r, index) => {

    const dx = r.Cx - centroidX;
    const dy = r.Cy - centroidY;

    // Parallel Axis Theorem
    const Ix_shifted = r.Ix + r.A * dy * dy;
    const Iy_shifted = r.Iy + r.A * dx * dx;

    Ix_final += Ix_shifted;
    Iy_final += Iy_shifted;

    step3Results.push({
      shape: index + 1,
      Ix_centroid: r.Ix,
      Iy_centroid: r.Iy,
      dx,
      dy,
      Ix_shifted,
      Iy_shifted,
    });
  });


  return {
    step1: [],
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
