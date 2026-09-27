import { useEffect, useState } from 'react';
import { Save, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import { DEFAULT_CONFIG } from '@/lib/indexEngine';
import { getCurrentDataMode, getMethodology, updateMethodology, type MethodologyConfig } from '@/services/api';

const MOCK_CONFIG: MethodologyConfig = {
  id: 'methodology-mock', methodology_version: 'apix-v1.0', base_period: DEFAULT_CONFIG.basePeriod,
  aggregation_method: DEFAULT_CONFIG.aggregationMethod, observation_frequency: DEFAULT_CONFIG.observationFrequency,
  fare_metric: 'total_fare', outlier_method: 'iqr', route_weight_version: 'mock-v1',
  route_weights: Object.fromEntries(DEFAULT_CONFIG.routes.map((route) => [route.route_code, route.weight])), is_active: true,
};

export default function AdminConfigPage() {
  const [config, setConfig] = useState<MethodologyConfig>(MOCK_CONFIG);
  const [draft, setDraft] = useState<MethodologyConfig>(MOCK_CONFIG);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (getCurrentDataMode() === 'mock') return;
    getMethodology().then((value) => { setConfig(value); setDraft(value); }).catch((reason: Error) => setError(reason.message));
  }, []);

  const save = async () => {
    setSaving(true); setStatus(''); setError('');
    try {
      const value = getCurrentDataMode() === 'mock' ? { ...draft } : await updateMethodology(draft);
      setConfig(value); setDraft(value); setStatus('Configuration saved');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save configuration'); }
    finally { setSaving(false); }
  };
  const update = (field: keyof MethodologyConfig, value: string) => setDraft((current) => ({ ...current, [field]: value }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primaryText">Index Configuration</h2>
          <p className="text-sm text-secondaryText mt-1">
            Configure the APIx calculation methodology. Changes affect index computation.
          </p>
        </div>
        <button className="btn-primary text-xs" onClick={save} disabled={saving}>
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
      {status && <p className="text-sm text-success">{status} ({config.methodology_version})</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Warning */}
      <Card className="p-4 border-warning/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primaryText">Methodology Notice</p>
            <p className="text-xs text-secondaryText mt-0.5">
              Actual weights and methodology should be based on the prescribed PSD/index methodology
              and relevant DGCA data. This prototype configuration is for demonstration only.
            </p>
          </div>
        </div>
      </Card>

      {/* Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Base Settings" subtitle="Core index parameters" />
          <CardBody className="space-y-4">
            <div>
              <label className="block text-xs text-secondaryText mb-1">Base Period</label>
              <input type="date" className="input w-full" value={draft.base_period} onChange={(event) => update('base_period', event.target.value)} />
            </div>
            <Select
              label="Aggregation Method"
              value={draft.aggregation_method}
              onChange={(value) => update('aggregation_method', value)}
              options={[
                { value: 'weighted_average', label: 'Weighted Average' },
              ]}
              className="w-full"
            />
            <Select
              label="Observation Frequency"
              value={draft.observation_frequency}
              onChange={(value) => update('observation_frequency', value)}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'monthly', label: 'Monthly' },
              ]}
              className="w-full"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Fare and Outliers" subtitle="Supported statistical inputs" />
          <CardBody className="space-y-4">
            <Select label="Fare Metric" value={draft.fare_metric} onChange={(value) => update('fare_metric', value)} options={[{ value: 'total_fare', label: 'Total Fare' }]} className="w-full" />
            <Select label="Outlier Method" value={draft.outlier_method} onChange={(value) => update('outlier_method', value)} options={[{ value: 'iqr', label: 'IQR' }]} className="w-full" />
            <p className="text-xs text-secondaryText">Active version: {config.methodology_version}</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Fare Categories" subtitle="Tracked fare classes" />
          <CardBody className="space-y-3">
            {['Economy', 'Premium Economy', 'Business'].map((fc) => (
              <div key={fc} className="flex items-center justify-between p-2 rounded-lg bg-navy-900">
                <span className="text-sm text-primaryText">{fc}</span>
                <Badge variant="positive" dot>Active</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Index Formula */}
      <Card>
        <CardHeader title="Index Formula" subtitle="Current calculation methodology" />
        <CardBody>
          <div className="bg-navy-950 border border-borderColor rounded-lg p-6 text-center">
            <p className="text-lg font-mono text-electric-light">
              APIx<sub>t</sub> = (Σ w<sub>i</sub> × P<sub>i,t</sub> / Σ w<sub>i</sub> × P<sub>i,base</sub>) × 100
            </p>
            <div className="mt-4 text-xs text-secondaryText space-y-1">
              <p>P<sub>i,t</sub> = price for route/fare category i at time t</p>
              <p>P<sub>i,base</sub> = corresponding base-period price</p>
              <p>w<sub>i</sub> = statistical weight for route i</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
