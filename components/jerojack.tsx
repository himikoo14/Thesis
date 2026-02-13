"use client";

type XY = { x: string; y: string };

type ShapeData = {
  type: string;
  hollow: "Hollow" | "Solid";  // ✅ ADD THIS
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
      if (n.x.trim() === "" || n.y.trim() === "") return;

      const x = Number(n.x);
      const y = Number(n.y);

      if (!isNaN(x) && !isNaN(y)) {
        points.push({ x, y });
      }
    });
  });

  // 🚨 If no valid points, render empty canvas
  if (points.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm w-full max-w-[360px] aspect-square mb-6 overflow-hidden mx-auto">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        />
      </div>
    );
  }



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
        {shapes.map((shape, si) => {
          if (shape.type !== "Polygon") return null;

          // convert valid nodes
          const validNodes = shape.nodes
            .map(n => {
              if (n.x.trim() === "" || n.y.trim() === "") return null;

              const x = Number(n.x);
              const y = Number(n.y);

              if (isNaN(x) || isNaN(y)) return null;

              return map(x, y);
            })
            .filter(Boolean);

          const isClosed =
            shape.nodes.length >= 3 &&
            shape.sides.length >= shape.nodes.length;

          return (
            <g key={si}>
              {isClosed && validNodes.length >= 3 && (
                <polygon
                  points={validNodes.map(p => `${p!.x},${p!.y}`).join(" ")}
                  fill={
                    shape.hollow === "Hollow"
                      ? "rgba(156, 163, 175, 0.5)"   // grey tint
                      : "rgba(59, 130, 246, 0.25)"   // blue solid
                  }
                  stroke={
                    shape.hollow === "Hollow"
                      ? "none"                      // ❌ no border
                      : "#111827"
                  }
                  strokeWidth={2}
                />
              )}


              {/* EDGES + DISTANCE */}
              {shape.sides.map((s, i) => {
                const A = shape.nodes[s.a];
                const B = shape.nodes[s.b];

                if (
                  A.x.trim() === "" ||
                  A.y.trim() === "" ||
                  B.x.trim() === "" ||
                  B.y.trim() === ""
                ) return null;

                const ax = Number(A.x);
                const ay = Number(A.y);
                const bx = Number(B.x);
                const by = Number(B.y);

                if ([ax, ay, bx, by].some(isNaN)) return null;

                const p1 = map(ax, ay);
                const p2 = map(bx, by);

                // ✅ distance calculation (real coordinates, not scaled)
                const distance = Math.sqrt(
                  Math.pow(bx - ax, 2) + Math.pow(by - ay, 2)
                );


                // ✅ midpoint (scaled for display)
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;

                return (
                  <g key={i}>
                    {/* line */}
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={
                        shape.hollow === "Hollow"
                          ? "#000000"
                          : "#111827"
                      }
                      strokeWidth={3}
                      strokeDasharray={
                        shape.hollow === "Hollow"
                          ? "8 6"
                          : "0"
                      }
                    />


                    {/* distance label */}
                    <text
                      x={midX}
                      y={midY - 18}   // 👈 move 18px above the line
                      fontSize="28"
                      fontWeight="bold"
                      fill="#000000"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >

                      {distance}
                    </text>
                  </g>
                );
              })}


              {/* NODES + LABELS */}
              {shape.nodes.map((n, i) => {
                const x = Number(n.x);
                const y = Number(n.y);
                if (isNaN(x) || isNaN(y)) return null;

                const p = map(x, y);

                // Convert index to letters A, B, C, ...
                const label = String.fromCharCode(65 + i);

                return (
                  <g key={i}>
                    {/* Node circle */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={10}
                      fill="#dc2626"
                    />

                    {/* Label */}
                    <text
                      x={p.x + 14}
                      y={p.y - 14}
                      fontSize="32"
                      fontWeight="bold"
                      fill="#111827"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}

            </g>
          );
        })}

      </svg>
    </div>
  );
}