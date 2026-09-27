import { Download, PartyPopper, Calendar } from 'lucide-react';
import { Card, CardHeader, CardBody, KPICard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import BarChart from '@/components/charts/BarChart';
import { FESTIVAL_EVENTS_DATA } from '@/data/mockEngine';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { DateRange } from '@/types';
import { exportToCSV } from '@/lib/export';
import { getCurrentDataMode } from '@/services/api';

export default function FestivalsPage({ dateRange = '30d' }: { dateRange?: DateRange }) {
  if (getCurrentDataMode() === 'api') {
    return (
      <div className="p-6 text-secondaryText">
        Festival demand analysis is unavailable in live API mode because no persisted event-impact dataset is configured.
      </div>
    );
  }
  void dateRange;
  const events = FESTIVAL_EVENTS_DATA;
  const avgIncrease = events.reduce((s, e) => s + e.percentage_increase, 0) / events.length;

  const chartData = events.map((e) => ({
    label: e.name.length > 10 ? e.name.slice(0, 8) + '...' : e.name,
    value: e.percentage_increase,
    color: e.percentage_increase > 25 ? '#EF4444' : e.percentage_increase > 15 ? '#F59E0B' : '#14B8A6',
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primaryText">Festival & Demand Analysis</h2>
          <p className="text-sm text-secondaryText mt-1">
            Airfare changes during high-demand festival, holiday, and travel seasons.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning" dot>Demo Data</Badge>
          <button onClick={() => exportToCSV(events, 'apix-festivals')} className="btn-secondary text-xs">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Events Tracked" value={events.length} icon={<PartyPopper className="w-4 h-4" />} />
        <KPICard label="Avg Fare Increase" value={`+${avgIncrease.toFixed(1)}%`} />
        <KPICard label="Highest Increase" value={`+${Math.max(...events.map((e) => e.percentage_increase))}%`} />
        <KPICard label="Impacted Routes" value={new Set(events.flatMap((e) => e.impacted_routes)).size} />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader title="Festival Impact on Airfares" subtitle="Percentage fare increase during each event" />
        <CardBody>
          <BarChart data={chartData} height={280} formatValue={(v) => `+${v}%`} />
        </CardBody>
      </Card>

      {/* Timeline + Event Cards */}
      <Card>
        <CardHeader title="Demand Events Timeline" subtitle="Festival and holiday periods with fare impact" />
        <CardBody className="p-0">
          <div className="divide-y divide-borderColor">
            {events.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3 hover:bg-navy-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-navy-800 border border-borderColor flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-electric-light" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-primaryText">{e.name}</p>
                      <Badge variant={e.type === 'festival' ? 'electric' : e.type === 'holiday' ? 'teal' : e.type === 'long_weekend' ? 'warning' : 'neutral'}>
                        {e.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-secondaryText mt-0.5">
                      {formatDate(e.start_date)} — {formatDate(e.end_date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-secondaryText">Before</p>
                    <p className="text-sm font-mono text-primaryText">{formatCurrency(e.avg_fare_before)}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-secondaryText">During</p>
                    <p className="text-sm font-mono text-primaryText">{formatCurrency(e.avg_fare_during)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-secondaryText">Increase</p>
                    <p className="text-sm font-bold text-negative">+{e.percentage_increase}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
