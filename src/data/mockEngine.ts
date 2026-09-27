import type {
  AirfareObservation,
  Availability,
  BacktestResult,
  BenchmarkValue,
  CleaningStatus,
  CollectionSource,
  DataProvenance,
  DataSource,
  DataSourceType,
  DataQualityMetrics,
  DateRange,
  FareClass,
  FestivalEvent,
  Flight,
  IndexValue,
  ObservationFilters,
  RawObservation,
} from '@/types';
import { AIRLINES, ROUTES } from './airports';
import { cleanObservations } from './cleaning';

export { AIRLINES, ROUTES };

// --- Seeded RNG for deterministic mock data ---
class SeededRNG {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }
}

const rng = new SeededRNG(42);

const ADVANCE_WINDOWS = [1, 7, 15, 30, 45] as const;
const FARE_CLASSES: FareClass[] = ['economy', 'premium_economy', 'business'];
const SOURCES: DataSource[] = ['indigo', 'air_india', 'air_india_express', 'akasa', 'spicejet', 'makemytrip', 'yatra', 'easemytrip', 'cleartrip', 'ixigo', 'goibibo'];
const AVAILABILITY: Availability[] = ['available', 'available', 'available', 'available', 'limited', 'limited', 'sold_out', 'cancelled'];
const SOURCE_TYPES: Record<DataSource, DataSourceType> = {
  indigo: 'airline',
  air_india: 'airline',
  air_india_express: 'airline',
  akasa: 'airline',
  spicejet: 'airline',
  makemytrip: 'ota',
  yatra: 'ota',
  easemytrip: 'ota',
  cleartrip: 'ota',
  ixigo: 'ota',
  goibibo: 'ota',
};

const SYNTHETIC_PROVENANCE = (source: DataSource): DataProvenance => ({
  source: source,
  organization: 'APIx Synthetic Demo',
  dataset: 'synthetic-airfare-observations',
  dataset_id: `synthetic-${source}`,
  source_type: SOURCE_TYPES[source] || 'synthetic',
  reference_period: '2026-09-12',
  retrieved_at: '2026-09-12T00:00:00Z',
  version: 'synthetic-v1',
});

// Base fares per route (in INR) — realistic Indian domestic fares
const BASE_FARES: Record<string, number> = {
  'DEL-BOM': 5200, 'DEL-BLR': 6100, 'BOM-BLR': 4500, 'DEL-CCU': 5500,
  'BLR-HYD': 4900, 'MAA-DEL': 5800, 'BOM-GOI': 3200, 'DEL-HYD': 5600,
  'BLR-CCU': 6800, 'BOM-CCU': 6500, 'DEL-PNQ': 4800, 'BLR-MAA': 3500,
  'DEL-JAI': 2800, 'BOM-AMD': 2600, 'DEL-AMD': 4200, 'BLR-COK': 3800,
  'HYD-MAA': 3600, 'DEL-LKO': 2500, 'BOM-HYD': 4200, 'CCU-GAU': 4800,
  'DEL-IXC': 2200, 'MAA-HYD': 3600, 'BLR-GOI': 3400, 'DEL-IXB': 5200,
  'BOM-JAI': 4400,
};

// Airline price multipliers
const AIRLINE_MULTIPLIER: Record<string, number> = {
  al1: 1.0,   // IndiGo — baseline
  al2: 1.08,  // Air India — slightly premium
  al3: 0.92,  // Air India Express — budget
  al4: 0.95,  // Akasa — budget
  al5: 0.98,  // SpiceJet — near baseline
};

// Fare class multipliers
const CLASS_MULTIPLIER: Record<FareClass, number> = {
  economy: 1.0,
  premium_economy: 1.35,
  business: 2.1,
};

// Advance window multipliers (closer = more expensive)
const ADVANCE_MULTIPLIER: Record<number, number> = {
  1: 1.62,
  7: 1.28,
  15: 1.0,
  30: 0.88,
  45: 0.82,
};

// Festival date ranges (2025-2026)
const FESTIVAL_EVENTS: Omit<FestivalEvent, 'avg_fare_before' | 'avg_fare_during' | 'percentage_increase' | 'impacted_routes'>[] = [
  { id: 'f1', name: 'Diwali', type: 'festival', start_date: '2025-10-20', end_date: '2025-10-25' },
  { id: 'f2', name: 'Christmas', type: 'holiday', start_date: '2025-12-23', end_date: '2025-12-27' },
  { id: 'f3', name: 'New Year', type: 'holiday', start_date: '2025-12-30', end_date: '2026-01-02' },
  { id: 'f4', name: 'Holi', type: 'festival', start_date: '2026-03-13', end_date: '2026-03-16' },
  { id: 'f5', name: 'Summer Travel Season', type: 'season', start_date: '2026-05-01', end_date: '2026-06-15' },
  { id: 'f6', name: 'Republic Day Weekend', type: 'long_weekend', start_date: '2026-01-24', end_date: '2026-01-27' },
  { id: 'f7', name: 'Eid al-Fitr', type: 'festival', start_date: '2026-03-30', end_date: '2026-04-02' },
  { id: 'f8', name: 'Dussehra', type: 'festival', start_date: '2025-10-01', end_date: '2025-10-04' },
];

function isFestivalPeriod(date: Date): { isFestival: boolean; multiplier: number } {
  const dateStr = date.toISOString().slice(0, 10);
  for (const f of FESTIVAL_EVENTS) {
    if (dateStr >= f.start_date && dateStr <= f.end_date) {
      return { isFestival: true, multiplier: 1.25 + rng.range(0, 0.15) };
    }
  }
  // Check if within 3 days before a festival
  for (const f of FESTIVAL_EVENTS) {
    const start = new Date(f.start_date);
    const diff = (start.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (diff > 0 && diff <= 3) {
      return { isFestival: true, multiplier: 1.15 + rng.range(0, 0.1) };
    }
  }
  return { isFestival: false, multiplier: 1.0 };
}

// Seasonal multiplier (summer/holiday peaks)
function seasonalMultiplier(date: Date): number {
  const month = date.getMonth();
  if (month === 4 || month === 5) return 1.12; // May-Jun summer
  if (month === 11 || month === 0) return 1.08; // Dec-Jan holidays
  if (month === 9) return 1.06; // October Diwali
  if (month === 2) return 1.04; // March Holi
  return 0.98;
}

// Day of week multiplier (weekends more expensive)
function dowMultiplier(date: Date): number {
  const dow = date.getDay();
  if (dow === 5 || dow === 6) return 1.1; // Fri-Sat
  if (dow === 0) return 1.05; // Sun
  return 0.97;
}

// --- Generate flights ---
function generateFlights(): Flight[] {
  const flights: Flight[] = [];
  let id = 1;
  for (const route of ROUTES) {
    for (const airline of AIRLINES) {
      // 2-4 flights per airline per route
      const count = rng.int(2, 4);
      for (let i = 0; i < count; i++) {
        flights.push({
          id: `fl${id++}`,
          airline_id: airline.id,
          flight_number: `${airline.code}${rng.int(100, 9999)}`,
          origin: route.origin,
          destination: route.destination,
        });
      }
    }
  }
  return flights;
}

export const FLIGHTS = generateFlights();

// --- Generate observations ---
function generateObservations(): AirfareObservation[] {
  const observations: AirfareObservation[] = [];
  let id = 1;
  let rawId = 1;

  const today = new Date('2026-09-12T00:00:00Z');

  // Generate 60 days of search dates (historical)
  for (let dayOffset = 59; dayOffset >= 0; dayOffset--) {
    const searchDate = new Date(today);
    searchDate.setDate(searchDate.getDate() - dayOffset);
    const searchDateStr = searchDate.toISOString().slice(0, 10);

    for (const route of ROUTES) {
      if (!route.active) continue;
      const baseFare = BASE_FARES[route.route_code] || 4500;

      for (const airline of AIRLINES) {
        // Not every airline flies every route every day
        if (rng.next() < 0.15) continue;

        for (const advanceWindow of ADVANCE_WINDOWS) {
          for (const fareClass of FARE_CLASSES) {
            // Not every class/advance combo
            if (rng.next() < 0.3) continue;

            const travelDate = new Date(searchDate);
            travelDate.setDate(travelDate.getDate() + advanceWindow);
            const travelDateStr = travelDate.toISOString().slice(0, 10);

            const airlineMult = AIRLINE_MULTIPLIER[airline.id] || 1.0;
            const classMult = CLASS_MULTIPLIER[fareClass];
            const advanceMult = ADVANCE_MULTIPLIER[advanceWindow] || 1.0;
            const seasonMult = seasonalMultiplier(travelDate);
            const dowMult = dowMultiplier(travelDate);
            const festival = isFestivalPeriod(travelDate);
            const noise = rng.range(0.92, 1.08);

            const totalFare = Math.round(
              baseFare * airlineMult * classMult * advanceMult * seasonMult * dowMult * festival.multiplier * noise
            );

            const baseFareComponent = Math.round(totalFare * 0.78);
            const taxes = Math.round(totalFare * 0.14);
            const udf = 100;
            const convenienceFee = rng.pick([0, 150, 175, 200]);
            const computedTotal = baseFareComponent + taxes + udf + convenienceFee;

            // Availability based on advance window and festival
            let availability: Availability;
            if (festival.isFestival && advanceWindow <= 7) {
              availability = rng.pick(['sold_out', 'limited', 'limited'] as Availability[]);
            } else if (advanceWindow <= 1) {
              availability = rng.pick(['limited', 'sold_out', 'available'] as Availability[]);
            } else {
              availability = rng.pick(AVAILABILITY);
            }

            // Cleaning status — mostly clean, some anomalies
            let cleaningStatus: CleaningStatus = 'clean';
            const anomalyRoll = rng.next();
            if (anomalyRoll < 0.01) cleaningStatus = 'outlier';
            else if (anomalyRoll < 0.02) cleaningStatus = 'duplicate';
            else if (anomalyRoll < 0.025) cleaningStatus = 'missing_required_field';

            const source = rng.pick(SOURCES);
            const flightId = `fl${rng.int(1, FLIGHTS.length)}`;

            observations.push({
              id: `obs${id++}`,
              flight_id: flightId,
              flight: `${airline.code}${rng.int(100, 9999)}`,
              route_id: route.id,
              airline_id: airline.id,
              travel_date: travelDateStr,
              search_date: searchDateStr,
              advance_window: advanceWindow,
              advance_days: advanceWindow,
              fare_class: fareClass,
              base_fare: baseFareComponent,
              taxes,
              udf,
              convenience_fee: convenienceFee,
              total_fare: computedTotal,
              collection_timestamp: searchDate.toISOString(),
              availability,
              source,
              source_type: SOURCE_TYPES[source] || 'synthetic',
              provenance: SYNTHETIC_PROVENANCE(source),
              raw_observation_id: `raw${rawId++}`,
              cleaning_status: cleaningStatus,
              origin: route.origin,
              destination: route.destination,
              airline_name: airline.name,
              airline_code: airline.code,
              route_code: route.route_code,
            });
          }
        }
      }
    }
  }

  return observations;
}

export const OBSERVATIONS = generateObservations();

// --- Generate index values (60 days) ---
function generateIndexValues(): IndexValue[] {
  const values: IndexValue[] = [];
  const today = new Date('2026-09-12T00:00:00Z');
  const baseValue = 100.0;

  // Base period: 60 days ago
  let prevApiX = baseValue;

  for (let i = 59; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    // Realistic index movement with trend
    const trend = 0.4 + (59 - i) * 0.05; // gradual upward trend
    const noise = rng.range(-1.5, 1.5);
    const change = trend + noise;
    const apiX = Math.round((prevApiX + change) * 100) / 100;

    // Count observations for this date
    const obsCount = OBSERVATIONS.filter((o) => o.search_date === dateStr).length;

    // YoY: compare with ~365 days ago (synthetic)
    const yoyBase = apiX - rng.range(4, 9);
    const yoyChange = Math.round(((apiX - yoyBase) / yoyBase) * 10000) / 100;

    // MoM: compare with ~30 days ago
    const momBase = apiX - rng.range(-2, 4);
    const momChange = Math.round(((apiX - momBase) / momBase) * 10000) / 100;

    values.push({
      id: `iv${i}`,
      date: dateStr,
      api_x: apiX,
      base_period: '2025-09-12',
      yoy_change: yoyChange,
      mom_change: momChange,
      observations_count: obsCount,
    });

    prevApiX = apiX;
  }

  return values;
}

export const INDEX_VALUES = generateIndexValues();

// --- Generate clearly synthetic benchmark demonstration values ---
function generateBenchmarkValues(): BenchmarkValue[] {
  const values: BenchmarkValue[] = [];
  const today = new Date('2026-09-12T00:00:00Z');

  // Synthetic demo values are not official DGCA observations.
  for (let i = 12; i >= 0; i--) {
    const date = new Date(today);
    date.setMonth(date.getMonth() - i);
    date.setDate(1);
    const dateStr = date.toISOString().slice(0, 10);

    // Find nearest index value
    const nearestIv = INDEX_VALUES.reduce((closest, iv) => {
      const diff = Math.abs(new Date(iv.date).getTime() - date.getTime());
      const closestDiff = Math.abs(new Date(closest.date).getTime() - date.getTime());
      return diff < closestDiff ? iv : closest;
    });

    const dgcaValue = Math.round((nearestIv.api_x + rng.range(-2, 2)) * 100) / 100;

    values.push({
      id: `bm${i}`,
      date: dateStr,
      dgca_value: dgcaValue,
      source: 'Synthetic Demo Benchmark',
    });
  }

  return values;
}

export const BENCHMARK_VALUES = generateBenchmarkValues();

// --- Generate backtest results (30 days) ---
function generateBacktestResults(): BacktestResult[] {
  const results: BacktestResult[] = [];
  const today = new Date('2026-09-12T00:00:00Z');

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    const iv = INDEX_VALUES.find((v) => v.date === dateStr) || INDEX_VALUES[INDEX_VALUES.length - 1 - i];
    const apiX = iv?.api_x || 100 + i * 0.3;

    // Benchmark follows APIx with some error
    const error = rng.range(-3, 3);
    const benchmark = Math.round((apiX + error) * 100) / 100;
    const absError = Math.round(Math.abs(apiX - benchmark) * 100) / 100;

    // Directional accuracy: did both move same direction?
    const apiDir = apiX > 100;
    const benchDir = benchmark > 100;
    const dirAcc = apiDir === benchDir;

    results.push({
      id: `bt${i}`,
      date: dateStr,
      api_x: apiX,
      benchmark,
      absolute_error: absError,
      directional_accuracy: dirAcc,
    });
  }

  return results;
}

export const BACKTEST_RESULTS = generateBacktestResults();

// --- Generate festival events with fare data ---
function generateFestivalEvents(): FestivalEvent[] {
  return FESTIVAL_EVENTS.map((f) => {
    const avgFareBefore = rng.int(4000, 5500);
    const avgFareDuring = Math.round(avgFareBefore * (1.2 + rng.range(0.05, 0.25)));
    const pctIncrease = Math.round(((avgFareDuring - avgFareBefore) / avgFareBefore) * 100);

    return {
      ...f,
      avg_fare_before: avgFareBefore,
      avg_fare_during: avgFareDuring,
      percentage_increase: pctIncrease,
      impacted_routes: ROUTES.slice(0, rng.int(3, 8)).map((r) => r.route_code),
    };
  });
}

export const FESTIVAL_EVENTS_DATA = generateFestivalEvents();

// --- Generate collection sources ---
function generateCollectionSources(): CollectionSource[] {
  const sourceDefs = [
    { name: 'IndiGo', type: 'airline' as const },
    { name: 'Air India', type: 'airline' as const },
    { name: 'Air India Express', type: 'airline' as const },
    { name: 'Akasa Air', type: 'airline' as const },
    { name: 'SpiceJet', type: 'airline' as const },
    { name: 'MakeMyTrip', type: 'ota' as const },
    { name: 'Yatra', type: 'ota' as const },
    { name: 'EaseMyTrip', type: 'ota' as const },
    { name: 'Cleartrip', type: 'ota' as const },
    { name: 'Ixigo', type: 'ota' as const },
    { name: 'Goibibo', type: 'ota' as const },
  ];

  return sourceDefs.map((s, i) => {
    const statusRoll = rng.next();
    let status: CollectionSource['status'];
    if (statusRoll < 0.6) status = 'completed';
    else if (statusRoll < 0.8) status = 'running';
    else if (statusRoll < 0.92) status = 'warning';
    else status = 'failed';

    const minsAgo = rng.int(1, 30);
    const lastCollection = new Date(Date.now() - minsAgo * 60 * 1000).toISOString();

    return {
      id: `src${i}`,
      name: s.name,
      type: s.type,
      status,
      last_collection: lastCollection,
      records_collected: rng.int(500, 5000),
      success_rate: Math.round(rng.range(85, 99.5) * 10) / 10,
      response_time_ms: rng.int(200, 3000),
      errors: status === 'failed' ? rng.int(5, 20) : status === 'warning' ? rng.int(1, 5) : rng.int(0, 2),
    };
  });
}

export const COLLECTION_SOURCES = generateCollectionSources();

// --- Generate raw observations ---
function generateRawObservations(): RawObservation[] {
  const results: RawObservation[] = [];
  for (let i = 0; i < 200; i++) {
    const route = rng.pick(ROUTES);
    const airline = rng.pick(AIRLINES);
    const travelDate = new Date();
    travelDate.setDate(travelDate.getDate() + rng.int(1, 45));
    const searchDate = new Date();
    searchDate.setHours(searchDate.getHours() - rng.int(0, 24));

    const source = rng.pick(SOURCES);
    const advanceDays = rng.pick([1, 7, 15, 30, 45]);
    const flight = `${airline.code}${rng.int(100, 9999)}`;

    results.push({
      id: `raw${i + 1}`,
      source,
      source_type: SOURCE_TYPES[source] || 'synthetic',
      provenance: SYNTHETIC_PROVENANCE(source),
      raw_data: JSON.stringify({
        fare: rng.int(2000, 12000),
        currency: 'INR',
        flight_number: flight,
        route: `${route.origin}-${route.destination}`,
      }),
      collection_timestamp: searchDate.toISOString(),
      status: rng.pick(['pending', 'processed', 'processed', 'processed', 'error'] as const),
      route_code: route.route_code,
      airline_code: airline.code,
      travel_date: travelDate.toISOString().slice(0, 10),
      search_date: searchDate.toISOString().slice(0, 10),
      raw_fare: rng.int(2000, 12000),
      response_status: rng.pick([200, 200, 200, 200, 403, 429, 500]),
      flight,
      advance_days: advanceDays,
    });
  }
  return results;
}

export const RAW_OBSERVATIONS = generateRawObservations();

const CLEANING_RESULT = cleanObservations(OBSERVATIONS);

export const CLEAN_OBSERVATIONS = CLEANING_RESULT.cleanedObservations;
export const FLAGGED_OBSERVATIONS = CLEANING_RESULT.flaggedObservations;
export const REJECTED_OBSERVATIONS = CLEANING_RESULT.rejectedObservations;
export const CLEANING_REPORT = CLEANING_RESULT.report;

function getReferenceDate(): Date {
  return new Date('2026-09-12T00:00:00Z');
}

function getRangeDays(dateRange: DateRange = '30d'): number {
  switch (dateRange) {
    case 'today':
      return 1;
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '3m':
      return 90;
    case '6m':
      return 180;
    case '1y':
      return 365;
    case 'custom':
    default:
      return 365;
  }
}

function filterByDateRange(observations: AirfareObservation[], dateRange: DateRange = '30d') {
  const referenceDate = getReferenceDate();
  const maxAgeDays = getRangeDays(dateRange);

  return observations.filter((observation) => {
    const observationDate = new Date(observation.search_date);
    const diffDays = (referenceDate.getTime() - observationDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= maxAgeDays;
  });
}

function applyObservationFilters(
  observations: AirfareObservation[],
  filters?: ObservationFilters
): AirfareObservation[] {
  let filtered = observations;

  if (filters?.dateRange) {
    filtered = filterByDateRange(filtered, filters.dateRange);
  }

  if (filters?.route) {
    filtered = filtered.filter((o) => o.route_code === filters.route);
  }

  if (filters?.airline) {
    filtered = filtered.filter((o) => o.airline_id === filters.airline);
  }

  if (filters?.availability) {
    filtered = filtered.filter((o) => o.availability === filters.availability);
  }

  if (filters?.source) {
    filtered = filtered.filter((o) => o.source === filters.source);
  }

  if (filters?.sourceType) {
    filtered = filtered.filter((o) => (o.source_type || 'synthetic') === filters.sourceType);
  }

  if (filters?.advanceWindow) {
    filtered = filtered.filter((o) => o.advance_window === filters.advanceWindow);
  }

  if (filters?.advanceDays) {
    filtered = filtered.filter((o) => (o.advance_days ?? o.advance_window) === filters.advanceDays);
  }

  if (filters?.fareType) {
    filtered = filtered.filter((o) => o.fare_class === filters.fareType);
  }

  if (filters?.cleaningStatus) {
    filtered = filtered.filter((o) => o.cleaning_status === filters.cleaningStatus);
  }

  if (filters?.search) {
    const query = filters.search.toLowerCase();
    filtered = filtered.filter((o) =>
      o.route_code.toLowerCase().includes(query) ||
      o.airline_name.toLowerCase().includes(query) ||
      (o.flight || o.flight_id).toLowerCase().includes(query) ||
      o.source.toLowerCase().includes(query)
    );
  }

  return filtered;
}

// --- Centralized normalized selectors ---
export function getObservations(filters?: ObservationFilters): AirfareObservation[] {
  return applyObservationFilters(CLEAN_OBSERVATIONS, filters);
}

export function getObservationsByRoute(routeCode: string, filters?: ObservationFilters): AirfareObservation[] {
  return getObservations({ ...filters, route: routeCode });
}

export function getObservationsByAirline(airlineId: string, filters?: ObservationFilters): AirfareObservation[] {
  return getObservations({ ...filters, airline: airlineId });
}

export function getObservationsByAdvanceWindow(advanceWindow: number, filters?: ObservationFilters): AirfareObservation[] {
  return getObservations({ ...filters, advanceWindow });
}

export function getObservationsByDateRange(dateRange: DateRange, filters?: ObservationFilters): AirfareObservation[] {
  return getObservations({ ...filters, dateRange });
}

export function getAvailableObservations(filters?: ObservationFilters): AirfareObservation[] {
  return getObservations({ ...filters, availability: 'available' });
}

export function getFareByRoute(routeCode: string, filters?: ObservationFilters) {
  const observations = getObservationsByRoute(routeCode, filters);
  return observations.length > 0
    ? Math.round(observations.reduce((s, o) => s + o.total_fare, 0) / observations.length)
    : 0;
}

export function getFareByAirline(airlineId: string, filters?: ObservationFilters) {
  const observations = getObservationsByAirline(airlineId, filters);
  return observations.length > 0
    ? Math.round(observations.reduce((s, o) => s + o.total_fare, 0) / observations.length)
    : 0;
}

export function getFareByLeadTime(advanceWindow: number, filters?: ObservationFilters) {
  const observations = getObservationsByAdvanceWindow(advanceWindow, filters);
  return observations.length > 0
    ? Math.round(observations.reduce((s, o) => s + o.total_fare, 0) / observations.length)
    : 0;
}

// --- Data quality metrics ---
export function getDataQualityMetrics(filters?: ObservationFilters): DataQualityMetrics {
  const observations = applyObservationFilters(CLEAN_OBSERVATIONS, filters);
  const total = observations.length;

  if (total === 0) {
    return {
      total_observations: 0,
      valid_observations: 0,
      invalid_observations: 0,
      duplicate_observations: 0,
      missing_observations: 0,
      outliers: 0,
      sold_out_records: 0,
      cancelled_flights: 0,
      available_observations: 0,
      index_eligible_observations: 0,
      completeness_rate: 0,
      validity_rate: 0,
      duplicate_rate: 0,
      availability_rate: 0,
      outlier_rate: 0,
      cleaning_success_rate: 0,
      quality_score: 0,
      issues: [],
    };
  }

  const duplicates = observations.filter((o) => o.cleaning_status === 'duplicate').length;
  const outliers = observations.filter((o) => o.cleaning_status === 'outlier').length;
  const missing = observations.filter((o) => o.cleaning_status === 'missing_required_field').length;
  const soldOut = observations.filter((o) => o.availability === 'sold_out').length;
  const cancelled = observations.filter((o) => o.availability === 'cancelled').length;
  const available = observations.filter((o) => o.availability === 'available').length;
  const valid = observations.filter((o) => o.cleaning_status === 'clean' || o.cleaning_status === 'valid').length;
  const indexEligible = observations.filter((o) => o.index_eligible).length;

  const completenessRate = Math.round(
    (observations.filter((o) => o.origin && o.destination && o.route_code && o.airline_id && o.travel_date && o.search_date && o.collection_timestamp).length / total) * 10000
  ) / 100;
  const validityRate = Math.round((valid / total) * 10000) / 100;
  const duplicateRate = Math.round((duplicates / total) * 10000) / 100;
  const availabilityRate = Math.round((available / total) * 10000) / 100;
  const outlierRate = Math.round((outliers / total) * 10000) / 100;

  return {
    total_observations: total,
    valid_observations: valid,
    invalid_observations: total - valid,
    duplicate_observations: duplicates,
    missing_observations: missing,
    outliers,
    sold_out_records: soldOut,
    cancelled_flights: cancelled,
    available_observations: available,
    index_eligible_observations: indexEligible,
    completeness_rate: completenessRate,
    validity_rate: validityRate,
    duplicate_rate: duplicateRate,
    availability_rate: availabilityRate,
    outlier_rate: outlierRate,
    cleaning_success_rate: validityRate,
    quality_score: validityRate,
    issues: [],
  };
}

// --- Derived analytics helpers ---

export function getLatestIndex(filters?: ObservationFilters): IndexValue {
  const filtered = filters?.dateRange
    ? INDEX_VALUES.filter((iv) => {
        const referenceDate = getReferenceDate();
        const diffDays = (referenceDate.getTime() - new Date(iv.date).getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= getRangeDays(filters.dateRange);
      })
    : [...INDEX_VALUES];

  return filtered[filtered.length - 1] || INDEX_VALUES[INDEX_VALUES.length - 1];
}

export function getRouteStats(routeCode: string, filters?: ObservationFilters) {
  const routeObs = applyObservationFilters(
    OBSERVATIONS.filter((o) => o.route_code === routeCode && o.cleaning_status === 'clean'),
    filters
  );
  if (routeObs.length === 0) return null;

  const recent = routeObs.filter((o) => {
    const daysAgo = (new Date('2026-09-12').getTime() - new Date(o.search_date).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  });
  const older = routeObs.filter((o) => {
    const daysAgo = (new Date('2026-09-12').getTime() - new Date(o.search_date).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo > 7 && daysAgo <= 14;
  });

  const avgRecent = recent.reduce((s, o) => s + o.total_fare, 0) / (recent.length || 1);
  const avgOlder = older.reduce((s, o) => s + o.total_fare, 0) / (older.length || 1);
  const changePct = avgOlder > 0 ? Math.round(((avgRecent - avgOlder) / avgOlder) * 10000) / 100 : 0;

  const route = ROUTE_MAP[routeCode] || ROUTES[0];
  const apixContribution = route ? route.weight : 0;

  const airlinesOnRoute = Array.from(new Set(routeObs.map((o) => o.airline_id)));
  const availabilityRate = routeObs.filter((o) => o.availability === 'available').length / routeObs.length;

  return {
    route_code: routeCode,
    origin: routeObs[0]?.origin || '',
    destination: routeObs[0]?.destination || '',
    avg_fare: Math.round(avgRecent),
    apix_contribution: apixContribution,
    change_pct: changePct,
    observations: routeObs.length,
    availability_rate: Math.round(availabilityRate * 1000) / 10,
    airlines_count: airlinesOnRoute.length,
    last_updated: routeObs[routeObs.length - 1]?.collection_timestamp || '',
  };
}

export function getAllRouteStats(filters?: ObservationFilters) {
  return ROUTES.filter((r) => r.active)
    .map((r) => getRouteStats(r.route_code, filters))
    .filter((s): s is NonNullable<typeof s> => s !== null);
}

export function getAirlineStats(airlineId: string, filters?: ObservationFilters) {
  const airlineObs = applyObservationFilters(
    OBSERVATIONS.filter((o) => o.airline_id === airlineId && o.cleaning_status === 'clean'),
    filters
  );
  if (airlineObs.length === 0) return null;

  const recent = airlineObs.filter((o) => {
    const daysAgo = (new Date('2026-09-12').getTime() - new Date(o.search_date).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  });
  const older = airlineObs.filter((o) => {
    const daysAgo = (new Date('2026-09-12').getTime() - new Date(o.search_date).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo > 7 && daysAgo <= 14;
  });

  const avgRecent = recent.reduce((s, o) => s + o.total_fare, 0) / (recent.length || 1);
  const avgOlder = older.reduce((s, o) => s + o.total_fare, 0) / (older.length || 1);
  const changePct = avgOlder > 0 ? Math.round(((avgRecent - avgOlder) / avgOlder) * 10000) / 100 : 0;

  const routes = new Set(airlineObs.map((o) => o.route_code));
  const taxes = airlineObs.map((o) => o.taxes).filter((value): value is number => value !== null);
  const convenienceFees = airlineObs.map((o) => o.convenience_fee).filter((value): value is number => value !== null);
  const avgTaxes = taxes.length > 0 ? taxes.reduce((sum, value) => sum + value, 0) / taxes.length : null;
  const avgConvFee = convenienceFees.length > 0 ? convenienceFees.reduce((sum, value) => sum + value, 0) / convenienceFees.length : null;
  const availabilityRate = airlineObs.filter((o) => o.availability === 'available').length / airlineObs.length;

  return {
    airline_id: airlineId,
    avg_fare: Math.round(avgRecent),
    fare_change: changePct,
    routes_count: routes.size,
    observations: airlineObs.length,
    availability_rate: Math.round(availabilityRate * 1000) / 10,
    avg_taxes: avgTaxes === null ? null : Math.round(avgTaxes),
    avg_convenience_fee: avgConvFee === null ? null : Math.round(avgConvFee),
  };
}

export function getAllAirlineStats(filters?: ObservationFilters) {
  return AIRLINES.map((a) => {
    const stat = getAirlineStats(a.id, filters);
    if (!stat) return null;
    return { airline: a, ...stat };
  }).filter((s): s is Exclude<typeof s, null> => s !== null);
}

export function getLeadTimeData(routeCode?: string, airlineId?: string, filters?: ObservationFilters) {
  const filtered = applyObservationFilters(
    OBSERVATIONS.filter((o) => {
      if (o.cleaning_status !== 'clean') return false;
      if (routeCode && o.route_code !== routeCode) return false;
      if (airlineId && o.airline_id !== airlineId) return false;
      return true;
    }),
    filters
  );

  return ADVANCE_WINDOWS.map((window) => {
    const windowObs = filtered.filter((o) => o.advance_window === window);
    const avgFare = windowObs.length > 0
      ? Math.round(windowObs.reduce((s, o) => s + o.total_fare, 0) / windowObs.length)
      : 0;
    return {
      advance_window: window,
      avg_fare: avgFare,
      observations: windowObs.length,
    };
  });
}

export function getFareComposition(routeCode?: string, airlineId?: string, filters?: ObservationFilters) {
  const filtered = applyObservationFilters(
    OBSERVATIONS.filter((o) => {
      if (o.cleaning_status !== 'clean') return false;
      if (routeCode && o.route_code !== routeCode) return false;
      if (airlineId && o.airline_id !== airlineId) return false;
      return true;
    }),
    filters
  );

  const complete = filtered.filter((observation) => [observation.base_fare, observation.taxes, observation.udf, observation.convenience_fee].every((value) => value !== null));
  if (filtered.length === 0) {
    return { base_fare: null, taxes: null, udf: null, convenience_fee: null, total: null, decomposition_status: 'insufficient_data', decomposition_observations: 0 };
  }

  return {
    base_fare: complete.length > 0 ? Math.round(complete.reduce((sum, o) => sum + (o.base_fare ?? 0), 0) / complete.length) : null,
    taxes: complete.length > 0 ? Math.round(complete.reduce((sum, o) => sum + (o.taxes ?? 0), 0) / complete.length) : null,
    udf: complete.length > 0 ? Math.round(complete.reduce((sum, o) => sum + (o.udf ?? 0), 0) / complete.length) : null,
    convenience_fee: complete.length > 0 ? Math.round(complete.reduce((sum, o) => sum + (o.convenience_fee ?? 0), 0) / complete.length) : null,
    total: Math.round(filtered.reduce((s, o) => s + o.total_fare, 0) / filtered.length),
    decomposition_status: complete.length === filtered.length ? 'complete' : complete.length > 0 ? 'partial' : 'insufficient_data',
    decomposition_observations: complete.length,
  };
}

export function getAvailabilityData(filters?: ObservationFilters) {
  const observations = applyObservationFilters(OBSERVATIONS, filters);
  const total = observations.length;
  const available = observations.filter((o) => o.availability === 'available').length;
  const limited = observations.filter((o) => o.availability === 'limited').length;
  const soldOut = observations.filter((o) => o.availability === 'sold_out').length;
  const cancelled = observations.filter((o) => o.availability === 'cancelled').length;

  return {
    rate: Math.round((available / total) * 1000) / 10,
    available,
    limited,
    sold_out: soldOut,
    cancelled,
    total,
  };
}

export function getAvailabilityTrend(filters?: ObservationFilters) {
  const today = getReferenceDate();
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (29 - i));
    const dateStr = date.toISOString().slice(0, 10);
    const dayObs = applyObservationFilters(
      OBSERVATIONS.filter((o) => o.search_date === dateStr),
      filters
    );
    const available = dayObs.filter((o) => o.availability === 'available').length;
    const rate = dayObs.length > 0 ? Math.round((available / dayObs.length) * 1000) / 10 : 0;
    return { date: dateStr, rate, total: dayObs.length };
  });
}

export function getTopMovers(filters?: ObservationFilters) {
  const stats = getAllRouteStats(filters);
  const sorted = [...stats].sort((a, b) => b.change_pct - a.change_pct);
  return {
    increases: sorted.slice(0, 5),
    decreases: sorted.slice(-5).reverse(),
  };
}

export function getInflationData(filters?: ObservationFilters) {
  const filtered = filters?.dateRange
    ? INDEX_VALUES.filter((iv) => {
        const referenceDate = getReferenceDate();
        const diffDays = (referenceDate.getTime() - new Date(iv.date).getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= getRangeDays(filters.dateRange);
      })
    : [...INDEX_VALUES];

  return filtered.map((iv) => ({
    date: iv.date,
    yoy: iv.yoy_change,
    mom: iv.mom_change,
    api_x: iv.api_x,
  }));
}

export function getInflationDrivers(filters?: ObservationFilters) {
  const stats = getAllRouteStats(filters);
  return stats
    .filter((s) => Math.abs(s.change_pct) > 3)
    .sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct))
    .slice(0, 8)
    .map((s) => ({
      route_code: s.route_code,
      change_pct: s.change_pct,
    }));
}

export function getRouteFareTrend(routeCode: string, filters?: ObservationFilters) {
  const routeObs = applyObservationFilters(
    OBSERVATIONS.filter((o) => o.route_code === routeCode && o.cleaning_status === 'clean'),
    filters
  );

  const today = new Date('2026-09-12T00:00:00Z');
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (29 - i));
    const dateStr = date.toISOString().slice(0, 10);
    const dayObs = routeObs.filter((o) => o.search_date === dateStr);
    const avgFare = dayObs.length > 0
      ? Math.round(dayObs.reduce((s, o) => s + o.total_fare, 0) / dayObs.length)
      : null;
    return { date: dateStr, fare: avgFare, observations: dayObs.length };
  });
}

export function getAirlineComparisonData(filters?: ObservationFilters) {
  return AIRLINES.map((a) => {
    const stats = getAirlineStats(a.id, filters);
    return {
      name: a.name,
      code: a.code,
      color: a.color,
      avg_fare: stats?.avg_fare ?? 0,
      routes: stats?.routes_count ?? 0,
      availability: stats?.availability_rate ?? 0,
    };
  });
}

export function getBacktestMetrics(filters?: ObservationFilters) {
  const results = BACKTEST_RESULTS.filter((result) => {
    if (!filters?.dateRange) return true;
    const resultDate = new Date(result.date);
    const referenceDate = getReferenceDate();
    const diffDays = (referenceDate.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= getRangeDays(filters.dateRange);
  });
  const errors = results.map((r) => r.absolute_error);
  const mae = Math.round((errors.reduce((s, e) => s + e, 0) / errors.length) * 100) / 100;
  const dirAccCount = results.filter((r) => r.directional_accuracy).length;
  const dirAcc = Math.round((dirAccCount / results.length) * 1000) / 10;
  const avgApiX = results.reduce((s, r) => s + r.api_x, 0) / results.length;
  const avgBench = results.reduce((s, r) => s + r.benchmark, 0) / results.length;
  const bias = Math.round((avgApiX - avgBench) * 100) / 100;

  // Correlation (simplified)
  const apiXVals = results.map((r) => r.api_x);
  const benchVals = results.map((r) => r.benchmark);
  const meanApiX = apiXVals.reduce((s, v) => s + v, 0) / apiXVals.length;
  const meanBench = benchVals.reduce((s, v) => s + v, 0) / benchVals.length;
  let numerator = 0, denomApiX = 0, denomBench = 0;
  for (let i = 0; i < apiXVals.length; i++) {
    const dxA = apiXVals[i] - meanApiX;
    const dxB = benchVals[i] - meanBench;
    numerator += dxA * dxB;
    denomApiX += dxA * dxA;
    denomBench += dxB * dxB;
  }
  const correlation = denomApiX > 0 && denomBench > 0
    ? Math.round((numerator / Math.sqrt(denomApiX * denomBench)) * 100) / 100
    : 0;

  // Index stability (inverse of average daily change)
  const changes: number[] = [];
  for (let i = 1; i < apiXVals.length; i++) {
    changes.push(Math.abs(apiXVals[i] - apiXVals[i - 1]));
  }
  const avgChange = changes.reduce((s, c) => s + c, 0) / changes.length;
  const stability = Math.round(Math.max(0, 100 - avgChange * 10) * 10) / 10;

  return {
    correlation,
    mae,
    directional_accuracy: dirAcc,
    bias,
    index_stability: stability,
  };
}

export function getRouteLevelBacktest(filters?: ObservationFilters) {
  return ROUTES.slice(0, 10).map((r) => {
    const stats = getRouteStats(r.route_code, filters);
    const deviation = rng.range(-3, 3);
    return {
      route_code: r.route_code,
      apix_contribution: r.weight,
      deviation: Math.round(deviation * 100) / 100,
      avg_fare: stats?.avg_fare || 0,
    };
  });
}

export function getErrorDistribution(filters?: ObservationFilters) {
  const bins = [
    { range: '< -2', count: 0 },
    { range: '-2 to -1', count: 0 },
    { range: '-1 to 0', count: 0 },
    { range: '0 to 1', count: 0 },
    { range: '1 to 2', count: 0 },
    { range: '> 2', count: 0 },
  ];

  const results = filters?.dateRange
    ? BACKTEST_RESULTS.filter((result) => {
        const resultDate = new Date(result.date);
        const referenceDate = getReferenceDate();
        const diffDays = (referenceDate.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= getRangeDays(filters.dateRange);
      })
    : [...BACKTEST_RESULTS];

  for (const r of results) {
    const err = r.api_x - r.benchmark;
    if (err < -2) bins[0].count++;
    else if (err < -1) bins[1].count++;
    else if (err < 0) bins[2].count++;
    else if (err < 1) bins[3].count++;
    else if (err < 2) bins[4].count++;
    else bins[5].count++;
  }
  return bins;
}

export function getObservationPage(page: number, pageSize: number, filters?: ObservationFilters) {
  const filtered = applyObservationFilters(OBSERVATIONS, filters);
  const start = (page - 1) * pageSize;
  return {
    data: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.ceil(filtered.length / pageSize),
  };
}

export function getFareDistribution(routeCode?: string) {
  const filtered = routeCode
    ? OBSERVATIONS.filter((o) => o.route_code === routeCode && o.cleaning_status === 'clean')
    : OBSERVATIONS.filter((o) => o.cleaning_status === 'clean');

  const bins = [
    { range: '₹2k-3k', count: 0 },
    { range: '₹3k-4k', count: 0 },
    { range: '₹4k-5k', count: 0 },
    { range: '₹5k-6k', count: 0 },
    { range: '₹6k-8k', count: 0 },
    { range: '₹8k-10k', count: 0 },
    { range: '₹10k+', count: 0 },
  ];

  for (const o of filtered) {
    const f = o.total_fare;
    if (f < 3000) bins[0].count++;
    else if (f < 4000) bins[1].count++;
    else if (f < 5000) bins[2].count++;
    else if (f < 6000) bins[3].count++;
    else if (f < 8000) bins[4].count++;
    else if (f < 10000) bins[5].count++;
    else bins[6].count++;
  }

  return bins;
}

export function getAirlineRouteData(airlineId: string, filters?: ObservationFilters) {
  const obs = applyObservationFilters(
    OBSERVATIONS.filter((o) => o.airline_id === airlineId && o.cleaning_status === 'clean'),
    filters
  );
  const routeMap = new Map<string, { route: string; avg_fare: number; count: number }>();

  for (const o of obs) {
    const existing = routeMap.get(o.route_code);
    if (existing) {
      existing.avg_fare = (existing.avg_fare * existing.count + o.total_fare) / (existing.count + 1);
      existing.count++;
    } else {
      routeMap.set(o.route_code, { route: o.route_code, avg_fare: o.total_fare, count: 1 });
    }
  }

  return Array.from(routeMap.values())
    .map((r) => ({ route: r.route, avg_fare: Math.round(r.avg_fare), observations: r.count }))
    .sort((a, b) => b.avg_fare - a.avg_fare);
}

export function getAirlineFareTrend(airlineId: string, filters?: ObservationFilters) {
  const obs = applyObservationFilters(
    OBSERVATIONS.filter((o) => o.airline_id === airlineId && o.cleaning_status === 'clean'),
    filters
  );
  const today = new Date('2026-09-12T00:00:00Z');
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (29 - i));
    const dateStr = date.toISOString().slice(0, 10);
    const dayObs = obs.filter((o) => o.search_date === dateStr);
    const avgFare = dayObs.length > 0
      ? Math.round(dayObs.reduce((s, o) => s + o.total_fare, 0) / dayObs.length)
      : null;
    return { date: dateStr, fare: avgFare };
  });
}

export const ROUTE_MAP = Object.fromEntries(ROUTES.map((r) => [r.route_code, r]));
