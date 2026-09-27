import type { AirfareObservation, Route } from '@/types';

export interface IndexConfig {
  basePeriod: string;
  routes: { route_code: string; weight: number }[];
  aggregationMethod: 'weighted_average' | 'geometric_mean' | 'laspeyres';
  observationFrequency: 'daily' | 'weekly' | 'monthly';
}

export const DEFAULT_CONFIG: IndexConfig = {
  basePeriod: '2025-09-12',
  routes: [
    { route_code: 'DEL-BOM', weight: 15 },
    { route_code: 'DEL-BLR', weight: 12 },
    { route_code: 'BOM-BLR', weight: 10 },
    { route_code: 'DEL-CCU', weight: 8 },
    { route_code: 'BLR-HYD', weight: 7 },
    { route_code: 'MAA-DEL', weight: 6 },
  ],
  aggregationMethod: 'weighted_average',
  observationFrequency: 'daily',
};

export function calculateAPIx(
  currentPrices: Map<string, number>,
  basePrices: Map<string, number>,
  weights: Map<string, number>
): number {
  let weightedSum = 0;
  let weightedBase = 0;

  for (const [routeCode, currentPrice] of currentPrices) {
    const basePrice = basePrices.get(routeCode);
    const weight = weights.get(routeCode) || 0;
    if (basePrice && basePrice > 0) {
      weightedSum += weight * currentPrice;
      weightedBase += weight * basePrice;
    }
  }

  if (weightedBase === 0) return 100;
  return Math.round((weightedSum / weightedBase) * 10000) / 100;
}

export function calculateRouteIndex(
  observations: AirfareObservation[],
  routes: Route[],
  basePrices: Map<string, number>
): number {
  const currentPrices = new Map<string, number>();
  const weights = new Map<string, number>();

  for (const route of routes) {
    const routeObs = observations.filter((o) => o.route_code === route.route_code && o.cleaning_status === 'clean');
    if (routeObs.length > 0) {
      const avgFare = routeObs.reduce((s, o) => s + o.total_fare, 0) / routeObs.length;
      currentPrices.set(route.route_code, avgFare);
      weights.set(route.route_code, route.weight);
    }
  }

  return calculateAPIx(currentPrices, basePrices, weights);
}
