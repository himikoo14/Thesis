"use client";

type XY = { x: string; y: string };

type ShapeData = {
  type: string;
  hollow: "Hollow" | "Solid";
  nodes: XY[];
  sides: { a: number; b: number }[];
  radius?: string;   // ✅ ADD THIS
};



type Props = {
  shapes: ShapeData[];
};

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
      const center = s.nodes[0];
      if (!center) return;

      const cx = Number(center.x);
      const cy = Number(center.y);
      const r = Number(s.radius);

      if ([cx, cy, r].some(isNaN)) return;

      // push bounding box of circle
      points.push({ x: cx - r, y: cy - r });
      points.push({ x: cx + r, y: cy + r });
    }


    // ✅ 🔴 ADD THIS BLOCK RIGHT HERE
    if (s.type?.startsWith("Semi-circle")) {
      const center = s.nodes[0];
      if (!center) return;

      const cx = Number(center.x);
      const cy = Number(center.y);
      const r = Number(s.radius);

      if ([cx, cy, r].some(isNaN)) return;

      // Always use full circular bounding box
      points.push({ x: cx - r, y: cy - r });
      points.push({ x: cx + r, y: cy + r });
    }
    // ✅ QUARTER CIRCLE
    if (s.type?.startsWith("Quarter-circle")) {
      const center = s.nodes[0];
      if (!center) return;

      const cx = Number(center.x);
      const cy = Number(center.y);
      const r = Number(s.radius);

      if ([cx, cy, r].some(isNaN)) return;

      // Always use full circular bounding box (stable scaling)
      points.push({ x: cx - r, y: cy - r });
      points.push({ x: cx + r, y: cy + r });
    }



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

          // ======================
          // 🟣 SEMICIRCLES
          // ======================
          if (shape.type?.startsWith("Semi-circle")) {
            const center = shape.nodes[0];
            if (!center) return null;

            const cx = Number(center.x);
            const cy = Number(center.y);
            const r = Number(shape.radius);

            if (isNaN(cx) || isNaN(cy) || isNaN(r) || r <= 0) return null;

            const mapped = map(cx, cy);
            const sr = r * scale;

            let startX = 0;
            let startY = 0;
            let endX = 0;
            let endY = 0;
            let sweep = 1;

            switch (shape.type) {
              case "Semi-circle-1": // UP
                startX = mapped.x - sr;
                startY = mapped.y;
                endX = mapped.x + sr;
                endY = mapped.y;
                sweep = 1;
                break;

              case "Semi-circle-2": // DOWN
                startX = mapped.x - sr;
                startY = mapped.y;
                endX = mapped.x + sr;
                endY = mapped.y;
                sweep = 0;
                break;

              case "Semi-circle-3": // RIGHT
                startX = mapped.x;
                startY = mapped.y - sr;
                endX = mapped.x;
                endY = mapped.y + sr;
                sweep = 0;   // ✅ FIXED
                break;


              case "Semi-circle-4": // LEFT
                startX = mapped.x;
                startY = mapped.y - sr;
                endX = mapped.x;
                endY = mapped.y + sr;
                sweep = 1;
                break;
            }

            const pathData = `
    M ${startX} ${startY}
    A ${sr} ${sr} 0 0 ${sweep} ${endX} ${endY}
    L ${startX} ${startY}
    Z
  `;

            return (
              <g key={si}>

                {/* SEMICIRCLE */}
                <path
                  d={pathData}
                  fill={
                    shape.hollow === "Hollow"
                      ? "rgba(156,163,175,0.5)"
                      : "rgba(59,130,246,0.3)"
                  }
                  stroke="#111827"
                  strokeWidth={3}
                  strokeDasharray={
                    shape.hollow === "Hollow" ? "8 6" : "0"
                  }
                />

                {/* CENTER POINT */}
                <circle
                  cx={mapped.x}
                  cy={mapped.y}
                  r={10}
                  fill="#dc2626"
                />

                {/* DIAMETER ENDPOINTS */}
                <circle cx={startX} cy={startY} r={8} fill="#2563eb" />
                <circle cx={endX} cy={endY} r={8} fill="#2563eb" />

                {/* RADIUS LINE */}
                <line
                  x1={mapped.x}
                  y1={mapped.y}
                  x2={startX}
                  y2={startY}
                  stroke="#16a34a"
                  strokeWidth={3}
                />

                {/* RADIUS LABEL */}
                <text
                  x={(mapped.x + startX) / 2}
                  y={(mapped.y + startY) / 2 - 12}
                  fontSize="28"
                  fontWeight="bold"
                  fill="#16a34a"
                  textAnchor="middle"
                >
                  r = {r}
                </text>

              </g>
            );

            {/* CENTER POINT */ }
            <circle
              cx={mapped.x}
              cy={mapped.y}
              r={10}
              fill="#dc2626"
            />

            {/* CENTER LABEL */ }
            <text
              x={mapped.x + 14}
              y={mapped.y - 14}
              fontSize="30"
              fontWeight="bold"
              fill="#111827"
            >
              C
            </text>

          }

          // ======================
          // 🟠 QUARTER CIRCLES
          // ======================
          if (shape.type?.startsWith("Quarter-circle")) {
            const center = shape.nodes[0];
            if (!center) return null;

            const cx = Number(center.x);
            const cy = Number(center.y);
            const r = Number(shape.radius);

            if (isNaN(cx) || isNaN(cy) || isNaN(r) || r <= 0) return null;

            const mapped = map(cx, cy);
            const sr = r * scale;

            let startX = 0;
            let startY = 0;
            let endX = 0;
            let endY = 0;
            let sweep = 0;

            switch (shape.type) {
              case "Quarter-circle-1": // Upper Right
                startX = mapped.x;
                startY = mapped.y - sr;
                endX = mapped.x + sr;
                endY = mapped.y;
                sweep = 1;
                break;

              case "Quarter-circle-2": // Upper Left
                startX = mapped.x - sr;
                startY = mapped.y;
                endX = mapped.x;
                endY = mapped.y - sr;
                sweep = 1;
                break;

              case "Quarter-circle-3": // Lower Left
                startX = mapped.x;
                startY = mapped.y + sr;
                endX = mapped.x - sr;
                endY = mapped.y;
                sweep = 1;
                break;

              case "Quarter-circle-4": // Lower Right
                startX = mapped.x + sr;
                startY = mapped.y;
                endX = mapped.x;
                endY = mapped.y + sr;
                sweep = 1;
                break;
            }

            const pathData = `
    M ${mapped.x} ${mapped.y}
    L ${startX} ${startY}
    A ${sr} ${sr} 0 0 ${sweep} ${endX} ${endY}
    Z
  `;

            return (
              <g key={si}>

                {/* QUARTER SHAPE */}
                <path
                  d={pathData}
                  fill={
                    shape.hollow === "Hollow"
                      ? "rgba(156,163,175,0.5)"
                      : "rgba(59,130,246,0.3)"
                  }
                  stroke="#111827"
                  strokeWidth={3}
                  strokeDasharray={
                    shape.hollow === "Hollow" ? "8 6" : "0"
                  }
                />

                {/* CENTER */}
                <circle
                  cx={mapped.x}
                  cy={mapped.y}
                  r={10}
                  fill="#dc2626"
                />

                {/* RADIUS LINES */}
                <line
                  x1={mapped.x}
                  y1={mapped.y}
                  x2={startX}
                  y2={startY}
                  stroke="#16a34a"
                  strokeWidth={3}
                />

                <line
                  x1={mapped.x}
                  y1={mapped.y}
                  x2={endX}
                  y2={endY}
                  stroke="#16a34a"
                  strokeWidth={3}
                />

                {/* RADIUS LABEL */}
                <text
                  x={(mapped.x + startX) / 2}
                  y={(mapped.y + startY) / 2 - 12}
                  fontSize="28"
                  fontWeight="bold"
                  fill="#16a34a"
                  textAnchor="middle"
                >
                  r = {r}
                </text>

              </g>
            );
          }

          // ======================
          // 🔵 CIRCLE
          // ======================
          if (shape.type === "Circle") {
            const center = shape.nodes[0];
            if (!center) return null;

            const cx = Number(center.x);
            const cy = Number(center.y);
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
                  fill={
                    shape.hollow === "Hollow"
                      ? "rgba(156, 163, 175, 0.5)"
                      : "rgba(59, 130, 246, 0.25)"
                  }
                  stroke="#111827"
                  strokeWidth={3}
                  strokeDasharray={
                    shape.hollow === "Hollow" ? "8 6" : "0"
                  }
                />

                {/* Radius Label */}
                <text
                  x={mappedCenter.x}
                  y={mappedCenter.y - scaledRadius - 20}
                  fontSize="28"
                  fontWeight="bold"
                  fill="#16a34a"
                  textAnchor="middle"
                >
                  r = {r}
                </text>
              </g>
            );
          }

          // ======================
          // 🔷 POLYGON (your original logic)
          // ======================
          if (shape.type !== "Polygon") return null;

          // convert valid nodes
          const validNodes = shape.nodes
            .map(n => {
              if (n.x.trim() === "" || n.y.trim() === "") return null;

              const x = Number(n.x);
              const y = Number(n.y);

              if (isNaN(x) || isNaN(y)) return null;

              return {
                ...map(x, y),
                realX: x,
                realY: y
              };
            })
            .filter((p): p is { x: number; y: number; realX: number; realY: number } => p !== null);;

          const cx =
            validNodes.reduce((s, p) => s + p.realX, 0) / validNodes.length;

          const cy =
            validNodes.reduce((s, p) => s + p.realY, 0) / validNodes.length;

          validNodes.sort(
            (a, b) =>
              Math.atan2(a.realY - cy, a.realX - cx) -
              Math.atan2(b.realY - cy, b.realX - cx)
          );

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
                const label = getGlobalLabel(si, i);

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
