import { useEffect, useState } from 'react';
import { Download, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardBody, KPICard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import { formatPercent } from '@/lib/formatters';
import type { DateRange } from '@/types';
import { exportToCSV } from '@/lib/export';
import { getCurrentDataMode } from '@/services/api';
import { loadInflationContext } from '@/services/dataService';

export default function InflationPage({ dateRange = '30d' }: { dateRange?: DateRange }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadInflationContext>> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    setError('');
    loadInflationContext(dateRange).then(setData).catch((reason: Error) => setError(reason.message));
  }, [dateRange]);

  if (error) return <div className="flex items-center justify-center h-64 text-secondaryText">Unable to load economic context: {error}</div>;
  if (!data) return <div className="flex items-center justify-center h-64 text-secondaryText">Loading economic context...</div>;

  const isMock = getCurrentDataMode() === 'mock';
  const inflationData = isMock ? data.mockInflation : [];
  const latestMock = inflationData[inflationData.length - 1];
  const latestOfficial = isMock ? null : data.items[data.items.length - 1];

  const series = [{
    name: isMock ? 'Synthetic Demo APIx' : 'APIx normalized', color: '#3B82F6',
    data: isMock ? inflationData.map((item) => ({ x: item.date, y: item.api_x })) : data.apixSeries.map((item) => ({ x: item.date, y: item.apix })),
  }, ...(isMock ? [] : [{ name: 'CPI normalized', color: '#F59E0B', data: data.apixSeries.map((item) => ({ x: item.date, y: item.cpi })) }])];
  const driverData = data.mockDrivers.map((driver) => ({ label: driver.route_code, value: driver.change_pct, color: driver.change_pct > 0 ? '#EF4444' : '#22C55E' }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primaryText">Airfare Inflation</h2>
          <p className="text-sm text-secondaryText mt-1">
            Airfare movement with CPI context. CPI is not an airfare benchmark.
          </p>
        </div>
        <div className="flex items-center gap-2"><Badge variant={isMock ? 'warning' : data.status === 'valid' ? 'positive' : 'neutral'} dot>{isMock ? 'Synthetic Demo' : data.status === 'source_not_imported' ? 'Official MoSPI data not imported' : 'Official MoSPI'}</Badge><button onClick={() => exportToCSV(isMock ? inflationData : data.apixSeries, 'apix-economic-context')} className="btn-secondary text-xs">
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button></div>
      </div>

      {!isMock && latestOfficial && <p className="text-xs text-secondaryText">Official source: {latestOfficial.source} · Base year: {latestOfficial.base_year ?? 'N/A'} = 100 · Geography: {latestOfficial.state ?? latestOfficial.geography ?? 'N/A'} · Sector: {latestOfficial.sector ?? 'N/A'} · Series: {latestOfficial.series ?? 'N/A'}</p>}

      {!isMock && data.status !== 'valid' && <Card className="p-4 border-warning/30"><p className="text-sm text-warning">{data.status === 'source_not_imported' ? 'Official MoSPI/eSankhyiki CPI data has not been imported.' : 'There is insufficient overlap between APIx and official CPI observations for comparison.'}</p></Card>}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {isMock ? <>
          <KPICard label="Airfare Inflation (YoY)" value={latestMock ? formatPercent(latestMock.yoy) : 'N/A'} icon={<TrendingUp className="w-4 h-4" />} />
          <KPICard label="MoM Change" value={latestMock ? formatPercent(latestMock.mom) : 'N/A'} />
          <KPICard label="Current APIx" value={latestMock ? latestMock.api_x.toFixed(2) : 'N/A'} />
          <KPICard label="CPI Observations" value="Demo" />
        </> : <>
          <KPICard label="CPI Inflation (YoY)" value={latestOfficial?.inflation_value == null ? 'N/A' : formatPercent(Number(latestOfficial.inflation_value))} icon={<TrendingUp className="w-4 h-4" />} />
          <KPICard label="CPI Index" value={latestOfficial?.index_value == null ? 'N/A' : Number(latestOfficial.index_value).toFixed(2)} />
          <KPICard label="CPI Observations" value={data.items.length} />
          <KPICard label="APIx/CPI Overlap" value={data.comparison?.observation_count ?? 'N/A'} />
        </>}
      </div>

      {/* YoY Inflation Trend */}
      <Card>
        <CardHeader title={isMock ? 'Synthetic Demo Inflation Trend' : 'Airfare vs CPI — Economic Context'} subtitle={isMock ? 'Deterministic development data' : 'Both series rebased to 100 at the first common observation'} />
        <CardBody>
          <LineChart
            series={series}
            height={280}
            formatY={(v) => v.toFixed(0)}
            formatX={(v) => {
              const d = new Date(v);
              return `${d.getDate()}/${d.getMonth() + 1}`;
            }}
            formatTooltip={(p) => `${p.seriesName}: ${p.y.toFixed(2)}`}
          />
        </CardBody>
      </Card>

      {isMock && <Card><CardHeader title="Inflation Drivers" subtitle="Synthetic demo route context" /><CardBody><BarChart data={driverData} height={250} horizontal formatValue={(v) => `${v}%`} /></CardBody></Card>}
      {!isMock && data.comparison && <Card><CardHeader title="Normalized Comparison" subtitle="Economic context, not DGCA validation" /><CardBody className="grid grid-cols-1 md:grid-cols-3 gap-4"><KPICard label="APIx Change" value={`${data.comparison.apix_change_pct.toFixed(2)}%`} /><KPICard label="CPI Change" value={`${data.comparison.cpi_change_pct.toFixed(2)}%`} /><KPICard label="Difference" value={`${data.comparison.difference_percentage_points.toFixed(2)} pp`} /></CardBody></Card>}
      <p className="text-xs text-secondaryText">Source boundary: airfare observations → APIx; DGCA → back-testing; MoSPI/eSankhyiki → CPI and macroeconomic context.</p>
    </div>
  );
}
