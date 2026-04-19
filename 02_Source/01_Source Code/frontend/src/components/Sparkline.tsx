import React from "react";

type Props = {
  points: Array<{ x: string; y: number }>; // x label, y value
  width?: number;
  height?: number;
  onPointClick?: (index: number, point: { x: string; y: number }) => void;
};

export default function Sparkline({
  points,
  width = 300,
  height = 60,
  onPointClick,
}: Props) {
  if (!points || points.length === 0)
    return <svg width={width} height={height} />;

  const padding = 4;
  const w = width - padding * 2;
  const h = height - padding * 2;
  const ys = points.map((p) => p.y);
  const maxY = Math.max(...ys, 1);
  const minY = Math.min(...ys, 0);

  const stepX = w / Math.max(points.length - 1, 1);

  const coords = points.map((p, i) => {
    const x = padding + i * stepX;
    const y = padding + h - ((p.y - minY) / (maxY - minY || 1)) * h;
    return { x, y };
  });

  const pathD = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
    .join(" ");

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <path d={pathD} fill="none" stroke="#1890ff" strokeWidth={2} />
      {coords.map((c, i) => (
        <circle
          key={i}
          cx={c.x}
          cy={c.y}
          r={4}
          fill="#fff"
          stroke="#1890ff"
          onClick={() => onPointClick && onPointClick(i, points[i])}
          style={{ cursor: onPointClick ? "pointer" : "default" }}
        />
      ))}
    </svg>
  );
}
