import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AircraftUsageDashboard from '../AircraftUsageDashboard';
import type { Flight, Aircraft } from '../../data';

vi.mock('../../contexts/DataProvider', () => ({
  useData: () => ({ userFlights: mockFlights, userAircraft: mockAircraft, userAccounts: mockAccounts })
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Cell: () => <div data-testid="cell" />
}));

const aircraft: Aircraft[] = [
  { id: 'N123', tailNumber: 'N123', make: 'Robinson', model: 'R44', status: 'active' },
  { id: 'N456', tailNumber: 'N456', make: 'Airbus', model: 'H125', status: 'active' }
];

const accounts = [
  { id: 'acc-1', name: 'Flight Operations' },
  { id: 'acc-2', name: 'Maintenance' }
];

const flights: Flight[] = [
  { id: 'f1', aircraftId: 'N123', date: '2026-03-10', status: 'completed', tag: '', legs: [{ duration: 90 }, { duration: 30 }], flightLog: { signature: { name: 'Chief Pilot' } } } as Flight,
  { id: 'f2', aircraftId: 'N123', date: '2026-03-12', status: 'completed', tag: '', legs: [{ duration: 60 }], flightLog: { signature: { name: 'Chief Pilot' } } } as Flight
];

let mockFlights: Flight[] = flights;
let mockAircraft: Aircraft[] = aircraft;
let mockAccounts: { id: string; name: string }[] = accounts;

describe('AircraftUsageDashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15'));
    mockFlights = flights;
    mockAircraft = aircraft;
    mockAccounts = accounts;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders aggregated stat cards and chart sections', () => {
    render(<AircraftUsageDashboard />);

    expect(screen.getByText('Total Missions').nextElementSibling).toHaveTextContent('2');
    expect(screen.getByText('Total Flight Hours').nextElementSibling).toHaveTextContent('3.0');
    expect(screen.getByText('Busiest Aircraft').nextElementSibling).toHaveTextContent('N123');
    expect(screen.getByText('Total Fuel (Gal)')).toBeInTheDocument();

    expect(screen.getByText('Flight Hours by Aircraft')).toBeInTheDocument();
    expect(screen.getByText('Missions by Aircraft')).toBeInTheDocument();
    expect(screen.getByText('Monthly Flight Hours Trend')).toBeInTheDocument();
  });

  it('shows empty state when no flights fall in the selected range', () => {
    mockFlights = [
      { id: 'f1', aircraftId: 'N123', date: '2026-02-10', status: 'completed', tag: '', legs: [{ duration: 60 }], flightLog: { signature: { name: 'Chief Pilot' } } } as Flight
    ];
    render(<AircraftUsageDashboard />);

    fireEvent.click(screen.getByRole('button', { name: /Month/i }));

    expect(screen.getByText('No completed flights fall within the selected date range.')).toBeInTheDocument();
  });

  it('shows onboarding message when there is no flight data at all', () => {
    mockFlights = [];
    mockAircraft = [];
    render(<AircraftUsageDashboard />);

    expect(screen.getByText('No completed flight data to visualize yet. Sign flight logbooks to see the dashboard.')).toBeInTheDocument();
  });
});
