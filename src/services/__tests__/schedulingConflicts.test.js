import { describe, it, expect } from 'vitest';
import { detectConflicts } from '../schedulingConflicts';

describe('schedulingConflicts', () => {
  const baseFlight = {
    id: 'flight_1',
    flightNumber: '001',
    title: 'Test Flight',
    aircraftId: 'N12345',
    status: 'confirmed',
    legs: [
      {
        departure: { id: 'KORD', name: 'Chicago O\'Hare' },
        destination: { id: 'KLAX', name: 'Los Angeles' },
        takeoffTime: '08:00',
        landTime: '12:00',
        duration: 240,
        date: '2026-01-15',
        arrDate: '2026-01-15',
        pilots: ['pilot_1'],
        pilotId: 'pilot_1'
      }
    ]
  };

  describe('detectConflicts', () => {
    it('returns empty conflicts for null inputs', () => {
      const result = detectConflicts(null, []);
      expect(result.pilotConflicts).toEqual([]);
      expect(result.aircraftConflicts).toEqual([]);
    });

    it('returns empty conflicts for flight with no legs', () => {
      const result = detectConflicts({ id: '1', legs: [] }, []);
      expect(result.pilotConflicts).toEqual([]);
      expect(result.aircraftConflicts).toEqual([]);
    });

    it('detects pilot conflict', () => {
      const otherFlight = {
        ...baseFlight,
        id: 'flight_2',
        flightNumber: '002',
        legs: [{
          ...baseFlight.legs[0],
          pilots: ['pilot_1'],
          pilotId: 'pilot_1',
          takeoffTime: '10:00',
          landTime: '14:00'
        }]
      };

      const result = detectConflicts(baseFlight, [otherFlight]);
      expect(result.pilotConflicts.length).toBe(1);
      expect(result.pilotConflicts[0].pilotId).toBe('pilot_1');
    });

    it('detects aircraft conflict', () => {
      const otherFlight = {
        ...baseFlight,
        id: 'flight_2',
        flightNumber: '002',
        legs: [{
          ...baseFlight.legs[0],
          pilots: ['pilot_2'],
          pilotId: 'pilot_2',
          takeoffTime: '10:00',
          landTime: '14:00'
        }]
      };

      const result = detectConflicts(baseFlight, [otherFlight]);
      expect(result.aircraftConflicts.length).toBe(1);
    });

    it('ignores conflicts with same flight (self)', () => {
      const result = detectConflicts(baseFlight, [baseFlight]);
      expect(result.pilotConflicts).toEqual([]);
      expect(result.aircraftConflicts).toEqual([]);
    });

    it('ignores canceled flights', () => {
      const otherFlight = {
        ...baseFlight,
        id: 'flight_2',
        status: 'canceled',
        legs: [{ ...baseFlight.legs[0], pilots: ['pilot_1'] }]
      };

      const result = detectConflicts(baseFlight, [otherFlight]);
      expect(result.pilotConflicts).toEqual([]);
    });

    it('ignores completed flights', () => {
      const otherFlight = {
        ...baseFlight,
        id: 'flight_2',
        status: 'completed',
        legs: [{ ...baseFlight.legs[0], pilots: ['pilot_1'] }]
      };

      const result = detectConflicts(baseFlight, [otherFlight]);
      expect(result.pilotConflicts).toEqual([]);
    });

    it('returns no conflict for non-overlapping times', () => {
      const otherFlight = {
        ...baseFlight,
        id: 'flight_2',
        flightNumber: '002',
        legs: [{
          ...baseFlight.legs[0],
          pilots: ['pilot_1'],
          pilotId: 'pilot_1',
          takeoffTime: '14:00',
          landTime: '18:00'
        }]
      };

      const result = detectConflicts(baseFlight, [otherFlight]);
      expect(result.pilotConflicts).toEqual([]);
    });
  });
});
