/**
 * Scheduling conflict detection for flights.
 * Checks pilot and aircraft overlaps across all flights.
 */

/**
 * Convert a leg's date + time into a Date object (minutes since epoch).
 * Handles overnight legs where arrDate > date.
 */
const legToRange = (leg) => {
  const depDate = leg.date || null;
  const arrDate = leg.arrDate || depDate;
  if (!depDate) return null;

  const depMinutes = timeToMinutes(leg.takeoffTime);
  const arrMinutes = timeToMinutes(leg.landTime);

  if (depMinutes === null || arrMinutes === null) return null;

  // Build start/end in minutes-from-epoch for comparison
  const startDay = dateStrToDays(depDate);
  const endDay = dateStrToDays(arrDate);

  if (startDay === null || endDay === null) return null;

  return {
    start: startDay * 1440 + depMinutes,
    end: endDay * 1440 + arrMinutes
  };
};

const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.split(':');
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

const dateStrToDays = (dateStr) => {
  if (!dateStr) return null;
  // YYYY-MM-DD -> days since epoch
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  // Approximate days since 2020-01-01 for comparison purposes
  return (y - 2020) * 365 + monthDays(m) + d;
};

const monthDays = (m) => {
  const days = [0, 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  return days[m] || 0;
};

const rangesOverlap = (a, b) => {
  if (!a || !b) return false;
  return a.start < b.end && b.start < a.end;
};

/**
 * Detect scheduling conflicts for a flight being saved.
 * @param {Object} flightData - The flight being saved
 * @param {Array} allFlights - All existing flights
 * @returns {{ pilotConflicts: Array, aircraftConflicts: Array }}
 */
export const detectConflicts = (flightData, allFlights) => {
  const pilotConflicts = [];
  const aircraftConflicts = [];

  if (!flightData || !flightData.legs || flightData.legs.length === 0) {
    return { pilotConflicts, aircraftConflicts };
  }

  // Skip conflict detection for completed or canceled flights
  if (flightData.status === 'completed' || flightData.status === 'canceled') {
    return { pilotConflicts, aircraftConflicts };
  }

  const currentLegRanges = flightData.legs
    .map(leg => ({ leg, range: legToRange(leg) }))
    .filter(l => l.range);

  if (currentLegRanges.length === 0) {
    return { pilotConflicts, aircraftConflicts };
  }

  // Collect all pilot IDs from this flight's legs
  const currentPilotIds = new Set();
  for (const { leg } of currentLegRanges) {
    if (leg.pilots && Array.isArray(leg.pilots)) {
      leg.pilots.forEach(p => { if (p) currentPilotIds.add(String(p)); });
    }
    if (leg.pilotId) currentPilotIds.add(String(leg.pilotId));
  }

  const currentAircraftId = flightData.aircraftId;

  // Check against all other flights
  for (const other of allFlights) {
    // Skip self (editing existing flight)
    if (flightData.id && other.id === flightData.id) continue;
    // Skip canceled or completed flights
    if (other.status === 'canceled' || other.status === 'completed') continue;
    // Skip flights with no legs
    if (!other.legs || other.legs.length === 0) continue;

    const otherLegRanges = other.legs
      .map(leg => ({ leg, range: legToRange(leg) }))
      .filter(l => l.range);

    // Check aircraft conflict (per-flight)
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

    // Check pilot conflicts (per-leg)
    if (currentPilotIds.size > 0) {
      for (const { leg: curLeg, range: curRange } of currentLegRanges) {
        const curPilots = new Set();
        if (curLeg.pilots && Array.isArray(curLeg.pilots)) {
          curLeg.pilots.forEach(p => { if (p) curPilots.add(String(p)); });
        }
        if (curLeg.pilotId) curPilots.add(String(curLeg.pilotId));

        for (const { leg: otherLeg, range: otherRange } of otherLegRanges) {
          if (!rangesOverlap(curRange, otherRange)) continue;

          const otherPilots = new Set();
          if (otherLeg.pilots && Array.isArray(otherLeg.pilots)) {
            otherLeg.pilots.forEach(p => { if (p) otherPilots.add(String(p)); }
            );
          }
          if (otherLeg.pilotId) otherPilots.add(String(otherLeg.pilotId));

          // Find overlapping pilots
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

  // Deduplicate conflicts by flightId
  const uniquePilotConflicts = [];
  const seenPilot = new Set();
  for (const c of pilotConflicts) {
    const key = `${c.flightId}_${c.pilotId}_${c.overlapDate}_${c.overlapTime}`;
    if (!seenPilot.has(key)) {
      seenPilot.add(key);
      uniquePilotConflicts.push(c);
    }
  }

  const uniqueAircraftConflicts = [];
  const seenAc = new Set();
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
