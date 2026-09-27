import { useEffect, useState } from 'react';
import { Download, FlaskConical } from 'lucide-react';
import { Card, CardBody, CardHeader, KPICard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LineChart from '@/components/charts/LineChart';
import { loadBacktestingData } from '@/services/dataService';
import { getCurrentDataMode, type BacktestResult, type BenchmarkRecord } from '@/services/api';
import type { DateRange } from '@/types';
import { exportToCSV } from '@/lib/export';

function metric(value: number | null | undefined, digits = 2) {
  return value === null || value === undefined ? 'N/A' : value.toFixed(digits);
}

export default function BacktestingPage({ dateRange = '30d' }: { dateRange?: DateRange }) {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [benchmarks, setBenchmarks] = useState<BenchmarkRecord[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBacktestingData(dateRange).then((data) => { setResult(data.result); setBenchmarks(data.benchmarks); }).catch((reason: Error) => setError(reason.message));
  }, [dateRange]);

  if (error) return <div className="flex items-center justify-center h-64 text-secondaryText">Unable to load back-testing data: {error}</div>;
  if (!result) return <div className="flex items-center justify-center h-64 text-secondaryText">Loading back-testing data...</div>;

  const series = [
    { name: 'APIx (normalized)', color: '#3B82F6', data: result.series.map((point) => ({ x: point.date, y: point.apix })) },
    { name: result.benchmark_source === 'dgca' ? 'DGCA (normalized)' : 'Synthetic Demo (normalized)', color: '#F59E0B', data: result.series.map((point) => ({ x: point.date, y: point.benchmark })) },
  ];
  const label = result.benchmark_source === 'dgca' ? 'Official DGCA' : 'Synthetic Demo';

  return <div className="space-y-6 animate-fade-in">
    <div className="flex items-start justify-between flex-wrap gap-4">
      <div><h2 className="text-2xl font-bold text-primaryText">APIx Validation & Back-testing</h2><p className="text-sm text-secondaryText mt-1">Normalized comparison against an independently imported benchmark.</p></div>
      <div className="flex items-center gap-2"><Badge variant={result.benchmark_source === 'dgca' ? 'positive' : 'warning'} dot>{label}</Badge><button onClick={() => exportToCSV(result.series, 'apix-backtesting')} className="btn-secondary text-xs"><Download className="w-3.5 h-3.5" />Export CSV</button></div>
    </div>
    {result.status === 'insufficient_data' && <Card className="p-4 border-warning/30"><p className="text-sm text-warning">Official route-level DGCA benchmark observations are currently unavailable. The reported aggregate airfare reference is not sufficient for the six-route APIx back-test, so no official percentages or chart values are shown.</p></Card>}
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <KPICard label="Status" value={result.status} icon={<FlaskConical className="w-4 h-4" />} />
      <KPICard label="Observations" value={result.observation_count} />
      <KPICard label="Correlation" value={metric(result.correlation)} />
      <KPICard label="MAE / RMSE" value={`${metric(result.mae)} / ${metric(result.rmse)}`} />
      <KPICard label="Directional Accuracy" value={result.directional_accuracy == null ? 'N/A' : `${metric(result.directional_accuracy, 1)}%`} />
    </div>
    <Card><CardHeader title="Normalized APIx vs Benchmark" subtitle={`Frequency: ${result.frequency} · Methodology: ${result.methodology_version ?? 'unavailable'}`} /><CardBody><LineChart series={series} height={300} formatY={(value) => value.toFixed(0)} formatX={(value) => { const date = new Date(value); return `${date.getDate()}/${date.getMonth() + 1}`; }} formatTooltip={(point) => `${point.seriesName}: ${point.y.toFixed(2)}`} /></CardBody></Card>
    <Card><CardHeader title="Benchmark Records" subtitle="Only imported records are displayed" /><CardBody>{benchmarks.length === 0 ? <p className="text-sm text-secondaryText">No official DGCA benchmark records are available.</p> : <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="table-header">Date</th><th className="table-header">Route</th><th className="table-header text-right">Value</th><th className="table-header">Source</th></tr></thead><tbody>{benchmarks.map((benchmark) => <tr className="table-row" key={benchmark.id}><td className="table-cell">{benchmark.benchmark_date}</td><td className="table-cell">{benchmark.route_code}</td><td className="table-cell text-right font-mono">{benchmark.benchmark_value.toFixed(2)}</td><td className="table-cell">{benchmark.source_type === 'dgca' ? 'Official DGCA' : 'Synthetic Demo'}</td></tr>)}</tbody></table></div>}</CardBody></Card>
    <p className="text-xs text-secondaryText">Data mode: {getCurrentDataMode() === 'api' ? 'FastAPI / PostgreSQL' : 'Synthetic Demo'} · Bias: {metric(result.bias)} · MAPE: {result.mape == null ? 'N/A' : `${metric(result.mape)}%`}</p>
  </div>;
}
