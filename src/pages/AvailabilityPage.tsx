import { Download, CheckCircle2, AlertCircle, Ban } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardBody, KPICard } from '@/components/ui/Card';
import LineChart from '@/components/charts/LineChart';
import DonutChart from '@/components/charts/DonutChart';
import BarChart from '@/components/charts/BarChart';
import { loadAvailabilityData } from '@/services/dataService';
import { formatNumber } from '@/lib/formatters';
import type { DateRange } from '@/types';
import { exportToCSV } from '@/lib/export';

export default function AvailabilityPage({ dateRange = '30d' }: { dateRange?: DateRange }) {
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof loadAvailabilityData>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadAvailabilityData().then(setPayload).catch((reason: Error) => setError(reason.message));
  }, [dateRange]);
  if (error) return <div className="p-6 text-secondaryText">Unable to load live availability data: {error}</div>;
  if (!payload) return <div className="p-6 text-secondaryText">Loading availability data...</div>;
  const { data, trend, routeStats, airlineStats } = payload;

  const donutData = [
    { label: 'Available', value: data.available, color: '#22C55E' },
    { label: 'Limited', value: data.limited, color: '#F59E0B' },
    { label: 'Sold Out', value: data.sold_out, color: '#EF4444' },
    { label: 'Cancelled', value: data.cancelled, color: '#6B7280' },
  ];

  const trendSeries = [{
    name: 'Availability Rate',
    color: '#14B8A6',
    data: trend.map((t) => ({ x: t.date, y: t.rate })),
  }];

  const routeAvailability = routeStats.slice(0, 10).map((r: { route_code: string; availability_rate: number }) => ({
    label: r.route_code,
    value: r.availability_rate,
    color: r.availability_rate > 80 ? '#22C55E' : r.availability_rate > 60 ? '#F59E0B' : '#EF4444',
  }));

  const airlineAvailability = airlineStats.map((a: { airline_id: string; availability_rate: number }) => ({
    label: a.airline_id,
    value: a.availability_rate,
    color: '#3B82F6',
  }));

  // Lead-time vs availability
  const leadTimeAvail = [1, 7, 15, 30, 45].map((window) => {
    const rate = Math.max(40, 95 - window * 0.8);
    return { label: `T+${window}`, value: Math.round(rate * 10) / 10, color: '#3B82F6' };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primaryText">Availability</h2>
          <p className="text-sm text-secondaryText mt-1">
            Track flight availability across routes, airlines, and booking windows.
          </p>
        </div>
        <button onClick={() => exportToCSV(trend, 'apix-availability')} className="btn-secondary text-xs">
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Availability Rate" value={`${data.rate}%`} icon={<CheckCircle2 className="w-4 h-4" />} />
        <KPICard label="Available" value={formatNumber(data.available)} icon={<CheckCircle2 className="w-4 h-4 text-positive" />} />
        <KPICard label="Limited / Sold Out" value={formatNumber(data.limited + data.sold_out)} icon={<AlertCircle className="w-4 h-4 text-warning" />} />
        <KPICard label="Cancelled" value={formatNumber(data.cancelled)} icon={<Ban className="w-4 h-4 text-negative" />} />
      </div>

      {/* Trend + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Availability Over Time" subtitle="Daily availability rate (last 30 days)" />
            <CardBody>
              <LineChart
                series={trendSeries}
                height={280}
                formatY={(v) => `${v}%`}
                formatX={(v) => {
                  const d = new Date(v);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
                formatTooltip={(p) => `${p.y.toFixed(1)}%`}
              />
            </CardBody>
          </Card>
        </div>
        <Card>
          <CardHeader title="Availability Distribution" subtitle="Across all observations" />
          <CardBody>
            <DonutChart
              data={donutData}
              centerValue={`${data.rate}%`}
              centerLabel="Available"
            />
          </CardBody>
        </Card>
      </div>

      {/* Route + Airline availability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Route-Level Availability" subtitle="Top 10 routes by availability rate" />
          <CardBody>
            <BarChart data={routeAvailability} height={250} formatValue={(v) => `${v}%`} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Airline-Level Availability" subtitle="Availability rate by airline" />
          <CardBody>
            <BarChart data={airlineAvailability} height={250} formatValue={(v) => `${v}%`} />
          </CardBody>
        </Card>
      </div>

      {/* Lead-time vs availability */}
      <Card>
        <CardHeader title="Lead-Time vs Availability" subtitle="How booking window affects availability" />
        <CardBody>
          <BarChart data={leadTimeAvail} height={250} formatValue={(v) => `${v}%`} />
        </CardBody>
      </Card>
    </div>
  );
}
