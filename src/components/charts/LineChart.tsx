import { useState, useRef } from 'react';

interface Series {
  name: string;
  color: string;
  data: { x: string; y: number | null }[];
  dashed?: boolean;
}

interface LineChartProps {
  series: Series[];
  height?: number;
  yLabel?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  formatY?: (v: number) => string;
  formatX?: (v: string) => string;
  formatTooltip?: (point: { x: string; y: number; seriesName: string }) => string;
}

export default function LineChart({
  series,
  height = 280,
  yLabel,
  showLegend = true,
  showGrid = true,
  formatY = (v) => String(v),
  formatX = (v) => v,
  formatTooltip,
}: LineChartProps) {
  const [hover, setHover] = useState<{ x: number; y: number; point: { x: string; y: number; seriesName: string } } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const width = 800;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const allPoints = series.flatMap((s) => s.data.filter((d) => d.y != null) as { x: string; y: number }[]);
  if (allPoints.length === 0) return <div className="flex items-center justify-center text-secondaryText text-sm" style={{ height }}>No data</div>;

  const xValues = [...new Set(series.flatMap((s) => s.data.map((d) => d.x)))].sort();
  const yValues = allPoints.map((p) => p.y);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const yPadding = (yMax - yMin) * 0.1 || 1;
  const yLo = yMin - yPadding;
  const yHi = yMax + yPadding;

  const xScale = (x: string) => {
    const idx = xValues.indexOf(x);
    return padding.left + (idx / Math.max(1, xValues.length - 1)) * innerWidth;
  };
  const yScale = (y: number) => padding.top + innerHeight - ((y - yLo) / (yHi - yLo)) * innerHeight;

  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const val = yLo + (i / 4) * (yHi - yLo);
    return { val, y: yScale(val) };
  });

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const ratio = (x - padding.left) / innerWidth;
    const idx = Math.round(ratio * (xValues.length - 1));
    if (idx < 0 || idx >= xValues.length) return;
    const xVal = xValues[idx];

    let closest: { x: string; y: number; seriesName: string } | null = null;
    let minDist = Infinity;
    for (const s of series) {
      const point = s.data.find((d) => d.x === xVal);
      if (point && point.y != null) {
        const dist = Math.abs(xScale(xVal) - x);
        if (dist < minDist) {
          minDist = dist;
          closest = { x: xVal, y: point.y, seriesName: s.name };
        }
      }
    }
    if (closest) {
      setHover({ x: e.clientX - rect.left, y: yScale(closest.y), point: closest });
    }
  };

  return (
    <div className="w-full">
      {showLegend && (
        <div className="flex items-center gap-4 mb-2 flex-wrap">
          {series.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-secondaryText">{s.name}</span>
            </div>
          ))}
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        {showGrid &&
          gridLines.map((g, i) => (
            <g key={i}>
              <line x1={padding.left} y1={g.y} x2={width - padding.right} y2={g.y} stroke="#263449" strokeWidth="0.5" strokeDasharray="2,4" />
              <text x={padding.left - 8} y={g.y + 3} textAnchor="end" fill="#94A3B8" fontSize="10">
                {formatY(Math.round(g.val))}
              </text>
            </g>
          ))}
        {/* X axis labels */}
        {xValues.map((x, i) => {
          if (xValues.length > 15 && i % Math.ceil(xValues.length / 8) !== 0) return null;
          return (
            <text key={x} x={xScale(x)} y={height - 8} textAnchor="middle" fill="#94A3B8" fontSize="10">
              {formatX(x)}
            </text>
          );
        })}
        {yLabel && (
          <text x={12} y={padding.top + innerHeight / 2} textAnchor="middle" fill="#94A3B8" fontSize="10" transform={`rotate(-90 12 ${padding.top + innerHeight / 2})`}>
            {yLabel}
          </text>
        )}
        {/* Lines */}
        {series.map((s) => {
          const points = s.data
            .filter((d) => d.y != null)
            .map((d) => `${xScale(d.x)},${yScale(d.y!)}`)
            .join(' ');
          return (
            <g key={s.name}>
              <polyline
                points={points}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={s.dashed ? '5,5' : undefined}
              />
              {/* Area under curve for first series */}
              {s === series[0] && !s.dashed && (
                <polygon
                  points={`${padding.left},${yScale(yLo)} ${points} ${xScale(s.data.filter((d) => d.y != null).slice(-1)[0]!.x)},${yScale(yLo)}`}
                  fill={s.color}
                  opacity="0.06"
                />
              )}
            </g>
          );
        })}
        {/* Hover indicator */}
        {hover && (
          <g>
            <line x1={xScale(hover.point.x)} y1={padding.top} x2={xScale(hover.point.x)} y2={height - padding.bottom} stroke="#3B82F6" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
            <circle cx={xScale(hover.point.x)} cy={hover.y} r="4" fill={series.find((s) => s.name === hover.point.seriesName)?.color || '#3B82F6'} stroke="#0B1220" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover && (
        <div
          className="fixed pointer-events-none z-50 bg-navy-850 border border-borderColor rounded-lg px-3 py-2 text-xs shadow-xl"
          style={{
            left: Math.min(hover.x + 12, window.innerWidth - 200),
            top: hover.y + 12,
          }}
        >
          <p className="text-secondaryText mb-0.5">{formatX(hover.point.x)}</p>
          <p className="text-primaryText font-medium">
            {formatTooltip ? formatTooltip(hover.point) : `${hover.point.seriesName}: ${formatY(hover.point.y)}`}
          </p>
        </div>
      )}
    </div>
  );
}
