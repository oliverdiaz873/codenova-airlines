/**
 * Scheduled services for SkyNova Airlines.
 * Source: PLAN_CODENOVA.md — section 4.7 (approved fictitious data)
 *
 * 20 recurring services: 5 connections x 2 directions x 2 daily departures,
 * operating Monday, Wednesday and Friday. Times are local wall-clock times
 * at each airport; the IANA zone of each airport resolves offsets per date.
 */

export interface Airport {
  city: string;
  iata: string;
  timeZone: string;
}

export interface ScheduledService {
  /** Unique flight number, e.g. 'CN101'. Reused across dates of the service. */
  flightNumber: string;
  /** Connection id shared with FLIGHT_CONNECTIONS in both directions. */
  routeId: string;
  origin: Airport;
  destination: Airport;
  /** Local departure time 'HH:mm' at the origin airport. */
  departureLocal: string;
  /** Elapsed block time in minutes; arrival is computed via IANA zones. */
  durationMinutes: number;
}

const SDQ: Airport = { city: 'Santo Domingo', iata: 'SDQ', timeZone: 'America/Santo_Domingo' };
const JBQ: Airport = { city: 'Santo Domingo', iata: 'JBQ', timeZone: 'America/Santo_Domingo' };
const SJU: Airport = { city: 'San Juan', iata: 'SJU', timeZone: 'America/Puerto_Rico' };
const AUA: Airport = { city: 'Aruba', iata: 'AUA', timeZone: 'America/Aruba' };
const MIA: Airport = { city: 'Miami', iata: 'MIA', timeZone: 'America/New_York' };
const BOG: Airport = { city: 'Bogotá', iata: 'BOG', timeZone: 'America/Bogota' };
const HAV: Airport = { city: 'La Habana', iata: 'HAV', timeZone: 'America/Havana' };

export const SCHEDULED_SERVICES: ScheduledService[] = [
  // SDQ <-> SJU
  { flightNumber: 'CN101', routeId: 'sdq-sju', origin: SDQ, destination: SJU, departureLocal: '08:00', durationMinutes: 75 },
  { flightNumber: 'CN102', routeId: 'sdq-sju', origin: SJU, destination: SDQ, departureLocal: '10:30', durationMinutes: 75 },
  { flightNumber: 'CN103', routeId: 'sdq-sju', origin: SDQ, destination: SJU, departureLocal: '17:00', durationMinutes: 75 },
  { flightNumber: 'CN104', routeId: 'sdq-sju', origin: SJU, destination: SDQ, departureLocal: '19:30', durationMinutes: 75 },
  // SDQ <-> AUA
  { flightNumber: 'CN201', routeId: 'sdq-aua', origin: SDQ, destination: AUA, departureLocal: '08:00', durationMinutes: 90 },
  { flightNumber: 'CN202', routeId: 'sdq-aua', origin: AUA, destination: SDQ, departureLocal: '10:45', durationMinutes: 90 },
  { flightNumber: 'CN203', routeId: 'sdq-aua', origin: SDQ, destination: AUA, departureLocal: '17:00', durationMinutes: 90 },
  { flightNumber: 'CN204', routeId: 'sdq-aua', origin: AUA, destination: SDQ, departureLocal: '19:45', durationMinutes: 90 },
  // SDQ <-> MIA
  { flightNumber: 'CN301', routeId: 'sdq-mia', origin: SDQ, destination: MIA, departureLocal: '08:00', durationMinutes: 150 },
  { flightNumber: 'CN302', routeId: 'sdq-mia', origin: MIA, destination: SDQ, departureLocal: '11:00', durationMinutes: 150 },
  { flightNumber: 'CN303', routeId: 'sdq-mia', origin: SDQ, destination: MIA, departureLocal: '17:00', durationMinutes: 150 },
  { flightNumber: 'CN304', routeId: 'sdq-mia', origin: MIA, destination: SDQ, departureLocal: '20:00', durationMinutes: 150 },
  // SDQ <-> BOG
  { flightNumber: 'CN401', routeId: 'sdq-bog', origin: SDQ, destination: BOG, departureLocal: '08:00', durationMinutes: 160 },
  { flightNumber: 'CN402', routeId: 'sdq-bog', origin: BOG, destination: SDQ, departureLocal: '11:00', durationMinutes: 160 },
  { flightNumber: 'CN403', routeId: 'sdq-bog', origin: SDQ, destination: BOG, departureLocal: '17:00', durationMinutes: 160 },
  { flightNumber: 'CN404', routeId: 'sdq-bog', origin: BOG, destination: SDQ, departureLocal: '20:00', durationMinutes: 160 },
  // JBQ <-> HAV
  { flightNumber: 'CN501', routeId: 'jbq-hav', origin: JBQ, destination: HAV, departureLocal: '09:00', durationMinutes: 120 },
  { flightNumber: 'CN502', routeId: 'jbq-hav', origin: HAV, destination: JBQ, departureLocal: '12:30', durationMinutes: 120 },
  { flightNumber: 'CN503', routeId: 'jbq-hav', origin: JBQ, destination: HAV, departureLocal: '17:00', durationMinutes: 120 },
  { flightNumber: 'CN504', routeId: 'jbq-hav', origin: HAV, destination: JBQ, departureLocal: '20:30', durationMinutes: 120 },
];
