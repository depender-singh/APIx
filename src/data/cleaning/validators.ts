import { AIRLINE_MAP, AIRPORT_CODE_SET, ROUTE_MAP } from '@/data/airports';
import type { AirfareObservation, CleaningStatus, DataQualityIssue, DataSource, FareClass, ObservationFilters } from '@/types';
import type { CleaningConfig, NormalizedObservation, ObservationIssueType } from './types';

const REQUIRED_FIELDS = [
  'origin',
  'destination',
  'route_code',
  'airline_id',
  'travel_date',
  'search_date',
  'advance_window',
  'total_fare',
  'availability',
  'source',
  'collection_timestamp',
] as const;

export const DEFAULT_CLEANING_CONFIG: CleaningConfig = {
  fareTolerance: 1,
  enableOutlierDetection: true,
  outlierMethod: 'iqr',
  outlierAction: 'flag',
  excludeSoldOut: true,
  excludeCancelled: true,
  duplicateStrategy: 'keep-first',
};

export const ADVANCE_WINDOW_MAP: Record<string, number> = {
  '1': 1,
  'T1': 1,
  'T+1': 1,
  '1 day': 1,
  '1d': 1,
  '7': 7,
  'T7': 7,
  'T+7': 7,
  '7 day': 7,
  '7d': 7,
  '15': 15,
  'T15': 15,
  'T+15': 15,
  '15 day': 15,
  '15d': 15,
  '30': 30,
  'T30': 30,
  'T+30': 30,
  '30 day': 30,
  '30d': 30,
  '45': 45,
  'T45': 45,
  'T+45': 45,
  '45 day': 45,
  '45d': 45,
};

export function normalizeRouteCode(routeCode: string): string {
  const normalized = routeCode
    .trim()
    .replace(/[-_/\s]+/g, '-')
    .toUpperCase();

  if (normalized.split('-').length === 2) {
    const [origin, destination] = normalized.split('-');
    return `${origin}-${destination}`;
  }

  return normalized;
}

export function normalizeAirlineId(airlineId: string): string {
  const normalized = airlineId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

  if (normalized === 'indigo' || normalized === '6e') return 'al1';
  if (normalized === 'air-india' || normalized === 'airindia' || normalized === 'ai') return 'al2';
  if (normalized === 'air-india-express' || normalized === 'airindiaexpress' || normalized === 'ix') return 'al3';
  if (normalized === 'akasa' || normalized === 'akasa-air' || normalized === 'qp') return 'al4';
  if (normalized === 'spicejet' || normalized === 'spice-jet' || normalized === 'sg') return 'al5';

  const directMatch = Object.entries(AIRLINE_MAP).find(([, airline]) => {
    const label = `${airline.name} ${airline.code}`.toLowerCase();
    return label.includes(normalized) || normalized.includes(label);
  });

  return directMatch ? directMatch[0] : normalized;
}

export function normalizeAdvanceWindow(value: number | string | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return ADVANCE_WINDOW_MAP[String(value)] ?? value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const direct = ADVANCE_WINDOW_MAP[trimmed.toUpperCase()];
    if (direct) return direct;

    const match = trimmed.match(/^T?\+?(\d+)$/i);
    if (match) {
      const parsed = Number(match[1]);
      return ADVANCE_WINDOW_MAP[String(parsed)] ?? parsed;
    }

    const dayMatch = trimmed.match(/^(\d+)\s*day(s)?$/i);
    if (dayMatch) {
      const parsed = Number(dayMatch[1]);
      return ADVANCE_WINDOW_MAP[String(parsed)] ?? parsed;
    }
  }

  return null;
}

export function isValidAirportCode(code: string): boolean {
  return !!(code && AIRPORT_CODE_SET.has(code.toUpperCase()));
}

export function isValidRoute(routeCode: string): boolean {
  const normalized = normalizeRouteCode(routeCode);
  return !!(normalized && ROUTE_MAP[normalized]);
}

export function isValidAirline(airlineId: string): boolean {
  const normalized = normalizeAirlineId(airlineId);
  return !!AIRLINE_MAP[normalized];
}

export function isDateLike(value: string | undefined): boolean {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

export function hasRequiredFields(observation: Partial<AirfareObservation>): boolean {
  return REQUIRED_FIELDS.every((field) => {
    const value = observation[field as keyof Partial<AirfareObservation>];

    if (typeof value === 'number') {
      return Number.isFinite(value);
    }

    return value !== null && value !== undefined && String(value).trim() !== '';
  });
}

export function createIssue(
  observationId: string,
  type: ObservationIssueType,
  message: string,
  severity: 'info' | 'warning' | 'error' = 'warning',
  field?: string,
  status?: CleaningStatus
): DataQualityIssue {
  return {
    observationId,
    severity,
    type,
    field,
    message,
    status,
  };
}

export function normalizeObservationFields(observation: AirfareObservation): AirfareObservation {
  const origin = observation.origin?.trim().toUpperCase();
  const destination = observation.destination?.trim().toUpperCase();
  const routeCode = normalizeRouteCode(observation.route_code || `${origin}-${destination}`);

  const normalizedAdvance = normalizeAdvanceWindow(observation.advance_window ?? observation.advance_days);

  return {
    ...observation,
    origin,
    destination,
    route_code: routeCode,
    airline_id: normalizeAirlineId(observation.airline_id),
    airline_name: observation.airline_name?.trim() || AIRLINE_MAP[normalizeAirlineId(observation.airline_id)]?.name || observation.airline_name,
    airline_code: observation.airline_code?.trim().toUpperCase() || AIRLINE_MAP[normalizeAirlineId(observation.airline_id)]?.code || observation.airline_code,
    flight: observation.flight?.trim() || undefined,
    availability: observation.availability === 'unavailable' ? 'available' : observation.availability,
    source: observation.source?.trim() as DataSource,
    source_type: observation.source_type || 'synthetic',
    advance_window: normalizedAdvance ?? (Number(observation.advance_window) || 0),
    advance_days: normalizedAdvance ?? observation.advance_days ?? (Number(observation.advance_window) || undefined),
    fare_class: observation.fare_class ? (observation.fare_class as FareClass) : null,
  };
}

export function buildObservationFilters(filters?: ObservationFilters): ObservationFilters | undefined {
  if (!filters) return undefined;

  return {
    ...filters,
    cleaningStatus: filters.cleaningStatus,
    qualityIssue: filters.qualityIssue,
  };
}

export function isIndexEligible(observation: NormalizedObservation, config: CleaningConfig): boolean {
  if (!observation.index_eligible) return false;
  if (config.excludeSoldOut && observation.availability === 'sold_out') return false;
  if (config.excludeCancelled && observation.availability === 'cancelled') return false;
  return observation.cleaning_status === 'clean' || observation.cleaning_status === 'valid';
}

export function calculateRate(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 10000) / 100;
}

export { REQUIRED_FIELDS };
