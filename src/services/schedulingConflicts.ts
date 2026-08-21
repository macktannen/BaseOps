import { parseISO, differenceInMinutes } from 'date-fns';
import type { Flight, FlightLeg } from '../types';

export interface Conflict {
  flightId: string | number | undefined;
  flightNumber: string | number | undefined;
  title: string | undefined;
  overlapLeg: string;
  overlapTime: string;
  overlapDate: string | undefined;
  pilotId?: string;
}

interface TimeRange {
  start: number;
  end: number;
}

const legToRange = (leg: FlightLeg): TimeRange | null => {
  const depDate = leg.date || null;
  const arrDate = leg.arrDate || depDate;
  if (!depDate) return null;

  const depMinutes = timeToMinutes(leg.takeoffTime);
  const arrMinutes = timeToMinutes(leg.landTime);

  if (depMinutes === null || arrMinutes === null) return null;

  const startDate = parseISO(`${depDate}T00:00:00`);
  const endDate = parseISO(`${arrDate}T00:00:00`);

  const startMinutes = differenceInMinutes(startDate, parseISO('2020-01-01T00:00:00')) + depMinutes;
  const endMinutes = differenceInMinutes(endDate, parseISO('2020-01-01T00:00:00')) + arrMinutes;

  return { start: startMinutes, end: endMinutes };
};

const timeToMinutes = (timeStr?: string): number | null => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.split(':');
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

const rangesOverlap = (a: TimeRange | null, b: TimeRange | null): boolean => {
  if (!a || !b) return false;
  return a.start < b.end && b.start < a.end;
};

export const detectConflicts = (
  flightData: Flight | null,
  allFlights: Flight[]
): { pilotConflicts: Conflict[]; aircraftConflicts: Conflict[] } => {
  const pilotConflicts: Conflict[] = [];
  const aircraftConflicts: Conflict[] = [];

  if (!flightData || !flightData.legs || flightData.legs.length === 0) {
    return { pilotConflicts, aircraftConflicts };
  }

  if (flightData.status === 'completed' || flightData.status === 'canceled') {
    return { pilotConflicts, aircraftConflicts };
  }

  const currentLegRanges = flightData.legs
    .map(leg => ({ leg, range: legToRange(leg) }))
    .filter((l): l is { leg: FlightLeg; range: TimeRange } => l.range !== null);

  if (currentLegRanges.length === 0) {
    return { pilotConflicts, aircraftConflicts };
  }

  const currentPilotIds = new Set<string>();
  for (const { leg } of currentLegRanges) {
    if (leg.pilots && Array.isArray(leg.pilots)) {
      leg.pilots.forEach(p => { if (p) currentPilotIds.add(String(p)); });
    }
    if (leg.pilotId) currentPilotIds.add(String(leg.pilotId));
  }

  const currentAircraftId = flightData.aircraftId;

  for (const other of allFlights) {
    if (flightData.id && other.id === flightData.id) continue;
    if (other.status === 'canceled' || other.status === 'completed') continue;
    if (!other.legs || other.legs.length === 0) continue;

    const otherLegRanges = other.legs
      .map(leg => ({ leg, range: legToRange(leg) }))
      .filter((l): l is { leg: FlightLeg; range: TimeRange } => l.range !== null);

    if (currentAircraftId && other.aircraftId && currentAircraftId === other.aircraftId) {
      for (const { range: curRange } of currentLegRanges) {
        for (const { leg: otherLeg, range: otherRange } of otherLegRanges) {
          if (rangesOverlap(curRange, otherRange)) {
            aircraftConflicts.push({
              flightId: other.id,
              flightNumber: other.flightNumber,
              title: other.title,
              overlapLeg: `${otherLeg.departure?.id || '?'} → ${otherLeg.destination?.id || '?'}`,
              overlapTime: `${otherLeg.takeoffTime} - ${otherLeg.landTime}`,
              overlapDate: otherLeg.date
            });
          }
        }
      }
    }

    if (currentPilotIds.size > 0) {
      for (const { leg: curLeg, range: curRange } of currentLegRanges) {
        const curPilots = new Set<string>();
        if (curLeg.pilots && Array.isArray(curLeg.pilots)) {
          curLeg.pilots.forEach(p => { if (p) curPilots.add(String(p)); });
        }
        if (curLeg.pilotId) curPilots.add(String(curLeg.pilotId));

        for (const { leg: otherLeg, range: otherRange } of otherLegRanges) {
          if (!rangesOverlap(curRange, otherRange)) continue;

          const otherPilots = new Set<string>();
          if (otherLeg.pilots && Array.isArray(otherLeg.pilots)) {
            otherLeg.pilots.forEach(p => { if (p) otherPilots.add(String(p)); });
          }
          if (otherLeg.pilotId) otherPilots.add(String(otherLeg.pilotId));

          for (const pid of curPilots) {
            if (otherPilots.has(pid)) {
              pilotConflicts.push({
                flightId: other.id,
                flightNumber: other.flightNumber,
                title: other.title,
                pilotId: pid,
                overlapLeg: `${otherLeg.departure?.id || '?'} → ${otherLeg.destination?.id || '?'}`,
                overlapTime: `${otherLeg.takeoffTime} - ${otherLeg.landTime}`,
                overlapDate: otherLeg.date
              });
            }
          }
        }
      }
    }
  }

  const uniquePilotConflicts: Conflict[] = [];
  const seenPilot = new Set<string>();
  for (const c of pilotConflicts) {
    const key = `${c.flightId}_${c.pilotId}_${c.overlapDate}_${c.overlapTime}`;
    if (!seenPilot.has(key)) {
      seenPilot.add(key);
      uniquePilotConflicts.push(c);
    }
  }

  const uniqueAircraftConflicts: Conflict[] = [];
  const seenAc = new Set<string>();
  for (const c of aircraftConflicts) {
    const key = `${c.flightId}_${c.overlapDate}_${c.overlapTime}`;
    if (!seenAc.has(key)) {
      seenAc.add(key);
      uniqueAircraftConflicts.push(c);
    }
  }

  return {
    pilotConflicts: uniquePilotConflicts,
    aircraftConflicts: uniqueAircraftConflicts
  };
};
