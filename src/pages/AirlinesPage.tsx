import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Card, CardHeader, CardBody, KPICard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import BarChart from '@/components/charts/BarChart';
import { DataTable } from '@/components/ui/Table';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { exportToCSV } from '@/lib/export';
import { loadAirlinesPageData } from '@/services/dataService';
import type { DateRange, PageKey } from '@/types';

interface AirlinesPageProps {
  onNavigate: (page: PageKey, params?: Record<string, string>) => void;
  dateRange?: DateRange;
}

export default function AirlinesPage({ onNavigate, dateRange = '30d' }: AirlinesPageProps) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadAirlinesPageData>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const payload = await loadAirlinesPageData(dateRange);
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
    return <div className="flex items-center justify-center h-64 text-secondaryText">Loading airlines...</div>;
  }

  const stats = data?.stats ?? [];
  const comparisonData = data?.comparisonData ?? [];
  const avgFareData = comparisonData.map((d) => ({ label: d.name, value: d.avg_fare, color: d.color }));
  const routesData = comparisonData.map((d) => ({ label: d.name, value: d.routes, color: d.color }));
  const availabilityData = comparisonData.map((d) => ({ label: d.name, value: d.availability, color: d.color }));
  const totalObs = stats.reduce((s, a) => s + (a.observations || 0), 0);
  const avgFare = stats.length > 0 ? Math.round(stats.reduce((s, a) => s + (a.avg_fare || 0), 0) / stats.length) : 0;
  const routesCovered = stats.reduce((total, airline) => total + (airline.routes_count || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primaryText">Airlines</h2>
          <p className="text-sm text-secondaryText mt-1">
            Comparative analysis of domestic airlines tracked by APIx.
          </p>
        </div>
        <button onClick={() => exportToCSV(stats, 'apix-airlines')} className="btn-secondary text-xs">
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Airlines Tracked" value={stats.length} />
        <KPICard label="Total Observations" value={totalObs.toLocaleString('en-IN')} />
        <KPICard label="Average Fare" value={formatCurrency(avgFare)} />
        <KPICard label="Routes Covered" value={routesCovered} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader title="Average Fare" subtitle="By airline" />
          <CardBody>
            <BarChart data={avgFareData} height={250} formatValue={(v) => formatCurrency(v)} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Routes Covered" subtitle="By airline" />
          <CardBody>
            <BarChart data={routesData} height={250} formatValue={(v) => String(v)} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Availability Rate" subtitle="By airline" />
          <CardBody>
            <BarChart data={availabilityData} height={250} formatValue={(v) => `${v}%`} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <DataTable
          columns={[
            {
              key: 'name',
              label: 'Airline',
              sortable: true,
              render: (r) => (
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: r.airline?.color }} />
                  <div>
                    <p className="font-medium text-primaryText">{r.airline?.name}</p>
                    <p className="text-xs text-secondaryText">{r.airline?.code}</p>
                  </div>
                </div>
              ),
            },
            { key: 'avg_fare', label: 'Avg Fare', sortable: true, align: 'right', render: (r) => <span className="font-mono">{formatCurrency(r.avg_fare)}</span> },
            { key: 'fare_change', label: 'Change %', sortable: true, align: 'right', render: (r) => <Badge variant={r.fare_change > 0 ? 'warning' : 'positive'}>{formatPercent(r.fare_change)}</Badge> },
            { key: 'routes_count', label: 'Routes', sortable: true, align: 'right' },
            { key: 'observations', label: 'Observations', sortable: true, align: 'right', render: (r) => r.observations?.toLocaleString('en-IN') },
            { key: 'availability_rate', label: 'Availability', sortable: true, align: 'right', render: (r) => <span className="font-mono">{r.availability_rate}%</span> },
            { key: 'avg_taxes', label: 'Avg Taxes', align: 'right', render: (r) => <span className="font-mono">{r.avg_taxes == null ? 'Unavailable' : formatCurrency(r.avg_taxes)}</span> },
            { key: 'avg_convenience_fee', label: 'Avg Conv. Fee', align: 'right', render: (r) => <span className="font-mono">{r.avg_convenience_fee == null ? 'Unavailable' : formatCurrency(r.avg_convenience_fee)}</span> },
          ]}
          data={stats}
          pageSize={10}
          searchable={false}
          onRowClick={(r) => onNavigate('airline-details', { airline: r.airline_id })}
        />
      </Card>
    </div>
  );
}
