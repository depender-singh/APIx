import { ArrowLeft, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardBody, KPICard } from '@/components/ui/Card';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import DonutChart from '@/components/charts/DonutChart';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { DateRange } from '@/types';
import { exportToCSV } from '@/lib/export';
import { loadRouteDetailData } from '@/services/dataService';

interface RouteDetailsPageProps {
  routeCode: string;
  onBack: () => void;
  dateRange?: DateRange;
}

export default function RouteDetailsPage({ routeCode, onBack }: RouteDetailsPageProps) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadRouteDetailData>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const payload = await loadRouteDetailData(routeCode);
        if (active) setData(payload);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [routeCode]);

  if (loading && !data) {
    return <div className="flex items-center justify-center h-64 text-secondaryText">Loading route details...</div>;
  }

  if (!data?.stats || !data.route) {
    return (
      <div className="flex items-center justify-center h-64 text-secondaryText">
        Route not found.
      </div>
    );
  }

  const { stats, trend, composition, distribution, airlineComparison, leadTimeData, availabilityTrend, compositionData } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button + header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-primaryText">{routeCode}</h2>
          <p className="text-sm text-secondaryText">
            {stats.origin} → {stats.destination}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard label="Current Avg Fare" value={formatCurrency(stats.avg_fare)} change={stats.change_pct} />
        <KPICard label="APIx Weight" value={`${stats.apix_contribution}%`} />
        <KPICard label="YoY Change" value={formatPercent(stats.change_pct)} />
        <KPICard label="Observations" value={stats.observations} />
        <KPICard label="Airlines" value={stats.airlines_count} />
        <KPICard label="Availability" value={`${stats.availability_rate}%`} />
      </div>

      {/* Historical Fare Trend */}
      <Card>
        <CardHeader
          title="Historical Fare Trend"
          subtitle={`Daily average fare for ${routeCode} over last 30 days`}
          action={
            <button onClick={() => exportToCSV(trend, `apix-${routeCode}-trend`)} className="btn-secondary text-xs">
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          }
        />
        <CardBody>
          <LineChart
            series={[{
              name: 'Average Fare',
              color: '#3B82F6',
              data: trend.map((t) => ({ x: t.date, y: t.fare })),
            }]}
            height={280}
            formatY={(v) => `₹${v}`}
            formatX={(v) => {
              const d = new Date(v);
              return `${d.getDate()}/${d.getMonth() + 1}`;
            }}
            formatTooltip={(p) => `${formatCurrency(p.y)}`}
          />
        </CardBody>
      </Card>

      {/* Airline Comparison + Lead-time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Airline Comparison" subtitle="Average fare by airline on this route" />
          <CardBody>
            <BarChart data={airlineComparison} height={250} formatValue={(v) => formatCurrency(v)} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Lead-Time Curve" subtitle="How advance booking affects fare" />
          <CardBody>
            <BarChart data={leadTimeData} height={250} formatValue={(v) => formatCurrency(v)} />
          </CardBody>
        </Card>
      </div>

      {/* Fare Composition + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Fare Composition" subtitle="Average fare breakdown" />
          <CardBody>
            <DonutChart
              data={compositionData}
              centerValue={formatCurrency(composition.total ?? 0)}
              centerLabel="Total Fare"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Fare Distribution" subtitle="Distribution of observed fares" />
          <CardBody>
            <BarChart
              data={distribution.map((d) => ({ label: d.range, value: d.count, color: '#3B82F6' }))}
              height={250}
              formatValue={(v) => String(v)}
            />
          </CardBody>
        </Card>
      </div>

      {/* Availability Trend */}
      <Card>
        <CardHeader title="Availability Trend" subtitle="Daily observation count as availability proxy" />
        <CardBody>
          <LineChart
            series={[{
              name: 'Availability',
              color: '#14B8A6',
              data: availabilityTrend,
            }]}
            height={220}
            formatY={(v) => `${v}%`}
            formatX={(v) => {
              const d = new Date(v);
              return `${d.getDate()}/${d.getMonth() + 1}`;
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
