"use client";

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
  type: string;
  hollow: "Hollow" | "Solid";
  nodes: XY[];
  sides: { a: number; b: number }[];
  radius?: string;
  x?: string;
  y?: string;
};

type Props = {
  shapes: ShapeData[];
};

/* ===================== ORDER NODES BY SIDES ===================== */
function orderNodesBySides(
  nodes: XY[],
  sides: { a: number; b: number }[]
): XY[] {
  if (sides.length === 0) return nodes;

  // Build adjacency list
  const adj: Map<number, number[]> = new Map();
  sides.forEach(({ a, b }) => {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push(b);
    adj.get(b)!.push(a);
  });

  // Walk the polygon boundary starting from first side
  const ordered: number[] = [];
  const visited = new Set<number>();
  let current = sides[0].a;

  while (ordered.length < sides.length) {
    ordered.push(current);
    visited.add(current);
    const neighbors = adj.get(current) || [];
    const next = neighbors.find(n => !visited.has(n));
    if (next === undefined) break;
    current = next;
  }

  return ordered.map(i => nodes[i]);
}

export default function ShapeCanvas({ shapes }: Props) {
  function getGlobalLabel(shapeIndex: number, nodeIndex: number) {
    let count = 0;

    for (let i = 0; i < shapeIndex; i++) {
      count += shapes[i].nodes.length;
    }

    let globalIndex = count + nodeIndex + 1;

    let label = "";
    while (globalIndex > 0) {
      const remainder = (globalIndex - 1) % 26;
      label = String.fromCharCode(65 + remainder) + label;
      globalIndex = Math.floor((globalIndex - 1) / 26);
    }

    return label;
  }

  const SIZE = 1000;
  const PADDING = 80;

  const points: { x: number; y: number }[] = [];

  shapes.forEach(s => {

    // ✅ POLYGON
    if (s.type === "Polygon") {
      s.nodes.forEach(n => {
        if (n.x.trim() === "" || n.y.trim() === "") return;

        const x = Number(n.x);
        const y = Number(n.y);

        if (!isNaN(x) && !isNaN(y)) {
          points.push({ x, y });
        }
      });
    }

    // ✅ CIRCLE
    if (s.type === "Circle") {
      const cx = Number(s.x);
      const cy = Number(s.y);
      const r = Number(s.radius);

      if ([cx, cy, r].some(isNaN)) return;

      points.push({ x: cx - r, y: cy - r });
      points.push({ x: cx + r, y: cy + r });
    }

    // ✅ SEMI-CIRCLE
    if (s.type?.startsWith("Semi-circle")) {
      const cx = Number(s.x);
      const cy = Number(s.y);
      const r = Number(s.radius);

      if ([cx, cy, r].some(isNaN)) return;

      points.push({ x: cx - r, y: cy - r });
      points.push({ x: cx + r, y: cy + r });
    }

    // ✅ QUARTER CIRCLE
    if (s.type?.startsWith("Quarter-circle")) {
      const cx = Number(s.x);
      const cy = Number(s.y);
      const r = Number(s.radius);

      if ([cx, cy, r].some(isNaN)) return;

      points.push({ x: cx - r, y: cy - r });
      points.push({ x: cx + r, y: cy + r });
    }
  });

  // 🚨 If no valid points, render empty canvas
  if (points.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm w-full max-w-[360px] aspect-square mb-6 overflow-hidden mx-auto relative z-10">
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

  const GRID_STEP = scale;

  const map = (x: number, y: number) => ({
    x: (x - minX) * scale + PADDING,
    y: SIZE - ((y - minY) * scale + PADDING),
  });

  const GRID_COUNT = Math.floor((SIZE - 2 * PADDING) / GRID_STEP);

  return (
    <div className="bg-white rounded-xl shadow-sm w-full max-w-[360px] aspect-square mb-6 overflow-hidden mx-auto relative z-10">
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
              <line x1={px} y1={0} x2={px} y2={SIZE} stroke="#0f1011" />
              <line x1={0} y1={py} x2={SIZE} y2={py} stroke="#0f1011" />
            </g>
          );
        })}

        {/* SHAPES */}
        {shapes.map((shape, si) => {

          // ======================
          // 🟣 SEMICIRCLES
          // ======================
          if (shape.type?.startsWith("Semi-circle")) {
            const cx = Number(shape.x);
            const cy = Number(shape.y);
            const r = Number(shape.radius);

            if (isNaN(cx) || isNaN(cy) || isNaN(r) || r <= 0) return null;

            const mapped = map(cx, cy);
            const sr = r * scale;

            let startX = 0, startY = 0, endX = 0, endY = 0, sweep = 1;

            switch (shape.type) {
              case "Semi-circle-1":
                startX = mapped.x - sr; startY = mapped.y;
                endX = mapped.x + sr; endY = mapped.y;
                sweep = 1; break;
              case "Semi-circle-2":
                startX = mapped.x - sr; startY = mapped.y;
                endX = mapped.x + sr; endY = mapped.y;
                sweep = 0; break;
              case "Semi-circle-3":
                startX = mapped.x; startY = mapped.y - sr;
                endX = mapped.x; endY = mapped.y + sr;
                sweep = 0; break;
              case "Semi-circle-4":
                startX = mapped.x; startY = mapped.y - sr;
                endX = mapped.x; endY = mapped.y + sr;
                sweep = 1; break;
            }

            const pathData = `M ${startX} ${startY} A ${sr} ${sr} 0 0 ${sweep} ${endX} ${endY} L ${startX} ${startY} Z`;

            return (
              <g key={si}>
                <path
                  d={pathData}
                  fill={shape.hollow === "Hollow" ? "rgba(156,163,175,0.5)" : "rgba(59,130,246,0.3)"}
                  stroke="#111827"
                  strokeWidth={3}
                  strokeDasharray={shape.hollow === "Hollow" ? "8 6" : "0"}
                />
                <circle cx={mapped.x} cy={mapped.y} r={10} fill="#dc2626" />
                <circle cx={startX} cy={startY} r={8} fill="#2563eb" />
                <circle cx={endX} cy={endY} r={8} fill="#2563eb" />
                <line x1={mapped.x} y1={mapped.y} x2={startX} y2={startY} stroke="#16a34a" strokeWidth={3} />
                <text x={(mapped.x + startX) / 2} y={(mapped.y + startY) / 2 - 12}
                  fontSize="28" fontWeight="bold" fill="#16a34a" textAnchor="middle">
                  r = {r}
                </text>
              </g>
            );
          }

          // ======================
          // 🟠 QUARTER CIRCLES
          // ======================
          if (shape.type?.startsWith("Quarter-circle")) {
            const cx = Number(shape.x);
            const cy = Number(shape.y);
            const r = Number(shape.radius);

            if (isNaN(cx) || isNaN(cy) || isNaN(r) || r <= 0) return null;

            const mapped = map(cx, cy);
            const sr = r * scale;

            let startX = 0, startY = 0, endX = 0, endY = 0, sweep = 0;

            switch (shape.type) {
              case "Quarter-circle-1":
                startX = mapped.x; startY = mapped.y - sr;
                endX = mapped.x + sr; endY = mapped.y;
                sweep = 1; break;
              case "Quarter-circle-2":
                startX = mapped.x - sr; startY = mapped.y;
                endX = mapped.x; endY = mapped.y - sr;
                sweep = 1; break;
              case "Quarter-circle-3":
                startX = mapped.x; startY = mapped.y + sr;
                endX = mapped.x - sr; endY = mapped.y;
                sweep = 1; break;
              case "Quarter-circle-4":
                startX = mapped.x + sr; startY = mapped.y;
                endX = mapped.x; endY = mapped.y + sr;
                sweep = 1; break;
            }

            const pathData = `M ${mapped.x} ${mapped.y} L ${startX} ${startY} A ${sr} ${sr} 0 0 ${sweep} ${endX} ${endY} Z`;

            return (
              <g key={si}>
                <path
                  d={pathData}
                  fill={shape.hollow === "Hollow" ? "rgba(156,163,175,0.5)" : "rgba(59,130,246,0.3)"}
                  stroke="#111827"
                  strokeWidth={3}
                  strokeDasharray={shape.hollow === "Hollow" ? "8 6" : "0"}
                />
                <circle cx={mapped.x} cy={mapped.y} r={10} fill="#dc2626" />
                <line x1={mapped.x} y1={mapped.y} x2={startX} y2={startY} stroke="#16a34a" strokeWidth={3} />
                <line x1={mapped.x} y1={mapped.y} x2={endX} y2={endY} stroke="#16a34a" strokeWidth={3} />
                <text x={(mapped.x + startX) / 2} y={(mapped.y + startY) / 2 - 12}
                  fontSize="28" fontWeight="bold" fill="#16a34a" textAnchor="middle">
                  r = {r}
                </text>
              </g>
            );
          }

          // ======================
          // 🔵 CIRCLE
          // ======================
          if (shape.type === "Circle") {
            const cx = Number(shape.x);
            const cy = Number(shape.y);
            const r = Number(shape.radius);

            if ([cx, cy, r].some(isNaN)) return null;

            const mappedCenter = map(cx, cy);
            const scaledRadius = r * scale;

            return (
              <g key={si}>
                <circle
                  cx={mappedCenter.x}
                  cy={mappedCenter.y}
                  r={scaledRadius}
                  fill={shape.hollow === "Hollow" ? "rgba(156, 163, 175, 0.5)" : "rgba(59, 130, 246, 0.25)"}
                  stroke="#111827"
                  strokeWidth={3}
                  strokeDasharray={shape.hollow === "Hollow" ? "8 6" : "0"}
                />
                <text
                  x={mappedCenter.x}
                  y={mappedCenter.y - scaledRadius - 20}
                  fontSize="28" fontWeight="bold" fill="#16a34a" textAnchor="middle">
                  r = {r}
                </text>
              </g>
            );
          }

          // ======================
          // 🔷 POLYGON
          // ======================
          if (shape.type !== "Polygon") return null;

          // ✅ Order nodes by sides for correct winding order (no angle sort)
          // Pass the full nodes array so indices in sides still match
          const orderedNodes = orderNodesBySides(shape.nodes, shape.sides);

          const validMapped = orderedNodes
            .map(n => {
              if (!n || n.x.trim() === "" || n.y.trim() === "") return null;
              const x = Number(n.x);
              const y = Number(n.y);
              if (isNaN(x) || isNaN(y)) return null;
              return { ...map(x, y), realX: x, realY: y };
            })
            .filter((p): p is { x: number; y: number; realX: number; realY: number } => p !== null);

          const isClosed =
            shape.nodes.length >= 3 &&
            shape.sides.length >= shape.nodes.length;

          return (
            <g key={si}>
              {isClosed && validMapped.length >= 3 && (
                <polygon
                  points={validMapped.map(p => `${p.x},${p.y}`).join(" ")}
                  fill={shape.hollow === "Hollow" ? "rgba(156, 163, 175, 0.5)" : "rgba(59, 130, 246, 0.25)"}
                  stroke={shape.hollow === "Hollow" ? "none" : "#111827"}
                  strokeWidth={2}
                />
              )}

              {/* EDGES + DISTANCE */}
              {shape.sides.map((s, i) => {
                const A = shape.nodes[s.a];
                const B = shape.nodes[s.b];

                if (
                  A.x.trim() === "" || A.y.trim() === "" ||
                  B.x.trim() === "" || B.y.trim() === ""
                ) return null;

                const ax = Number(A.x), ay = Number(A.y);
                const bx = Number(B.x), by = Number(B.y);

                if ([ax, ay, bx, by].some(isNaN)) return null;

                const p1 = map(ax, ay);
                const p2 = map(bx, by);

                const distance = Math.sqrt(
                  Math.pow(bx - ax, 2) + Math.pow(by - ay, 2)
                );

                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;

                return (
                  <g key={i}>
                    <line
                      x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                      stroke={shape.hollow === "Hollow" ? "#000000" : "#111827"}
                      strokeWidth={3}
                      strokeDasharray={shape.hollow === "Hollow" ? "8 6" : "0"}
                    />
                    <text
                      x={midX} y={midY - 18}
                      fontSize="28" fontWeight="bold" fill="#000000"
                      textAnchor="middle" dominantBaseline="middle">
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
                const label = getGlobalLabel(si, i);

                return (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r={10} fill="#dc2626" />
                    <text x={p.x + 14} y={p.y - 14} fontSize="32" fontWeight="bold" fill="#111827">
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