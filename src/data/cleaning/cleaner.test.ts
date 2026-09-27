import { describe, it, expect } from 'vitest';
import { cleanObservations } from './cleaner';
import type { AirfareObservation } from '@/types';

const baseObservation = {
  id: 'obs1',
  flight_id: 'fl1',
  route_id: 'r1',
  airline_id: 'al1',
  travel_date: '2026-09-20',
  search_date: '2026-09-12',
  advance_window: 7,
  advance_days: 7,
  fare_class: 'economy',
  base_fare: 4000,
  taxes: 800,
  udf: 100,
  convenience_fee: 150,
  total_fare: 5050,
  collection_timestamp: '2026-09-12T00:00:00Z',
  availability: 'available',
  source: 'indigo',
  source_type: 'airline',
  raw_observation_id: 'raw1',
  cleaning_status: 'raw',
  origin: 'DEL',
  destination: 'BOM',
  airline_name: 'IndiGo',
  airline_code: '6E',
  route_code: 'DEL-BOM',
} satisfies AirfareObservation;

describe('APIx cleaning layer', () => {
  it('accepts a valid observation', () => {
    const result = cleanObservations([baseObservation]);
    expect(result.cleanedObservations[0]?.cleaning_status).toBe('clean');
    expect(result.cleanedObservations[0]?.index_eligible).toBe(true);
  });

  it('accepts total-only fares without inventing components', () => {
    const result = cleanObservations([{
      ...baseObservation,
      fare_class: null,
      base_fare: null,
      taxes: null,
      udf: null,
      convenience_fee: null,
      total_fare: 106630,
    }]);

    expect(result.cleanedObservations[0]?.cleaning_status).toBe('clean');
    expect(result.cleanedObservations[0]?.index_eligible).toBe(true);
    expect(result.cleanedObservations[0]?.base_fare).toBeNull();
    expect(result.cleanedObservations[0]?.taxes).toBeNull();
    expect(result.cleanedObservations[0]?.udf).toBeNull();
    expect(result.cleanedObservations[0]?.convenience_fee).toBeNull();
  });

  it('detects missing required fields', () => {
    const result = cleanObservations([{ ...baseObservation, origin: '' }]);
    expect(result.rejectedObservations[0]?.cleaning_status).toBe('missing_required_field');
  });

  it('detects invalid route codes', () => {
    const result = cleanObservations([{ ...baseObservation, route_code: 'DEL-XYZ', origin: 'DEL', destination: 'XYZ' }]);
    expect(result.rejectedObservations[0]?.cleaning_status).toBe('invalid_route');
  });

  it('normalizes airline identifiers', () => {
    const result = cleanObservations([{ ...baseObservation, airline_id: 'INDIGO', airline_name: 'INDIGO', airline_code: '6E' }]);
    expect(result.cleanedObservations[0]?.airline_id).toBe('al1');
  });

  it('normalizes advance windows', () => {
    const result = cleanObservations([{ ...baseObservation, advance_window: 1, advance_days: 1 }]);
    expect(result.cleanedObservations[0]?.advance_window).toBe(1);
  });

  it('rejects negative fares', () => {
    const result = cleanObservations([{ ...baseObservation, total_fare: -1 }]);
    expect(result.rejectedObservations[0]?.cleaning_status).toBe('invalid_fare');
  });

  it('detects fare mismatch', () => {
    const result = cleanObservations([{ ...baseObservation, total_fare: 6000 }]);
    expect(result.rejectedObservations[0]?.cleaning_status).toBe('invalid_fare');
  });

  it('detects duplicate observations', () => {
    const result = cleanObservations([baseObservation, baseObservation]);
    expect(result.flaggedObservations.some((o) => o.cleaning_status === 'duplicate')).toBe(true);
  });

  it('handles sold out observations', () => {
    const result = cleanObservations([{ ...baseObservation, availability: 'sold_out' }]);
    expect(result.flaggedObservations[0]?.cleaning_status).toBe('sold_out');
  });

  it('calculates quality metrics', () => {
    const result = cleanObservations([baseObservation, { ...baseObservation, id: 'obs2', total_fare: 6000 }]);
    expect(result.report.total_observations).toBe(2);
    expect(result.report.valid_observations).toBeGreaterThanOrEqual(1);
  });

  it('filters index-eligible observations', () => {
    const result = cleanObservations([
      baseObservation,
      { ...baseObservation, id: 'obs2', availability: 'sold_out' },
      { ...baseObservation, id: 'obs3', route_code: 'DEL-XYZ', origin: 'DEL', destination: 'XYZ' },
    ]);
    expect(result.cleanedObservations.length).toBe(1);
  });
});
