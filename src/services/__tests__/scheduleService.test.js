import { describe, it, expect } from 'vitest';
import { getPersonStatusForDate, removePersonStatusForDate, setPersonStatusForDate } from '../scheduleService';

describe('scheduleService', () => {
  const person = { id: 'pilot_1', name: 'John Smith' };

  describe('getPersonStatusForDate', () => {
    it('returns empty string for null inputs', () => {
      expect(getPersonStatusForDate(null, person, '2026-01-01')).toBe('');
      expect(getPersonStatusForDate({}, null, '2026-01-01')).toBe('');
      expect(getPersonStatusForDate({}, person, null)).toBe('');
    });

    it('finds status by ID-key', () => {
      const schedules = { 'pilot_1_2026-01-01': 'On Duty' };
      expect(getPersonStatusForDate(schedules, person, '2026-01-01')).toBe('On Duty');
    });

    it('finds status by Name-key', () => {
      const schedules = { 'John Smith_2026-01-01': 'Flight' };
      expect(getPersonStatusForDate(schedules, person, '2026-01-01')).toBe('Flight');
    });

    it('returns empty for Clear status', () => {
      const schedules = { 'pilot_1_2026-01-01': 'Clear' };
      expect(getPersonStatusForDate(schedules, person, '2026-01-01')).toBe('');
    });

    it('returns empty for non-matching date', () => {
      const schedules = { 'pilot_1_2026-01-01': 'On Duty' };
      expect(getPersonStatusForDate(schedules, person, '2026-01-02')).toBe('');
    });
  });

  describe('removePersonStatusForDate', () => {
    it('removes status by ID-key', () => {
      const schedules = {
        'pilot_1_2026-01-01': 'On Duty',
        'pilot_1_2026-01-02': 'Flight'
      };
      const result = removePersonStatusForDate(schedules, 'pilot_1', '2026-01-01', [person]);
      expect(result['pilot_1_2026-01-01']).toBeUndefined();
      expect(result['pilot_1_2026-01-02']).toBe('Flight');
    });

    it('removes status by Name-key', () => {
      const schedules = {
        'John Smith_2026-01-01': 'On Duty',
        'John Smith_2026-01-02': 'Flight'
      };
      const result = removePersonStatusForDate(schedules, 'pilot_1', '2026-01-01', [person]);
      expect(result['John Smith_2026-01-01']).toBeUndefined();
      expect(result['John Smith_2026-01-02']).toBe('Flight');
    });

    it('does not modify original object', () => {
      const schedules = { 'pilot_1_2026-01-01': 'On Duty' };
      removePersonStatusForDate(schedules, 'pilot_1', '2026-01-01', [person]);
      expect(schedules['pilot_1_2026-01-01']).toBe('On Duty');
    });
  });

  describe('setPersonStatusForDate', () => {
    it('sets status for a person', () => {
      const schedules = {};
      const result = setPersonStatusForDate(schedules, 'pilot_1', '2026-01-01', 'On Duty', [person]);
      expect(result['pilot_1_2026-01-01']).toBe('On Duty');
    });

    it('clears existing status before setting new one', () => {
      const schedules = { 'pilot_1_2026-01-01': 'Flight' };
      const result = setPersonStatusForDate(schedules, 'pilot_1', '2026-01-01', 'On Duty', [person]);
      expect(result['pilot_1_2026-01-01']).toBe('On Duty');
      expect(Object.keys(result)).toHaveLength(1);
    });

    it('removes status when set to Clear', () => {
      const schedules = { 'pilot_1_2026-01-01': 'On Duty' };
      const result = setPersonStatusForDate(schedules, 'pilot_1', '2026-01-01', 'Clear', [person]);
      expect(result['pilot_1_2026-01-01']).toBeUndefined();
    });

    it('removes status when set to empty string', () => {
      const schedules = { 'pilot_1_2026-01-01': 'On Duty' };
      const result = setPersonStatusForDate(schedules, 'pilot_1', '2026-01-01', '', [person]);
      expect(result['pilot_1_2026-01-01']).toBeUndefined();
    });
  });
});
