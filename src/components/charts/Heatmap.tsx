interface HeatmapProps {
  rows: { label: string; cells: { value: number; label: string }[] }[];
  colLabels: string[];
  colorScale?: (v: number) => string;
}

export default function Heatmap({ rows, colLabels, colorScale }: HeatmapProps) {
  const defaultColorScale = (v: number) => {
    if (v > 10) return '#EF4444';
    if (v > 5) return '#F59E0B';
    if (v > 0) return '#FBBF24';
    if (v > -5) return '#84CC16';
    return '#22C55E';
  };
  const scale = colorScale || defaultColorScale;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="table-header sticky left-0 bg-navy-900">Route</th>
            {colLabels.map((c) => (
              <th key={c} className="table-header text-center">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="table-row">
              <td className="table-cell font-medium sticky left-0 bg-navy-850">{row.label}</td>
              {row.cells.map((cell, j) => (
                <td key={j} className="px-2 py-2 text-center">
                  <div
                    className="w-12 h-12 mx-auto rounded-lg flex items-center justify-center text-xs font-medium text-white"
                    style={{ backgroundColor: scale(cell.value) }}
                    title={cell.label}
                  >
                    {cell.value > 0 ? '+' : ''}{cell.value}%
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
