import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/Table';
import Select from '@/components/ui/Select';
import { getObservationPage, ROUTES, AIRLINES } from '@/data/mockEngine';
import { getAirlines, getCurrentDataMode, getObservations, getRoutes, type Observation } from '@/services/api';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { DateRange } from '@/types';
import { exportToCSV, exportToJSON } from '@/lib/export';

export default function DataExplorerPage({ dateRange = '30d' }: { dateRange?: DateRange }) {
  const [page, setPage] = useState(1);
  const [routeFilter, setRouteFilter] = useState('');
  const [airlineFilter, setAirlineFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [apiRows, setApiRows] = useState<Observation[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiRouteOptions, setApiRouteOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [apiAirlineOptions, setApiAirlineOptions] = useState<Array<{ value: string; label: string }>>([]);
  const dataMode = getCurrentDataMode();

  useEffect(() => {
    if (dataMode !== 'api') {
      setApiRows([]);
      setApiError(null);
      return;
    }

    let active = true;

    const load = async () => {
      setApiLoading(true);
      setApiError(null);

      try {
        const [observationsResponse, routesResponse, airlinesResponse] = await Promise.all([
          getObservations({
            page,
            page_size: 15,
            route: routeFilter || undefined,
            airline: airlineFilter || undefined,
            availability: availabilityFilter || undefined,
          }),
          getRoutes(),
          getAirlines(),
        ]);

        if (!active) return;

        setApiRows(observationsResponse.items ?? []);
        setApiRouteOptions(routesResponse.items.map((route) => ({ value: route.route_code, label: route.route_code })));
        setApiAirlineOptions(airlinesResponse.items.map((airline) => ({ value: airline.airline_id, label: airline.airline_name })));
      } catch {
        if (active) {
          setApiError('Unable to load observations from the API backend.');
          setApiRows([]);
        }
      } finally {
        if (active) {
          setApiLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [airlineFilter, availabilityFilter, dataMode, page, routeFilter]);

  const mockResult = dataMode === 'mock'
    ? getObservationPage(page, 20, {
      route: routeFilter || undefined,
      airline: airlineFilter || undefined,
      availability: availabilityFilter || undefined,
      dateRange,
    })
    : { data: [], total: 0, page, page_size: 20 };

  const resultData = (dataMode === 'api' ? apiRows : mockResult.data) as unknown as Array<Record<string, unknown>>;
  const result = dataMode === 'api'
    ? { data: resultData, total: apiRows.length, page, page_size: 15 }
    : { ...mockResult, data: resultData };

  const routeOptions = dataMode === 'api' ? apiRouteOptions : ROUTES.map((r) => ({ value: r.route_code, label: r.route_code }));
  const airlineOptions = dataMode === 'api' ? apiAirlineOptions : AIRLINES.map((a) => ({ value: a.id, label: a.name }));

  const handleExport = () => {
    const allData = dataMode === 'api'
      ? apiRows
      : getObservationPage(1, 99999, {
        route: routeFilter || undefined,
        airline: airlineFilter || undefined,
        availability: availabilityFilter || undefined,
        dateRange,
      }).data;
    exportToCSV(allData, 'apix-observations');
  };

  if (dataMode === 'api' && apiError) {
    return <div className="flex items-center justify-center h-64 text-secondaryText">{apiError}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primaryText">Data Explorer</h2>
          <p className="text-sm text-secondaryText mt-1">
            Inspect individual airfare observations with full filtering and export.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary text-xs">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button onClick={() => exportToJSON(result.data, 'apix-observations-page')} className="btn-secondary text-xs">
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 p-4">
          <Select
            label="Route"
            value={routeFilter}
            onChange={(v) => { setRouteFilter(v); setPage(1); }}
            placeholder="All routes"
            options={routeOptions}
            className="w-48"
          />
          <Select
            label="Airline"
            value={airlineFilter}
            onChange={(v) => { setAirlineFilter(v); setPage(1); }}
            placeholder="All airlines"
            options={airlineOptions}
            className="w-48"
          />
          <Select
            label="Availability"
            value={availabilityFilter}
            onChange={(v) => { setAvailabilityFilter(v); setPage(1); }}
            placeholder="All"
            options={[
              { value: 'available', label: 'Available' },
              { value: 'limited', label: 'Limited' },
              { value: 'sold_out', label: 'Sold Out' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
            className="w-40"
          />
        </div>
      </Card>

      {/* Table */}
      {dataMode === 'api' && apiLoading ? (
        <div className="flex items-center justify-center h-32 text-secondaryText">Loading observations...</div>
      ) : (
      <Card>
        <DataTable<Record<string, unknown>>
          columns={[
            { key: 'route_code', label: 'Route', sortable: true, render: (r) => <span className="font-medium">{String((r as Record<string, unknown>).route_code ?? '')}</span> },
            { key: 'airline_name', label: 'Airline', sortable: true },
            { key: 'travel_date', label: 'Travel Date', sortable: true, render: (r) => formatDate(String((r as Record<string, unknown>).travel_date ?? '')) },
            { key: 'advance_window', label: 'Advance', sortable: true, align: 'right', render: (r) => `T+${String((r as Record<string, unknown>).advance_window ?? '')}` },
            { key: 'fare_class', label: 'Class' },
            { key: 'base_fare', label: 'Base Fare', sortable: true, align: 'right', render: (r) => <span className="font-mono">{formatCurrency(Number((r as Record<string, unknown>).base_fare ?? 0))}</span> },
            { key: 'total_fare', label: 'Total Fare', sortable: true, align: 'right', render: (r) => <span className="font-mono font-medium">{formatCurrency(Number((r as Record<string, unknown>).total_fare ?? 0))}</span> },
            { key: 'availability', label: 'Availability', align: 'center', render: (r) => (
              <Badge variant={String((r as Record<string, unknown>).availability ?? '') === 'available' ? 'positive' : String((r as Record<string, unknown>).availability ?? '') === 'limited' ? 'warning' : String((r as Record<string, unknown>).availability ?? '') === 'sold_out' ? 'negative' : 'neutral'}>
                {String((r as Record<string, unknown>).availability ?? '')}
              </Badge>
            ) },
            { key: 'source', label: 'Source' },
            { key: 'cleaning_status', label: 'Status', align: 'center', render: (r) => (
              <Badge variant={String((r as Record<string, unknown>).cleaning_status ?? '') === 'clean' ? 'positive' : String((r as Record<string, unknown>).cleaning_status ?? '') === 'raw' ? 'neutral' : 'warning'}>
                {String((r as Record<string, unknown>).cleaning_status ?? '')}
              </Badge>
            ) },
          ]}
          data={result.data}
          pageSize={15}
          searchPlaceholder="Search observations..."
        />
      </Card>
      )}
    </div>
  );
}
