'use client';

import { useEffect, useState } from 'react';

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: Segment[];
}

export default function DonutChart({ segments }: DonutChartProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate from 0 to 1
    const timer = setTimeout(() => setProgress(1), 50);
    return () => clearTimeout(timer);
  }, []);

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 65;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;

  // Build cumulative offsets via reduce (evita reasignar `let` durante render —
  // React 19 / eslint-plugin-react-hooks prohibe `let x = 0; x += ...` a nivel
  // de componente).
  const arcs = segments.reduce<
    Array<{ label: string; value: number; color: string; dashArray: string; dashOffset: number; fraction: number }>
  >((acc, seg) => {
    const fraction = seg.value / total;
    const dashLength = fraction * circumference;
    const gap = circumference - dashLength;
    const prevCumulative = acc.reduce((s, prev) => s + prev.fraction * circumference, 0);
    const offset = circumference * 0.25 - prevCumulative;
    acc.push({
      ...seg,
      dashArray: `${dashLength} ${gap}`,
      dashOffset: offset,
      fraction,
    });
    return acc;
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* SVG donut */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
        >
          {/* Background track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />

          {/* Segments */}
          {arcs.map((arc, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={arc.dashArray}
              strokeDashoffset={
                arc.dashOffset +
                (1 - progress) * circumference * arc.fraction
              }
              strokeLinecap="butt"
              style={{
                transition:
                  'stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)',
                transformOrigin: 'center',
              }}
            />
          ))}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{total}</span>
          <span className="text-xs text-text-secondary">Total</span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-xs text-text-secondary">
              {seg.label}{' '}
              <span className="font-semibold text-white">{seg.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
