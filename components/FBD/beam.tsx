"use client";

export default function Beam({
  x,
  y,
  length,
  height = 40,
  stroke = "white",
}: {
  x: number;
  y: number;
  length: number;
  height?: number;
  stroke?: string;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={length}
      height={height}
      rx={height / 2} // rounded corners
      ry={height / 2}
      fill="none"
      stroke={stroke}
      strokeWidth={2}
    />
  );
}