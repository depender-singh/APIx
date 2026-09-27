import type { AirfareObservation, CleaningStatus, DataQualityIssue, DataQualityMetrics } from '@/types';

export interface CleaningConfig {
  fareTolerance: number;
  enableOutlierDetection: boolean;
  outlierMethod: 'iqr' | 'robust-zscore';
  outlierAction: 'flag' | 'exclude';
  excludeSoldOut: boolean;
  excludeCancelled: boolean;
  duplicateStrategy: 'keep-first' | 'keep-latest';
}

export interface CleaningResult {
  rawObservations: AirfareObservation[];
  cleanedObservations: AirfareObservation[];
  rejectedObservations: AirfareObservation[];
  flaggedObservations: AirfareObservation[];
  issues: DataQualityIssue[];
  report: DataQualityMetrics;
}

export interface OutlierEvaluation {
  isOutlier: boolean;
  method: 'iqr' | 'robust-zscore';
  score: number;
  threshold: number;
  reason: string;
}

export type ObservationIssueType =
  | 'missing_required_field'
  | 'invalid_route'
  | 'invalid_airline'
  | 'invalid_date'
  | 'invalid_fare'
  | 'duplicate'
  | 'outlier'
  | 'sold_out'
  | 'cancelled'
  | 'flagged';

export interface NormalizedObservation extends AirfareObservation {
  cleaning_status: CleaningStatus;
  quality_issues: DataQualityIssue[];
  index_eligible: boolean;
  duplicate_of?: string;
}
