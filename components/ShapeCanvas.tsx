"use client";

type XY = { x: string; y: string };

type ShapeData = {
  type: string;
  nodes: XY[];
  sides: { a: number; b: number }[];
};

type Props = {
  shapes: ShapeData[];
};

export default function ShapeCanvas({ shapes }: Props) {
  const SIZE = 1000;
  const PADDING = 80;

  const points: { x: number; y: number }[] = [];

  shapes.forEach(s => {
    if (s.type !== "Polygon") return;
    s.nodes.forEach(n => {
      const x = Number(n.x);
      const y = Number(n.y);
      if (!isNaN(x) && !isNaN(y)) points.push({ x, y });
    });
  });

  if (points.length === 0) points.push({ x: 0, y: 0 });

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);

  const minX = Math.floor(Math.min(...xs));
  const maxX = Math.ceil(Math.max(...xs));
  const minY = Math.floor(Math.min(...ys));
  const maxY = Math.ceil(Math.max(...ys));

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const scale = Math.min(
    (SIZE - 2 * PADDING) / spanX,
    (SIZE - 2 * PADDING) / spanY
  );

  const GRID_STEP = scale; // ✅ 1 unit = 1 grid

  const map = (x: number, y: number) => ({
    x: (x - minX) * scale + PADDING,
    y: SIZE - ((y - minY) * scale + PADDING),
  });

  // how many grids fit across drawable area
  const GRID_COUNT = Math.floor((SIZE - 2 * PADDING) / GRID_STEP);

  return (
    <div className="bg-white rounded-xl shadow-sm w-full max-w-[360px] aspect-square mb-6 overflow-hidden mx-auto">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* GRID */}
        {Array.from({ length: GRID_COUNT + 1 }).map((_, i) => {
          const px = PADDING + i * GRID_STEP;
          const py = SIZE - (PADDING + i * GRID_STEP);

          return (
            <g key={i}>
              {/* vertical */}
              <line
                x1={px}
                y1={0}
                x2={px}
                y2={SIZE}
                stroke="#0f1011"
              />
              {/* horizontal */}
              <line
                x1={0}
                y1={py}
                x2={SIZE}
                y2={py}
                stroke="#0f1011"
              />
            </g>
          );
        })}

        {/* SHAPES */}
        {shapes.map((shape, si) => (
          <g key={si}>
            {shape.sides.map((s, i) => {
              const A = shape.nodes[s.a];
              const B = shape.nodes[s.b];

              const ax = Number(A.x);
              const ay = Number(A.y);
              const bx = Number(B.x);
              const by = Number(B.y);

              if ([ax, ay, bx, by].some(isNaN)) return null;

              const p1 = map(ax, ay);
              const p2 = map(bx, by);

              return (
                <line
                  key={i}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#111827"
                  strokeWidth={3}
                />
              );
            })}

            {shape.nodes.map((n, i) => {
              const x = Number(n.x);
              const y = Number(n.y);
              if (isNaN(x) || isNaN(y)) return null;

              const p = map(x, y);
              return (
                <circle key={i} cx={p.x} cy={p.y} r={10} fill="#dc2626" />
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}
