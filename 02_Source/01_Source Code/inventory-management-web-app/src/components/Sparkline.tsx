// File: components/Sparkline.tsx
// Component vẽ biểu đồ đường đơn giản (sparkline) dùng SVG
// Hiển thị trend theo thời gian với tooltip khi hover
// Dùng để hiển thị xu hướng tồn kho, giao dịch trong StatCard

import React, { useState, useRef } from "react";

// Props cho Sparkline
type Props = {
  points: Array<{ x: string; y: number }>; // Dữ liệu: x là nhãn (ngày/tháng), y là giá trị
  width?: number | string; // Chiều rộng SVG (number px hoặc '100%')
  height?: number; // Chiều cao SVG (px)
  dotRadius?: number; // Bán kính các điểm trên biểu đồ
  spacing?: number; // Khoảng cách cố định giữa các điểm (px)
  onPointClick?: (index: number, point: { x: string; y: number }) => void; // Callback khi click vào điểm
};

export default function Sparkline({
  points,
  width = "100%",
  height = 60,
  spacing = 36,
  dotRadius = 3,
  onPointClick,
}: Props) {
  // Trả về thông báo nếu không có dữ liệu
  if (!points || points.length === 0)
    return <div className="text-xs text-gray-500">Không có dữ liệu</div>;

  const padding = 4;
  const h = height - padding * 2;

  // Tính toán min/max của trục y
  const ys = points.map((p) => p.y);
  let maxY = Math.max(...ys, 1);
  let minY = Math.min(...ys, 0);

  // Nếu tất cả các điểm bằng nhau (đường thẳng), mở rộng range để hiển thị
  if (maxY === minY) {
    if (maxY === 0) {
      maxY = 1; // Hiển thị something thay vì đường flat tại 0
    } else {
      maxY = maxY + Math.abs(maxY) * 0.05 + 1;
      minY = minY - Math.abs(minY) * 0.05 - 1;
    }
  }

  // Khoảng cách cố định giữa các điểm, SVG width tăng theo số lượng points
  const fixedStep = Math.max(4, spacing);
  const svgContentWidth =
    padding * 2 + fixedStep * Math.max(points.length - 1, 0) + 2;

  // Đảm bảoo SVG rộng ít nhất bằng width nếu là number
  const numericMinWidth = typeof width === "number" ? width : 0;
  const svgWidth = Math.max(numericMinWidth, svgContentWidth);

  // Chuyển đổi dữ liệu thành tọa độ SVG
  const coords = points.map((p, i) => {
    const x = padding + i * fixedStep;
    const ratio = (p.y - minY) / (maxY - minY);
    const y = padding + h - ratio * h;
    return { x, y };
  });

  // Tạo path cho đường line và area (filled)
  const pathD = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
    .join(" ");
  const areaD =
    pathD +
    ` L ${coords[coords.length - 1].x} ${padding + h} L ${coords[0].x} ${padding + h} Z`;

  // State cho tooltip
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    left: number;
    top: number;
    text: string;
  }>({ visible: false, left: 0, top: 0, text: "" });

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Xử lý mouse enter vào điểm
  const handleMouseEnter = (
    e: React.MouseEvent,
    point: { x: string; y: number },
    coord: { x: number; y: number },
  ) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const left = rect
      ? e.clientX - rect.left + (containerRef.current?.scrollLeft ?? 0)
      : coord.x;
    const top = rect
      ? e.clientY - rect.top + (containerRef.current?.scrollTop ?? 0)
      : coord.y;
    setTooltip({ visible: true, left, top, text: `${point.x} — ${point.y}` });
  };

  // Xử lý mouse move trên điểm
  const handleMouseMove = (
    e: React.MouseEvent,
    point: { x: string; y: number },
    coord: { x: number; y: number },
  ) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const offsetX = rect
      ? e.clientX - rect.left + (containerRef.current?.scrollLeft ?? 0)
      : e.clientX;
    const offsetY = rect
      ? e.clientY - rect.top + (containerRef.current?.scrollTop ?? 0)
      : e.clientY;
    setTooltip((t) => ({
      ...t,
      left: offsetX,
      top: offsetY,
      text: `${point.x} — ${point.y}`,
    }));
  };

  // Xử lý mouse leave - ẩn tooltip
  const handleMouseLeave = () => {
    setTooltip((t) => ({ ...t, visible: false }));
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        overflowX: "auto",
        display: "block",
      }}
      ref={containerRef}
    >
      <svg
        width={svgWidth}
        height={height}
        viewBox={`0 0 ${svgWidth} ${height}`}
        preserveAspectRatio="xMinYMin meet"
        style={{ display: "block" }}
      >
        {/* Vùng filled area dưới đường line */}
        <path d={areaD} fill="rgba(24,144,255,0.06)" stroke="none" />
        {/* Đường line chính */}
        <path
          d={pathD}
          fill="none"
          stroke="#1890ff"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Các điểm dữ liệu */}
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={dotRadius}
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

      {/* Tooltip hiển thị thông tin điểm */}
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
