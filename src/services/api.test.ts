import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { getCurrentDataMode, getHealth, getRoutes, getLatestIndex, getMospiCpi } from './api';

describe('frontend api client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('respects the configured data mode', () => {
    vi.stubEnv('VITE_DATA_MODE', 'api');
    expect(getCurrentDataMode()).toBe('api');

    vi.stubEnv('VITE_DATA_MODE', 'mock');
    expect(getCurrentDataMode()).toBe('mock');

    vi.stubEnv('VITE_DATA_MODE', '');
    expect(getCurrentDataMode()).toBe('api');
  });

  it('fetches backend health information', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'ok',
        app: 'APIx',
        environment: 'development',
        data_mode: 'mock',
      }),
    } as Response);

    const health = await getHealth();

    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/health');
    expect(health.app).toBe('APIx');
  });

  it('parses route responses from the backend', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'r1',
            route_code: 'DEL-BOM',
            origin: 'DEL',
            destination: 'BOM',
            origin_city: 'Delhi',
            destination_city: 'Mumbai',
            is_active: true,
            created_at: '2026-09-12T00:00:00Z',
            updated_at: '2026-09-12T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        page_size: 50,
      }),
    } as Response);

    const routes = await getRoutes();

    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/routes');
    expect(routes.total).toBe(1);
    expect(routes.items[0].route_code).toBe('DEL-BOM');
  });

  it('parses the latest index response from the backend', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'idx-synthetic-2026-09-12',
        index_date: '2026-09-12',
        index_value: 136,
        base_period: '2026-09-12',
        aggregation_method: 'weighted_average (synthetic demo)',
        observation_frequency: 'daily',
        route_weight_version: 'synthetic-demo-v1',
        created_at: '2026-09-12T18:12:13.476736Z',
      }),
    } as Response);

    const latestIndex = await getLatestIndex();

    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/airfare-index/latest');
    expect(latestIndex?.index_value).toBe(136);
  });

  it('preserves official CPI index and inflation as separate fields', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'insufficient_data',
        source_type: 'mospi',
        indicator_code: 'CPI',
        items: [{ index_value: '107.94', inflation_value: '4.45', is_official: true }],
        apix_series: [],
        comparison: null,
      }),
    } as Response);

    const context = await getMospiCpi();

    expect(context.items[0].index_value).toBe('107.94');
    expect(context.items[0].inflation_value).toBe('4.45');
    expect(context.items[0].index_value).not.toBe(context.items[0].inflation_value);
  });
});
