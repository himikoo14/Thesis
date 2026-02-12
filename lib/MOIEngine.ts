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
      // ✅ Ignore if values are empty
      if (!shape.radius || !shape.x || !shape.y) return;

      const r = Number(shape.radius);
      const cx = Number(shape.x);
      const cy = Number(shape.y);

      // ✅ Ignore invalid numbers
      if (isNaN(r) || isNaN(cx) || isNaN(cy)) return;

      const area = Math.PI * r * r;

      totalArea += area;
      sumX += area * cx;
      sumY += area * cy;

      Ix += (Math.PI * Math.pow(r, 4)) / 4;
      Iy += (Math.PI * Math.pow(r, 4)) / 4;
    }
  });

  // ✅ If nothing computed, return plain zero
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

  return {
    area: totalArea,
    centroidX,
    centroidY,
    Ix,
    Iy,
  };
}
