import airportsData from './airports.json';

export interface Airport {
  id: string;
  type: string;
  name: string;
  lat: number;
  lon: number;
  municipality: string;
  state: string;
}

export const airports: Airport[] = airportsData as Airport[];

const airportIndex = new Map<string, Airport>();
for (const ap of airports) {
  airportIndex.set(ap.id, ap);
}

export function getAirportById(id: string): Airport | undefined {
  return airportIndex.get(id);
}

export default airports;
