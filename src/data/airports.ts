import type { Airport, Airline, Route } from '@/types';

export const AIRPORTS: Airport[] = [
  { id: '1', airport_code: 'DEL', city: 'Delhi', airport_name: 'Indira Gandhi Intl', state: 'Delhi' },
  { id: '2', airport_code: 'BOM', city: 'Mumbai', airport_name: 'Chhatrapati Shivaji Intl', state: 'Maharashtra' },
  { id: '3', airport_code: 'BLR', city: 'Bengaluru', airport_name: 'Kempegowda Intl', state: 'Karnataka' },
  { id: '4', airport_code: 'CCU', city: 'Kolkata', airport_name: 'Netaji Subhas Chandra Bose', state: 'West Bengal' },
  { id: '5', airport_code: 'HYD', city: 'Hyderabad', airport_name: 'Rajiv Gandhi Intl', state: 'Telangana' },
  { id: '6', airport_code: 'MAA', city: 'Chennai', airport_name: 'Chennai Intl', state: 'Tamil Nadu' },
  { id: '7', airport_code: 'MAA', city: 'Chennai', airport_name: 'Chennai Intl', state: 'Tamil Nadu' },
  { id: '8', airport_code: 'AMD', city: 'Ahmedabad', airport_name: 'Sardar Vallabhbhai Patel', state: 'Gujarat' },
  { id: '9', airport_code: 'PNQ', city: 'Pune', airport_name: 'Pune Airport', state: 'Maharashtra' },
  { id: '10', airport_code: 'GOI', city: 'Goa', airport_name: 'Dabolim Airport', state: 'Goa' },
  { id: '11', airport_code: 'COK', city: 'Kochi', airport_name: 'Cochin Intl', state: 'Kerala' },
  { id: '12', airport_code: 'JAI', city: 'Jaipur', airport_name: 'Jaipur Intl', state: 'Rajasthan' },
  { id: '13', airport_code: 'LKO', city: 'Lucknow', airport_name: 'Chaudhary Charan Singh', state: 'Uttar Pradesh' },
  { id: '14', airport_code: 'GAU', city: 'Guwahati', airport_name: 'Lokpriya Gopinath Bordoloi', state: 'Assam' },
  { id: '15', airport_code: 'BBI', city: 'Bhubaneswar', airport_name: 'Biju Patnaik Intl', state: 'Odisha' },
  { id: '16', airport_code: 'IXC', city: 'Chandigarh', airport_name: 'Chandigarh Airport', state: 'Punjab' },
  { id: '17', airport_code: 'IXR', city: 'Ranchi', airport_name: 'Birsa Munda', state: 'Jharkhand' },
  { id: '18', airport_code: 'VTZ', city: 'Visakhapatnam', airport_name: 'Visakhapatnam Airport', state: 'Andhra Pradesh' },
  { id: '19', airport_code: 'IXB', city: 'Bagdogra', airport_name: 'Bagdogra Airport', state: 'West Bengal' },
  { id: '20', airport_code: 'IXE', city: 'Mangalore', airport_name: 'Mangalore Airport', state: 'Karnataka' },
  { id: '21', airport_code: 'IXM', city: 'Madurai', airport_name: 'Madurai Airport', state: 'Tamil Nadu' },
  { id: '22', airport_code: 'TRV', city: 'Thiruvananthapuram', airport_name: 'Trivandrum Intl', state: 'Kerala' },
  { id: '23', airport_code: 'IXJ', city: 'Jodhpur', airport_name: 'Jodhpur Airport', state: 'Rajasthan' },
  { id: '24', airport_code: 'IXG', city: 'Belgaum', airport_name: 'Belgaum Airport', state: 'Karnataka' },
  { id: '25', airport_code: 'IXL', city: 'Leh', airport_name: 'Leh Kushok Bakula Rimpochee', state: 'Ladakh' },
];

export const AIRPORT_MAP: Record<string, Airport> = Object.fromEntries(
  AIRPORTS.map((a) => [a.airport_code, a])
);

export const AIRLINES: Airline[] = [
  { id: 'al1', name: 'IndiGo', code: '6E', status: 'active', color: '#0B3D91' },
  { id: 'al2', name: 'Air India', code: 'AI', status: 'active', color: '#C8102E' },
  { id: 'al3', name: 'Air India Express', code: 'IX', status: 'active', color: '#E87722' },
  { id: 'al4', name: 'Akasa Air', code: 'QP', status: 'active', color: '#FF6F00' },
  { id: 'al5', name: 'SpiceJet', code: 'SG', status: 'active', color: '#D9252A' },
];

export const AIRLINE_MAP: Record<string, Airline> = Object.fromEntries(
  AIRLINES.map((a) => [a.id, a])
);

export const ROUTES: Route[] = [
  { id: 'r1', origin: 'DEL', destination: 'BOM', route_code: 'DEL-BOM', weight: 15, active: true, passenger_traffic_basis: 'High-traffic trunk route', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r2', origin: 'DEL', destination: 'BLR', route_code: 'DEL-BLR', weight: 12, active: true, passenger_traffic_basis: 'Major north-south route', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r3', origin: 'BOM', destination: 'BLR', route_code: 'BOM-BLR', weight: 10, active: true, passenger_traffic_basis: 'West-south corridor', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r4', origin: 'DEL', destination: 'CCU', route_code: 'DEL-CCU', weight: 8, active: true, passenger_traffic_basis: 'Capital to eastern metro', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r5', origin: 'BLR', destination: 'HYD', route_code: 'BLR-HYD', weight: 7, active: true, passenger_traffic_basis: 'South Indian tech corridor', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r6', origin: 'MAA', destination: 'DEL', route_code: 'MAA-DEL', weight: 6, active: true, passenger_traffic_basis: 'South to capital route', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r7', origin: 'BOM', destination: 'GOI', route_code: 'BOM-GOI', weight: 5, active: true, passenger_traffic_basis: 'Tourist route', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r8', origin: 'DEL', destination: 'HYD', route_code: 'DEL-HYD', weight: 5, active: true, passenger_traffic_basis: 'Capital to tech hub', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r9', origin: 'BLR', destination: 'CCU', route_code: 'BLR-CCU', weight: 4, active: true, passenger_traffic_basis: 'South to east route', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r10', origin: 'BOM', destination: 'CCU', route_code: 'BOM-CCU', weight: 4, active: true, passenger_traffic_basis: 'West to east route', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r11', origin: 'DEL', destination: 'PNQ', route_code: 'DEL-PNQ', weight: 3, active: true, passenger_traffic_basis: 'Capital to Pune', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r12', origin: 'BLR', destination: 'MAA', route_code: 'BLR-MAA', weight: 3, active: true, passenger_traffic_basis: 'Southern corridor', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r13', origin: 'DEL', destination: 'JAI', route_code: 'DEL-JAI', weight: 2, active: true, passenger_traffic_basis: 'Short-haul tourist', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r14', origin: 'BOM', destination: 'AMD', route_code: 'BOM-AMD', weight: 2, active: true, passenger_traffic_basis: 'Short western route', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r15', origin: 'DEL', destination: 'AMD', route_code: 'DEL-AMD', weight: 2, active: true, passenger_traffic_basis: 'Capital to Gujarat', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r16', origin: 'BLR', destination: 'COK', route_code: 'BLR-COK', weight: 2, active: true, passenger_traffic_basis: 'Tech to Kerala', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r17', origin: 'HYD', destination: 'MAA', route_code: 'HYD-MAA', weight: 2, active: true, passenger_traffic_basis: 'South corridor', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r18', origin: 'DEL', destination: 'LKO', route_code: 'DEL-LKO', weight: 1, active: true, passenger_traffic_basis: 'Short regional', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r19', origin: 'BOM', destination: 'HYD', route_code: 'BOM-HYD', weight: 1, active: true, passenger_traffic_basis: 'West to south', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r20', origin: 'CCU', destination: 'GAU', route_code: 'CCU-GAU', weight: 1, active: true, passenger_traffic_basis: 'Eastern regional', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r21', origin: 'DEL', destination: 'IXC', route_code: 'DEL-IXC', weight: 1, active: true, passenger_traffic_basis: 'Capital to Chandigarh', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r22', origin: 'MAA', destination: 'HYD', route_code: 'MAA-HYD', weight: 1, active: true, passenger_traffic_basis: 'Southern regional', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r23', origin: 'BLR', destination: 'GOI', route_code: 'BLR-GOI', weight: 1, active: true, passenger_traffic_basis: 'Tech to tourist', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r24', origin: 'DEL', destination: 'IXB', route_code: 'DEL-IXB', weight: 1, active: true, passenger_traffic_basis: 'Capital to northeast', last_updated: '2026-09-12T08:00:00Z' },
  { id: 'r25', origin: 'BOM', destination: 'JAI', route_code: 'BOM-JAI', weight: 1, active: true, passenger_traffic_basis: 'West to Rajasthan', last_updated: '2026-09-12T08:00:00Z' },
];

export const ROUTE_MAP: Record<string, Route> = Object.fromEntries(
  ROUTES.map((r) => [r.route_code, r])
);

export const AIRPORT_CODE_SET = new Set(AIRPORTS.map((a) => a.airport_code));
