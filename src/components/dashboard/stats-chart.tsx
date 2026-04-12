'use client';

import { useEffect, useRef, useState } from 'react';

interface DataPoint {
  label: string;
  value: number;
}

interface StatsChartProps {
  data: DataPoint[];
}

export default function StatsChart({ data }: StatsChartProps) {
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    value: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value));
  // Add 20% headroom so the peak doesn't touch the top
  const ceiling = Math.ceil(maxValue * 1.2) || 1;

  const padding = { top: 12, right: 16, bottom: 32, left: 16 };
  const viewBoxW = 600;
  const viewBoxH = 200;
  const chartW = viewBoxW - padding.left - padding.right;
  const chartH = viewBoxH - padding.top - padding.bottom;

  // Map data to x/y coords — guard against single-point (denominator = 0)
  const denominator = data.length > 1 ? data.length - 1 : 1;
  const points = data.map((d, i) => ({
    x: padding.left + (data.length === 1 ? chartW / 2 : (i / denominator) * chartW),
    y: padding.top + chartH - (d.value / ceiling) * chartH,
    label: d.label,
    value: d.value,
  }));

  // Build smooth quadratic bezier path
  function buildSmoothPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return '';
    let path = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const cpX = (curr.x + next.x) / 2;
      path += ` Q ${curr.x},${curr.y} ${cpX},${(curr.y + next.y) / 2}`;
    }
    // Final segment to last point
    const last = pts[pts.length - 1];
    path += ` T ${last.x},${last.y}`;
    return path;
  }

  // Build a cubic bezier path for smoother curves
  function buildCubicPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return '';
    let path = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const tension = 0.3;
      const dx = next.x - curr.x;
      const cp1x = curr.x + dx * tension;
      const cp1y = curr.y;
      const cp2x = next.x - dx * tension;
      const cp2y = next.y;
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
    }
    return path;
  }

  const linePath = buildCubicPath(points);

  // Area path: line path + close to bottom
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x},${padding.top + chartH}` +
    ` L ${points[0].x},${padding.top + chartH} Z`;

  const gradientId = 'statsGradient';
  const clipId = 'statsClip';

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * viewBoxW;

    // Find closest point
    let closest = points[0];
    let minDist = Infinity;
    for (const pt of points) {
      const dist = Math.abs(pt.x - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closest = pt;
      }
    }

    if (minDist < chartW / denominator) {
      setTooltip({
        x: closest.x,
        y: closest.y,
        label: closest.label,
        value: closest.value,
      });
    } else {
      setTooltip(null);
    }
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
      className="w-full"
      style={{ height: 200 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTooltip(null)}
    >
      <defs>
        {/* Gradient for area fill */}
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e3a6e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#1e3a6e" stopOpacity="0.02" />
        </linearGradient>

        {/* Clip path for draw-in animation */}
        <clipPath id={clipId}>
          <rect
            x="0"
            y="0"
            width={mounted ? viewBoxW : 0}
            height={viewBoxH}
            style={{
              transition: 'width 1s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </clipPath>
      </defs>

      {/* Subtle horizontal grid lines */}
      {[0.25, 0.5, 0.75].map((frac) => {
        const y = padding.top + chartH * (1 - frac);
        return (
          <line
            key={frac}
            x1={padding.left}
            y1={y}
            x2={padding.left + chartW}
            y2={y}
            stroke="#e5e7eb"
            strokeWidth="0.5"
            strokeDasharray="4 4"
          />
        );
      })}

      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#${gradientId})`}
        clipPath={`url(#${clipId})`}
      />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke="#1e3a6e"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        clipPath={`url(#${clipId})`}
      />

      {/* Data point dots */}
      {points.map((pt, i) => (
        <circle
          key={i}
          cx={pt.x}
          cy={pt.y}
          r={tooltip?.x === pt.x ? 5 : 3.5}
          fill="#ffffff"
          stroke="#1e3a6e"
          strokeWidth="2"
          clipPath={`url(#${clipId})`}
          style={{ transition: 'r 0.15s ease' }}
        />
      ))}

      {/* X-axis labels */}
      {points.map((pt, i) => (
        <text
          key={i}
          x={pt.x}
          y={viewBoxH - 6}
          textAnchor="middle"
          className="fill-gray-400"
          style={{ fontSize: '11px' }}
        >
          {pt.label}
        </text>
      ))}

      {/* Tooltip */}
      {tooltip && (
        <g>
          {/* Vertical guide line */}
          <line
            x1={tooltip.x}
            y1={padding.top}
            x2={tooltip.x}
            y2={padding.top + chartH}
            stroke="#1e3a6e"
            strokeWidth="0.75"
            strokeDasharray="3 3"
            opacity="0.4"
          />

          {/* Tooltip background */}
          <rect
            x={tooltip.x - 28}
            y={tooltip.y - 30}
            width="56"
            height="22"
            rx="6"
            fill="#1e3a6e"
          />
          {/* Tooltip arrow */}
          <polygon
            points={`${tooltip.x - 4},${tooltip.y - 8} ${tooltip.x + 4},${tooltip.y - 8} ${tooltip.x},${tooltip.y - 3}`}
            fill="#1e3a6e"
          />
          {/* Tooltip text */}
          <text
            x={tooltip.x}
            y={tooltip.y - 15}
            textAnchor="middle"
            fill="#ffffff"
            style={{ fontSize: '12px', fontWeight: 600 }}
          >
            {tooltip.value}
          </text>
        </g>
      )}
    </svg>
  );
}
