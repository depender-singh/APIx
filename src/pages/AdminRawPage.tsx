import { Download } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/Table';
import { RAW_OBSERVATIONS } from '@/data/mockEngine';
import { formatDateTime, formatCurrency } from '@/lib/formatters';
import { exportToCSV } from '@/lib/export';
import { getCurrentDataMode } from '@/services/api';

export default function AdminRawPage() {
  if (getCurrentDataMode() === 'api') {
    return <div className="p-6 text-secondaryText">Use the FastAPI raw-observations endpoint for live provenance. Demo raw observations are disabled in API mode.</div>;
  }
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primaryText">Raw Observations</h2>
          <p className="text-sm text-secondaryText mt-1">
            Inspect raw scraped observations before cleaning. Raw data is preserved permanently.
          </p>
        </div>
        <button onClick={() => exportToCSV(RAW_OBSERVATIONS, 'apix-raw-observations')} className="btn-secondary text-xs">
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      <Card>
        <CardHeader title="Raw Observation Log" subtitle={`${RAW_OBSERVATIONS.length} raw observations preserved`} />
        <DataTable
          columns={[
            { key: 'id', label: 'ID', sortable: true, render: (r) => <span className="font-mono text-xs">{r.id}</span> },
            { key: 'source', label: 'Source', sortable: true },
            { key: 'route_code', label: 'Route', sortable: true },
            { key: 'airline_code', label: 'Airline', sortable: true },
            { key: 'travel_date', label: 'Travel Date', sortable: true },
            { key: 'search_date', label: 'Search Date', sortable: true, render: (r) => formatDateTime(r.search_date) },
            { key: 'raw_fare', label: 'Raw Fare', sortable: true, align: 'right', render: (r) => <span className="font-mono">{formatCurrency(r.raw_fare)}</span> },
            { key: 'response_status', label: 'HTTP Status', align: 'center', render: (r) => (
              <Badge variant={r.response_status === 200 ? 'positive' : r.response_status === 403 || r.response_status === 429 ? 'warning' : 'negative'}>
                {r.response_status}
              </Badge>
            ) },
            { key: 'status', label: 'Processing Status', align: 'center', sortable: true, render: (r) => (
              <Badge variant={r.status === 'processed' ? 'positive' : r.status === 'pending' ? 'warning' : 'negative'} dot>
                {r.status}
              </Badge>
            ) },
          ]}
          data={RAW_OBSERVATIONS}
          pageSize={15}
          searchPlaceholder="Search raw observations..."
        />
      </Card>
    </div>
  );
}
