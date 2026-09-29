const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export type ApiMode = 'mock' | 'api';

export function getCurrentDataMode(): ApiMode {
  // The frontend can render its built-in demo dataset when no backend mode is configured.
  return import.meta.env.VITE_DATA_MODE === 'api' ? 'api' : 'mock';
}

export interface ApiResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface HealthResponse {
  status: string;
  app: string;
  environment: string;
  data_mode?: string;
  service?: string;
  mode?: string;
}

export interface Airline {
  id: string;
  airline_id: string;
  airline_name: string;
  iata_code?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Route {
  id: string;
  route_code: string;
  origin: string;
  destination: string;
  origin_city?: string | null;
  destination_city?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Observation {
  id: string;
  route_id: string;
  data_source_id?: string | null;
  route_code: string;
  origin: string;
  destination: string;
  airline_id: string;
  flight?: string | null;
  travel_date: string;
  search_date: string;
  advance_window: number;
  fare_class: string | null;
  base_fare: number | null;
  taxes: number | null;
  udf: number | null;
  convenience_fee: number | null;
  total_fare: number;
  currency?: string | null;
  availability: string;
  source: string;
  source_type?: string | null;
  collection_timestamp: string;
  cleaning_status: string;
  index_eligible: boolean;
  organization?: string | null;
  dataset?: string | null;
  dataset_id?: string | null;
  version?: string | null;
  license?: string | null;
  terms_url?: string | null;
  reference_period?: string | null;
  retrieved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IndexValue {
  id: string;
  index_date: string;
  index_value: number;
  base_period?: string | null;
  aggregation_method?: string | null;
  observation_frequency?: string | null;
  route_weight_version?: string | null;
  created_at: string;
}

export interface DataQualityMetrics {
  total_observations: number;
  valid_observations: number;
  invalid_observations: number;
  duplicate_observations: number;
  missing_field_observations: number;
  sold_out_observations: number;
  cancelled_observations: number;
  outlier_observations: number;
  available_observations: number;
  index_eligible_observations: number;
  completeness_rate?: number | null;
  validity_rate?: number | null;
  duplicate_rate?: number | null;
  availability_rate?: number | null;
  outlier_rate?: number | null;
}

export interface OverviewAnalytics {
  latest_index: { index_date: string; index_value: number } | null;
  route_stats: AnalyticsRouteStats[];
  top_movers: {
    increases: AnalyticsRouteStats[];
    decreases: AnalyticsRouteStats[];
  };
  quality: DataQualityMetrics;
  available_flights: number;
  airlines_count: number;
  quotes_collected: number;
  index_series: Array<{ index_date: string; index_value: number }>;
  sparkline: number[];
}

export interface AnalyticsRouteStats {
  route_code: string;
  origin: string;
  destination: string;
  avg_fare: number;
  change_pct: number;
  observations: number;
  availability_rate: number;
  airlines_count: number;
  apix_contribution: number;
  last_updated?: string | null;
}

export interface AnalyticsAirlineStats {
  airline_id: string;
  avg_fare: number;
  fare_change: number;
  routes_count: number;
  observations: number;
  availability_rate: number;
  avg_taxes: number | null;
  avg_convenience_fee: number | null;
}

export interface AnalyticsLeadTimePoint {
  advance_window: number;
  avg_fare: number;
  observations: number;
}

export interface AnalyticsFareComposition {
  base_fare: number | null;
  taxes: number | null;
  udf: number | null;
  convenience_fee: number | null;
  total: number | null;
  decomposition_status: string;
  decomposition_observations: number;
}

export interface AnalyticsAvailabilityStats {
  rate: number;
  available: number;
  limited: number;
  sold_out: number;
  cancelled: number;
  total: number;
}

export interface AnalyticsIndexPoint {
  index_date: string;
  index_value: number;
}

export interface MethodologyConfig {
  id: string;
  methodology_version: string;
  base_period: string;
  aggregation_method: string;
  observation_frequency: string;
  fare_metric: string;
  outlier_method: string;
  route_weight_version: string;
  route_weights: Record<string, number>;
  is_active: boolean;
}

export interface MethodologyUpdate {
  methodology_version: string;
  base_period: string;
  aggregation_method: string;
  observation_frequency: string;
  fare_metric: string;
  outlier_method: string;
  route_weights: Record<string, number>;
}

export interface BenchmarkRecord {
  id: string;
  benchmark_date: string;
  route_code: string;
  benchmark_value: number;
  benchmark_metric: string;
  benchmark_scope?: 'route_level_airfare' | 'aggregate_airfare_reference' | 'traffic_reference';
  currency?: string | null;
  period_type: string;
  source?: string | null;
  source_type?: string | null;
  dataset?: string | null;
  dataset_id?: string | null;
  dataset_version?: string | null;
  source_document?: string | null;
  source_url?: string | null;
  reference_period?: string | null;
  retrieved_at?: string | null;
  license?: string | null;
  provenance?: Record<string, unknown> | null;
  notes?: string | null;
  created_at: string;
}

export interface BenchmarkListResponse {
  items: BenchmarkRecord[];
  total: number;
  page: number;
  page_size: number;
  status: 'available' | 'source_not_imported';
}

export interface BacktestResult {
  id: string;
  benchmark_source: string;
  benchmark_dataset?: string | null;
  benchmark_version?: string | null;
  methodology_version?: string | null;
  route_scope?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  frequency: string;
  observation_count: number;
  correlation?: number | null;
  mae?: number | null;
  rmse?: number | null;
  directional_accuracy?: number | null;
  bias?: number | null;
  mape?: number | null;
  stability?: number | null;
  status: string;
  series: Array<{ date: string; apix: number; benchmark: number }>;
  route_results: Array<Record<string, unknown>>;
  created_at: string;
}

export interface OfficialIndicator {
  id: string;
  source_type: string;
  organization: string;
  source: string;
  dataset_name: string;
  dataset_id?: string | null;
  dataset_version?: string | null;
  indicator_code: string;
  indicator_name: string;
  category?: string | null;
  geography?: string | null;
  unit: string;
  observation_date: string;
  value: number;
  base_period?: string | null;
  frequency: string;
  reference_period?: string | null;
  source_url?: string | null;
  retrieved_at?: string | null;
  published_at?: string | null;
  methodology_version?: string | null;
  provenance: Record<string, unknown>;
  is_official: boolean;
  base_year?: number | null;
  series?: string | null;
  year?: number | null;
  month?: number | null;
  state?: string | null;
  sector?: string | null;
  division?: string | null;
  group?: string | null;
  class_name?: string | null;
  sub_class?: string | null;
  item?: string | null;
  code?: string | null;
  index_value?: number | string | null;
  inflation_value?: number | string | null;
  imputation?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InflationContext {
  status: 'source_not_imported' | 'insufficient_data' | 'valid';
  source_type: string;
  indicator_code: string;
  items: OfficialIndicator[];
  apix_series: Array<{ date: string; apix: number; cpi: number; cpi_inflation?: number | null }>;
  comparison: {
    observation_count: number;
    apix_change_pct: number;
    cpi_change_pct: number;
    difference_percentage_points: number;
  } | null;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = init
    ? await fetch(`${API_BASE_URL}${path}`, { headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) }, ...init })
    : await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function getHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/api/v1/health');
}

export async function getObservations(
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<ApiResponse<Observation>> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== null && value !== undefined && value !== '') {
      query.append(key, String(value));
    }
  }

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<ApiResponse<Observation>>(`/api/v1/observations${suffix}`);
}

export async function getObservation(id: string): Promise<Observation> {
  return apiRequest<Observation>(`/api/v1/observations/${id}`);
}

export async function getRoutes(): Promise<ApiResponse<Route>> {
  return apiRequest<ApiResponse<Route>>('/api/v1/routes');
}

export async function getRoute(routeCode: string): Promise<Route> {
  return apiRequest<Route>(`/api/v1/routes/${routeCode}`);
}

export async function getAirlines(): Promise<ApiResponse<Airline>> {
  return apiRequest<ApiResponse<Airline>>('/api/v1/airlines');
}

export async function getAirline(airlineId: string): Promise<Airline> {
  return apiRequest<Airline>(`/api/v1/airlines/${airlineId}`);
}

export async function getLatestIndex(): Promise<IndexValue | null> {
  return apiRequest<IndexValue | null>('/api/v1/airfare-index/latest');
}

export async function getIndex(
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<ApiResponse<IndexValue>> {
  return getIndexHistory(params);
}

export async function getIndexHistory(
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<ApiResponse<IndexValue>> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== null && value !== undefined && value !== '') {
      query.append(key, String(value));
    }
  }

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<ApiResponse<IndexValue>>(`/api/v1/airfare-index${suffix}`);
}

export async function getDataQuality(): Promise<DataQualityMetrics> {
  return apiRequest<DataQualityMetrics>('/api/v1/data-quality');
}

export async function getAnalyticsOverview(): Promise<OverviewAnalytics> {
  return apiRequest<OverviewAnalytics>('/api/v1/analytics/overview');
}

export async function getAnalyticsRoutes(
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<AnalyticsRouteStats[]> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== null && value !== undefined && value !== '') {
      query.append(key, String(value));
    }
  }

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<AnalyticsRouteStats[]>(`/api/v1/analytics/routes${suffix}`);
}

export async function getAnalyticsRoute(routeCode: string): Promise<AnalyticsRouteStats | null> {
  return apiRequest<AnalyticsRouteStats>(`/api/v1/analytics/routes/${routeCode}`);
}

export async function getAnalyticsAirlines(
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<AnalyticsAirlineStats[]> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== null && value !== undefined && value !== '') {
      query.append(key, String(value));
    }
  }

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<AnalyticsAirlineStats[]>(`/api/v1/analytics/airlines${suffix}`);
}

export async function getAnalyticsAirline(airlineId: string): Promise<AnalyticsAirlineStats | null> {
  return apiRequest<AnalyticsAirlineStats>(`/api/v1/analytics/airlines/${airlineId}`);
}

export async function getAnalyticsLeadTime(
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<AnalyticsLeadTimePoint[]> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== null && value !== undefined && value !== '') {
      query.append(key, String(value));
    }
  }

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<AnalyticsLeadTimePoint[]>(`/api/v1/analytics/lead-time${suffix}`);
}

export async function getAnalyticsFareComposition(
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<AnalyticsFareComposition> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== null && value !== undefined && value !== '') {
      query.append(key, String(value));
    }
  }

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<AnalyticsFareComposition>(`/api/v1/analytics/fare-composition${suffix}`);
}

export async function getAnalyticsAvailability(
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<AnalyticsAvailabilityStats> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== null && value !== undefined && value !== '') {
      query.append(key, String(value));
    }
  }

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<AnalyticsAvailabilityStats>(`/api/v1/analytics/availability${suffix}`);
}

export async function getAnalyticsHistorical(): Promise<AnalyticsIndexPoint[]> {
  return apiRequest<AnalyticsIndexPoint[]>('/api/v1/analytics/historical');
}

export async function getMethodology(): Promise<MethodologyConfig> {
  return apiRequest<MethodologyConfig>('/api/v1/analytics/methodology');
}

export async function updateMethodology(payload: MethodologyUpdate): Promise<MethodologyConfig> {
  return apiRequest<MethodologyConfig>('/api/v1/analytics/methodology', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function recalculateIndex(date: string): Promise<IndexValue> {
  return apiRequest<IndexValue>('/api/v1/analytics/recalculate', {
    method: 'POST',
    body: JSON.stringify({ date }),
  });
}

export async function getBenchmarks(params?: Record<string, string | number | null | undefined>): Promise<BenchmarkListResponse> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) if (value !== null && value !== undefined && value !== '') query.append(key, String(value));
  const suffix = query.toString() ? `?${query}` : '';
  return apiRequest<BenchmarkListResponse>(`/api/v1/benchmarks${suffix}`);
}

export async function getDgcaBenchmarks(): Promise<BenchmarkListResponse> {
  return apiRequest<BenchmarkListResponse>('/api/v1/benchmarks/dgca');
}

export async function getBacktests(params?: Record<string, string | number | null | undefined>): Promise<ApiResponse<BacktestResult>> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) if (value !== null && value !== undefined && value !== '') query.append(key, String(value));
  const suffix = query.toString() ? `?${query}` : '';
  return apiRequest<ApiResponse<BacktestResult>>(`/api/v1/backtesting${suffix}`);
}

export async function getLatestBacktest(): Promise<BacktestResult | null> {
  return apiRequest<BacktestResult | null>('/api/v1/backtesting/latest');
}

export async function runBacktest(payload: { start_date?: string; end_date?: string; route_code?: string; benchmark_source?: string; frequency?: string; methodology_version?: string }): Promise<BacktestResult> {
  return apiRequest<BacktestResult>('/api/v1/backtesting/run', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getMospiIndicators(params?: Record<string, string | number | null | undefined>): Promise<ApiResponse<OfficialIndicator>> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) if (value !== null && value !== undefined && value !== '') query.append(key, String(value));
  const suffix = query.toString() ? `?${query}` : '';
  return apiRequest<ApiResponse<OfficialIndicator>>(`/api/v1/indicators/mospi${suffix}`);
}

export async function getMospiCpi(params?: Record<string, string | number | null | undefined>): Promise<InflationContext> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) if (value !== null && value !== undefined && value !== '') query.append(key, String(value));
  const suffix = query.toString() ? `?${query}` : '';
  return apiRequest<InflationContext>(`/api/v1/indicators/mospi/cpi${suffix}`);
}
