/**
 * Flight connections data for CodeNova Airlines.
 * Source: PLAN_CODENOVA.md — PA-2, section 4.1
 *
 * Connections, fares, and days of operation are approved.
 * Schedules are NOT yet defined (4.7) — shown as "Horario por confirmar".
 */

export interface FlightConnection {
  id: string;
  origin: {
    city: string;
    iata: string;
  };
  destination: {
    city: string;
    iata: string;
  };
  farePerPassenger: number;
  /** null = not yet verified (4.7) */
  schedule: string | null;
  image: string;
}

export const DAYS_OF_OPERATION = ['Lunes', 'Miércoles', 'Viernes'];

export const FLIGHT_CONNECTIONS: FlightConnection[] = [
  {
    id: 'sdq-sju',
    origin: { city: 'Santo Domingo', iata: 'SDQ' },
    destination: { city: 'San Juan', iata: 'SJU' },
    farePerPassenger: 7900,
    schedule: null,
    image: '/destination-caribbean.png',
  },
  {
    id: 'sdq-aua',
    origin: { city: 'Santo Domingo', iata: 'SDQ' },
    destination: { city: 'Aruba', iata: 'AUA' },
    farePerPassenger: 9600,
    schedule: null,
    image: '/hero-airplane.png',
  },
  {
    id: 'sdq-mia',
    origin: { city: 'Santo Domingo', iata: 'SDQ' },
    destination: { city: 'Miami', iata: 'MIA' },
    farePerPassenger: 9900,
    schedule: null,
    image: '/destination-miami.png',
  },
  {
    id: 'sdq-bog',
    origin: { city: 'Santo Domingo', iata: 'SDQ' },
    destination: { city: 'Bogotá', iata: 'BOG' },
    farePerPassenger: 10200,
    schedule: null,
    image: '/hero-night.png',
  },
  {
    id: 'jbq-hav',
    origin: { city: 'Santo Domingo', iata: 'JBQ' },
    destination: { city: 'La Habana', iata: 'HAV' },
    farePerPassenger: 19500,
    schedule: null,
    image: '/cabin-interior.png',
  },
];

/** Format a number as Dominican Peso currency */
export function formatCurrency(amount: number): string {
  return `RD$${amount.toLocaleString('es-DO')}`;
}
