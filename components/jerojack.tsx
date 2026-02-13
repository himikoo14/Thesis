"use client";

type XY = { x: string; y: string };

type ShapeData = {
  type: string;
  hollow: "Hollow" | "Solid";
  nodes: XY[];
  sides: { a: number; b: number }[];
  radius?: string;
};

type Props = {
  shapes: ShapeData[];
};

export default function ShapeCanvas({ shapes }: Props) {
  const SIZE = 1000;
  const PADDING = 80;

  const points: { x: number; y: number }[] = [];

  // ==============================
  // 📌 COLLECT ALL BOUNDING POINTS
  // ==============================
  shapes.forEach((s) => {
    // Polygon
    if (s.type === "Polygon") {
      s.nodes.forEach((n) => {
        const x = Number(n.x);
        const y = Number(n.y);
        if (!isNaN(x) && !isNaN(y)) points.push({ x, y });
      });
    }

    // circle + Semicircle
    if (s.type === "circle" || s.type?.startsWith("Semi-circle")) {
      const center = s.nodes[0];
      if (!center) return;

      const cx = Number(center.x);
      const cy = Number(center.y);
      const r = Number(s.radius ?? 0);
      if (isNaN(cx) || isNaN(cy) || r <= 0) return;


      points.push({ x: cx - r, y: cy - r });
      points.push({ x: cx + r, y: cy + r });
    }
  });
  console.log("POINTS:", points);

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

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

  const GRID_STEP = scale;

  const map = (x: number, y: number) => ({
    x: (x - minX) * scale + PADDING,
    y: SIZE - ((y - minY) * scale + PADDING),
  });

  const GRID_COUNT = Math.floor((SIZE - 2 * PADDING) / GRID_STEP);

  // ==============================
  // 🎨 RENDER
  // ==============================
  return (
    <div className="bg-white rounded-xl shadow-sm w-full max-w-[360px] aspect-square mb-6 overflow-hidden mx-auto">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full">
        {/* GRID */}
        {Array.from({ length: GRID_COUNT + 1 }).map((_, i) => {
          const px = PADDING + i * GRID_STEP;
          const py = SIZE - (PADDING + i * GRID_STEP);

          return (
            <g key={i}>
              <line x1={px} y1={0} x2={px} y2={SIZE} stroke="#0f1011" />
              <line x1={0} y1={py} x2={SIZE} y2={py} stroke="#0f1011" />
            </g>
          );
        })}

        {/* SHAPES */}
        {shapes.map((shape, si) => {
          const isHollow = shape.hollow === "Hollow";

          // ======================
          if (shape.type?.startsWith("Semi-circle")) {
            const center = shape.nodes[0];
            if (!center) return null;

            const cx = Number(center.x);
            const cy = Number(center.y);
            const r = parseFloat(shape.radius ?? "");

            if (isNaN(cx) || isNaN(cy) || isNaN(r)) return;
            if (r <= 0) return;


            const mapped = map(cx, cy);
            const sr = r * scale;

            let startX = 0;
            let startY = 0;
            let endX = 0;
            let endY = 0;
            let sweep = 0;

            switch (shape.type) {

              case "Semi-circle-1": // OPEN UP (in math)
                startX = mapped.x - sr;
                startY = mapped.y;
                endX = mapped.x + sr;
                endY = mapped.y;
                sweep = 1;  // 🔥 changed
                break;

              case "Semi-circle-2": // OPEN DOWN
                startX = mapped.x - sr;
                startY = mapped.y;
                endX = mapped.x + sr;
                endY = mapped.y;
                sweep = 0;  // 🔥 changed
                break;

              case "Semi-circle-3": // OPEN RIGHT
                startX = mapped.x;
                startY = mapped.y - sr;
                endX = mapped.x;
                endY = mapped.y + sr;
                sweep = 0;  // 🔥 changed
                break;

              case "Semi-circle-4": // OPEN LEFT
                startX = mapped.x;
                startY = mapped.y - sr;
                endX = mapped.x;
                endY = mapped.y + sr;
                sweep = 1;  // 🔥 changed
                break;

              default:
                return null;
            }

            const pathData = `
    M ${startX} ${startY}
    A ${sr} ${sr} 0 0 ${sweep} ${endX} ${endY}
    L ${startX} ${startY}
    Z
  `;

            return (
              <g key={si}>
                <path
                  d={pathData}
                  fill={
                    shape.hollow === "Hollow"
                      ? "none"
                      : "rgba(59,130,246,0.25)"
                  }
                  stroke="#111827"
                  strokeWidth={3}
                  strokeDasharray={
                    shape.hollow === "Hollow" ? "8 6" : "0"
                  }
                />
              </g>
            );
          }


          // ======================
          // 🔵 circle
          // ======================
          if (shape.type === "circle") {
            const center = shape.nodes[0];
            if (!center) return null;

            const cx = Number(center.x);
            const cy = Number(center.y);
            const r = parseFloat(shape.radius ?? "");

            if (isNaN(cx) || isNaN(cy) || isNaN(r)) return null;
            if (r <= 0) return null;


            const mapped = map(cx, cy);
            const sr = r * scale;

            return (
              <g key={si}>
                <circle
                  cx={mapped.x}
                  cy={mapped.y}
                  r={sr}
                  fill={
                    isHollow
                      ? "rgba(156,163,175,0.5)"
                      : "rgba(59,130,246,0.25)"
                  }
                  stroke="#111827"
                  strokeWidth={3}
                  strokeDasharray={isHollow ? "8 6" : "0"}
                />
                <text
                  x={mapped.x}
                  y={mapped.y - sr - 20}
                  fontSize="28"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  r = {r}
                </text>
              </g>
            );
          }

          // ======================
          // 🔷 POLYGON
          // ======================
          if (shape.type !== "Polygon") return null;

          const validNodes = shape.nodes
            .map((n) => {
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
                  points={validNodes.map((p) => `${p!.x},${p!.y}`).join(" ")}
                  fill={
                    isHollow
                      ? "rgba(156,163,175,0.5)"
                      : "rgba(59,130,246,0.25)"
                  }
                  stroke={isHollow ? "none" : "#111827"}
                  strokeWidth={2}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
