'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface CellData {
  date: string;
  count: number;
  dayOfWeek: number;
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function getIntensityColor(count: number): string {
  if (count === 0) return '#f1f5f9'; // gray-100
  if (count <= 2) return '#93c5fd'; // light blue
  if (count <= 4) return '#3b82f6'; // medium blue
  if (count <= 6) return '#1e3a6e'; // primary
  return '#162d57'; // primary-dark
}

const LEGEND_LEVELS = [0, 1, 3, 5, 7];

export default function ActivityHeatmap() {
  const [data, setData] = useState<CellData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    date: string;
    count: number;
  } | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/activity')
      .then(r => r.json())
      .then(res => setData(res.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  // Arrange into weeks (columns) and days (rows)
  const weeks = useMemo(() => {
    const result: (CellData | null)[][] = [];
    let currentWeek: (CellData | null)[] = [];

    if (data.length > 0) {
      const firstDay = data[0].dayOfWeek;
      for (let i = 0; i < firstDay; i++) {
        currentWeek.push(null);
      }
    }

    for (const cell of data) {
      currentWeek.push(cell);
      if (cell.dayOfWeek === 6) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      result.push(currentWeek);
    }
    return result;
  }, [data]);

  const totalActivities = data.reduce((sum, d) => sum + d.count, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const cellSize = 14;
  const cellGap = 3;
  const labelW = 32;
  const gridW = weeks.length * (cellSize + cellGap);
  const gridH = 7 * (cellSize + cellGap);

  function handleCellHover(e: React.MouseEvent, cell: CellData | null) {
    if (!cell) {
      setTooltip(null);
      return;
    }
    const rect = (e.target as SVGElement).getBoundingClientRect();
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top,
      date: cell.date,
      count: cell.count,
    });
  }

  function formatDisplayDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }

  return (
    <div className="relative">
      {totalActivities === 0 && (
        <p className="text-xs text-gray-500 text-center mb-2">
          Sin actividad registrada en los ultimos 84 dias
        </p>
      )}

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <svg
          width={labelW + gridW + 8}
          height={gridH + 8}
          className="block"
        >
          {/* Day labels (Y axis) */}
          {[1, 3, 5].map((dayIdx) => (
            <text
              key={dayIdx}
              x={0}
              y={dayIdx * (cellSize + cellGap) + cellSize - 2}
              className="fill-gray-400"
              style={{ fontSize: '10px' }}
            >
              {DAY_LABELS[dayIdx]}
            </text>
          ))}

          {/* Grid cells */}
          {weeks.map((week, wIdx) =>
            week.map((cell, dIdx) => {
              if (!cell) return null;
              return (
                <rect
                  key={`${wIdx}-${dIdx}`}
                  x={labelW + wIdx * (cellSize + cellGap)}
                  y={dIdx * (cellSize + cellGap)}
                  width={cellSize}
                  height={cellSize}
                  rx={3}
                  fill={getIntensityColor(cell.count)}
                  className="cursor-pointer transition-colors duration-150"
                  onMouseEnter={(e) => handleCellHover(e, cell)}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-gray-400">
        <span>Menos</span>
        {LEGEND_LEVELS.map((lvl) => (
          <span
            key={lvl}
            className="inline-block rounded-sm"
            style={{
              width: 12,
              height: 12,
              backgroundColor: getIntensityColor(lvl),
            }}
          />
        ))}
        <span>Mas</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white shadow-lg"
          style={{
            left: tooltip.x,
            top: tooltip.y - 6,
          }}
        >
          <span className="font-medium">{formatDisplayDate(tooltip.date)}</span>
          <span className="ml-1.5 text-gray-300">
            {tooltip.count} {tooltip.count === 1 ? 'actividad' : 'actividades'}
          </span>
        </div>
      )}
    </div>
  );
}
