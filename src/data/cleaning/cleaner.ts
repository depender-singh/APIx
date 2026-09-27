import type { AirfareObservation, DataQualityIssue } from '@/types';
import { AIRLINE_MAP } from '@/data/airports';
import {
  createIssue,
  DEFAULT_CLEANING_CONFIG,
  normalizeAdvanceWindow,
  normalizeAirlineId,
  normalizeObservationFields,
  hasRequiredFields,
  isDateLike,
  isIndexEligible,
  isValidAirline,
  isValidRoute,
} from './validators';
import { detectOutliers } from './outliers';
import { buildQualityMetrics } from './qualityMetrics';
import type { CleaningConfig, CleaningResult, NormalizedObservation } from './types';

const DEFAULT_CONFIG: CleaningConfig = DEFAULT_CLEANING_CONFIG;

function buildDuplicateKey(observation: Pick<AirfareObservation, 'source' | 'route_code' | 'airline_id' | 'travel_date' | 'search_date' | 'advance_window' | 'fare_class' | 'flight' | 'flight_id'>): string {
  return [
    observation.source,
    observation.route_code,
    observation.airline_id,
    observation.travel_date,
    observation.search_date,
    observation.advance_window,
    observation.fare_class,
    observation.flight || observation.flight_id,
  ].join('|');
}

function markDuplicateCandidates(
  observations: NormalizedObservation[],
  config: CleaningConfig
): { observations: NormalizedObservation[]; issues: DataQualityIssue[] } {
  const seen = new Map<string, NormalizedObservation>();
  const issues: DataQualityIssue[] = [];

  const results: NormalizedObservation[] = observations.map((observation) => {
    const duplicateKey = buildDuplicateKey(observation);

    if (!seen.has(duplicateKey)) {
      seen.set(duplicateKey, observation);
      return observation;
    }

    const duplicateIssue = createIssue(
      observation.id,
      'duplicate',
      `Duplicate observation detected for ${observation.route_code}; retained ${config.duplicateStrategy === 'keep-first' ? 'first' : 'latest'} record`,
      'warning',
      'route_code',
      'duplicate'
    );

    issues.push(duplicateIssue);

    return {
      ...observation,
      cleaning_status: 'duplicate',
      duplicate_of: seen.get(duplicateKey)?.id,
      index_eligible: false,
      quality_issues: [...(observation.quality_issues || []), duplicateIssue],
    } satisfies NormalizedObservation;
  });

  return { observations: results, issues };
}

export function cleanObservations(
  rawObservations: AirfareObservation[],
  config: Partial<CleaningConfig> = {}
): CleaningResult {
  const effectiveConfig: CleaningConfig = { ...DEFAULT_CONFIG, ...config };

  const processed: NormalizedObservation[] = [];
  const allIssues: DataQualityIssue[] = [];

  for (const observation of rawObservations.map((item) => normalizeObservationFields(item))) {
    const localIssues: DataQualityIssue[] = [];
    let nextStatus: AirfareObservation['cleaning_status'] = 'clean';

    if (!hasRequiredFields(observation)) {
      nextStatus = 'missing_required_field';
      localIssues.push(
        createIssue(
          observation.id,
          'missing_required_field',
          'Missing one or more required fields for a valid observation',
          'error',
          'required_fields',
          'missing_required_field'
        )
      );
    }

    if (!isValidRoute(observation.route_code)) {
      nextStatus = 'invalid_route';
      localIssues.push(
        createIssue(observation.id, 'invalid_route', `Invalid route code: ${observation.route_code}`, 'error', 'route_code', 'invalid_route')
      );
    }

    const normalizedAirlineId = normalizeAirlineId(observation.airline_id);
    if (!isValidAirline(normalizedAirlineId)) {
      nextStatus = 'invalid_airline';
      localIssues.push(
        createIssue(observation.id, 'invalid_airline', `Unknown airline identifier: ${observation.airline_id}`, 'error', 'airline_id', 'invalid_airline')
      );
    }

    if (!isDateLike(observation.travel_date) || !isDateLike(observation.search_date) || !isDateLike(observation.collection_timestamp)) {
      nextStatus = 'invalid_date';
      localIssues.push(
        createIssue(observation.id, 'invalid_date', 'Invalid travel, search, or collection date value', 'error', 'travel_date', 'invalid_date')
      );
    }

    const normalizedAdvance = normalizeAdvanceWindow(observation.advance_window ?? observation.advance_days);
    if (normalizedAdvance === null) {
      nextStatus = 'invalid_date';
      localIssues.push(
        createIssue(observation.id, 'invalid_date', 'Unsupported advance window format', 'warning', 'advance_window', 'invalid_date')
      );
    }

    const components = [observation.base_fare, observation.taxes, observation.udf, observation.convenience_fee];
    if (components.some((value) => value !== null && value < 0) || observation.total_fare < 0) {
      nextStatus = 'invalid_fare';
      localIssues.push(
        createIssue(observation.id, 'invalid_fare', 'Negative fare component detected', 'error', 'total_fare', 'invalid_fare')
      );
    }

    const hasCompleteFare = components.every((value) => value !== null);
    const calculatedTotal = hasCompleteFare ? components.reduce((sum, value) => sum + (value ?? 0), 0) : null;
    const fareDifference = calculatedTotal === null ? 0 : Math.abs(calculatedTotal - observation.total_fare);
    if (calculatedTotal !== null && fareDifference > effectiveConfig.fareTolerance) {
      nextStatus = 'invalid_fare';
      localIssues.push(
        createIssue(
          observation.id,
          'invalid_fare',
          `Fare total mismatch: expected approximately ${calculatedTotal} but received ${observation.total_fare}`,
          'warning',
          'total_fare',
          'invalid_fare'
        )
      );
    }

    if (observation.availability === 'sold_out' && effectiveConfig.excludeSoldOut) {
      nextStatus = 'sold_out';
      localIssues.push(
        createIssue(observation.id, 'sold_out', 'Sold-out observation excluded from index eligibility', 'info', 'availability', 'sold_out')
      );
    }

    if (observation.availability === 'cancelled' && effectiveConfig.excludeCancelled) {
      nextStatus = 'cancelled';
      localIssues.push(
        createIssue(observation.id, 'cancelled', 'Cancelled observation excluded from index eligibility', 'info', 'availability', 'cancelled')
      );
    }

    const candidate: NormalizedObservation = {
      ...observation,
      airline_id: normalizedAirlineId,
      airline_name: AIRLINE_MAP[normalizedAirlineId]?.name || observation.airline_name,
      airline_code: AIRLINE_MAP[normalizedAirlineId]?.code || observation.airline_code,
      advance_window: normalizedAdvance ?? observation.advance_window,
      advance_days: normalizedAdvance ?? observation.advance_days,
      cleaning_status: nextStatus,
      quality_issues: localIssues,
      index_eligible: nextStatus === 'clean',
    };

    processed.push(candidate);
    allIssues.push(...localIssues);
  }

  const duplicateResult = markDuplicateCandidates(processed, effectiveConfig);

  const outlierTarget = duplicateResult.observations.filter(
    (observation) => observation.cleaning_status === 'clean'
  );

  const outlierResult = detectOutliers(outlierTarget, effectiveConfig);
  const outlierMap = new Map(outlierResult.observations.map((observation) => [observation.id, observation]));

  const finalObservations = duplicateResult.observations.map((observation) => {
    if (observation.cleaning_status !== 'clean') {
      return {
        ...observation,
        index_eligible: isIndexEligible(observation, effectiveConfig),
      };
    }

    const outlierObservation = outlierMap.get(observation.id);
    if (!outlierObservation) {
      return {
        ...observation,
        index_eligible: isIndexEligible(observation, effectiveConfig),
      };
    }

    const mergedIssues = [...(observation.quality_issues || []), ...(outlierObservation.quality_issues || [])];

    return {
      ...outlierObservation,
      quality_issues: mergedIssues,
      index_eligible: isIndexEligible(outlierObservation, effectiveConfig),
    };
  });

  const report = buildQualityMetrics(finalObservations, [...allIssues, ...duplicateResult.issues, ...outlierResult.issues]);

  const cleanedObservations = finalObservations.filter((observation) => observation.cleaning_status === 'clean' && observation.index_eligible);
  const rejectedObservations = finalObservations.filter((observation) =>
    ['invalid_route', 'invalid_airline', 'invalid_date', 'invalid_fare', 'missing_required_field'].includes(observation.cleaning_status)
  );
  const flaggedObservations = finalObservations.filter((observation) =>
    ['duplicate', 'sold_out', 'cancelled', 'outlier'].includes(observation.cleaning_status)
  );

  return {
    rawObservations,
    cleanedObservations,
    rejectedObservations,
    flaggedObservations,
    issues: [...allIssues, ...duplicateResult.issues, ...outlierResult.issues],
    report,
  };
}
