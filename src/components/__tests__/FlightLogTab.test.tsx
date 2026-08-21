import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FlightLogTab from '../FlightLogTab';
import type { Aircraft, FlightLeg } from '../../types';

vi.mock('../../contexts/DataProvider', () => ({
  useData: () => ({ userAircraft: mockUserAircraft })
}));

vi.mock('../../services/authService', () => ({
  authService: { getCurrentUser: () => mockCurrentUser }
}));

vi.mock('../../hooks/useIsMobile', () => ({ default: () => false }));

const adminUser = { id: 'u1', uid: 'u1', name: 'Admin User', email: '', roles: ['admin'], role: 'admin', viewOwnFlightsOnly: false };

let mockUserAircraft: Aircraft[] = [];
let mockCurrentUser = adminUser;

const legs: FlightLeg[] = [
  {
    departure: { type: 'airport', id: 'KVPZ' },
    destination: { type: 'airport', id: 'KORD' },
    pilots: ['p1'],
    date: '2026-08-20'
  }
];

const makeAircraft = (overrides: Partial<Aircraft> = {}): Aircraft => ({
  id: 'N123',
  tailNumber: 'N123',
  totalHours: 100,
  hobbs: 500,
  landings: 40,
  engine1Hours: 100,
  engine1Cycles: 300,
  ...overrides
});

describe('FlightLogTab baseline resolution', () => {
  beforeEach(() => {
    mockUserAircraft = [makeAircraft()];
    mockCurrentUser = adminUser;
  });

  it('always uses the aircraftTotals snapshot for a signed flight even when aircraft state differs', () => {
    render(
      <FlightLogTab
        legs={legs}
        flightLog={{
          signature: { name: 'Admin User', timestamp: 'now', isoTimestamp: '2026-08-20T10:00:00Z' },
          isLocked: true,
          aircraftTotals: {
            flightBefore: 90,
            hobbsBefore: 490.5,
            landingsBefore: 35,
            engine1Before: 90,
            cycles1Before: 290,
            changeFlight: 2,
            changeHobbs: 2,
            changeLandings: 1,
            changeEngine1Hours: 2,
            changeEngine1Cycles: 1,
            dualEngine: false
          }
        }}
        aircraftId="N123"
        pilotsList={[]}
      />
    );

    expect(screen.getByText('Aircraft Hours').nextElementSibling).toHaveTextContent('90.0');
    expect(screen.getByText('Hobbs Meter').nextElementSibling).toHaveTextContent('490.5');
    expect(screen.getByText('Aircraft Landings').nextElementSibling).toHaveTextContent('35');
    expect(screen.getByText(/Engine Hours/).nextElementSibling).toHaveTextContent('90.0');
    const engineCyclesCell = screen.getAllByText('Engine Cycles').find(el => el.tagName === 'TD');
    expect(engineCyclesCell?.nextElementSibling).toHaveTextContent('290');
  });

  it('falls back to aircraft state when unsigned and no totals snapshot exists', () => {
    render(
      <FlightLogTab
        legs={legs}
        flightLog={{}}
        aircraftId="N123"
        pilotsList={[]}
      />
    );

    expect(screen.getByText('Aircraft Hours').nextElementSibling).toHaveTextContent('100.0');
    expect(screen.getByText('Aircraft Landings').nextElementSibling).toHaveTextContent('40');
    expect(screen.getByText('Hobbs Meter').nextElementSibling).toHaveTextContent('500.0');
  });

  it('prefers the authoritative baseline over stale aircraft state when unsigned', () => {
    render(
      <FlightLogTab
        legs={legs}
        flightLog={{}}
        aircraftId="N123"
        pilotsList={[]}
        authoritativeBaseline={{
          flightBefore: 77.5,
          hobbsBefore: 480,
          landingsBefore: 30,
          engine1Before: 77.5,
          cycles1Before: 250
        }}
      />
    );

    expect(screen.getByText('Aircraft Hours').nextElementSibling).toHaveTextContent('77.5');
    expect(screen.getByText('Aircraft Landings').nextElementSibling).toHaveTextContent('30');
    expect(screen.getByText('Hobbs Meter').nextElementSibling).toHaveTextContent('480.0');
  });

  it('refreshes aircraft from Firestore before signing and snapshots baselines from fresh data', async () => {
    const onSign = vi.fn();
    const refreshAircraft = vi.fn().mockResolvedValue([makeAircraft({ totalHours: 150, hobbs: 550 })]);

    render(
      <FlightLogTab
        legs={[{ ...legs[0] }]}
        flightLog={{ legsActuals: [{ flightHrs: '2', hobbs: '2.5', landings: '1' }] }}
        onSign={onSign}
        aircraftId="N123"
        pilotsList={[]}
        refreshAircraft={refreshAircraft}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Sign Logbook/i }));

    await waitFor(() => expect(onSign).toHaveBeenCalledTimes(1));

    expect(refreshAircraft).toHaveBeenCalled();
    const totals = onSign.mock.calls[0][1];
    expect(totals.flightBefore).toBe(150);
    expect(totals.hobbsBefore).toBe(550);
    expect(totals.changeFlight).toBe(2);
    expect(totals.changeHobbs).toBe(2.5);
    expect(totals.landingsBefore).toBe(40);
    expect(totals.changeLandings).toBe(1);
  });

  it('keeps stale aircraft state when the Firestore refresh returns nothing usable', async () => {
    const onSign = vi.fn();
    const refreshAircraft = vi.fn().mockResolvedValue(null);

    render(
      <FlightLogTab
        legs={[{ ...legs[0] }]}
        flightLog={{ legsActuals: [{ flightHrs: '2' }] }}
        onSign={onSign}
        aircraftId="N123"
        pilotsList={[]}
        refreshAircraft={refreshAircraft}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Sign Logbook/i }));

    await waitFor(() => expect(onSign).toHaveBeenCalledTimes(1));

    const totals = onSign.mock.calls[0][1];
    expect(totals.flightBefore).toBe(100);
    expect(totals.changeFlight).toBe(2);
  });

  it('refreshes aircraft before dispatching clear signature to the parent', async () => {
    const onClearSignature = vi.fn();
    const refreshAircraft = vi.fn().mockResolvedValue([makeAircraft()]);

    render(
      <FlightLogTab
        legs={legs}
        flightLog={{ signature: { name: 'Admin User', timestamp: 'now' }, aircraftTotals: { flightBefore: 90 } }}
        onClearSignature={onClearSignature}
        aircraftId="N123"
        pilotsList={[]}
        refreshAircraft={refreshAircraft}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /CLEAR SIGNATURE/i }));

    await waitFor(() => expect(onClearSignature).toHaveBeenCalledTimes(1));
    expect(refreshAircraft).toHaveBeenCalled();
  });
});
