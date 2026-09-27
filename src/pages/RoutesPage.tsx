import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/Table';
import Select from '@/components/ui/Select';
import { formatCurrency, formatPercent, formatRelativeTime } from '@/lib/formatters';
import { exportToCSV } from '@/lib/export';
import { loadRoutesPageData } from '@/services/dataService';
import type { DateRange, PageKey } from '@/types';

interface RoutesPageProps {
  onNavigate: (page: PageKey, params?: Record<string, string>) => void;
  dateRange?: DateRange;
}

export default function RoutesPage({ onNavigate, dateRange = '30d' }: RoutesPageProps) {
  const [originFilter, setOriginFilter] = useState('');
  const [airlineFilter, setAirlineFilter] = useState('');
  const [data, setData] = useState<Awaited<ReturnType<typeof loadRoutesPageData>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const payload = await loadRoutesPageData(dateRange);
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
    return <div className="flex items-center justify-center h-64 text-secondaryText">Loading routes...</div>;
  }

  const routeRows = data?.allStats ?? [];
  const origins = data?.origins ?? [];
  const airlineOptions = data?.airlineOptions ?? [];

  const filtered = routeRows.filter((s) => {
    if (originFilter && s.origin !== originFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primaryText">Routes</h2>
          <p className="text-sm text-secondaryText mt-1">
            Comprehensive view of all observed domestic air routes and their fare metrics.
          </p>
        </div>
        <button
          onClick={() => exportToCSV(filtered, 'apix-routes')}
          className="btn-secondary text-xs"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      <Card>
        <CardBody className="flex flex-wrap gap-3">
          <Select
            label="Origin"
            value={originFilter}
            onChange={setOriginFilter}
            placeholder="All origins"
            options={origins.map((o) => ({ value: o, label: o }))}
            className="w-40"
          />
          <Select
            label="Airline"
            value={airlineFilter}
            onChange={setAirlineFilter}
            placeholder="All airlines"
            options={airlineOptions}
            className="w-40"
          />
        </CardBody>
      </Card>

      <Card>
        <DataTable
          columns={[
            {
              key: 'route_code',
              label: 'Route',
              sortable: true,
              render: (r) => (
                <div>
                  <p className="font-medium text-primaryText">{r.route_code}</p>
                  <p className="text-xs text-secondaryText">{r.origin} → {r.destination}</p>
                </div>
              ),
            },
            { key: 'avg_fare', label: 'Avg Fare', sortable: true, align: 'right', render: (r) => <span className="font-mono">{formatCurrency(r.avg_fare)}</span> },
            { key: 'apix_contribution', label: 'APIx Weight', sortable: true, align: 'right', render: (r) => <span className="font-mono text-electric-light">{r.apix_contribution}%</span> },
            { key: 'change_pct', label: 'Change %', sortable: true, align: 'right', render: (r) => <Badge variant={r.change_pct > 5 ? 'negative' : r.change_pct > 0 ? 'warning' : 'positive'}>{formatPercent(r.change_pct)}</Badge> },
            { key: 'observations', label: 'Observations', sortable: true, align: 'right' },
            { key: 'availability_rate', label: 'Availability', sortable: true, align: 'right', render: (r) => <span className="font-mono">{r.availability_rate}%</span> },
            { key: 'airlines_count', label: 'Airlines', sortable: true, align: 'center' },
            { key: 'last_updated', label: 'Last Updated', render: (r) => <span className="text-xs text-secondaryText">{formatRelativeTime(r.last_updated)}</span> },
          ]}
          data={filtered}
          pageSize={12}
          searchPlaceholder="Search routes..."
          onRowClick={(r) => onNavigate('route-details', { route: r.route_code })}
        />
      </Card>
    </div>
  );
}
