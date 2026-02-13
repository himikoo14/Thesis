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
  sides: { a: number; b: number }[];
  radius: string;
  x: string;
  y: string;
};

export function computeMOI(shapes: ShapeData[]) {
  let totalArea = 0;
  let sumX = 0;
  let sumY = 0;

  let Ix_global = 0;
  let Iy_global = 0;

  shapes.forEach(shape => {

    /* =====================================================
       POLYGON
    ===================================================== */
    if (shape.type === "Polygon") {

      if (!shape.nodes || shape.nodes.length < 3) return;

      const pts = shape.nodes.map(p => ({
        x: Number(p.x),
        y: Number(p.y),
      }));

      if (pts.some(p => isNaN(p.x) || isNaN(p.y))) return;

      let A = 0;
      let Cx = 0;
      let Cy = 0;
      let Ix = 0;
      let Iy = 0;

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

      A = A / 2;
      if (A === 0) return;

      Cx = Cx / (6 * A);
      Cy = Cy / (6 * A);

      Ix = Ix / 12;
      Iy = Iy / 12;

      // Hollow handling
      const sign = shape.hollow === "Hollow" ? -1 : 1;

      totalArea += sign * A;
      sumX += sign * A * Cx;
      sumY += sign * A * Cy;

      Ix_global += sign * Ix;
      Iy_global += sign * Iy;
    }

    /* =====================================================
       CIRCLE
    ===================================================== */
    if (shape.type === "Circle") {

      if (!shape.radius || !shape.x || !shape.y) return;

      const r = Number(shape.radius);
      const cx = Number(shape.x);
      const cy = Number(shape.y);

      if (isNaN(r) || isNaN(cx) || isNaN(cy)) return;

      const A = Math.PI * r * r;

      const Ix = (Math.PI * Math.pow(r, 4)) / 4;
      const Iy = (Math.PI * Math.pow(r, 4)) / 4;

      const sign = shape.hollow === "Hollow" ? -1 : 1;

      totalArea += sign * A;
      sumX += sign * A * cx;
      sumY += sign * A * cy;

      Ix_global += sign * Ix;
      Iy_global += sign * Iy;
    }

  });

  /* =====================================================
     GLOBAL CENTROID
  ===================================================== */

  if (totalArea === 0) {
    return {
      area: 0,
      centroidX: 0,
      centroidY: 0,
      Ix: 0,
      Iy: 0,
    };
  }

  const centroidX = sumX / totalArea;
  const centroidY = sumY / totalArea;

  /* =====================================================
     PARALLEL AXIS THEOREM (Shift to centroid)
  ===================================================== */

  let Ix_final = 0;
  let Iy_final = 0;

  shapes.forEach(shape => {

    if (shape.type === "Polygon" && shape.nodes.length >= 3) {

      const pts = shape.nodes.map(p => ({
        x: Number(p.x),
        y: Number(p.y),
      }));

      let A = 0;
      let Cx = 0;
      let Cy = 0;
      let Ix = 0;
      let Iy = 0;

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

      A = A / 2;
      Cx = Cx / (6 * A);
      Cy = Cy / (6 * A);

      Ix = Ix / 12;
      Iy = Iy / 12;

      const sign = shape.hollow === "Hollow" ? -1 : 1;

      Ix_final += sign * (Ix + A * Math.pow(Cy - centroidY, 2));
      Iy_final += sign * (Iy + A * Math.pow(Cx - centroidX, 2));
    }

    if (shape.type === "Circle") {

      const r = Number(shape.radius);
      const cx = Number(shape.x);
      const cy = Number(shape.y);

      const A = Math.PI * r * r;
      const Ix = (Math.PI * Math.pow(r, 4)) / 4;
      const Iy = (Math.PI * Math.pow(r, 4)) / 4;

      const sign = shape.hollow === "Hollow" ? -1 : 1;

      Ix_final += sign * (Ix + A * Math.pow(cy - centroidY, 2));
      Iy_final += sign * (Iy + A * Math.pow(cx - centroidX, 2));
    }

  });

  return {
    area: totalArea,
    centroidX,
    centroidY,
    Ix: Ix_final,
    Iy: Iy_final,
  };
}
