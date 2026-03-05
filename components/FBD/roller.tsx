// roller.tsx
export default function DetailedRollerSupport({
  x,
  y,
}: {
  x: number; // center of roller
  y: number; // ground level
}) {
  const rollerRadius = 20;
  const blockWidth = 100;
  const blockHeight = 40;
  const hatchWidth = 120;
  const hatchSpacing = 8;

  return (
    <g>
      {/* Roller circle */}
      <circle
        cx={x}
        cy={y - blockHeight - rollerRadius}
        r={rollerRadius}
        fill="none"
        stroke="black"
        strokeWidth={2}
      />

      {/* Bearing block */}
      <rect
        x={x - blockWidth / 2}
        y={y - blockHeight}
        width={blockWidth}
        height={blockHeight}
        fill="none"
        stroke="black"
        strokeWidth={2}
      />

      {/* Ground line */}
      <line
        x1={x - hatchWidth / 2}
        y1={y}
        x2={x + hatchWidth / 2}
        y2={y}
        stroke="black"
        strokeWidth={2}
      />

      {/* Hatch lines */}
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={i}
          x1={x - hatchWidth / 2 + i * hatchSpacing}
          y1={y}
          x2={x - hatchWidth / 2 + i * hatchSpacing + 10}
          y2={y - 10}
          stroke="black"
          strokeWidth={1}
        />
      ))}
    </g>
  );
}