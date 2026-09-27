import { Activity, RefreshCw } from 'lucide-react';
import { Card, CardHeader, KPICard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/Table';
import { COLLECTION_SOURCES } from '@/data/mockEngine';
import { formatRelativeTime, formatNumber } from '@/lib/formatters';
import { getCurrentDataMode } from '@/services/api';

export default function AdminCollectionPage() {
  if (getCurrentDataMode() === 'api') {
    return <div className="p-6 text-secondaryText">Live collection status is available from the FastAPI collection monitor. Demo source metrics are disabled in API mode.</div>;
  }
  const totalRecords = COLLECTION_SOURCES.reduce((s, c) => s + c.records_collected, 0);
  const avgSuccessRate = COLLECTION_SOURCES.reduce((s, c) => s + c.success_rate, 0) / COLLECTION_SOURCES.length;
  const totalErrors = COLLECTION_SOURCES.reduce((s, c) => s + c.errors, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primaryText">Data Collection Monitor</h2>
          <p className="text-sm text-secondaryText mt-1">
            Real-time status of all data collection sources.
          </p>
        </div>
        <button className="btn-secondary text-xs">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Total Sources" value={COLLECTION_SOURCES.length} icon={<Activity className="w-4 h-4" />} />
        <KPICard label="Records Collected" value={formatNumber(totalRecords)} />
        <KPICard label="Avg Success Rate" value={`${avgSuccessRate.toFixed(1)}%`} />
        <KPICard label="Total Errors" value={totalErrors} />
      </div>

      {/* Source Table */}
      <Card>
        <CardHeader title="Collection Sources" subtitle="Status and metrics for each data source" />
        <DataTable
          columns={[
            { key: 'name', label: 'Source', sortable: true, render: (r) => (
              <div>
                <p className="font-medium text-primaryText">{r.name}</p>
                <p className="text-xs text-secondaryText">{r.type === 'airline' ? 'Airline' : 'OTA Aggregator'}</p>
              </div>
            ) },
            { key: 'status', label: 'Status', align: 'center', sortable: true, render: (r) => (
              <Badge variant={r.status === 'completed' ? 'positive' : r.status === 'running' ? 'electric' : r.status === 'warning' ? 'warning' : 'negative'} dot>
                {r.status}
              </Badge>
            ) },
            { key: 'last_collection', label: 'Last Collection', render: (r) => formatRelativeTime(r.last_collection) },
            { key: 'records_collected', label: 'Records', sortable: true, align: 'right', render: (r) => formatNumber(r.records_collected) },
            { key: 'success_rate', label: 'Success Rate', sortable: true, align: 'right', render: (r) => <span className="font-mono">{r.success_rate}%</span> },
            { key: 'response_time_ms', label: 'Response Time', sortable: true, align: 'right', render: (r) => <span className="font-mono">{r.response_time_ms}ms</span> },
            { key: 'errors', label: 'Errors', sortable: true, align: 'right', render: (r) => (
              <span className={r.errors > 0 ? 'text-negative font-mono' : 'text-secondaryText font-mono'}>{r.errors}</span>
            ) },
          ]}
          data={COLLECTION_SOURCES}
          pageSize={12}
          searchable={false}
        />
      </Card>
    </div>
  );
}
