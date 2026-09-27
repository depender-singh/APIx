import type { AirfareObservation, DataQualityIssue } from '@/types';
import { createIssue } from './validators';
import type { CleaningConfig, NormalizedObservation, OutlierEvaluation } from './types';

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function iqr(values: number[]): { q1: number; q3: number; lower: number; upper: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor((sorted.length - 1) * 0.25);
  const q3Index = Math.floor((sorted.length - 1) * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  return {
    q1,
    q3,
    lower: q1 - 1.5 * iqr,
    upper: q3 + 1.5 * iqr,
  };
}

function robustZScore(value: number, medianValue: number, mad: number): number {
  if (mad === 0) return 0;
  return Math.abs((value - medianValue) / mad);
}

export function evaluateOutlier(
  observation: AirfareObservation,
  groupedObservations: AirfareObservation[],
  config: CleaningConfig
): { evaluation: OutlierEvaluation; issues: DataQualityIssue[] } {
  if (!config.enableOutlierDetection || groupedObservations.length < 3) {
    return {
      evaluation: {
        isOutlier: false,
        method: config.outlierMethod,
        score: 0,
        threshold: 0,
        reason: 'No outlier analysis required',
      },
      issues: [],
    };
  }

  const values = groupedObservations.map((item) => item.total_fare);
  const med = median(values);
  const { lower, upper } = iqr(values);
  const robustValues = groupedObservations.map((item) => Math.abs(item.total_fare - med));
  const mad = median(robustValues);

  const baseMethod = config.outlierMethod || 'iqr';

  if (baseMethod === 'iqr') {
    const points = observation.total_fare < lower || observation.total_fare > upper;
    const score = Math.abs(observation.total_fare - med) / Math.max(1, upper - lower);

    return {
      evaluation: {
        isOutlier: points,
        method: 'iqr',
        score: Number(score.toFixed(3)),
        threshold: Number(upper.toFixed(2)),
        reason: points
          ? 'Fare is outside the route/airline/advance-window IQR band'
          : 'Fare within expected band',
      },
      issues: points
        ? [createIssue(observation.id, 'outlier', 'Potential outlier detected using IQR analysis', 'warning', 'total_fare', 'outlier')]
        : [],
    };
  }

  const zScore = robustZScore(observation.total_fare, med, mad);
  const threshold = 3.5;

  return {
    evaluation: {
      isOutlier: zScore > threshold,
      method: 'robust-zscore',
      score: Number(zScore.toFixed(3)),
      threshold,
      reason: zScore > threshold
        ? 'Fare deviates substantially from group median using robust z-score'
        : 'Fare remains within expected robust z-score range',
    },
    issues: zScore > threshold
      ? [createIssue(observation.id, 'outlier', 'Potential outlier detected using robust z-score', 'warning', 'total_fare', 'outlier')]
      : [],
  };
}

export function groupObservationsForOutlierDetection(observations: AirfareObservation[]): Map<string, AirfareObservation[]> {
  const groups = new Map<string, AirfareObservation[]>();

  for (const observation of observations) {
    const key = [observation.route_code, observation.airline_id, observation.advance_window].join('|');
    const existing = groups.get(key) || [];
    existing.push(observation);
    groups.set(key, existing);
  }

  return groups;
}

export function detectOutliers(
  observations: AirfareObservation[],
  config: CleaningConfig
): { observations: NormalizedObservation[]; issues: DataQualityIssue[] } {
  const groups = groupObservationsForOutlierDetection(observations);
  const issues: DataQualityIssue[] = [];
  const result: NormalizedObservation[] = observations.map((observation) => ({
    ...observation,
    quality_issues: [],
    index_eligible: true,
    cleaning_status: observation.cleaning_status,
  }));

  for (const observation of result) {
    const group = groups.get([observation.route_code, observation.airline_id, observation.advance_window].join('|')) || [];
    const { evaluation, issues: groupIssues } = evaluateOutlier(observation, group, config);

    if (evaluation.isOutlier) {
      observation.index_eligible = false;
      observation.cleaning_status = 'outlier';
      observation.quality_issues = [...(observation.quality_issues || []), ...groupIssues];
      issues.push(...groupIssues);
    }
  }

  return { observations: result, issues };
}
