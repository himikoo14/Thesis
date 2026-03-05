// Pinned.tsx
export default function PinnedSupport({ x, y }: { x: number; y: number }) {
  const hatchWidth = 40;
  const hatchSpacing = 6;

  return (
    <g>
      {/* Support vertical line */}
      <line x1={x} y1={y - 30} x2={x} y2={y} stroke="black" strokeWidth={2} />

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
      {Array.from({ length: 6 }).map((_, i) => (
        <line
          key={i}
          x1={x - hatchWidth / 2 + i * hatchSpacing}
          y1={y}
          x2={x - hatchWidth / 2 + i * hatchSpacing + 8}
          y2={y - 8}
          stroke="black"
          strokeWidth={1}
        />
      ))}
    </g>
  );
}