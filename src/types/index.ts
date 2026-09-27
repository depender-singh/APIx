export interface Airline {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  color: string;
}

export interface Airport {
  id: string;
  airport_code: string;
  city: string;
  airport_name: string;
  state: string;
}

export interface Route {
  id: string;
  origin: string;
  destination: string;
  route_code: string;
  weight: number;
  active: boolean;
  passenger_traffic_basis: string;
  last_updated: string;
}

export interface Flight {
  id: string;
  airline_id: string;
  flight_number: string;
  origin: string;
  destination: string;
}

export type Availability = 'available' | 'limited' | 'sold_out' | 'cancelled' | 'unavailable' | 'unknown';
export type FareClass = 'economy' | 'premium_economy' | 'business';
export type CleaningStatus = 'raw' | 'clean' | 'valid' | 'invalid' | 'duplicate' | 'missing_required_field' | 'invalid_route' | 'invalid_airline' | 'invalid_date' | 'invalid_fare' | 'sold_out' | 'cancelled' | 'outlier' | 'flagged';
export type DataSource = 'indigo' | 'air_india' | 'air_india_express' | 'akasa' | 'spicejet' | 'makemytrip' | 'yatra' | 'easemytrip' | 'cleartrip' | 'ixigo' | 'goibibo';
export type DataSourceType = 'airline' | 'ota' | 'dgca' | 'mospi' | 'synthetic';

export interface DataProvenance {
  source: string;
  organization: string;
  dataset: string;
  dataset_id: string;
  source_type: DataSourceType;
  reference_period?: string;
  retrieved_at?: string;
  version?: string;
}

export interface DataQualityIssue {
  observationId: string;
  severity: 'info' | 'warning' | 'error';
  type: string;
  field?: string;
  message: string;
  status?: CleaningStatus;
}

export interface AirfareObservation {
  id: string;
  flight_id: string;
  flight?: string;
  route_id: string;
  airline_id: string;
  travel_date: string;
  search_date: string;
  advance_window: number;
  advance_days?: number;
  fare_class: FareClass | null;
  base_fare: number | null;
  taxes: number | null;
  udf: number | null;
  convenience_fee: number | null;
  total_fare: number;
  collection_timestamp: string;
  availability: Availability;
  source: DataSource;
  source_type?: DataSourceType;
  provenance?: DataProvenance;
  raw_observation_id: string;
  cleaning_status: CleaningStatus;
  quality_issues?: DataQualityIssue[];
  index_eligible?: boolean;
  duplicate_of?: string;
  origin: string;
  destination: string;
  airline_name: string;
  airline_code: string;
  route_code: string;
}

export interface RawObservation {
  id: string;
  source: DataSource;
  source_type?: DataSourceType;
  provenance?: DataProvenance;
  raw_data: string;
  collection_timestamp: string;
  status: 'pending' | 'processed' | 'error';
  route_code: string;
  airline_code: string;
  travel_date: string;
  search_date: string;
  raw_fare: number;
  response_status: number;
  flight?: string;
  advance_days?: number;
}

export interface IndexValue {
  id: string;
  date: string;
  api_x: number;
  base_period: string;
  yoy_change: number;
  mom_change: number;
  observations_count: number;
}

export interface BenchmarkValue {
  id: string;
  date: string;
  dgca_value: number;
  source: string;
}

export interface BacktestResult {
  id: string;
  date: string;
  api_x: number;
  benchmark: number;
  absolute_error: number;
  directional_accuracy: boolean;
}

export interface FestivalEvent {
  id: string;
  name: string;
  type: 'festival' | 'holiday' | 'long_weekend' | 'season';
  start_date: string;
  end_date: string;
  avg_fare_before: number;
  avg_fare_during: number;
  percentage_increase: number;
  impacted_routes: string[];
}

export interface CollectionSource {
  id: string;
  name: string;
  type: 'airline' | 'ota';
  status: 'running' | 'completed' | 'warning' | 'failed';
  last_collection: string;
  records_collected: number;
  success_rate: number;
  response_time_ms: number;
  errors: number;
}

export interface DataQualityMetrics {
  total_observations: number;
  valid_observations: number;
  invalid_observations: number;
  duplicate_observations: number;
  missing_observations: number;
  outliers: number;
  sold_out_records: number;
  cancelled_flights: number;
  available_observations: number;
  index_eligible_observations: number;
  completeness_rate: number;
  validity_rate: number;
  duplicate_rate: number;
  availability_rate: number;
  outlier_rate: number;
  cleaning_success_rate: number;
  quality_score: number;
  issues?: DataQualityIssue[];
}

export type PageKey =
  | 'overview'
  | 'routes'
  | 'route-details'
  | 'airlines'
  | 'airline-details'
  | 'lead-time'
  | 'inflation'
  | 'historical'
  | 'festivals'
  | 'fare-composition'
  | 'availability'
  | 'backtesting'
  | 'data-explorer'
  | 'api-docs'
  | 'about'
  | 'admin-dashboard'
  | 'admin-collection'
  | 'admin-quality'
  | 'admin-raw'
  | 'admin-config'
  | 'admin-weights';

export type DateRange = 'today' | '7d' | '30d' | '3m' | '6m' | '1y' | 'custom';
export type ObservationFilters = {
  route?: string;
  airline?: string;
  search?: string;
  availability?: string;
  source?: string;
  sourceType?: DataSourceType;
  advanceWindow?: number;
  advanceDays?: number;
  fareType?: string;
  dateRange?: DateRange;
  cleaningStatus?: CleaningStatus;
  qualityIssue?: string;
};
