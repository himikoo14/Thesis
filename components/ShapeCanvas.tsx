"use client";

type XY = { x: string; y: string };

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
  axisType?: "Centroidal" | "Custom";
  axisX?: number;
  axisY?: number;
};

/* ===================== FORMAT DISTANCE ===================== */
function formatDistance(d: number): string {
  // Up to 2 decimal places, no trailing zeros
  return parseFloat(d.toFixed(2)).toString();
}

/* ===================== ORDER NODES BY SIDES ===================== */
function orderNodesBySides(
  nodes: XY[],
  sides: { a: number; b: number }[]
): XY[] {
  if (sides.length === 0) return nodes;

  const adj: Map<number, number[]> = new Map();
  sides.forEach(({ a, b }) => {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push(b);
    adj.get(b)!.push(a);
  });

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

export default function ShapeCanvas({ shapes, axisType, axisX, axisY }: Props) {
  function getGlobalLabel(shapeIndex: number, nodeIndex: number) {
    let count = 0;
    for (let i = 0; i < shapeIndex; i++) count += shapes[i].nodes.length;
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
    if (s.type === "Polygon") {
      s.nodes.forEach(n => {
        if (n.x.trim() === "" || n.y.trim() === "") return;
        const x = Number(n.x), y = Number(n.y);
        if (!isNaN(x) && !isNaN(y)) points.push({ x, y });
      });
    }
    if (
      s.type === "Circle" ||
      s.type?.startsWith("Semi-circle") ||
      s.type?.startsWith("Quarter-circle")
    ) {
      const cx = Number(s.x), cy = Number(s.y), r = Number(s.radius);
      if ([cx, cy, r].some(isNaN)) return;
      points.push({ x: cx - r, y: cy - r });
      points.push({ x: cx + r, y: cy + r });
    }
  });

  if (points.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm w-full max-w-[400px] aspect-square mb-6 overflow-hidden mx-auto relative z-10 border border-gray-200 dark:border-gray-700">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet" />
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
  const GRID_COUNT = Math.floor((SIZE - 2 * PADDING) / GRID_STEP);

  // Center the drawing within the canvas
  const drawnW = spanX * scale;
  const drawnH = spanY * scale;
  const offsetX = (SIZE - drawnW) / 2;
  const offsetY = (SIZE - drawnH) / 2;

  const map = (x: number, y: number) => ({
    x: (x - minX) * scale + offsetX,
    y: (SIZE - offsetY) - (y - minY) * scale,
  });

  return (
    <div
      className="rounded-xl shadow-sm w-full max-w-[400px] aspect-square mb-6 overflow-hidden mx-auto relative z-10 border border-gray-200 dark:border-gray-700"
      style={{ background: "var(--canvas-bg, white)" }}
    >
      {/* Inject CSS vars for dark mode — SVG can't read Tailwind classes directly */}
      <style>{`
        @media (prefers-color-scheme: dark) {
          :root {
            --canvas-bg: #1e293b;
            --canvas-inner: #0f172a;
            --grid-minor: #1e3a5f;
            --grid-major: #334155;
          }
        }
        .dark {
          --canvas-bg: #1e293b;
          --canvas-inner: #0f172a;
          --grid-minor: #1e3a5f;
          --grid-major: #334155;
        }
      `}</style>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* ── BACKGROUND ── */}
        {/* Light mode colours are inline; dark mode overrides via CSS vars on the wrapper div */}
        <rect x={0} y={0} width={SIZE} height={SIZE} fill="var(--canvas-bg, #f8fafc)" />
        <rect x={PADDING} y={PADDING} width={SIZE - 2 * PADDING} height={SIZE - 2 * PADDING} fill="var(--canvas-inner, white)" />

        {/* ── MINOR GRID ── */}
        {Array.from({ length: GRID_COUNT + 1 }).map((_, i) => {
          const px = PADDING + i * GRID_STEP;
          const py = SIZE - (PADDING + i * GRID_STEP);
          return (
            <g key={`grid-${i}`}>
              <line x1={px} y1={PADDING} x2={px} y2={SIZE - PADDING} stroke="var(--grid-minor, #e2e8f0)" strokeWidth={1} />
              <line x1={PADDING} y1={py} x2={SIZE - PADDING} y2={py} stroke="var(--grid-minor, #e2e8f0)" strokeWidth={1} />
            </g>
          );
        })}

        {/* ── AXIS BORDER ── */}
        <rect
          x={PADDING} y={PADDING}
          width={SIZE - 2 * PADDING} height={SIZE - 2 * PADDING}
          fill="none" stroke="var(--grid-major, #cbd5e1)" strokeWidth={2}
        />

        {/* ── SHAPES ── */}
        {[...shapes]
          .map((shape, i) => ({ shape, i }))
          .sort((a, b) => {
            if (a.shape.hollow === b.shape.hollow) return 0;
            return a.shape.hollow === "Hollow" ? 1 : -1;
          })
          .map(({ shape, i: si }) => {
            // Colors — same hues but readable on both light and dark backgrounds
            // The SVG sits on top of the CSS-var-coloured rects, so we keep shape
            // colours constant (they have enough contrast on both bg shades).
            const COLOR_SOLID_FILL    = "rgba(59,130,246,0.20)";
            const COLOR_SOLID_STROKE  = "#3b82f6";
            const COLOR_HOLLOW_FILL   = "rgba(148,163,184,0.22)";
            const COLOR_HOLLOW_STROKE = "#94a3b8";
            const COLOR_NODE          = "#ef4444";
            const COLOR_LABEL         = "#e2e8f0";   // light text — readable on dark inner bg
            const COLOR_DIST          = "#f1f5f9";
            const COLOR_RADIUS        = "#4ade80";
            const COLOR_CENTER        = "#f87171";

            /* ── SEMI-CIRCLES ── */
            if (shape.type?.startsWith("Semi-circle")) {
              const cx = Number(shape.x), cy = Number(shape.y), r = Number(shape.radius);
              if (isNaN(cx) || isNaN(cy) || isNaN(r) || r <= 0) return null;

              const mapped = map(cx, cy);
              const sr = r * scale;
              const isHollow = shape.hollow === "Hollow";
              let startX = 0, startY = 0, endX = 0, endY = 0, sweep = 1;

              switch (shape.type) {
                case "Semi-circle-1": startX = mapped.x - sr; startY = mapped.y; endX = mapped.x + sr; endY = mapped.y; sweep = 1; break;
                case "Semi-circle-2": startX = mapped.x - sr; startY = mapped.y; endX = mapped.x + sr; endY = mapped.y; sweep = 0; break;
                case "Semi-circle-3": startX = mapped.x; startY = mapped.y - sr; endX = mapped.x; endY = mapped.y + sr; sweep = 0; break;
                case "Semi-circle-4": startX = mapped.x; startY = mapped.y - sr; endX = mapped.x; endY = mapped.y + sr; sweep = 1; break;
              }

              const pathData = `M ${startX} ${startY} A ${sr} ${sr} 0 0 ${sweep} ${endX} ${endY} L ${startX} ${startY} Z`;
              const midRX = (mapped.x + startX) / 2;
              const midRY = (mapped.y + startY) / 2;

              return (
                <g key={si}>
                  <path d={pathData} fill="rgba(0,0,0,0.10)" transform="translate(4,4)" />
                  <path
                    d={pathData}
                    fill={isHollow ? COLOR_HOLLOW_FILL : COLOR_SOLID_FILL}
                    stroke={isHollow ? COLOR_HOLLOW_STROKE : COLOR_SOLID_STROKE}
                    strokeWidth={2.5}
                    strokeDasharray={isHollow ? "10 6" : "0"}
                  />
                  <circle cx={mapped.x} cy={mapped.y} r={8} fill={COLOR_CENTER} stroke="white" strokeWidth={2} />
                  <text x={mapped.x + 18} y={mapped.y - 14} fontSize="22" fontWeight="700" fill={COLOR_CENTER} fontFamily="monospace">
                    C({cx}, {cy})
                  </text>
                  <line x1={mapped.x} y1={mapped.y} x2={startX} y2={startY} stroke={COLOR_RADIUS} strokeWidth={2} strokeDasharray="6 4" />
                  <text x={(mapped.x + midRX) / 2} y={(mapped.y + midRY) / 2 - 12}
                    fontSize="22" fontWeight="700" fill={COLOR_RADIUS} textAnchor="middle" fontFamily="monospace">
                    r={r}
                  </text>
                  <circle cx={startX} cy={startY} r={7} fill="#2563eb" stroke="white" strokeWidth={2} />
                  <circle cx={endX} cy={endY} r={7} fill="#2563eb" stroke="white" strokeWidth={2} />
                </g>
              );
            }

            /* ── QUARTER CIRCLES ── */
            if (shape.type?.startsWith("Quarter-circle")) {
              const cx = Number(shape.x), cy = Number(shape.y), r = Number(shape.radius);
              if (isNaN(cx) || isNaN(cy) || isNaN(r) || r <= 0) return null;

              const mapped = map(cx, cy);
              const sr = r * scale;
              const isHollow = shape.hollow === "Hollow";
              let startX = 0, startY = 0, endX = 0, endY = 0, sweep = 0;

              switch (shape.type) {
                case "Quarter-circle-1": startX = mapped.x; startY = mapped.y - sr; endX = mapped.x + sr; endY = mapped.y; sweep = 1; break;
                case "Quarter-circle-2": startX = mapped.x - sr; startY = mapped.y; endX = mapped.x; endY = mapped.y - sr; sweep = 1; break;
                case "Quarter-circle-3": startX = mapped.x; startY = mapped.y + sr; endX = mapped.x - sr; endY = mapped.y; sweep = 1; break;
                case "Quarter-circle-4": startX = mapped.x + sr; startY = mapped.y; endX = mapped.x; endY = mapped.y + sr; sweep = 1; break;
              }

              const pathData = `M ${mapped.x} ${mapped.y} L ${startX} ${startY} A ${sr} ${sr} 0 0 ${sweep} ${endX} ${endY} Z`;

              return (
                <g key={si}>
                  <path d={pathData} fill="rgba(0,0,0,0.10)" transform="translate(4,4)" />
                  <path
                    d={pathData}
                    fill={isHollow ? COLOR_HOLLOW_FILL : COLOR_SOLID_FILL}
                    stroke={isHollow ? COLOR_HOLLOW_STROKE : COLOR_SOLID_STROKE}
                    strokeWidth={2.5}
                    strokeDasharray={isHollow ? "10 6" : "0"}
                  />
                  <circle cx={mapped.x} cy={mapped.y} r={8} fill={COLOR_CENTER} stroke="white" strokeWidth={2} />
                  <line x1={mapped.x} y1={mapped.y} x2={startX} y2={startY} stroke={COLOR_RADIUS} strokeWidth={2} strokeDasharray="6 4" />
                  <line x1={mapped.x} y1={mapped.y} x2={endX} y2={endY} stroke={COLOR_RADIUS} strokeWidth={2} strokeDasharray="6 4" />
                  <rect x={(mapped.x + startX) / 2 - 4} y={(mapped.y + startY) / 2 - 30} width={80} height={26} rx={5} fill="rgba(0,0,0,0.45)" />
                  <text x={(mapped.x + startX) / 2} y={(mapped.y + startY) / 2 - 14}
                    fontSize="22" fontWeight="700" fill={COLOR_RADIUS} textAnchor="middle" fontFamily="monospace">
                    r={r}
                  </text>
                </g>
              );
            }

            /* ── CIRCLE ── */
            if (shape.type === "Circle") {
              const cx = Number(shape.x), cy = Number(shape.y), r = Number(shape.radius);
              if (isNaN(cx) || isNaN(cy) || isNaN(r) || r <= 0) return null;

              const mc = map(cx, cy);
              const sr = r * scale;
              const isHollow = shape.hollow === "Hollow";

              return (
                <g key={si}>
                  <circle cx={mc.x + 4} cy={mc.y + 4} r={sr} fill="rgba(0,0,0,0.10)" />
                  <circle
                    cx={mc.x} cy={mc.y} r={sr}
                    fill={isHollow ? COLOR_HOLLOW_FILL : COLOR_SOLID_FILL}
                    stroke={isHollow ? COLOR_HOLLOW_STROKE : COLOR_SOLID_STROKE}
                    strokeWidth={2.5}
                    strokeDasharray={isHollow ? "10 6" : "0"}
                  />
                  <line x1={mc.x} y1={mc.y} x2={mc.x + sr} y2={mc.y} stroke={COLOR_RADIUS} strokeWidth={2} strokeDasharray="6 4" />
                  <rect x={mc.x + sr / 2 - 38} y={mc.y - 30} width={76} height={26} rx={5} fill="rgba(0,0,0,0.45)" />
                  <text x={mc.x + sr / 2} y={mc.y - 13} fontSize="22" fontWeight="700" fill={COLOR_RADIUS} textAnchor="middle" fontFamily="monospace">
                    r={r}
                  </text>
                  <circle cx={mc.x} cy={mc.y} r={8} fill={COLOR_CENTER} stroke="white" strokeWidth={2} />
                  <rect x={mc.x + 12} y={mc.y - 34} width={140} height={28} rx={6} fill="rgba(0,0,0,0.45)" />
                  <text x={mc.x + 20} y={mc.y - 16} fontSize="22" fontWeight="700" fill={COLOR_CENTER} fontFamily="monospace">
                    C({cx}, {cy})
                  </text>
                </g>
              );
            }

            /* ── POLYGON ── */
            if (shape.type !== "Polygon") return null;

            const orderedNodes = orderNodesBySides(shape.nodes, shape.sides);
            const isHollow = shape.hollow === "Hollow";

            const validMapped = orderedNodes
              .map(n => {
                if (!n || n.x.trim() === "" || n.y.trim() === "") return null;
                const x = Number(n.x), y = Number(n.y);
                if (isNaN(x) || isNaN(y)) return null;
                return { ...map(x, y), realX: x, realY: y };
              })
              .filter((p): p is { x: number; y: number; realX: number; realY: number } => p !== null);

            const isClosed = shape.nodes.length >= 3 && shape.sides.length >= shape.nodes.length;

            return (
              <g key={si}>
                {isClosed && validMapped.length >= 3 && (
                  <polygon
                    points={validMapped.map(p => `${p.x + 4},${p.y + 4}`).join(" ")}
                    fill="rgba(0,0,0,0.10)"
                  />
                )}
                {isClosed && validMapped.length >= 3 && (
                  <polygon
                    points={validMapped.map(p => `${p.x},${p.y}`).join(" ")}
                    fill={isHollow ? COLOR_HOLLOW_FILL : COLOR_SOLID_FILL}
                    stroke={isHollow ? COLOR_HOLLOW_STROKE : COLOR_SOLID_STROKE}
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                  />
                )}

                {/* EDGES + DISTANCE LABELS */}
                {shape.sides.map((s, i) => {
                  const A = shape.nodes[s.a];
                  const B = shape.nodes[s.b];
                  if (A.x.trim() === "" || A.y.trim() === "" || B.x.trim() === "" || B.y.trim() === "") return null;
                  const ax = Number(A.x), ay = Number(A.y), bx = Number(B.x), by = Number(B.y);
                  if ([ax, ay, bx, by].some(isNaN)) return null;

                  const p1 = map(ax, ay);
                  const p2 = map(bx, by);
                  const distance = Math.sqrt(Math.pow(bx - ax, 2) + Math.pow(by - ay, 2));
                  const label = formatDistance(distance);

                  const midX = (p1.x + p2.x) / 2;
                  const midY = (p1.y + p2.y) / 2;
                  const dx = p2.x - p1.x, dy = p2.y - p1.y;
                  const len = Math.sqrt(dx * dx + dy * dy) || 1;
                  const nx = -dy / len, ny = dx / len;
                  const offsetX = midX + nx * 22;
                  const offsetY = midY + ny * 22;

                  return (
                    <g key={i}>
                      {!isClosed && (
                        <line
                          x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                          stroke={isHollow ? COLOR_HOLLOW_STROKE : COLOR_SOLID_STROKE}
                          strokeWidth={2.5}
                          strokeDasharray={isHollow ? "10 6" : "0"}
                          strokeLinecap="round"
                        />
                      )}
                      <text
                        x={offsetX} y={offsetY + 3}
                        fontSize="22" fontWeight="700" fill={COLOR_DIST}
                        textAnchor="middle" dominantBaseline="middle"
                        fontFamily="monospace"
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}

                {/* NODE DOTS + LABELS */}
                {shape.nodes.map((n, i) => {
                  const x = Number(n.x), y = Number(n.y);
                  if (isNaN(x) || isNaN(y)) return null;
                  const p = map(x, y);
                  const label = getGlobalLabel(si, i);

                  return (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r={13} fill={COLOR_NODE} fillOpacity={0.25} />
                      <circle cx={p.x} cy={p.y} r={8} fill={COLOR_NODE} stroke="white" strokeWidth={2.5} />
                      <text x={p.x + 18} y={p.y - 13} fontSize="24" fontWeight="800" fill={COLOR_LABEL} fontFamily="monospace">
                        {label}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

        {/* ── CUSTOM AXIS ── */}
        {axisType === "Custom" && axisX !== undefined && axisY !== undefined && (() => {
          const p = map(axisX, axisY);
          return (
            <g>
              <line x1={PADDING} y1={p.y} x2={SIZE - PADDING} y2={p.y} stroke="#f87171" strokeWidth={2.5} strokeDasharray="12 7" />
              <line x1={p.x} y1={PADDING} x2={p.x} y2={SIZE - PADDING} stroke="#60a5fa" strokeWidth={2.5} strokeDasharray="12 7" />
              <circle cx={p.x} cy={p.y} r={9} fill="#e2e8f0" stroke="white" strokeWidth={2} />
              <rect x={p.x + 12} y={p.y - 34} width={120} height={28} rx={6} fill="rgba(0,0,0,0.45)" />
              <text x={p.x + 18} y={p.y - 16} fontSize="22" fontWeight="700" fill="#f1f5f9" fontFamily="monospace">
                ({axisX}, {axisY})
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}