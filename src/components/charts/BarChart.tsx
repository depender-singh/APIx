import { useState, useRef } from 'react';

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  horizontal?: boolean;
  formatValue?: (v: number) => string;
  showValues?: boolean;
}

export default function BarChart({
  data,
  height = 280,
  horizontal = false,
  formatValue = (v) => String(v),
  showValues = true,
}: BarChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 800;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  if (data.length === 0) return <div className="flex items-center justify-center text-secondaryText text-sm" style={{ height }}>No data</div>;

  const maxVal = Math.max(...data.map((d) => d.value));
  const minVal = Math.min(0, ...data.map((d) => d.value));

  if (horizontal) {
    const barHeight = Math.min(30, (innerHeight - 10) / data.length - 4);
    const totalHeight = padding.top + padding.bottom + data.length * (barHeight + 4);
    const yScale = (i: number) => padding.top + i * (barHeight + 4);
    const xScale = (v: number) => padding.left + ((v - minVal) / (maxVal - minVal || 1)) * innerWidth;

    return (
      <svg viewBox={`0 0 ${width} ${totalHeight}`} className="w-full" style={{ height: totalHeight }}>
        {data.map((d, i) => (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <text x={padding.left - 8} y={yScale(i) + barHeight / 2 + 4} textAnchor="end" fill="#94A3B8" fontSize="11">
              {d.label}
            </text>
            <rect
              x={padding.left}
              y={yScale(i)}
              width={xScale(d.value) - padding.left}
              height={barHeight}
              fill={d.color || '#3B82F6'}
              rx="3"
              opacity={hover === null || hover === i ? 1 : 0.5}
            />
            {showValues && (
              <text x={xScale(d.value) + 6} y={yScale(i) + barHeight / 2 + 4} fill="#F8FAFC" fontSize="11" fontWeight="500">
                {formatValue(d.value)}
              </text>
            )}
          </g>
        ))}
      </svg>
    );
  }

  const barWidth = Math.min(40, (innerWidth - 10) / data.length - 6);
  const xScale = (i: number) => padding.left + (i + 0.5) * (innerWidth / data.length);
  const yScale = (v: number) => padding.top + innerHeight - ((v - minVal) / (maxVal - minVal || 1)) * innerHeight;

  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const val = minVal + (i / 4) * (maxVal - minVal);
    return { val, y: yScale(val) };
  });

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height }}
    >
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={padding.left} y1={g.y} x2={width - padding.right} y2={g.y} stroke="#263449" strokeWidth="0.5" strokeDasharray="2,4" />
          <text x={padding.left - 8} y={g.y + 3} textAnchor="end" fill="#94A3B8" fontSize="10">
            {formatValue(Math.round(g.val))}
          </text>
        </g>
      ))}
      {data.map((d, i) => (
        <g
          key={i}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
        >
          <rect
            x={xScale(i) - barWidth / 2}
            y={yScale(Math.max(0, d.value))}
            width={barWidth}
            height={Math.abs(yScale(d.value) - yScale(0))}
            fill={d.color || '#3B82F6'}
            rx="3"
            opacity={hover === null || hover === i ? 1 : 0.5}
          />
          {showValues && hover === i && (
            <text x={xScale(i)} y={yScale(d.value) - 6} textAnchor="middle" fill="#F8FAFC" fontSize="11" fontWeight="600">
              {formatValue(d.value)}
            </text>
          )}
          <text x={xScale(i)} y={height - 10} textAnchor="middle" fill="#94A3B8" fontSize="10">
            {d.label.length > 12 ? d.label.slice(0, 10) + '...' : d.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
