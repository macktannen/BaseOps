import { parseISO, differenceInDays } from 'date-fns';
import type { Flight, Aircraft } from '../data';

export interface DateBounds {
  startStr?: string | null;
  endStr?: string | null;
}

interface FlightLeg {
  date?: string;
  arrDate?: string;
  takeoffTime?: string;
  landTime?: string;
  duration?: number;
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
  hoursByMonth: Record<string, number>;
  missionsByMonth: Record<string, number>;
  byStatus: Record<string, number>;
  byTag: Record<string, number>;
}

export interface FleetAircraftShare {
  aircraftId: string;
  tailNumber: string;
  totalHours: number;
  missionCount: number;
  utilization: number;
}

export interface FleetUsageStats {
  totalAircraft: number;
  totalMissions: number;
  totalLegs: number;
  totalHours: number;
  byAircraft: FleetAircraftShare[];
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
  hoursByMonth: {},
  missionsByMonth: {},
  byStatus: {},
  byTag: {},
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
  dateBounds?: DateBounds | null
): { aircraft: AircraftUsageStats[]; fleet: FleetUsageStats } => {
  const filtered = filterFlightsByDate(flights, dateBounds);
  const statsMap = new Map<string, AircraftUsageStats>();

  aircraft.forEach((ac) => {
    statsMap.set(ac.id, createEmptyAircraftStats(ac));
  });

  let totalMissions = 0;
  let totalLegs = 0;
  let totalHours = 0;

  filtered.forEach((flight) => {
    const acId = flight.aircraftId;
    if (!acId) return;

    const stats = statsMap.get(acId);
    if (!stats) return;

    const monthKey = getMonthKey(flight);
    const statusKey = normalizeStatus(flight.status);
    const tagKey = flight.tag || 'untagged';
    const legs = (flight.legs || []) as FlightLeg[];
    const legCount = legs.length;

    stats.missionCount += 1;
    stats.missionsByMonth[monthKey] = (stats.missionsByMonth[monthKey] || 0) + 1;
    stats.totalLegs += legCount;

    totalMissions += 1;
    totalLegs += legCount;

    if (!stats.byStatus[statusKey]) stats.byStatus[statusKey] = 0;
    if (!stats.byTag[tagKey]) stats.byTag[tagKey] = 0;

    legs.forEach((leg) => {
      const minutes = computeLegMinutes(leg);
      const hours = Math.round((minutes / 60) * 100) / 100;

      stats.totalHours = Math.round((stats.totalHours + hours) * 100) / 100;
      stats.hoursByMonth[monthKey] = Math.round(((stats.hoursByMonth[monthKey] || 0) + hours) * 100) / 100;
      stats.byStatus[statusKey] = Math.round((stats.byStatus[statusKey] + hours) * 100) / 100;
      stats.byTag[tagKey] = Math.round((stats.byTag[tagKey] + hours) * 100) / 100;

      totalHours = Math.round((totalHours + hours) * 100) / 100;
    });
  });

  const aircraftStats = aircraft
    .map((ac) => statsMap.get(ac.id))
    .filter((s): s is AircraftUsageStats => Boolean(s));

  const byAircraft: FleetAircraftShare[] = aircraftStats.map((s) => ({
    aircraftId: s.aircraftId,
    tailNumber: s.tailNumber,
    totalHours: s.totalHours,
    missionCount: s.missionCount,
    utilization: totalHours > 0 ? Math.round((s.totalHours / totalHours) * 10000) / 10000 : 0,
  }));

  return {
    aircraft: aircraftStats,
    fleet: {
      totalAircraft: aircraft.length,
      totalMissions,
      totalLegs,
      totalHours,
      byAircraft,
    },
  };
};
