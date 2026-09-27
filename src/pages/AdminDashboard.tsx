import { Activity, Database, CheckCircle2, AlertTriangle, Server, Cpu, HardDrive } from 'lucide-react';
import { Card, CardHeader, CardBody, KPICard } from '@/components/ui/Card';
import { getDataQualityMetrics, COLLECTION_SOURCES, getLatestIndex } from '@/data/mockEngine';
import { formatNumber, formatRelativeTime } from '@/lib/formatters';
import { getCurrentDataMode } from '@/services/api';

export default function AdminDashboard() {
  if (getCurrentDataMode() === 'api') {
    return (
      <div className="p-6 text-secondaryText">
        Live administration metrics are available through the backend collection, quality, and analytics endpoints. No demo metrics are shown in API mode.
      </div>
    );
  }
  const quality = getDataQualityMetrics();
  const latest = getLatestIndex();
  const activeSources = COLLECTION_SOURCES.filter((s) => s.status === 'running' || s.status === 'completed').length;
  const failedSources = COLLECTION_SOURCES.filter((s) => s.status === 'failed').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-primaryText">Admin Dashboard</h2>
        <p className="text-sm text-secondaryText mt-1">
          System overview and operational health monitoring.
        </p>
      </div>

      {/* System KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Total Observations" value={formatNumber(quality.total_observations)} icon={<Database className="w-4 h-4" />} />
        <KPICard label="Data Quality" value={`${quality.quality_score}%`} icon={<CheckCircle2 className="w-4 h-4" />} />
        <KPICard label="Active Sources" value={`${activeSources}/${COLLECTION_SOURCES.length}`} icon={<Activity className="w-4 h-4" />} />
        <KPICard label="Current APIx" value={latest.api_x.toFixed(2)} />
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader title="System Resources" subtitle="Server health metrics" />
          <CardBody className="space-y-3">
            {[
              { label: 'CPU Usage', value: 34, icon: Cpu, color: '#22C55E' },
              { label: 'Memory', value: 62, icon: HardDrive, color: '#F59E0B' },
              { label: 'Disk Storage', value: 48, icon: Server, color: '#3B82F6' },
            ].map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-secondaryText" />
                      <span className="text-xs text-secondaryText">{r.label}</span>
                    </div>
                    <span className="text-xs font-mono text-primaryText">{r.value}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-navy-800 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${r.value}%`, backgroundColor: r.color }} />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Collection Status" subtitle="Source collection summary" />
          <CardBody className="space-y-2">
            {COLLECTION_SOURCES.slice(0, 6).map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    s.status === 'completed' ? 'bg-positive' :
                    s.status === 'running' ? 'bg-electric animate-pulse' :
                    s.status === 'warning' ? 'bg-warning' : 'bg-negative'
                  }`} />
                  <span className="text-xs text-primaryText">{s.name}</span>
                </div>
                <span className="text-xs text-secondaryText">{formatRelativeTime(s.last_collection)}</span>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Data Pipeline" subtitle="Processing stages" />
          <CardBody className="space-y-2">
            {[
              { label: 'Raw Data', count: quality.total_observations, status: 'completed' },
              { label: 'Validation', count: quality.total_observations - quality.missing_observations, status: 'completed' },
              { label: 'Deduplication', count: quality.total_observations - quality.duplicate_observations, status: 'completed' },
              { label: 'Outlier Detection', count: quality.valid_observations, status: 'completed' },
              { label: 'Index Calculation', count: 1, status: 'completed' },
            ].map((stage) => (
              <div key={stage.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
                  <span className="text-xs text-primaryText">{stage.label}</span>
                </div>
                <span className="text-xs font-mono text-secondaryText">{formatNumber(stage.count)}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Alerts */}
      {failedSources > 0 && (
        <Card className="p-4 border-negative/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-negative flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primaryText">{failedSources} Source(s) Failed</p>
              <p className="text-xs text-secondaryText mt-0.5">
                Some data collection sources are reporting failures. Check the Collection Monitor for details.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
