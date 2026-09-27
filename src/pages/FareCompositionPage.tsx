import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Card, CardHeader, CardBody, KPICard } from '@/components/ui/Card';
import DonutChart from '@/components/charts/DonutChart';
import StackedBarChart from '@/components/charts/StackedBarChart';
import Select from '@/components/ui/Select';
import { getAirlines, getCurrentDataMode, getRoutes } from '@/services/api';
import { loadFareCompositionData } from '@/services/dataService';
import { formatCurrency } from '@/lib/formatters';
import type { DateRange } from '@/types';
import { exportToCSV } from '@/lib/export';

export default function FareCompositionPage({ dateRange = '30d' }: { dateRange?: DateRange }) {
  const [routeFilter, setRouteFilter] = useState('');
  const [airlineFilter, setAirlineFilter] = useState('');
  const [composition, setComposition] = useState<Awaited<ReturnType<typeof loadFareCompositionData>> | null>(null);
  const [routes, setRoutes] = useState<Array<{ route_code: string }>>([]);
  const [airlines, setAirlines] = useState<Array<{ airline_id: string; airline_name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const mode = getCurrentDataMode();
  useEffect(() => {
    Promise.all([loadFareCompositionData(routeFilter || undefined, airlineFilter || undefined), getRoutes(), getAirlines()])
      .then(([value, routeResponse, airlineResponse]) => {
        setComposition(value);
        setRoutes(routeResponse.items);
        setAirlines(airlineResponse.items);
      })
      .catch((reason: Error) => setError(reason.message));
  }, [routeFilter, airlineFilter, dateRange]);
  if (error) return <div className="p-6 text-secondaryText">Unable to load live fare composition: {error}</div>;
  if (!composition) return <div className="p-6 text-secondaryText">Loading fare composition...</div>;
  const formatOptionalCurrency = (value: number | null) => value === null ? 'Unavailable' : formatCurrency(value);
  const componentPercentage = (value: number | null) => composition.total && value !== null
    ? ((value / composition.total) * 100).toFixed(1)
    : 'Unavailable';

  const donutData = [
    { label: 'Base Fare', value: composition.base_fare, color: '#3B82F6' },
    { label: 'Taxes', value: composition.taxes, color: '#14B8A6' },
    { label: 'UDF', value: composition.udf, color: '#F59E0B' },
    { label: 'Convenience Fee', value: composition.convenience_fee, color: '#8B5CF6' },
  ].filter((item): item is { label: string; value: number; color: string } => item.value !== null);

  // Stacked bar by route (top 8 routes)
  const stackedData = mode === 'mock' ? routes.slice(0, 8).map((r) => {
    const c = composition;
    return {
      label: r.route_code,
      segments: [
        { value: c.base_fare, color: '#3B82F6', name: 'Base Fare' },
        { value: c.taxes, color: '#14B8A6', name: 'Taxes' },
        { value: c.udf, color: '#F59E0B', name: 'UDF' },
        { value: c.convenience_fee, color: '#8B5CF6', name: 'Convenience Fee' },
      ].filter((segment): segment is { value: number; color: string; name: string } => segment.value !== null),
    };
  }) : [];

  const breakdown = [
    { component: 'Base Fare', value: composition.base_fare, pct: componentPercentage(composition.base_fare), color: '#3B82F6' },
    { component: 'Taxes', value: composition.taxes, pct: componentPercentage(composition.taxes), color: '#14B8A6' },
    { component: 'UDF', value: composition.udf, pct: componentPercentage(composition.udf), color: '#F59E0B' },
    { component: 'Convenience Fee', value: composition.convenience_fee, pct: componentPercentage(composition.convenience_fee), color: '#8B5CF6' },
  ].filter((item): item is { component: string; value: number; pct: string; color: string } => item.value !== null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primaryText">Fare Composition</h2>
          <p className="text-sm text-secondaryText mt-1">
            Breakdown of airfare into base fare, taxes, UDF, and convenience fees.
          </p>
        </div>
        <button onClick={() => exportToCSV(breakdown, 'apix-fare-composition')} className="btn-secondary text-xs">
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="flex flex-wrap gap-3">
          <Select
            label="Route"
            value={routeFilter}
            onChange={setRouteFilter}
            placeholder="All routes"
            options={routes.map((r) => ({ value: r.route_code, label: r.route_code }))}
            className="w-48"
          />
          <Select
            label="Airline"
            value={airlineFilter}
            onChange={setAirlineFilter}
            placeholder="All airlines"
            options={airlines.map((a) => ({ value: a.airline_id, label: a.airline_name }))}
            className="w-48"
          />
        </CardBody>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard label="Base Fare" value={formatOptionalCurrency(composition.base_fare)} />
        <KPICard label="Taxes" value={formatOptionalCurrency(composition.taxes)} />
        <KPICard label="UDF" value={formatOptionalCurrency(composition.udf)} />
        <KPICard label="Convenience Fee" value={formatOptionalCurrency(composition.convenience_fee)} />
        <KPICard label="Total Fare" value={formatOptionalCurrency(composition.total)} />
      </div>

      {/* Donut + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Fare Composition" subtitle="Average fare breakdown (donut)" />
          <CardBody>
            <DonutChart
              data={donutData}
              centerValue={formatOptionalCurrency(composition.total)}
              centerLabel="Total"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Component Breakdown" subtitle="Detailed fare component values" />
          <CardBody>
            <div className="space-y-3">
              {breakdown.map((b) => (
                <div key={b.component}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded" style={{ backgroundColor: b.color }} />
                      <span className="text-sm text-primaryText">{b.component}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-primaryText">{formatCurrency(b.value)}</span>
                      <span className="text-xs text-secondaryText w-12 text-right">{b.pct}%</span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-navy-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${b.pct}%`, backgroundColor: b.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Stacked bar by route */}
      {mode === 'mock' && <Card>
        <CardHeader title="Fare Composition by Route" subtitle="Stacked breakdown for top routes" />
        <CardBody>
          <StackedBarChart data={stackedData} height={280} formatValue={(v) => formatCurrency(v)} />
        </CardBody>
      </Card>}
    </div>
  );
}
