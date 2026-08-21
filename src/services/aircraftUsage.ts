import { parseISO, differenceInDays } from 'date-fns';
import type { Flight, Aircraft, FlightLeg } from '../types';

export interface DateBounds {
  startStr?: string | null;
  endStr?: string | null;
}

interface LegActual {
  fuelPurchased?: number | string;
  flightHrs?: number | string;
}

interface FlightLog {
  legsActuals?: LegActual[];
  signature?: unknown;
}

export interface AircraftUsageStats {
  aircraftId: string;
  tailNumber: string;
  make?: string;
  model?: string;
  status?: string;
  missionCount: number;
  totalLegs: number;
  totalHours: number;
  totalFuel: number;
  hoursByMonth: Record<string, number>;
  missionsByMonth: Record<string, number>;
  fuelByMonth: Record<string, number>;
  byStatus: Record<string, number>;
  byTag: Record<string, number>;
  byAccount: Record<string, number>;
  fuelByTag: Record<string, number>;
}

export interface FleetAircraftShare {
  aircraftId: string;
  tailNumber: string;
  totalHours: number;
  missionCount: number;
  totalFuel: number;
  utilization: number;
}

export interface FleetUsageStats {
  totalAircraft: number;
  totalMissions: number;
  totalLegs: number;
  totalHours: number;
  totalFuel: number;
  byAircraft: FleetAircraftShare[];
  byAccount: Record<string, { hours: number; missions: number; fuel: number }>;
  byTag: Record<string, { hours: number; missions: number; fuel: number }>;
}

const timeToMinutes = (timeStr?: string | null): number | null => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const normalizeStatus = (status?: string | null): string => {
  if (!status) return 'unknown';
  const lower = String(status).trim().toLowerCase();
  if (lower === 'cancelled') return 'canceled';
  if (lower === 'onhold') return 'on hold';
  return lower;
};

const isCompletedFlight = (flight: Flight): boolean => {
  const log = flight.flightLog as FlightLog | undefined;
  return Boolean(log?.signature);
};

const getFlightDateString = (flight: Flight): string | null => {
  if (!flight.date) return null;
  return String(flight.date).slice(0, 10);
};

const getMonthKey = (flight: Flight): string => {
  const ds = getFlightDateString(flight);
  return ds ? ds.slice(0, 7) : 'unknown';
};

const computeLegMinutes = (leg: FlightLeg): number => {
  if (typeof leg.duration === 'number' && !Number.isNaN(leg.duration)) {
    return leg.duration;
  }

  const depMinutes = timeToMinutes(leg.takeoffTime);
  const arrMinutes = timeToMinutes(leg.landTime);
  if (depMinutes === null || arrMinutes === null) return 0;

  let dayDiff = 0;
  if (leg.date && leg.arrDate) {
    try {
      const depDate = parseISO(`${leg.date}T00:00:00`);
      const arrDate = parseISO(`${leg.arrDate}T00:00:00`);
      const days = differenceInDays(arrDate, depDate);
      if (!Number.isNaN(days)) dayDiff = days;
    } catch {}
  }

  let diff = (arrMinutes - depMinutes) + dayDiff * 24 * 60;
  if (diff < 0) diff += 24 * 60;
  return diff;
};

const createEmptyAircraftStats = (aircraft: Aircraft): AircraftUsageStats => ({
  aircraftId: aircraft.id,
  tailNumber: aircraft.tailNumber || aircraft.id,
  make: aircraft.make,
  model: aircraft.model,
  status: aircraft.status,
  missionCount: 0,
  totalLegs: 0,
  totalHours: 0,
  totalFuel: 0,
  hoursByMonth: {},
  missionsByMonth: {},
  fuelByMonth: {},
  byStatus: {},
  byTag: {},
  byAccount: {},
  fuelByTag: {},
});

export const filterFlightsByDate = (
  flights: Flight[],
  dateBounds?: DateBounds | null
): Flight[] => {
  if (!dateBounds || (!dateBounds.startStr && !dateBounds.endStr)) return flights;
  const start = dateBounds.startStr || null;
  const end = dateBounds.endStr || null;

  return flights.filter((flight) => {
    const ds = getFlightDateString(flight);
    if (!ds) return false;
    if (start && ds < start) return false;
    if (end && ds > end) return false;
    return true;
  });
};

export const computeAircraftUsage = (
  flights: Flight[],
  aircraft: Aircraft[],
  dateBounds?: DateBounds | null,
  completedOnly: boolean = true,
  accounts: { id: string; name: string }[] = []
): { aircraft: AircraftUsageStats[]; fleet: FleetUsageStats } => {
  let filtered = filterFlightsByDate(flights, dateBounds);
  if (completedOnly) {
    filtered = filtered.filter(isCompletedFlight);
  }

  const statsMap = new Map<string, AircraftUsageStats>();
  aircraft.forEach((ac) => {
    statsMap.set(ac.id, createEmptyAircraftStats(ac));
  });

  let totalMissions = 0;
  let totalLegs = 0;
  let totalHours = 0;
  let totalFuel = 0;
  const fleetByAccount: Record<string, { hours: number; missions: number; fuel: number }> = {};
  const fleetByTag: Record<string, { hours: number; missions: number; fuel: number }> = {};

  filtered.forEach((flight) => {
    const acId = flight.aircraftId;
    if (!acId) return;
    const stats = statsMap.get(acId);
    if (!stats) return;

    const monthKey = getMonthKey(flight);
    const statusKey = normalizeStatus(flight.status);
    const tagKey = flight.tag || 'untagged';
    const rawAccountId = (flight as Record<string, unknown>).accountId as string || '';
    const matchedAccount = rawAccountId ? accounts.find(a => a.id === rawAccountId) : null;
    const accountName = matchedAccount?.name || rawAccountId || 'unassigned';
    const legs = (flight.legs || []) as FlightLeg[];
    const legCount = legs.length;

    const log = flight.flightLog as FlightLog | undefined;
    const legsActuals = log?.legsActuals || [];
    let flightFuel = 0;
    legsActuals.forEach((la) => {
      const gal = parseFloat(String(la.fuelPurchased || '0'));
      if (!Number.isNaN(gal)) flightFuel += gal;
    });
    flightFuel = Math.round(flightFuel * 10) / 10;

    let flightHours = 0;
    legs.forEach((leg, idx) => {
      const actual = legsActuals[idx];
      if (actual?.flightHrs !== undefined && actual.flightHrs !== '' && actual.flightHrs !== null) {
        const hrs = parseFloat(String(actual.flightHrs));
        if (!Number.isNaN(hrs)) {
          flightHours = Math.round((flightHours + hrs) * 100) / 100;
          return;
        }
      }
      const minutes = computeLegMinutes(leg);
      const hours = Math.round((minutes / 60) * 100) / 100;
      flightHours = Math.round((flightHours + hours) * 100) / 100;
    });

    stats.missionCount += 1;
    stats.missionsByMonth[monthKey] = (stats.missionsByMonth[monthKey] || 0) + 1;
    stats.totalLegs += legCount;
    stats.totalHours = Math.round((stats.totalHours + flightHours) * 100) / 100;
    stats.totalFuel = Math.round((stats.totalFuel + flightFuel) * 10) / 10;
    stats.hoursByMonth[monthKey] = Math.round(((stats.hoursByMonth[monthKey] || 0) + flightHours) * 100) / 100;
    stats.fuelByMonth[monthKey] = Math.round(((stats.fuelByMonth[monthKey] || 0) + flightFuel) * 10) / 10;
    stats.byStatus[statusKey] = Math.round(((stats.byStatus[statusKey] || 0) + flightHours) * 100) / 100;
    stats.byTag[tagKey] = Math.round(((stats.byTag[tagKey] || 0) + flightHours) * 100) / 100;
    stats.fuelByTag[tagKey] = Math.round(((stats.fuelByTag[tagKey] || 0) + flightFuel) * 10) / 10;
    stats.byAccount[accountName] = Math.round(((stats.byAccount[accountName] || 0) + flightHours) * 100) / 100;

    totalMissions += 1;
    totalLegs += legCount;
    totalHours = Math.round((totalHours + flightHours) * 100) / 100;
    totalFuel = Math.round((totalFuel + flightFuel) * 10) / 10;

    if (!fleetByAccount[accountName]) fleetByAccount[accountName] = { hours: 0, missions: 0, fuel: 0 };
    fleetByAccount[accountName].hours = Math.round((fleetByAccount[accountName].hours + flightHours) * 100) / 100;
    fleetByAccount[accountName].missions += 1;
    fleetByAccount[accountName].fuel = Math.round((fleetByAccount[accountName].fuel + flightFuel) * 10) / 10;

    if (!fleetByTag[tagKey]) fleetByTag[tagKey] = { hours: 0, missions: 0, fuel: 0 };
    fleetByTag[tagKey].hours = Math.round((fleetByTag[tagKey].hours + flightHours) * 100) / 100;
    fleetByTag[tagKey].missions += 1;
    fleetByTag[tagKey].fuel = Math.round((fleetByTag[tagKey].fuel + flightFuel) * 10) / 10;
  });

  const aircraftStats = aircraft
    .map((ac) => statsMap.get(ac.id))
    .filter((s): s is AircraftUsageStats => Boolean(s));

  const byAircraft: FleetAircraftShare[] = aircraftStats.map((s) => ({
    aircraftId: s.aircraftId,
    tailNumber: s.tailNumber,
    totalHours: s.totalHours,
    missionCount: s.missionCount,
    totalFuel: s.totalFuel,
    utilization: totalHours > 0 ? Math.round((s.totalHours / totalHours) * 10000) / 10000 : 0,
  }));

  return {
    aircraft: aircraftStats,
    fleet: {
      totalAircraft: aircraft.length,
      totalMissions,
      totalLegs,
      totalHours,
      totalFuel,
      byAircraft,
      byAccount: fleetByAccount,
      byTag: fleetByTag,
    },
  };
};
