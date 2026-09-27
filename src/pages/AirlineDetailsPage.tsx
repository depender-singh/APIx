import { ArrowLeft, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardBody, KPICard } from '@/components/ui/Card';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import DonutChart from '@/components/charts/DonutChart';
import { formatCurrency } from '@/lib/formatters';
import type { DateRange } from '@/types';
import { exportToCSV } from '@/lib/export';
import { loadAirlineDetailData } from '@/services/dataService';

interface AirlineDetailsPageProps {
  airlineId: string;
  onBack: () => void;
  dateRange?: DateRange;
}

export default function AirlineDetailsPage({ airlineId, onBack }: AirlineDetailsPageProps) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadAirlineDetailData>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const payload = await loadAirlineDetailData(airlineId);
        if (active) setData(payload);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [airlineId]);

  if (loading && !data) {
    return <div className="flex items-center justify-center h-64 text-secondaryText">Loading airline details...</div>;
  }

  if (!data?.airline || !data.stats) {
    return <div className="flex items-center justify-center h-64 text-secondaryText">Airline not found.</div>;
  }

  const { airline, stats, trend, routeData, composition, distribution, leadTimeData, compositionData } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: airline.color }} />
          <div>
            <h2 className="text-2xl font-bold text-primaryText">{airline.name}</h2>
            <p className="text-sm text-secondaryText">Code: {airline.code} · {stats.routes_count} routes observed</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard label="Average Fare" value={formatCurrency(stats.avg_fare)} change={stats.fare_change} />
        <KPICard label="Market Coverage" value={`${stats.routes_count} routes`} />
        <KPICard label="Observations" value={stats.observations.toLocaleString('en-IN')} />
        <KPICard label="Availability" value={`${stats.availability_rate}%`} />
        <KPICard label="Avg Taxes" value={stats.avg_taxes == null ? 'N/A' : formatCurrency(stats.avg_taxes)} />
        <KPICard label="Avg Conv. Fee" value={stats.avg_convenience_fee == null ? 'N/A' : formatCurrency(stats.avg_convenience_fee)} />
      </div>

      {/* Fare Trend */}
      <Card>
        <CardHeader
          title="Historical Fare Trend"
          subtitle={`Daily average fare for ${airline.name} over last 30 days`}
          action={
            <button onClick={() => exportToCSV(trend, `apix-${airline.name}-trend`)} className="btn-secondary text-xs">
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          }
        />
        <CardBody>
          <LineChart
            series={[{
              name: 'Average Fare',
              color: airline.color,
              data: trend.map((t) => ({ x: t.date, y: t.fare })),
            }]}
            height={280}
            formatY={(v) => `₹${v}`}
            formatX={(v) => {
              const d = new Date(v);
              return `${d.getDate()}/${d.getMonth() + 1}`;
            }}
            formatTooltip={(p) => formatCurrency(p.y)}
          />
        </CardBody>
      </Card>

      {/* Route-wise fare + Lead-time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Route-wise Fare" subtitle="Average fare by route" />
          <CardBody>
            <BarChart
              data={routeData.slice(0, 10).map((r) => ({ label: r.route, value: r.avg_fare, color: airline.color }))}
              height={250}
              formatValue={(v) => formatCurrency(v)}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Lead-Time Behaviour" subtitle="Advance booking impact on fare" />
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
              data={distribution.map((d) => ({ label: d.range, value: d.count, color: airline.color }))}
              height={250}
              formatValue={(v) => String(v)}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
