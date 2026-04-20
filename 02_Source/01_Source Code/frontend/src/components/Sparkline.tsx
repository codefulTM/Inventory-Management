import React, { useState, useRef } from "react";

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
  let maxY = Math.max(...ys, 1);
  let minY = Math.min(...ys, 0);

  // If all points are equal (flat line) expand range a bit so line/area is visible
  if (maxY === minY) {
    if (maxY === 0) {
      maxY = 1; // show something instead of flat at 0
    } else {
      maxY = maxY + Math.abs(maxY) * 0.05 + 1;
      minY = minY - Math.abs(minY) * 0.05 - 1;
    }
  }

  const stepX = w / Math.max(points.length - 1, 1);

  const coords = points.map((p, i) => {
    const x = padding + i * stepX;
    const ratio = (p.y - minY) / (maxY - minY);
    const y = padding + h - ratio * h;
    return { x, y };
  });

  // Build path and area (filled) for better visual
  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaD =
    pathD +
    ` L ${coords[coords.length - 1].x} ${padding + h} L ${coords[0].x} ${padding + h} Z`;

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    left: number;
    top: number;
    text: string;
  }>({ visible: false, left: 0, top: 0, text: "" });

  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleMouseEnter = (
    e: React.MouseEvent,
    point: { x: string; y: number },
    coord: { x: number; y: number },
  ) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const left = rect ? coord.x : coord.x;
    const top = rect ? coord.y : coord.y;
    setTooltip({ visible: true, left, top, text: `${point.x} — ${point.y}` });
  };

  const handleMouseMove = (
    e: React.MouseEvent,
    point: { x: string; y: number },
    coord: { x: number; y: number },
  ) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const offsetX = rect ? e.clientX - rect.left : e.clientX;
    const offsetY = rect ? e.clientY - rect.top : e.clientY;
    setTooltip((t) => ({ ...t, left: offsetX, top: offsetY, text: `${point.x} — ${point.y}` }));
  };

  const handleMouseLeave = () => {
    setTooltip((t) => ({ ...t, visible: false }));
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={containerRef}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        {/* subtle filled area */}
        <path d={areaD} fill="rgba(24,144,255,0.06)" stroke="none" />
        <path
          d={pathD}
          fill="none"
          stroke="#1890ff"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={Math.max(2, Math.min(4, width / 120))}
            fill="#fff"
            stroke="#1890ff"
            strokeWidth={1.5}
            onClick={() => onPointClick && onPointClick(i, points[i])}
            onMouseEnter={(e) => handleMouseEnter(e, points[i], c)}
            onMouseMove={(e) => handleMouseMove(e, points[i], c)}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: onPointClick ? "pointer" : "default" }}
          />
        ))}
      </svg>

      {tooltip.visible && (
        <div
          style={{
            position: "absolute",
            left: tooltip.left + 8,
            top: tooltip.top - 36,
            transform: "translate(0,0)",
            pointerEvents: "none",
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            padding: "6px 8px",
            borderRadius: 4,
            fontSize: 12,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            zIndex: 1000,
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
