import * as mockEngine from '@/data/mockEngine';

import {
  getAirlines,
  getAnalyticsAirline,
  getAnalyticsAvailability,
  getAnalyticsFareComposition,
  getAnalyticsLeadTime,
  getAnalyticsOverview,
  getAnalyticsRoute,
  getAnalyticsRoutes,
  getAnalyticsAirlines,
  getDgcaBenchmarks,
  getLatestBacktest,
  getCurrentDataMode,
  getDataQuality,
  getIndexHistory,
  getLatestIndex,
  getMospiCpi,
  getObservations,
  getRoutes,
  runBacktest,
  type Airline,
  type ApiMode,
  type DataQualityMetrics,
  type Observation,
  type Route,
  type BacktestResult,
} from './api';

type UiAirline = {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  color: string;
};

type IndexValueLike = {
  id: string;
  date: string;
  api_x: number;
  index_date: string;
  index_value: number;
  base_period: string;
  yoy_change: number;
  mom_change: number;
  observations_count: number;
};

type QualityLike = {
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
  completeness_rate: number | null;
  validity_rate: number | null;
  duplicate_rate: number | null;
  availability_rate: number | null;
  outlier_rate: number | null;
  cleaning_success_rate: number;
  quality_score: number;
};

type RouteStat = {
  route_code: string;
  origin: string;
  destination: string;
  avg_fare: number;
  change_pct: number;
  observations: number;
  availability_rate: number;
  airlines_count: number;
  apix_contribution: number;
  last_updated: string;
  route?: Route;
};

export interface OverviewData {
  latestIndex: IndexValueLike | null;
  routeStats: RouteStat[];
  topMovers: {
    increases: Array<{ route_code: string; avg_fare: number; change_pct: number }>;
    decreases: Array<{ route_code: string; avg_fare: number; change_pct: number }>;
  };
  quality: QualityLike;
  availableFlights: number;
  airlinesCount: number;
  quotesCollected: number;
  indexSeries: Array<{ name: string; color: string; data: Array<{ x: string; y: number }> }>;
  sparkline: number[];
}

function mapIndexValue(item: {
  id?: string;
  index_date?: string;
  index_value?: number;
  index_value_value?: number;
  base_period?: string | null;
}): IndexValueLike {
  const value = item.index_value ?? item.index_value_value ?? 0;
  const indexDate = item.index_date ?? '';

  return {
    id: item.id ?? indexDate,
    date: indexDate,
    api_x: value,
    index_date: indexDate,
    index_value: value,
    base_period: item.base_period ?? indexDate,
    yoy_change: 0,
    mom_change: 0,
    observations_count: 0,
  };
}

function buildQualityResponse(response: DataQualityMetrics): QualityLike {
  return {
    total_observations: response.total_observations ?? 0,
    valid_observations: response.valid_observations ?? 0,
    invalid_observations: response.invalid_observations ?? 0,
    duplicate_observations: response.duplicate_observations ?? 0,
    missing_observations: response.missing_field_observations ?? 0,
    outliers: response.outlier_observations ?? 0,
    sold_out_records: response.sold_out_observations ?? 0,
    cancelled_flights: response.cancelled_observations ?? 0,
    available_observations: response.available_observations ?? 0,
    index_eligible_observations: response.index_eligible_observations ?? 0,
    completeness_rate: response.completeness_rate ?? null,
    validity_rate: response.validity_rate ?? null,
    duplicate_rate: response.duplicate_rate ?? null,
    availability_rate: response.availability_rate ?? null,
    outlier_rate: response.outlier_rate ?? null,
    cleaning_success_rate:
      typeof response.validity_rate === 'number'
        ? Math.round(response.validity_rate * 100)
        : 0,
    quality_score:
      typeof response.completeness_rate === 'number'
        ? Math.round(response.completeness_rate * 100)
        : 0,
  };
}

function buildRouteStats(routes: Route[], observations: Observation[]) {
  return routes.map((route) => {
    const routeObs = observations.filter(
      (observation) => observation.route_code === route.route_code && observation.cleaning_status === 'clean',
    );

    const avgFare = routeObs.length > 0
      ? routeObs.reduce((sum, observation) => sum + Number(observation.total_fare), 0) / routeObs.length
      : 0;
    const availabilityRate = routeObs.length > 0
      ? (routeObs.filter((observation) => observation.availability === 'available').length / routeObs.length) * 100
      : 0;

    return {
      route_code: route.route_code,
      origin: route.origin,
      destination: route.destination,
      avg_fare: avgFare,
      change_pct: 0,
      observations: routeObs.length,
      availability_rate: availabilityRate,
      airlines_count: new Set(routeObs.map((observation) => observation.airline_id)).size,
      apix_contribution: 0,
      last_updated: route.updated_at || route.created_at,
      route,
    };
  });
}

function buildAirlineStats(airlines: Airline[], observations: Observation[]): Array<{
  airline_id: string;
  airline: UiAirline;
  avg_fare: number;
  fare_change: number;
  routes_count: number;
  observations: number;
  availability_rate: number;
  avg_taxes: number;
  avg_convenience_fee: number;
  name: string;
  code: string;
  color: string;
}> {
  return airlines.map((airline) => {
    const airlineObs = observations.filter(
      (observation) => observation.airline_id === airline.airline_id && observation.cleaning_status === 'clean',
    );

    const avgFare = airlineObs.length > 0
      ? airlineObs.reduce((sum, observation) => sum + Number(observation.total_fare), 0) / airlineObs.length
      : 0;
    const avgTaxes = airlineObs.length > 0
      ? airlineObs.reduce((sum, observation) => sum + Number(observation.taxes), 0) / airlineObs.length
      : 0;
    const avgConvenienceFee = airlineObs.length > 0
      ? airlineObs.reduce((sum, observation) => sum + Number(observation.convenience_fee), 0) / airlineObs.length
      : 0;

    return {
      airline_id: airline.airline_id,
      airline: {
        id: airline.airline_id,
        name: airline.airline_name,
        code: airline.iata_code || airline.airline_id,
        status: airline.is_active ? 'active' : 'inactive',
        color: '#3B82F6',
      },
      avg_fare: avgFare,
      fare_change: 0,
      routes_count: new Set(airlineObs.map((observation) => observation.route_code)).size,
      observations: airlineObs.length,
      availability_rate: airlineObs.length > 0
        ? (airlineObs.filter((observation) => observation.availability === 'available').length / airlineObs.length) * 100
        : 0,
      avg_taxes: avgTaxes,
      avg_convenience_fee: avgConvenienceFee,
      name: airline.airline_name,
      code: airline.iata_code || airline.airline_id,
      color: '#3B82F6',
    };
  });
}

function buildDistribution(values: number[]) {
  const buckets = [
    { label: '₹0-2500', min: 0, max: 2500 },
    { label: '₹2500-5000', min: 2500, max: 5000 },
    { label: '₹5000-7500', min: 5000, max: 7500 },
    { label: '₹7500-10000', min: 7500, max: 10000 },
    { label: '₹10000+', min: 10000, max: Number.POSITIVE_INFINITY },
  ];

  return buckets.map((bucket) => ({
    range: bucket.label,
    count: values.filter((value) => value >= bucket.min && value < bucket.max).length,
  }));
}

export async function loadOverviewData(dateRange: string = '30d'): Promise<OverviewData> {
  const mode: ApiMode = getCurrentDataMode();

  if (mode === 'mock') {
    const latestIndex = mockEngine.getLatestIndex({ dateRange: dateRange as never });

    return {
      latestIndex: latestIndex ? mapIndexValue({
        id: latestIndex.id,
        index_date: latestIndex.date,
        index_value: latestIndex.api_x,
        base_period: latestIndex.base_period,
      }) : null,
      routeStats: mockEngine.getAllRouteStats({ dateRange: dateRange as never }),
      topMovers: mockEngine.getTopMovers({ dateRange: dateRange as never }),
      quality: mockEngine.getDataQualityMetrics({ dateRange: dateRange as never }),
      availableFlights: mockEngine.OBSERVATIONS.filter((observation) => observation.availability === 'available').length,
      airlinesCount: mockEngine.AIRLINES.length,
      quotesCollected: mockEngine.OBSERVATIONS.length,
      indexSeries: [
        {
          name: 'APIx',
          color: '#3B82F6',
          data: mockEngine.INDEX_VALUES.map((value) => ({ x: value.date, y: value.api_x })),
        },
        {
          name: 'Previous Period',
          color: '#64748B',
          data: mockEngine.INDEX_VALUES.map((value, index) => ({ x: value.date, y: 100 + index * 0.15 })),
        },
      ],
      sparkline: mockEngine.INDEX_VALUES.slice(-10).map((value) => value.api_x),
    };
  }

  const analyticsOverview = await getAnalyticsOverview();

  const latestIndex = analyticsOverview.latest_index ? mapIndexValue(analyticsOverview.latest_index) : null;
  const routeStats = analyticsOverview.route_stats.map((route) => ({
    route_code: route.route_code,
    origin: route.origin,
    destination: route.destination,
    avg_fare: route.avg_fare,
    change_pct: route.change_pct,
    observations: route.observations,
    availability_rate: route.availability_rate,
    airlines_count: route.airlines_count,
    apix_contribution: route.apix_contribution,
    last_updated: route.last_updated ?? '',
    route: undefined,
  }));
  const topMovers = {
    increases: analyticsOverview.top_movers.increases.map((route) => ({
      route_code: route.route_code,
      avg_fare: route.avg_fare,
      change_pct: route.change_pct,
    })),
    decreases: analyticsOverview.top_movers.decreases.map((route) => ({
      route_code: route.route_code,
      avg_fare: route.avg_fare,
      change_pct: route.change_pct,
    })),
  };

  const quality = buildQualityResponse(analyticsOverview.quality as DataQualityMetrics);
  const indexSeries = [
    {
      name: 'APIx',
      color: '#3B82F6',
      data: analyticsOverview.index_series.map((item) => ({ x: item.index_date, y: item.index_value })),
    },
    {
      name: 'Previous Period',
      color: '#64748B',
      data: analyticsOverview.index_series.map((item, index) => ({ x: item.index_date, y: 100 + index * 0.15 })),
    },
  ];

  return {
    latestIndex: latestIndex ?? null,
    routeStats,
    topMovers,
    quality,
    availableFlights: analyticsOverview.available_flights,
    airlinesCount: analyticsOverview.airlines_count,
    quotesCollected: analyticsOverview.quotes_collected,
    indexSeries,
    sparkline: analyticsOverview.sparkline,
  };
}

export async function loadRoutesPageData(dateRange: string = '30d') {
  const mode: ApiMode = getCurrentDataMode();

  if (mode === 'mock') {
    return {
      allStats: mockEngine.getAllRouteStats({ dateRange: dateRange as never }),
      origins: [...new Set(mockEngine.ROUTES.map((route) => route.origin))].sort(),
      airlineOptions: mockEngine.AIRLINES.map((airline) => ({ value: airline.id, label: airline.name })),
    };
  }

  const [routesResponse, airlinesResponse, observationsResponse] = await Promise.all([
    getRoutes(),
    getAirlines(),
    getObservations({ page_size: 200 }),
  ]);

  const observations = observationsResponse.items ?? [];
  const allStats = buildRouteStats(routesResponse.items, observations);

  return {
    allStats,
    origins: [...new Set(routesResponse.items.map((route) => route.origin))].sort(),
    airlineOptions: airlinesResponse.items.map((airline) => ({ value: airline.airline_id, label: airline.airline_name })),
  };
}

export async function loadAirlinesPageData(dateRange: string = '30d') {
  const mode = getCurrentDataMode();

  if (mode === 'mock') {
    const stats = mockEngine.getAllAirlineStats({ dateRange: dateRange as never }).map((airline) => ({
      ...airline,
      airline: {
        id: airline.airline.id,
        name: airline.airline.name,
        code: airline.airline.code,
        status: airline.airline.status,
        color: airline.airline.color,
      },
    }));
    const comparisonData = mockEngine.getAirlineComparisonData({ dateRange: dateRange as never });

    return {
      stats,
      comparisonData,
      totalObs: stats.reduce((sum, airline) => sum + (airline.observations || 0), 0),
      avgFare: stats.length > 0 ? Math.round(stats.reduce((sum, airline) => sum + (airline.avg_fare || 0), 0) / stats.length) : 0,
      routesCovered: stats.reduce((sum, airline) => sum + (airline.routes_count || 0), 0),
      totalAirlines: stats.length,
    };
  }

  const [airlinesResponse, observationsResponse] = await Promise.all([
    getAirlines(),
    getObservations({ page_size: 200 }),
  ]);

  const observations = observationsResponse.items ?? [];
  const stats = buildAirlineStats(airlinesResponse.items, observations);
  const comparisonData = stats.map((item) => ({
    name: item.name,
    avg_fare: item.avg_fare,
    routes: item.routes_count,
    availability: item.availability_rate,
    color: item.color,
  }));

  return {
    stats,
    comparisonData,
    totalObs: stats.reduce((sum, airline) => sum + (airline.observations || 0), 0),
    avgFare: stats.length > 0 ? Math.round(stats.reduce((sum, airline) => sum + (airline.avg_fare || 0), 0) / stats.length) : 0,
    routesCovered: stats.reduce((sum, airline) => sum + (airline.routes_count || 0), 0),
    totalAirlines: stats.length,
  };
}

export async function loadAdminQualityData(dateRange: string = '30d') {
  const mode = getCurrentDataMode();

  if (mode === 'mock') {
    return mockEngine.getDataQualityMetrics({ dateRange: dateRange as never });
  }

  const quality = buildQualityResponse(await getDataQuality());
  return quality;
}

export async function loadLeadTimeData(route?: string, airline?: string) {
  const mode = getCurrentDataMode();
  if (mode === 'mock') return mockEngine.getLeadTimeData(route, airline, { dateRange: '30d' as never });
  return getAnalyticsLeadTime({ route, airline });
}

export async function loadAvailabilityData() {
  const mode = getCurrentDataMode();
  if (mode === 'mock') {
    return {
      data: mockEngine.getAvailabilityData(),
      trend: mockEngine.getAvailabilityTrend(),
      routeStats: mockEngine.getAllRouteStats(),
      airlineStats: mockEngine.getAllAirlineStats(),
    };
  }
  const [data, routeStats, airlineStats] = await Promise.all([
    getAnalyticsAvailability(),
    getAnalyticsRoutes(),
    getAnalyticsAirlines(),
  ]);
  return { data, trend: [], routeStats: routeStats.map((item) => ({ ...item, airline: undefined })), airlineStats };
}

export async function loadFareCompositionData(route?: string, airline?: string) {
  const mode = getCurrentDataMode();
  if (mode === 'mock') return mockEngine.getFareComposition(route, airline, { dateRange: '30d' as never });
  return getAnalyticsFareComposition({ route, airline });
}

export async function loadHistoricalData(dateRange: string = '30d') {
  const mode = getCurrentDataMode();

  if (mode === 'mock') {
    return {
      latest: mockEngine.getLatestIndex({ dateRange: dateRange as never }),
      indexValues: mockEngine.INDEX_VALUES,
    };
  }

  const [latestResponse, history] = await Promise.all([getLatestIndex(), getIndexHistory({ page_size: 200 })]);

  const latest = latestResponse ? mapIndexValue(latestResponse) : null;
  const indexValues = history.items.map((item) => mapIndexValue(item));

  return {
    latest: latest ?? indexValues[indexValues.length - 1] ?? null,
    indexValues,
  };
}

export async function loadBacktestingData(dateRange: string = '30d') {
  const mode = getCurrentDataMode();
  if (mode === 'mock') {
    const results = mockEngine.BACKTEST_RESULTS.filter((result) => {
      const diff = (new Date('2026-09-12').getTime() - new Date(result.date).getTime()) / 86400000;
      return diff <= (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 365);
    });
    const metrics = mockEngine.getBacktestMetrics({ dateRange: dateRange as never });
    return {
      result: {
        id: 'synthetic-demo-backtest', benchmark_source: 'synthetic_demo', benchmark_dataset: 'synthetic-demo', benchmark_version: 'demo-v1',
        methodology_version: 'synthetic-demo-v1', route_scope: 'overall', frequency: 'daily', observation_count: results.length,
        correlation: metrics.correlation, mae: metrics.mae, rmse: null, directional_accuracy: metrics.directional_accuracy,
        bias: metrics.bias, mape: null, stability: metrics.index_stability, status: 'partial',
        series: results.map((item) => ({ date: item.date, apix: item.api_x, benchmark: item.benchmark })), route_results: [], created_at: '2026-09-12T00:00:00Z',
      } as BacktestResult,
      benchmarks: [],
    };
  }
  const [latest, benchmarks] = await Promise.all([getLatestBacktest(), getDgcaBenchmarks()]);
  const result = latest ?? await runBacktest({ benchmark_source: 'dgca', frequency: 'monthly' });
  return { result, benchmarks: benchmarks.items };
}

export async function loadInflationContext(dateRange: string = '30d') {
  const mode = getCurrentDataMode();
  if (mode === 'mock') {
    const inflationData = mockEngine.getInflationData({ dateRange: dateRange as never });
    return {
      status: 'synthetic_demo' as const,
      source_type: 'synthetic',
      indicator_code: 'CPI_DEMO',
      items: [],
      apixSeries: inflationData.map((item) => ({ date: item.date, apix: item.api_x, cpi: 100 + (item.api_x - 100) * 0.35 })),
      comparison: null,
      mockInflation: inflationData,
      mockDrivers: mockEngine.getInflationDrivers({ dateRange: dateRange as never }),
    };
  }
  const context = await getMospiCpi();
  return { ...context, apixSeries: context.apix_series, mockInflation: [], mockDrivers: [] };
}

export async function loadRouteDetailData(routeCode: string) {
  const mode = getCurrentDataMode();

  if (mode === 'mock') {
    const stats = mockEngine.getRouteStats(routeCode, { dateRange: '30d' as never });
    const trend = mockEngine.getRouteFareTrend(routeCode, { dateRange: '30d' as never });
    const composition = mockEngine.getFareComposition(routeCode, undefined, { dateRange: '30d' as never });
    const distribution = mockEngine.getFareDistribution(routeCode);
    const route = mockEngine.ROUTES.find((item) => item.route_code === routeCode) ?? null;
    const routeObs = mockEngine.OBSERVATIONS.filter((observation) => observation.route_code === routeCode && observation.cleaning_status === 'clean');
    const airlinesOnRoute = mockEngine.AIRLINES.filter((airline) => routeObs.some((observation) => observation.airline_id === airline.id));
    const airlineComparison = airlinesOnRoute.map((airline) => {
      const airlineObs = routeObs.filter((observation) => observation.airline_id === airline.id);
      const avgFare = airlineObs.length > 0
        ? Math.round(airlineObs.reduce((sum, observation) => sum + observation.total_fare, 0) / airlineObs.length)
        : 0;
      return { label: airline.name, value: avgFare, color: airline.color };
    });

    const leadTimeData = [1, 7, 15, 30, 45].map((window) => {
      const windowObs = routeObs.filter((observation) => observation.advance_window === window);
      const avgFare = windowObs.length > 0
        ? Math.round(windowObs.reduce((sum, observation) => sum + observation.total_fare, 0) / windowObs.length)
        : 0;
      return { label: `T+${window}`, value: avgFare, color: '#14B8A6' };
    });

    const availabilityTrend = trend.map((point) => ({
      x: point.date,
      y: point.observations > 0 ? Math.round((point.observations / 20) * 1000) / 10 : 0,
    }));

    const compositionData = [
      composition.base_fare == null ? null : { label: 'Base Fare', value: composition.base_fare, color: '#3B82F6' },
      composition.taxes == null ? null : { label: 'Taxes', value: composition.taxes, color: '#14B8A6' },
      composition.udf == null ? null : { label: 'UDF', value: composition.udf, color: '#F59E0B' },
      composition.convenience_fee == null ? null : { label: 'Convenience Fee', value: composition.convenience_fee, color: '#8B5CF6' },
    ].filter((item): item is { label: string; value: number; color: string } => item !== null);

    return { stats, trend, composition, distribution, route, routeObs, airlinesOnRoute, airlineComparison, leadTimeData, availabilityTrend, compositionData };
  }

  const [routesResponse, observationsResponse, airlinesResponse] = await Promise.all([
    getRoutes(),
    getObservations({ page_size: 200 }),
    getAirlines(),
  ]);

  const route = routesResponse.items.find((item) => item.route_code === routeCode) ?? null;
  const observations = observationsResponse.items ?? [];
  const routeObs = observations.filter((observation) => observation.route_code === routeCode && observation.cleaning_status === 'clean');

  const [routeStatsResponse, leadTimeResponse, fareCompositionResponse, availabilityResponse] = await Promise.all([
    getAnalyticsRoute(routeCode),
    getAnalyticsLeadTime({ route: routeCode }),
    getAnalyticsFareComposition({ route: routeCode }),
    getAnalyticsAvailability({ route: routeCode }),
  ]);

  const stats = routeStatsResponse
    ? {
        route_code: routeStatsResponse.route_code,
        origin: route?.origin ?? routeStatsResponse.origin,
        destination: route?.destination ?? routeStatsResponse.destination,
        avg_fare: routeStatsResponse.avg_fare,
        change_pct: routeStatsResponse.change_pct,
        observations: routeStatsResponse.observations,
        availability_rate: routeStatsResponse.availability_rate,
        airlines_count: routeStatsResponse.airlines_count,
        apix_contribution: routeStatsResponse.apix_contribution,
        last_updated: routeStatsResponse.last_updated ?? route?.updated_at ?? route?.created_at ?? '',
      }
    : null;

  const trend = Array.from(
    routeObs.reduce((map, observation) => {
      const key = observation.travel_date;
      const current = map.get(key) ?? { date: key, fare: 0, observations: 0 };
      current.fare += Number(observation.total_fare);
      current.observations += 1;
      map.set(key, current);
      return map;
    }, new Map<string, { date: string; fare: number; observations: number }>()),
  ).map(([date, value]) => ({
    date,
    fare: value.fare / value.observations,
    observations: value.observations,
  })).sort((a, b) => a.date.localeCompare(b.date));

  const composition = {
    base_fare: fareCompositionResponse.base_fare,
    taxes: fareCompositionResponse.taxes,
    udf: fareCompositionResponse.udf,
    convenience_fee: fareCompositionResponse.convenience_fee,
    total: fareCompositionResponse.total,
  };

  const distribution = buildDistribution(routeObs.map((observation) => Number(observation.total_fare)));

  const airlinesOnRoute = airlinesResponse.items.filter((airline) => routeObs.some((observation) => observation.airline_id === airline.airline_id));
  const airlineComparison = airlinesOnRoute.map((airline) => {
    const airlineObs = routeObs.filter((observation) => observation.airline_id === airline.airline_id);
    const avgFare = airlineObs.length > 0
      ? Math.round(airlineObs.reduce((sum, observation) => sum + Number(observation.total_fare), 0) / airlineObs.length)
      : 0;
    return { label: airline.airline_name, value: avgFare, color: '#3B82F6' };
  });

  const leadTimeData = leadTimeResponse.map((point: { advance_window: number; avg_fare: number }) => ({
    label: `T+${point.advance_window}`,
    value: point.avg_fare,
    color: '#14B8A6',
  }));

  const availabilityTrend = trend.map((point) => ({
    x: point.date,
    y: point.observations > 0 ? Math.round((point.observations / 20) * 1000) / 10 : 0,
  }));

  const compositionData = [
    composition.base_fare == null ? null : { label: 'Base Fare', value: composition.base_fare, color: '#3B82F6' },
    composition.taxes == null ? null : { label: 'Taxes', value: composition.taxes, color: '#14B8A6' },
    composition.udf == null ? null : { label: 'UDF', value: composition.udf, color: '#F59E0B' },
    composition.convenience_fee == null ? null : { label: 'Convenience Fee', value: composition.convenience_fee, color: '#8B5CF6' },
  ].filter((item): item is { label: string; value: number; color: string } => item !== null);

  return { stats, trend, composition, distribution, route, routeObs, airlinesOnRoute, airlineComparison, leadTimeData, availabilityTrend, compositionData, availability: availabilityResponse };
}

export async function loadAirlineDetailData(airlineId: string) {
  const mode = getCurrentDataMode();

  if (mode === 'mock') {
    const airline = mockEngine.AIRLINES.find((item) => item.id === airlineId) ?? null;
    const airlineUi: UiAirline | null = airline ? {
      id: airline.id,
      name: airline.name,
      code: airline.code,
      status: airline.status,
      color: airline.color,
    } : null;
    const stats = mockEngine.getAirlineStats(airlineId, { dateRange: '30d' as never });
    const trend = mockEngine.getAirlineFareTrend(airlineId, { dateRange: '30d' as never });
    const routeData = mockEngine.getAirlineRouteData(airlineId, { dateRange: '30d' as never });
    const composition = mockEngine.getFareComposition(undefined, airlineId, { dateRange: '30d' as never });
    const distribution = mockEngine.getFareDistribution(undefined);

    const leadTimeData = [1, 7, 15, 30, 45].map((window) => {
      const windowObs = trend.filter((point) => point.date !== undefined);
      const avgFare = windowObs.length > 0 ? Math.round(windowObs.reduce((sum, point) => sum + (point.fare || 0), 0) / windowObs.length) : 0;
      return { label: `T+${window}`, value: avgFare, color: airlineUi?.color ?? '#3B82F6' };
    });

    const compositionData = [
      composition.base_fare == null ? null : { label: 'Base Fare', value: composition.base_fare, color: '#3B82F6' },
      composition.taxes == null ? null : { label: 'Taxes', value: composition.taxes, color: '#14B8A6' },
      composition.udf == null ? null : { label: 'UDF', value: composition.udf, color: '#F59E0B' },
      composition.convenience_fee == null ? null : { label: 'Convenience Fee', value: composition.convenience_fee, color: '#8B5CF6' },
    ].filter((item): item is { label: string; value: number; color: string } => item !== null);

    return { airline: airlineUi, stats, trend, routeData, composition, distribution, leadTimeData, compositionData };
  }

  const [airlinesResponse, observationsResponse] = await Promise.all([
    getAirlines(),
    getObservations({ page_size: 200 }),
  ]);

  const airline = airlinesResponse.items.find((item) => item.airline_id === airlineId) ?? null;
  const airlineUi: UiAirline | null = airline ? {
    id: airline.airline_id,
    name: airline.airline_name,
    code: airline.iata_code || airline.airline_id,
    status: airline.is_active ? 'active' : 'inactive',
    color: '#3B82F6',
  } : null;
  const observations = observationsResponse.items ?? [];
  const airlineObs = observations.filter((observation) => observation.airline_id === airlineId && observation.cleaning_status === 'clean');

  const [airlineStatsResponse, leadTimeResponse, fareCompositionResponse] = await Promise.all([
    getAnalyticsAirline(airlineId),
    getAnalyticsLeadTime({ airline: airlineId }),
    getAnalyticsFareComposition({ airline: airlineId }),
  ]);

  const stats = airlineStatsResponse
    ? {
        airline_id: airlineStatsResponse.airline_id,
        airline: airlineUi,
        avg_fare: airlineStatsResponse.avg_fare,
        fare_change: airlineStatsResponse.fare_change,
        routes_count: airlineStatsResponse.routes_count,
        observations: airlineStatsResponse.observations,
        availability_rate: airlineStatsResponse.availability_rate,
        avg_taxes: airlineStatsResponse.avg_taxes,
        avg_convenience_fee: airlineStatsResponse.avg_convenience_fee,
      }
    : null;

  const trend = Array.from(
    airlineObs.reduce((map, observation) => {
      const key = observation.travel_date;
      const current = map.get(key) ?? { date: key, fare: 0, observations: 0 };
      current.fare += Number(observation.total_fare);
      current.observations += 1;
      map.set(key, current);
      return map;
    }, new Map<string, { date: string; fare: number; observations: number }>()),
  ).map(([date, value]) => ({
    date,
    fare: value.fare / value.observations,
    observations: value.observations,
  })).sort((a, b) => a.date.localeCompare(b.date));

  const routeData = Array.from(
    airlineObs.reduce((map, observation) => {
      const key = observation.route_code;
      const current = map.get(key) ?? { route: observation.route_code, avg_fare: 0, observations: 0 };
      current.avg_fare += Number(observation.total_fare);
      current.observations += 1;
      map.set(key, current);
      return map;
    }, new Map<string, { route: string; avg_fare: number; observations: number }>()),
  ).map(([route, value]) => ({
    route,
    avg_fare: value.avg_fare / value.observations,
  }));

  const composition = {
    base_fare: fareCompositionResponse.base_fare,
    taxes: fareCompositionResponse.taxes,
    udf: fareCompositionResponse.udf,
    convenience_fee: fareCompositionResponse.convenience_fee,
    total: fareCompositionResponse.total,
  };

  const distribution = buildDistribution(airlineObs.map((observation) => Number(observation.total_fare)));

  const leadTimeData = leadTimeResponse.map((point: { advance_window: number; avg_fare: number }) => ({
    label: `T+${point.advance_window}`,
    value: point.avg_fare,
    color: '#3B82F6',
  }));

  const compositionData = [
    composition.base_fare == null ? null : { label: 'Base Fare', value: composition.base_fare, color: '#3B82F6' },
    composition.taxes == null ? null : { label: 'Taxes', value: composition.taxes, color: '#14B8A6' },
    composition.udf == null ? null : { label: 'UDF', value: composition.udf, color: '#F59E0B' },
    composition.convenience_fee == null ? null : { label: 'Convenience Fee', value: composition.convenience_fee, color: '#8B5CF6' },
  ].filter((item): item is { label: string; value: number; color: string } => item !== null);

  return { airline: airlineUi, stats, trend, routeData, composition, distribution, leadTimeData, compositionData };
}
