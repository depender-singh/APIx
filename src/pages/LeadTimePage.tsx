import { useEffect, useState } from 'react';
import { Download, TrendingDown, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardBody, KPICard } from '@/components/ui/Card';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import Select from '@/components/ui/Select';
import { getAirlines, getRoutes } from '@/services/api';
import { loadLeadTimeData } from '@/services/dataService';
import { formatCurrency } from '@/lib/formatters';
import type { DateRange } from '@/types';
import { exportToCSV } from '@/lib/export';

export default function LeadTimePage({ dateRange = '30d' }: { dateRange?: DateRange }) {
  const [routeFilter, setRouteFilter] = useState('');
  const [airlineFilter, setAirlineFilter] = useState('');
  const [data, setData] = useState<Array<{ advance_window: number; avg_fare: number; observations: number }>>([]);
  const [routes, setRoutes] = useState<Array<{ route_code: string }>>([]);
  const [airlines, setAirlines] = useState<Array<{ airline_id: string; airline_name: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadLeadTimeData(routeFilter || undefined, airlineFilter || undefined), getRoutes(), getAirlines()])
      .then(([points, routeResponse, airlineResponse]) => {
        setData(points);
        setRoutes(routeResponse.items);
        setAirlines(airlineResponse.items);
      })
      .catch((reason: Error) => setError(reason.message));
  }, [routeFilter, airlineFilter, dateRange]);

  if (error) return <div className="p-6 text-secondaryText">Unable to load live lead-time data: {error}</div>;
  if (data.length === 0) return <div className="p-6 text-secondaryText">Insufficient live data for lead-time analysis.</div>;

  const lineSeries = [{
    name: 'Average Fare',
    color: '#3B82F6',
    data: data.map((d) => ({ x: `T+${d.advance_window}`, y: d.avg_fare })),
  }];

  const barData = data.map((d) => ({
    label: `T+${d.advance_window}`,
    value: d.avg_fare,
    color: '#14B8A6',
  }));

  // Insight calculations
  const t1Fare = data.find((d) => d.advance_window === 1)?.avg_fare || 0;
  const t7Fare = data.find((d) => d.advance_window === 7)?.avg_fare || 0;
  const cheapestWindow = data.reduce((min, d) => d.avg_fare < min.avg_fare ? d : min, data[0]);
  const priceIncreaseWithin7 = t7Fare > 0 ? Math.round(((t1Fare - t7Fare) / t7Fare) * 1000) / 10 : 0;

  // Volatility (stdev between windows)
  const highestVolatilityWindow = data.reduce((max, d) => {
    const next = data.find((dd) => dd.advance_window === d.advance_window + 7);
    if (!next) return max;
    const diff = Math.abs(d.avg_fare - next.avg_fare);
    return diff > max.diff ? { window: d.advance_window, diff } : max;
  }, { window: 1, diff: 0 });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primaryText">Lead-Time Analysis</h2>
          <p className="text-sm text-secondaryText mt-1">
            How advance booking windows affect domestic airfare prices.
          </p>
        </div>
        <button onClick={() => exportToCSV(data, 'apix-lead-time')} className="btn-secondary text-xs">
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

      {/* Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KPICard
          label="Price Increase (within 7 days)"
          value={`+${priceIncreaseWithin7}%`}
          icon={<TrendingDown className="w-4 h-4 rotate-180" />}
        />
        <KPICard
          label="Cheapest Booking Window"
          value={`T+${cheapestWindow?.advance_window || 45}`}
          icon={<Clock className="w-4 h-4" />}
        />
        <KPICard
          label="Highest Volatility Window"
          value={`T+${highestVolatilityWindow.window}`}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
      </div>

      {/* Line Chart */}
      <Card>
        <CardHeader title="Lead-Time Curve" subtitle="Average airfare by days before travel" />
        <CardBody>
          <LineChart
            series={lineSeries}
            height={300}
            formatY={(v) => `₹${v}`}
            formatX={(v) => v}
            formatTooltip={(p) => formatCurrency(p.y)}
          />
        </CardBody>
      </Card>

      {/* Bar Chart */}
      <Card>
        <CardHeader title="Fare by Booking Window" subtitle="Bar chart comparison" />
        <CardBody>
          <BarChart data={barData} height={250} formatValue={(v) => formatCurrency(v)} />
        </CardBody>
      </Card>
    </div>
  );
}
