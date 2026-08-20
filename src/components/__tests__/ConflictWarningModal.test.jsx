import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConflictWarningModal from '../ConflictWarningModal';

const pilotConflict = {
  flightId: 'f1',
  flightNumber: '101',
  title: 'Test Flight',
  pilotId: 'pilot_1',
  overlapLeg: 'KORD → KLAX',
  overlapTime: '08:00 - 12:00',
  overlapDate: '2026-01-15',
};

const aircraftConflict = {
  flightId: 'f2',
  flightNumber: '102',
  title: 'Another Flight',
  overlapLeg: 'KLAX → KSFO',
  overlapTime: '13:00 - 14:00',
  overlapDate: '2026-01-15',
};

describe('ConflictWarningModal', () => {
  it('renders pilot conflict with pilot name', () => {
    render(
      <ConflictWarningModal
        pilotConflicts={[pilotConflict]}
        aircraftConflicts={[]}
        onProceed={() => {}}
        onCancel={() => {}}
        pilotNames={{ pilot_1: 'John Smith' }}
      />
    );
    expect(screen.getByText('Scheduling Conflicts Detected')).toBeInTheDocument();
    expect(screen.getByText(/John Smith is already assigned/)).toBeInTheDocument();
  });

  it('renders aircraft conflict', () => {
    render(
      <ConflictWarningModal
        pilotConflicts={[]}
        aircraftConflicts={[aircraftConflict]}
        onProceed={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText(/Aircraft is already scheduled/)).toBeInTheDocument();
  });

  it('calls onProceed when Save Anyway clicked', () => {
    const onProceed = vi.fn();
    render(
      <ConflictWarningModal
        pilotConflicts={[pilotConflict]}
        aircraftConflicts={[]}
        onProceed={onProceed}
        onCancel={() => {}}
      />
    );
    fireEvent.click(screen.getByText('Save Anyway'));
    expect(onProceed).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel clicked', () => {
    const onCancel = vi.fn();
    render(
      <ConflictWarningModal
        pilotConflicts={[pilotConflict]}
        aircraftConflicts={[]}
        onProceed={() => {}}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
