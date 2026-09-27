import { Activity, Plane, Building2, Database, CheckCircle2, BarChart3, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardBody, KPICard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LineChart from '@/components/charts/LineChart';
import Sparkline from '@/components/charts/Sparkline';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/formatters';
import { exportToCSV } from '@/lib/export';
import { loadOverviewData } from '@/services/dataService';
import { getCurrentDataMode } from '@/services/api';
import type { DateRange, PageKey } from '@/types';

interface OverviewDashboardProps {
  onNavigate: (page: PageKey, params?: Record<string, string>) => void;
  dateRange?: DateRange;
}

export default function OverviewDashboard({ onNavigate, dateRange = '30d' }: OverviewDashboardProps) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadOverviewData>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataMode = getCurrentDataMode();

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const payload = await loadOverviewData(dateRange);
        if (active) {
          setData(payload);
        }
      } catch {
        if (active) {
          setError('Unable to load dashboard data.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [dateRange]);

  if (loading && !data) {
    return <div className="flex items-center justify-center h-64 text-secondaryText">Loading dashboard data...</div>;
  }

  if (error && !data) {
    return <div className="flex items-center justify-center h-64 text-secondaryText">{error}</div>;
  }

  const currentData = data!;
  const latestIndex = currentData.latestIndex;
  const routeStats = currentData.routeStats;
  const topMovers = currentData.topMovers;
  const quality = currentData.quality;
  const availableFlights = currentData.availableFlights;
  const apixSparkline = currentData.sparkline;
  const indexSeries = currentData.indexSeries;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primaryText">Airfare Price Index</h2>
          <p className="text-sm text-secondaryText mt-1">
            Real-time and historical intelligence on domestic airfare movements in India.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={dataMode === 'api' ? 'positive' : 'warning'} dot>
            {dataMode === 'api' ? 'Live API Data' : 'Demo Data'}
          </Badge>
          <button
            onClick={() => exportToCSV(currentData.indexSeries[0]?.data.map((point) => ({ date: point.x, api_x: point.y })), 'apix-index-values')}
            className="btn-secondary text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard
          label="Current APIx"
          value={latestIndex ? latestIndex.index_value.toFixed(2) : '0.00'}
          change={latestIndex ? latestIndex.index_value - 100 : 0}
          changeLabel="Base"
          icon={<Activity className="w-4 h-4" />}
          sparkline={<Sparkline data={apixSparkline} width={60} height={20} />}
        />
        <KPICard
          label="Routes Observed"
          value={routeStats.length}
          icon={<Plane className="w-4 h-4" />}
        />
        <KPICard
          label="Airlines Tracked"
          value={currentData.airlinesCount}
          icon={<Building2 className="w-4 h-4" />}
        />
        <KPICard
          label="Quotes Collected"
          value={formatNumber(currentData.quotesCollected)}
          icon={<Database className="w-4 h-4" />}
        />
        <KPICard
          label="Available Flights"
          value={formatNumber(availableFlights)}
          icon={<BarChart3 className="w-4 h-4" />}
        />
        <KPICard
          label="Data Quality"
          value={`${quality.quality_score}%`}
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
      </div>

      <Card>
        <CardHeader
          title="Airfare Price Index Trend"
          subtitle="Daily APIx movement over the last 60 days"
          action={
            <div className="flex items-center gap-1">
              {['Daily', 'Weekly', 'Monthly'].map((tab, i) => (
                <button
                  key={tab}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    i === 0 ? 'bg-electric/15 text-electric-light' : 'text-secondaryText hover:text-primaryText'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          }
        />
        <CardBody>
          <LineChart
            series={indexSeries}
            height={300}
            formatY={(v) => v.toFixed(0)}
            formatX={(v) => {
              const d = new Date(v);
              return `${d.getDate()}/${d.getMonth() + 1}`;
            }}
            formatTooltip={(p) => `${p.seriesName}: ${p.y.toFixed(2)}`}
          />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="Route Performance"
            subtitle="Current average fares and price movement"
            action={
              <button onClick={() => onNavigate('routes')} className="text-xs text-electric-light hover:text-electric">
                View all →
              </button>
            }
          />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-navy-900">
                    <th className="table-header">Route</th>
                    <th className="table-header text-right">Current Fare</th>
                    <th className="table-header text-right">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {routeStats.slice(0, 8).map((r) => (
                    <tr
                      key={r.route_code}
                      className="table-row cursor-pointer"
                      onClick={() => onNavigate('route-details', { route: r.route_code })}
                    >
                      <td className="table-cell font-medium">
                        {r.origin} → {r.destination}
                      </td>
                      <td className="table-cell text-right font-mono">{formatCurrency(r.avg_fare)}</td>
                      <td className="table-cell text-right">
                        <Badge variant={r.change_pct > 5 ? 'negative' : r.change_pct > 0 ? 'warning' : 'positive'}>
                          {formatPercent(r.change_pct)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Biggest Fare Increases" subtitle="Top 5 routes by price movement" />
            <CardBody className="p-0">
              <div className="divide-y divide-borderColor">
                {topMovers.increases.map((r, i) => (
                  <div
                    key={r.route_code}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-navy-800/50 cursor-pointer"
                    onClick={() => onNavigate('route-details', { route: r.route_code })}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-secondaryText w-4">{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-primaryText">{r.route_code}</p>
                        <p className="text-xs text-secondaryText">{formatCurrency(r.avg_fare)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkline data={[r.avg_fare * 0.9, r.avg_fare * 0.95, r.avg_fare * 0.98, r.avg_fare]} color="#EF4444" width={50} height={20} />
                      <div className="flex items-center gap-1 text-negative text-sm font-medium">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        {formatPercent(r.change_pct)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Biggest Fare Decreases" subtitle="Top 5 routes by price drop" />
            <CardBody className="p-0">
              <div className="divide-y divide-borderColor">
                {topMovers.decreases.map((r, i) => (
                  <div
                    key={r.route_code}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-navy-800/50 cursor-pointer"
                    onClick={() => onNavigate('route-details', { route: r.route_code })}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-secondaryText w-4">{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-primaryText">{r.route_code}</p>
                        <p className="text-xs text-secondaryText">{formatCurrency(r.avg_fare)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkline data={[r.avg_fare * 1.1, r.avg_fare * 1.05, r.avg_fare * 1.02, r.avg_fare]} color="#22C55E" width={50} height={20} />
                      <div className="flex items-center gap-1 text-positive text-sm font-medium">
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        {formatPercent(r.change_pct)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Lead-Time Analysis', page: 'lead-time' as PageKey, desc: 'Booking window impact' },
          { label: 'Back-testing', page: 'backtesting' as PageKey, desc: 'APIx vs DGCA validation' },
          { label: 'Fare Composition', page: 'fare-composition' as PageKey, desc: 'Fare breakdown' },
          { label: 'Data Explorer', page: 'data-explorer' as PageKey, desc: 'Raw observations' },
        ].map((link) => (
          <Card key={link.label} hover className="p-4 cursor-pointer" >
            <div onClick={() => onNavigate(link.page)}>
              <p className="text-sm font-medium text-primaryText">{link.label}</p>
              <p className="text-xs text-secondaryText mt-0.5">{link.desc}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
