import type { AirfareObservation, DataQualityIssue, DataQualityMetrics } from '@/types';
import { calculateRate } from './validators';

export function buildQualityMetrics(
  observations: AirfareObservation[],
  issues: DataQualityIssue[]
): DataQualityMetrics {
  const total = observations.length;
  const validObservations = observations.filter((o) => o.cleaning_status === 'clean' || o.cleaning_status === 'valid').length;
  const invalidObservations = observations.filter((o) => o.cleaning_status === 'invalid' || o.cleaning_status === 'missing_required_field' || o.cleaning_status === 'invalid_route' || o.cleaning_status === 'invalid_airline' || o.cleaning_status === 'invalid_date' || o.cleaning_status === 'invalid_fare').length;
  const duplicateObservations = observations.filter((o) => o.cleaning_status === 'duplicate').length;
  const missingObservations = observations.filter((o) => o.cleaning_status === 'missing_required_field').length;
  const outliers = observations.filter((o) => o.cleaning_status === 'outlier').length;
  const soldOutRecords = observations.filter((o) => o.availability === 'sold_out').length;
  const cancelledFlights = observations.filter((o) => o.availability === 'cancelled').length;
  const availableObservations = observations.filter((o) => o.availability === 'available').length;
  const indexEligibleObservations = observations.filter((o) => o.index_eligible).length;

  const completenessRate = calculateRate(
    observations.filter((o) => o.origin && o.destination && o.route_code && o.airline_id && o.travel_date && o.search_date && o.collection_timestamp).length,
    total
  );

  const validityRate = calculateRate(validObservations, total);
  const duplicateRate = calculateRate(duplicateObservations, total);
  const availabilityRate = calculateRate(availableObservations, total);
  const outlierRate = calculateRate(outliers, total);
  const cleaningSuccessRate = validityRate;
  const qualityScore = validityRate;

  return {
    total_observations: total,
    valid_observations: validObservations,
    invalid_observations: invalidObservations,
    duplicate_observations: duplicateObservations,
    missing_observations: missingObservations,
    outliers,
    sold_out_records: soldOutRecords,
    cancelled_flights: cancelledFlights,
    available_observations: availableObservations,
    index_eligible_observations: indexEligibleObservations,
    completeness_rate: completenessRate,
    validity_rate: validityRate,
    duplicate_rate: duplicateRate,
    availability_rate: availabilityRate,
    outlier_rate: outlierRate,
    cleaning_success_rate: cleaningSuccessRate,
    quality_score: qualityScore,
    issues,
  };
}
