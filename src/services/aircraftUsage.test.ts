import { describe, it, expect } from 'vitest';
import { filterFlightsByDate, computeAircraftUsage } from './aircraftUsage';
import type { Flight, Aircraft } from '../data';

const ac1: Aircraft = { id: 'N123', tailNumber: 'N123', make: 'Robinson', model: 'R44', status: 'active' };
const ac2: Aircraft = { id: 'N456', tailNumber: 'N456', make: 'Airbus', model: 'H125', status: 'active' };
const ac3: Aircraft = { id: 'N789', tailNumber: 'N789', make: 'Bell', model: '407', status: 'maintenance' };

const makeFlight = (
  id: string | number,
  aircraftId: string,
  date: string,
  legs: unknown[],
  status = 'confirmed',
  tag = ''
): Flight => ({
  id,
  aircraftId,
  date,
  status,
  tag,
  legs,
});

describe('filterFlightsByDate', () => {
  it('returns all flights when bounds are missing', () => {
    const flights: Flight[] = [
      makeFlight('f1', 'N123', '2026-01-15', []),
      makeFlight('f2', 'N123', '2026-02-10', []),
    ];
    expect(filterFlightsByDate(flights, null)).toEqual(flights);
    expect(filterFlightsByDate(flights, {})).toEqual(flights);
  });

  it('filters flights inclusively by start and end', () => {
    const flights: Flight[] = [
      makeFlight('f1', 'N123', '2026-01-14', []),
      makeFlight('f2', 'N123', '2026-01-15', []),
      makeFlight('f3', 'N123', '2026-01-20', []),
      makeFlight('f4', 'N123', '2026-01-21', []),
    ];
    const result = filterFlightsByDate(flights, { startStr: '2026-01-15', endStr: '2026-01-20' });
    expect(result.map((f) => f.id)).toEqual(['f2', 'f3']);
  });

  it('excludes flights without a date', () => {
    const flights: Flight[] = [
      { id: 'f1', aircraftId: 'N123', date: '2026-01-15' } as Flight,
      { id: 'f2', aircraftId: 'N123' } as Flight,
    ];
    const result = filterFlightsByDate(flights, { startStr: '2026-01-01', endStr: '2026-01-31' });
    expect(result.map((f) => f.id)).toEqual(['f1']);
  });
});

describe('computeAircraftUsage', () => {
  it('returns zeroed stats for empty inputs', () => {
    const result = computeAircraftUsage([], []);
    expect(result.aircraft).toEqual([]);
    expect(result.fleet).toEqual({ totalAircraft: 0, totalMissions: 0, totalLegs: 0, totalHours: 0, byAircraft: [] });
  });

  it('includes every aircraft even with no flights', () => {
    const result = computeAircraftUsage([], [ac1, ac2]);
    expect(result.aircraft.map((a) => a.aircraftId)).toEqual(['N123', 'N456']);
    expect(result.aircraft.every((a) => a.missionCount === 0 && a.totalHours === 0)).toBe(true);
  });

  it('sums mission count and flight hours across multiple legs', () => {
    const flights: Flight[] = [
      makeFlight('f1', 'N123', '2026-03-10', [
        { duration: 90 },
        { duration: 30 },
      ]),
      makeFlight('f2', 'N123', '2026-03-12', [
        { duration: 60 },
      ]),
    ];
    const result = computeAircraftUsage(flights, [ac1]);
    const acStats = result.aircraft[0];
    expect(acStats.missionCount).toBe(2);
    expect(acStats.totalLegs).toBe(3);
    expect(acStats.totalHours).toBe(3);
    expect(acStats.hoursByMonth['2026-03']).toBe(3);
    expect(acStats.missionsByMonth['2026-03']).toBe(2);
  });

  it('falls back to takeoff and land times when duration is missing', () => {
    const flights: Flight[] = [
      makeFlight('f1', 'N456', '2026-04-05', [
        { takeoffTime: '08:00', landTime: '10:30' },
      ]),
    ];
    const result = computeAircraftUsage(flights, [ac2]);
    expect(result.aircraft[0].totalHours).toBe(2.5);
  });

  it('handles overnight legs using arrDate', () => {
    const flights: Flight[] = [
      makeFlight('f1', 'N123', '2026-05-01', [
        { date: '2026-05-01', arrDate: '2026-05-02', takeoffTime: '22:00', landTime: '02:00' },
      ]),
    ];
    const result = computeAircraftUsage(flights, [ac1]);
    expect(result.aircraft[0].totalHours).toBe(4);
  });

  it('breaks hours down by status and tag', () => {
    const flights: Flight[] = [
      makeFlight('f1', 'N123', '2026-06-01', [{ duration: 60 }], 'completed', 'training'),
      makeFlight('f2', 'N123', '2026-06-02', [{ duration: 120 }], 'Completed', 'medevac'),
      makeFlight('f3', 'N123', '2026-06-03', [{ duration: 90 }], 'on hold', 'training'),
    ];
    const result = computeAircraftUsage(flights, [ac1]);
    const acStats = result.aircraft[0];
    expect(acStats.byStatus['completed']).toBe(3);
    expect(acStats.byStatus['on hold']).toBe(1.5);
    expect(acStats.byTag['training']).toBe(2.5);
    expect(acStats.byTag['medevac']).toBe(2);
  });

  it('calculates fleet totals and utilization shares', () => {
    const flights: Flight[] = [
      makeFlight('f1', 'N123', '2026-07-01', [{ duration: 120 }]),
      makeFlight('f2', 'N456', '2026-07-02', [{ duration: 60 }]),
      makeFlight('f3', 'N456', '2026-07-03', [{ duration: 60 }]),
    ];
    const result = computeAircraftUsage(flights, [ac1, ac2, ac3]);
    expect(result.fleet.totalAircraft).toBe(3);
    expect(result.fleet.totalMissions).toBe(3);
    expect(result.fleet.totalHours).toBe(4);

    const n123 = result.fleet.byAircraft.find((a) => a.aircraftId === 'N123');
    const n456 = result.fleet.byAircraft.find((a) => a.aircraftId === 'N456');
    const n789 = result.fleet.byAircraft.find((a) => a.aircraftId === 'N789');

    expect(n123?.totalHours).toBe(2);
    expect(n123?.utilization).toBe(0.5);
    expect(n456?.totalHours).toBe(2);
    expect(n456?.utilization).toBe(0.5);
    expect(n789?.totalHours).toBe(0);
    expect(n789?.utilization).toBe(0);
  });

  it('respects date bounds when aggregating', () => {
    const flights: Flight[] = [
      makeFlight('f1', 'N123', '2026-08-01', [{ duration: 120 }]),
      makeFlight('f2', 'N123', '2026-08-15', [{ duration: 60 }]),
      makeFlight('f3', 'N123', '2026-09-01', [{ duration: 30 }]),
    ];
    const result = computeAircraftUsage(flights, [ac1], { startStr: '2026-08-01', endStr: '2026-08-31' });
    expect(result.aircraft[0].missionCount).toBe(2);
    expect(result.aircraft[0].totalHours).toBe(3);
    expect(result.aircraft[0].hoursByMonth['2026-08']).toBe(3);
    expect(result.aircraft[0].hoursByMonth['2026-09']).toBeUndefined();
  });
});
