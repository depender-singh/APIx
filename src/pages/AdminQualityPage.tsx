import { Database, CheckCircle2, Copy, AlertTriangle, XCircle, Ban, Filter } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardBody, KPICard } from '@/components/ui/Card';
import DonutChart from '@/components/charts/DonutChart';
import { formatNumber } from '@/lib/formatters';
import { loadAdminQualityData } from '@/services/dataService';

export default function AdminQualityPage() {
  const [q, setQ] = useState<Awaited<ReturnType<typeof loadAdminQualityData>> | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const payload = await loadAdminQualityData();
        if (active) setQ(payload);
      } catch {
        if (active) setQ(null);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  if (!q) {
    return <div className="flex items-center justify-center h-64 text-secondaryText">Loading quality data...</div>;
  }

  const donutData = [
    { label: 'Valid', value: q.valid_observations, color: '#22C55E' },
    { label: 'Duplicates', value: q.duplicate_observations, color: '#F59E0B' },
    { label: 'Outliers', value: q.outliers, color: '#EF4444' },
    { label: 'Missing', value: q.missing_observations, color: '#6B7280' },
  ];

  const pipeline = [
    { icon: Database, label: 'Raw Data', value: q.total_observations, color: '#3B82F6' },
    { icon: Filter, label: 'Validation', value: q.total_observations - q.missing_observations, color: '#14B8A6' },
    { icon: Copy, label: 'Deduplication', value: q.total_observations - q.duplicate_observations, color: '#F59E0B' },
    { icon: AlertTriangle, label: 'Outlier Detection', value: q.valid_observations, color: '#22C55E' },
    { icon: CheckCircle2, label: 'Standardization', value: q.valid_observations, color: '#8B5CF6' },
    { icon: CheckCircle2, label: 'Clean Data', value: q.valid_observations, color: '#22C55E' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-primaryText">Data Quality</h2>
        <p className="text-sm text-secondaryText mt-1">
          Monitoring data quality across the collection and cleaning pipeline.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Data Quality Score" value={`${q.quality_score}%`} icon={<CheckCircle2 className="w-4 h-4" />} />
        <KPICard label="Total Observations" value={formatNumber(q.total_observations)} icon={<Database className="w-4 h-4" />} />
        <KPICard label="Valid Observations" value={formatNumber(q.valid_observations)} icon={<CheckCircle2 className="w-4 h-4 text-positive" />} />
        <KPICard label="Cleaning Success" value={`${q.cleaning_success_rate}%`} />
      </div>

      {/* Pipeline */}
      <Card>
        <CardHeader title="Data Quality Pipeline" subtitle="Processing stages from raw to clean data" />
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {pipeline.map((stage, i) => {
              const Icon = stage.icon;
              return (
                <div key={i} className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-navy-800 border border-borderColor flex items-center justify-center mx-auto mb-2">
                    <Icon className="w-5 h-5" style={{ color: stage.color }} />
                  </div>
                  <p className="text-xs font-medium text-primaryText">{stage.label}</p>
                  <p className="text-xs text-secondaryText mt-0.5 font-mono">{formatNumber(stage.value)}</p>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Quality Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Observation Quality Distribution" subtitle="Breakdown by cleaning status" />
          <CardBody>
            <DonutChart data={donutData} centerValue={`${q.quality_score}%`} centerLabel="Quality" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Quality Metrics" subtitle="Detailed breakdown" />
          <CardBody className="space-y-3">
            {[
              { label: 'Total Observations', value: q.total_observations, icon: Database, color: 'text-electric-light' },
              { label: 'Valid Observations', value: q.valid_observations, icon: CheckCircle2, color: 'text-positive' },
              { label: 'Duplicate Observations', value: q.duplicate_observations, icon: Copy, color: 'text-warning' },
              { label: 'Missing Observations', value: q.missing_observations, icon: AlertTriangle, color: 'text-negative' },
              { label: 'Outliers Detected', value: q.outliers, icon: AlertTriangle, color: 'text-negative' },
              { label: 'Sold Out Records', value: q.sold_out_records, icon: XCircle, color: 'text-warning' },
              { label: 'Cancelled Flights', value: q.cancelled_flights, icon: Ban, color: 'text-negative' },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="flex items-center justify-between p-2 rounded-lg bg-navy-900">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${m.color}`} />
                    <span className="text-sm text-secondaryText">{m.label}</span>
                  </div>
                  <span className="text-sm font-mono text-primaryText">{formatNumber(m.value)}</span>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
