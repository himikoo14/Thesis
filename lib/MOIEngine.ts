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

  let Ix = 0;
  let Iy = 0;

  shapes.forEach(shape => {
    if (shape.type === "Circle") {
      const r = Number(shape.radius);
      const cx = Number(shape.x);
      const cy = Number(shape.y);

      const area = Math.PI * r * r;

      totalArea += area;
      sumX += area * cx;
      sumY += area * cy;

      Ix += (Math.PI * Math.pow(r, 4)) / 4;
      Iy += (Math.PI * Math.pow(r, 4)) / 4;
    }

    // (Polygon logic can be added later)
  });

  const centroidX = totalArea !== 0 ? sumX / totalArea : 0;
  const centroidY = totalArea !== 0 ? sumY / totalArea : 0;

  return {
    area: totalArea,
    centroidX,
    centroidY,
    Ix,
    Iy,
  };
}
