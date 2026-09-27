import { useEffect, useState } from 'react';
import { Save, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardBody, KPICard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/Table';
import { ROUTES } from '@/data/mockEngine';
import { formatRelativeTime } from '@/lib/formatters';
import { getCurrentDataMode, getMethodology, getRoutes, updateMethodology, type MethodologyConfig, type Route as ApiRoute } from '@/services/api';

export default function AdminWeightsPage() {
  const [config, setConfig] = useState<MethodologyConfig | null>(null);
  const [routes, setRoutes] = useState<Array<{ route_code: string; origin: string; destination: string; weight: number; active: boolean; last_updated: string }>>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (getCurrentDataMode() === 'mock') {
      setConfig({ id: 'methodology-mock', methodology_version: 'apix-v1.0', base_period: '2025-09-12', aggregation_method: 'weighted_average', observation_frequency: 'daily', fare_metric: 'total_fare', outlier_method: 'iqr', route_weight_version: 'mock-v1', route_weights: Object.fromEntries(ROUTES.map((route) => [route.route_code, route.weight])), is_active: true });
      setRoutes(ROUTES.map((route) => ({ route_code: route.route_code, origin: route.origin, destination: route.destination, weight: route.weight, active: route.active, last_updated: route.last_updated })));
      return;
    }
    Promise.all([getMethodology(), getRoutes()]).then(([methodology, response]) => {
      setConfig(methodology);
      setRoutes(response.items.map((route: ApiRoute) => ({ route_code: route.route_code, origin: route.origin, destination: route.destination, weight: methodology.route_weights[route.route_code] ?? 0, active: route.is_active, last_updated: route.updated_at })));
    }).catch((reason: Error) => setError(reason.message));
  }, []);

  const totalWeight = routes.reduce((sum, route) => sum + route.weight, 0);
  const changed = config ? routes.some((route) => route.weight !== (config.route_weights[route.route_code] ?? 0)) : false;
  const save = async () => {
    if (!config || routes.some((route) => route.weight <= 0)) { setError('All route weights must be positive.'); return; }
    setSaving(true); setStatus(''); setError('');
    try {
      const value = getCurrentDataMode() === 'mock' ? { ...config, route_weights: Object.fromEntries(routes.map((route) => [route.route_code, route.weight])) } : await updateMethodology({ ...config, route_weights: Object.fromEntries(routes.map((route) => [route.route_code, route.weight])), methodology_version: `${config.methodology_version}-weights` });
      setConfig(value); setStatus(`Saved ${value.methodology_version}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save weights'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primaryText">Route & Weight Management</h2>
          <p className="text-sm text-secondaryText mt-1">
            Configure representative route basket and statistical weights for APIx calculation.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary text-xs" onClick={save} disabled={saving}>
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Weights'}
          </button>
        </div>
      </div>
      {changed && <p className="text-xs text-warning">Unsaved changes</p>}
      {status && <p className="text-sm text-success">{status}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Warning */}
      <Card className="p-4 border-warning/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-secondaryText">
            Route weights should be based on the prescribed methodology and relevant DGCA passenger
            traffic data. The current weights are demo values for prototype demonstration only.
          </p>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Total Routes" value={routes.length} />
        <KPICard label="Active Routes" value={routes.filter((r) => r.active).length} />
        <KPICard label="Total Weight" value={`${totalWeight}%`} />
        <KPICard label="Avg Weight" value={`${(totalWeight / (routes.length || 1)).toFixed(1)}%`} />
      </div>

      {/* Route Weight Table */}
      <Card>
        <CardHeader title="Route Weight Configuration" subtitle="Statistical weights for representative route basket" />
        <DataTable
          columns={[
            { key: 'route_code', label: 'Route', sortable: true, render: (r) => <span className="font-medium">{r.route_code}</span> },
            { key: 'origin', label: 'Origin', sortable: true },
            { key: 'destination', label: 'Destination', sortable: true },
            { key: 'weight', label: 'Weight (%)', sortable: true, align: 'right', render: (r) => (
              <input
                type="number"
                value={r.weight}
                onChange={(event) => setRoutes((current) => current.map((item) => item.route_code === r.route_code ? { ...item, weight: Number(event.target.value) } : item))}
                className="input w-20 text-right font-mono"
              />
            ) },
            { key: 'passenger_traffic_basis', label: 'Traffic Basis' },
            { key: 'active', label: 'Status', align: 'center', render: (r) => (
              <Badge variant={r.active ? 'positive' : 'neutral'} dot>{r.active ? 'Active' : 'Inactive'}</Badge>
            ) },
            { key: 'last_updated', label: 'Last Updated', render: (r) => <span className="text-xs text-secondaryText">{formatRelativeTime(r.last_updated)}</span> },
          ]}
          data={routes}
          pageSize={15}
          searchable={true}
          searchPlaceholder="Search routes..."
        />
      </Card>

      {/* Weight Distribution */}
      <Card>
        <CardHeader title="Weight Distribution" subtitle="Visual representation of route weights" />
        <CardBody>
          <div className="space-y-2">
            {routes.slice(0, 10).map((r) => (
              <div key={r.route_code} className="flex items-center gap-3">
                <span className="text-xs text-secondaryText w-20 font-mono">{r.route_code}</span>
                <div className="flex-1 h-4 rounded-full bg-navy-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-electric transition-all duration-500"
                    style={{ width: `${(r.weight / 15) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-primaryText w-10 text-right">{r.weight}%</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
