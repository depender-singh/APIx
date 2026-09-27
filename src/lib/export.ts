export function exportToCSV(data: unknown[], filename: string) {
  if (data.length === 0) return;

  const firstRow = data[0] as Record<string, unknown> | null;
  if (!firstRow) return;

  const headers = Object.keys(firstRow);
  const csvRows = [
    headers.join(','),
    ...data.map((row) => {
      const record = row as Record<string, unknown>;
      return headers.map((h) => {
        const val = record[h];
        if (val == null) return '';
        const str = typeof val === 'string' ? val : String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',');
    }),
  ];
  const csv = csvRows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadFile(blob, `${filename}.csv`);
}

export function exportToJSON(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadFile(blob, `${filename}.json`);
}

function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
