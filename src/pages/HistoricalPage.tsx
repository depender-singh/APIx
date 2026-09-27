import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Card, CardHeader, CardBody, KPICard } from '@/components/ui/Card';
import LineChart from '@/components/charts/LineChart';
import Select from '@/components/ui/Select';
import { DataTable } from '@/components/ui/Table';
import { formatPercent, formatDate } from '@/lib/formatters';
import type { DateRange } from '@/types';
import { exportToCSV, exportToJSON } from '@/lib/export';
import { loadHistoricalData } from '@/services/dataService';

export default function HistoricalPage({ dateRange = '30d' }: { dateRange?: DateRange }) {
  const [aggregation, setAggregation] = useState('daily');
  const [basePeriod, setBasePeriod] = useState('2025-09-12');
  const [data, setData] = useState<Awaited<ReturnType<typeof loadHistoricalData>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const payload = await loadHistoricalData(dateRange);
        if (active) setData(payload);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [dateRange]);

  if (loading && !data) {
    return <div className="flex items-center justify-center h-64 text-secondaryText">Loading historical data...</div>;
  }

  const indexValues = data?.indexValues ?? [];
  const latest = data?.latest ?? null;

  const series = [{
    name: 'APIx',
    color: '#3B82F6',
    data: indexValues.map((v) => ({ x: v.date, y: v.api_x })),
  }];

  const baseSeries = [{
    name: 'Base Period (100)',
    color: '#64748B',
    data: indexValues.map((v) => ({ x: v.date, y: 100 })),
    dashed: true,
  }];

  if (!latest) {
    return <div className="flex items-center justify-center h-64 text-secondaryText">No historical APIx data available.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primaryText">Historical APIx</h2>
          <p className="text-sm text-secondaryText mt-1">
            Complete historical index data with configurable aggregation and base period.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportToCSV(indexValues, 'apix-historical')} className="btn-secondary text-xs">
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <button onClick={() => exportToJSON(indexValues, 'apix-historical')} className="btn-secondary text-xs">
            <Download className="w-3.5 h-3.5" />
            JSON
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Current APIx" value={latest.api_x.toFixed(2)} change={latest.yoy_change} changeLabel="YoY" />
        <KPICard label="YoY Change" value={formatPercent(latest.yoy_change)} />
        <KPICard label="MoM Change" value={formatPercent(latest.mom_change)} />
        <KPICard label="Base Period Diff" value={`+${(latest.api_x - 100).toFixed(2)}`} />
      </div>

      {/* Controls */}
      <Card>
        <CardBody className="flex flex-wrap gap-3">
          <Select
            label="Aggregation"
            value={aggregation}
            onChange={setAggregation}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
            className="w-40"
          />
          <Select
            label="Base Period"
            value={basePeriod}
            onChange={setBasePeriod}
            options={[
              { value: '2025-09-12', label: 'Sep 2025' },
              { value: '2025-01-01', label: 'Jan 2025' },
              { value: '2024-09-12', label: 'Sep 2024' },
            ]}
            className="w-40"
          />
        </CardBody>
      </Card>

      {/* Trend Chart */}
      <Card>
        <CardHeader title="APIx Historical Trend" subtitle={`Aggregation: ${aggregation} · Base period: ${basePeriod}`} />
        <CardBody>
          <LineChart
            series={[...series, ...baseSeries]}
            height={300}
            formatY={(v) => v.toFixed(0)}
            formatX={(v) => {
              const d = new Date(v);
              return `${d.getDate()}/${d.getMonth() + 1}`;
            }}
            formatTooltip={(p) => `${p.seriesName}: ${p.y.toFixed(2)}`}
          />
        </CardBody>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader title="Index Values" subtitle="Daily APIx values with YoY and MoM changes" />
        <DataTable
          columns={[
            { key: 'date', label: 'Date', sortable: true, render: (r) => formatDate(r.date) },
            { key: 'api_x', label: 'APIx', sortable: true, align: 'right', render: (r) => <span className="font-mono">{r.api_x.toFixed(2)}</span> },
            { key: 'yoy_change', label: 'YoY %', sortable: true, align: 'right', render: (r) => <span className={r.yoy_change > 0 ? 'text-negative' : 'text-positive'}>{formatPercent(r.yoy_change)}</span> },
            { key: 'mom_change', label: 'MoM %', sortable: true, align: 'right', render: (r) => <span className={r.mom_change > 0 ? 'text-negative' : 'text-positive'}>{formatPercent(r.mom_change)}</span> },
            { key: 'observations_count', label: 'Observations', sortable: true, align: 'right', render: (r) => r.observations_count.toLocaleString('en-IN') },
          ]}
          data={indexValues}
          pageSize={12}
          searchPlaceholder="Search by date..."
        />
      </Card>
    </div>
  );
}
