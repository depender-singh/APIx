import { useState } from 'react';

interface StackedBarProps {
  data: { label: string; segments: { value: number; color: string; name: string }[] }[];
  height?: number;
  formatValue?: (v: number) => string;
}

export default function StackedBarChart({ data, height = 280, formatValue = (v) => String(v) }: StackedBarProps) {
  const [hover, setHover] = useState<{ barIdx: number; segIdx: number } | null>(null);
  const width = 800;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  if (data.length === 0) return <div className="flex items-center justify-center text-secondaryText text-sm" style={{ height }}>No data</div>;

  const totals = data.map((d) => d.segments.reduce((s, seg) => s + seg.value, 0));
  const maxTotal = Math.max(...totals);

  const barWidth = Math.min(50, (innerWidth - 10) / data.length - 6);
  const xScale = (i: number) => padding.left + (i + 0.5) * (innerWidth / data.length);
  const yScale = (v: number) => padding.top + innerHeight - (v / maxTotal) * innerHeight;

  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const val = (i / 4) * maxTotal;
    return { val, y: yScale(val) };
  });

  // Legend
  const legendItems = data[0]?.segments.map((s) => ({ name: s.name, color: s.color })) || [];

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-2 flex-wrap">
        {legendItems.map((l) => (
          <div key={l.name} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: l.color }} />
            <span className="text-xs text-secondaryText">{l.name}</span>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padding.left} y1={g.y} x2={width - padding.right} y2={g.y} stroke="#263449" strokeWidth="0.5" strokeDasharray="2,4" />
            <text x={padding.left - 8} y={g.y + 3} textAnchor="end" fill="#94A3B8" fontSize="10">
              {formatValue(Math.round(g.val))}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          let cumY = 0;
          return (
            <g key={i}>
              {d.segments.map((seg, j) => {
                const y = yScale(cumY + seg.value);
                const h = yScale(cumY) - yScale(cumY + seg.value);
                cumY += seg.value;
                return (
                  <rect
                    key={j}
                    x={xScale(i) - barWidth / 2}
                    y={y}
                    width={barWidth}
                    height={h}
                    fill={seg.color}
                    rx="2"
                    opacity={hover === null || hover.barIdx === i ? 1 : 0.5}
                    onMouseEnter={() => setHover({ barIdx: i, segIdx: j })}
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })}
              <text x={xScale(i)} y={height - 10} textAnchor="middle" fill="#94A3B8" fontSize="10">
                {d.label.length > 10 ? d.label.slice(0, 8) + '...' : d.label}
              </text>
              {hover?.barIdx === i && (
                <text x={xScale(i)} y={yScale(totals[i]) - 6} textAnchor="middle" fill="#F8FAFC" fontSize="11" fontWeight="600">
                  {formatValue(totals[i])}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
