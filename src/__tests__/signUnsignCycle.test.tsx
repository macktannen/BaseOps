import { describe, it, expect, beforeEach } from 'vitest';
import { computeAircraftUsage } from '../services/aircraftUsage';
import type { Flight, Aircraft, FlightLeg } from '../types';

const makeAircraft = (overrides: Partial<Aircraft> = {}): Aircraft => ({
  id: 'N123',
  tailNumber: 'N123',
  make: 'Robinson',
  model: 'R44',
  status: 'active',
  totalHours: 100,
  hobbs: 500,
  landings: 40,
  engine1Hours: 100,
  engine1Cycles: 300,
  ...overrides,
});

const makeLegs = (durationMin: number, date = '2026-08-20'): FlightLeg[] => [
  {
    departure: { type: 'airport', id: 'KVPZ' },
    destination: { type: 'airport', id: 'KORD' },
    pilots: ['p1'],
    date,
    duration: durationMin,
  },
];

const makeFlight = (
  id: string | number,
  aircraftId: string,
  durationMin: number,
  date = '2026-08-20',
  extra: Record<string, unknown> = {}
): Flight => ({
  id,
  aircraftId,
  date,
  status: 'completed',
  tag: '',
  legs: makeLegs(durationMin, date),
  ...extra,
});

const signFlight = (flight: Flight, snapshottedTotals: Record<string, unknown>): Flight => ({
  ...flight,
  status: 'completed',
  flightLog: {
    ...flight.flightLog,
    signature: { name: 'Admin User', timestamp: 'now', isoTimestamp: '2026-08-20T10:00:00Z' },
    isLocked: true,
    aircraftTotals: snapshottedTotals,
  },
});

const unsignFlight = (flight: Flight): Flight => ({
  ...flight,
  status: 'confirmed',
  flightLog: {
    ...flight.flightLog,
    signature: null,
    isLocked: false,
    aircraftTotals: null,
  },
});

const applySignToAircraft = (ac: Aircraft, totals: Record<string, unknown>): Aircraft => {
  const u = { ...ac } as Record<string, unknown>;
  u.totalHours = (Math.round((Number(totals.flightBefore || 0) + Number(totals.changeFlight || 0)) * 10) / 10).toFixed(1);
  u.hobbs = (Math.round((Number(totals.hobbsBefore || 0) + Number(totals.changeHobbs || 0)) * 10) / 10).toFixed(1);
  u.landings = parseInt(String(totals.landingsBefore || 0), 10) + Math.round(Number(totals.changeLandings || 0));
  u.engine1Hours = (Math.round((Number(totals.engine1Before || 0) + Number(totals.changeEngine1Hours || 0)) * 10) / 10).toFixed(1);
  u.engineHours = u.engine1Hours;
  u.engine1Cycles = parseInt(String(totals.cycles1Before || 0), 10) + Math.round(Number(totals.changeEngine1Cycles || 0));
  u.engineCycles = u.engine1Cycles;
  return u as unknown as Aircraft;
};

const applyUnsignToAircraft = (ac: Aircraft, totals: Record<string, unknown>): Aircraft => {
  const u = { ...ac } as Record<string, unknown>;
  if (totals.flightBefore !== undefined) u.totalHours = parseFloat(String(totals.flightBefore)).toFixed(1);
  if (totals.hobbsBefore !== undefined) u.hobbs = parseFloat(String(totals.hobbsBefore)).toFixed(1);
  if (totals.landingsBefore !== undefined) u.landings = parseInt(String(totals.landingsBefore), 10);
  if (totals.engine1Before !== undefined) {
    u.engine1Hours = parseFloat(String(totals.engine1Before)).toFixed(1);
    u.engineHours = u.engine1Hours;
  }
  if (totals.cycles1Before !== undefined) {
    u.engine1Cycles = parseInt(String(totals.cycles1Before), 10);
    u.engineCycles = u.engine1Cycles;
  }
  return u as unknown as Aircraft;
};

const getSnapshotTotals = (ac: Aircraft, changeHrs: number): Record<string, unknown> => ({
  flightBefore: parseFloat(String(ac.totalHours)),
  hobbsBefore: parseFloat(String(ac.hobbs)),
  landingsBefore: parseInt(String(ac.landings), 10),
  engine1Before: parseFloat(String(ac.engine1Hours)),
  cycles1Before: parseInt(String(ac.engine1Cycles), 10),
  changeFlight: changeHrs,
  changeHobbs: changeHrs,
  changeLandings: 1,
  changeEngine1Hours: changeHrs,
  changeEngine1Cycles: 1,
  dualEngine: false,
});

describe('sign / unsign / re-sign cycle', () => {
  let aircraft: Aircraft;
  let flight: Flight;
  let snapshot: Record<string, unknown>;

  beforeEach(() => {
    aircraft = makeAircraft();
    flight = makeFlight('fl-1', 'N123', 120);
    snapshot = getSnapshotTotals(aircraft, 2);
  });

  it('baseline: unsigned flight is excluded from usage stats', () => {
    const result = computeAircraftUsage([flight], [aircraft]);
    expect(result.aircraft[0].totalHours).toBe(0);
    expect(result.aircraft[0].missionCount).toBe(0);
    expect(result.fleet.totalHours).toBe(0);
    expect(result.fleet.totalMissions).toBe(0);
  });

  it('sign: aircraft hours increment and flight appears in usage stats', () => {
    const signed = signFlight(flight, snapshot);
    const updatedAc = applySignToAircraft(aircraft, snapshot);

    expect(parseFloat(String(updatedAc.totalHours))).toBe(102);

    const result = computeAircraftUsage([signed], [updatedAc]);
    expect(result.aircraft[0].totalHours).toBe(2);
    expect(result.aircraft[0].missionCount).toBe(1);
    expect(result.fleet.totalHours).toBe(2);
    expect(result.fleet.totalMissions).toBe(1);
  });

  it('unsign: aircraft hours revert to baseline and flight is excluded', () => {
    const signed = signFlight(flight, snapshot);
    const updatedAc = applySignToAircraft(aircraft, snapshot);
    const unsigned = unsignFlight(signed);
    const revertedAc = applyUnsignToAircraft(updatedAc, snapshot);

    expect(parseFloat(String(revertedAc.totalHours))).toBe(100);

    const result = computeAircraftUsage([unsigned], [revertedAc]);
    expect(result.aircraft[0].totalHours).toBe(0);
    expect(result.aircraft[0].missionCount).toBe(0);
    expect(result.fleet.totalHours).toBe(0);
    expect(result.fleet.totalMissions).toBe(0);
  });

  it('re-sign: aircraft hours increment again after unsign', () => {
    const signed = signFlight(flight, snapshot);
    const updatedAc = applySignToAircraft(aircraft, snapshot);
    const unsigned = unsignFlight(signed);
    const revertedAc = applyUnsignToAircraft(updatedAc, snapshot);

    const reSnapshot = getSnapshotTotals(revertedAc, 2);
    const reSigned = signFlight(unsigned, reSnapshot);
    const reUpdatedAc = applySignToAircraft(revertedAc, reSnapshot);

    expect(parseFloat(String(reUpdatedAc.totalHours))).toBe(102);

    const result = computeAircraftUsage([reSigned], [reUpdatedAc]);
    expect(result.aircraft[0].totalHours).toBe(2);
    expect(result.aircraft[0].missionCount).toBe(1);
    expect(result.fleet.totalHours).toBe(2);
  });

  it('full cycle: sign → unsign → re-sign matches at every step', () => {
    const step0 = computeAircraftUsage([flight], [aircraft]);
    expect(step0.fleet.totalHours).toBe(0);
    expect(step0.fleet.totalMissions).toBe(0);
    expect(parseFloat(String(aircraft.totalHours))).toBe(100);

    const signed = signFlight(flight, snapshot);
    const acAfterSign = applySignToAircraft(aircraft, snapshot);
    const step1 = computeAircraftUsage([signed], [acAfterSign]);
    expect(step1.fleet.totalHours).toBe(2);
    expect(step1.fleet.totalMissions).toBe(1);
    expect(step1.aircraft[0].hoursByMonth['2026-08']).toBe(2);
    expect(parseFloat(String(acAfterSign.totalHours))).toBe(102);

    const unsigned = unsignFlight(signed);
    const acAfterUnsign = applyUnsignToAircraft(acAfterSign, snapshot);
    const step2 = computeAircraftUsage([unsigned], [acAfterUnsign]);
    expect(step2.fleet.totalHours).toBe(0);
    expect(step2.fleet.totalMissions).toBe(0);
    expect(step2.aircraft[0].hoursByMonth['2026-08']).toBeUndefined();
    expect(parseFloat(String(acAfterUnsign.totalHours))).toBe(100);

    const reSnapshot = getSnapshotTotals(acAfterUnsign, 2);
    const reSigned = signFlight(unsigned, reSnapshot);
    const acAfterResign = applySignToAircraft(acAfterUnsign, reSnapshot);
    const step3 = computeAircraftUsage([reSigned], [acAfterResign]);
    expect(step3.fleet.totalHours).toBe(2);
    expect(step3.fleet.totalMissions).toBe(1);
    expect(step3.aircraft[0].hoursByMonth['2026-08']).toBe(2);
    expect(parseFloat(String(acAfterResign.totalHours))).toBe(102);
  });

  it('fleet totals match per-aircraft totals across sign / unsign / re-sign phases', () => {
    const ac2 = makeAircraft({ id: 'N456', tailNumber: 'N456', totalHours: 200, hobbs: 800, landings: 100, engine1Hours: 200, engine1Cycles: 500 });
    const flight2 = makeFlight('fl-2', 'N456', 60);

    const result = computeAircraftUsage([flight, flight2], [aircraft, ac2]);
    expect(result.fleet.totalAircraft).toBe(2);
    expect(result.fleet.totalHours).toBe(0);
    expect(result.fleet.byAircraft.find(a => a.aircraftId === 'N123')?.totalHours).toBe(0);
    expect(result.fleet.byAircraft.find(a => a.aircraftId === 'N456')?.totalHours).toBe(0);

    const signed1 = signFlight(flight, snapshot);
    const ac1After = applySignToAircraft(aircraft, snapshot);
    const snap2 = getSnapshotTotals(ac2, 1);
    const signed2 = signFlight(flight2, snap2);
    const ac2After = applySignToAircraft(ac2, snap2);

    const resultAfterSign = computeAircraftUsage([signed1, signed2], [ac1After, ac2After]);
    expect(resultAfterSign.fleet.totalHours).toBe(3);
    expect(resultAfterSign.fleet.totalMissions).toBe(2);
    expect(resultAfterSign.fleet.byAircraft.find(a => a.aircraftId === 'N123')?.totalHours).toBe(2);
    expect(resultAfterSign.fleet.byAircraft.find(a => a.aircraftId === 'N456')?.totalHours).toBe(1);

    const unsigned1 = unsignFlight(signed1);
    const ac1Reverted = applyUnsignToAircraft(ac1After, snapshot);
    const resultUnsign1 = computeAircraftUsage([unsigned1, signed2], [ac1Reverted, ac2After]);
    expect(resultUnsign1.fleet.totalHours).toBe(1);
    expect(resultUnsign1.fleet.totalMissions).toBe(1);
    expect(resultUnsign1.fleet.byAircraft.find(a => a.aircraftId === 'N123')?.totalHours).toBe(0);
    expect(resultUnsign1.fleet.byAircraft.find(a => a.aircraftId === 'N456')?.totalHours).toBe(1);

    const reSnap1 = getSnapshotTotals(ac1Reverted, 2);
    const reSigned1 = signFlight(unsigned1, reSnap1);
    const ac1Resigned = applySignToAircraft(ac1Reverted, reSnap1);
    const resultReSign = computeAircraftUsage([reSigned1, signed2], [ac1Resigned, ac2After]);
    expect(resultReSign.fleet.totalHours).toBe(3);
    expect(resultReSign.fleet.totalMissions).toBe(2);
    expect(resultReSign.fleet.byAircraft.find(a => a.aircraftId === 'N123')?.totalHours).toBe(2);
    expect(resultReSign.fleet.byAircraft.find(a => a.aircraftId === 'N456')?.totalHours).toBe(1);
  });
});

describe('concurrent sign / unsign race condition regression', () => {
  it('two concurrent sign operations on the same flight produce idempotent usage stats', () => {
    const ac = makeAircraft();
    const flight = makeFlight('fl-race', 'N123', 120);
    const snap = getSnapshotTotals(ac, 2);

    const signedTab1 = signFlight(flight, { ...snap });
    const signedTab2 = signFlight(flight, { ...snap });

    const acAfterSign = applySignToAircraft(ac, snap);

    const result1 = computeAircraftUsage([signedTab1], [acAfterSign]);
    expect(result1.fleet.totalHours).toBe(2);
    expect(result1.fleet.totalMissions).toBe(1);

    const result2 = computeAircraftUsage([signedTab2], [acAfterSign]);
    expect(result2.fleet.totalHours).toBe(2);
    expect(result2.fleet.totalMissions).toBe(1);
    expect(result1.fleet.totalHours).toBe(result2.fleet.totalHours);
  });

  it('interleaved sign and unsign from two tabs yields consistent aircraft totals', () => {
    const ac = makeAircraft();
    const flight = makeFlight('fl-interleave', 'N123', 120);

    const snap1 = getSnapshotTotals(ac, 2);
    const signed = signFlight(flight, snap1);
    const acAfterSign = applySignToAircraft(ac, snap1);

    const unsigned = unsignFlight(signed);
    const acAfterUnsign = applyUnsignToAircraft(acAfterSign, snap1);

    const snap2 = getSnapshotTotals(acAfterUnsign, 2);
    const reSigned = signFlight(unsigned, snap2);
    const acAfterReSign = applySignToAircraft(acAfterUnsign, snap2);

    const finalResult = computeAircraftUsage([reSigned], [acAfterReSign]);
    expect(finalResult.fleet.totalHours).toBe(2);
    expect(finalResult.fleet.totalMissions).toBe(1);
    expect(parseFloat(String(acAfterReSign.totalHours))).toBe(102);
  });

  it('rapid sign → unsign → sign cycle produces consistent usage stats each iteration', () => {
    const results: { hours: number; missions: number }[] = [];

    for (let i = 0; i < 3; i++) {
      const ac = makeAircraft();
      const flight = makeFlight('fl-rapid-' + i, 'N123', 90);

      const snap = getSnapshotTotals(ac, 1.5);
      const signed = signFlight(flight, snap);
      const acSigned = applySignToAircraft(ac, snap);

      const unsigned = unsignFlight(signed);
      const acUnsigned = applyUnsignToAircraft(acSigned, snap);

      const reSnap = getSnapshotTotals(acUnsigned, 1.5);
      const reSigned = signFlight(unsigned, reSnap);
      const acReSigned = applySignToAircraft(acUnsigned, reSnap);

      const usage = computeAircraftUsage([reSigned], [acReSigned]);
      results.push({
        hours: usage.fleet.totalHours,
        missions: usage.fleet.totalMissions,
      });

      expect(parseFloat(String(acReSigned.totalHours))).toBeCloseTo(101.5, 1);
    }

    results.forEach((r) => {
      expect(r.hours).toBe(1.5);
      expect(r.missions).toBe(1);
    });
  });

  it('two tabs signing different flights on the same aircraft accumulate correctly', () => {
    const ac = makeAircraft();
    const flight1 = makeFlight('fl-multi1', 'N123', 120);
    const flight2 = makeFlight('fl-multi2', 'N123', 90, '2026-08-21');

    const snap1 = getSnapshotTotals(ac, 2);
    const signed1 = signFlight(flight1, snap1);
    const acAfter1 = applySignToAircraft(ac, snap1);

    const snap2 = getSnapshotTotals(acAfter1, 1.5);
    const signed2 = signFlight(flight2, snap2);
    const acAfter2 = applySignToAircraft(acAfter1, snap2);

    const result = computeAircraftUsage([signed1, signed2], [acAfter2]);
    expect(result.fleet.totalHours).toBe(3.5);
    expect(result.fleet.totalMissions).toBe(2);
    expect(result.aircraft[0].missionCount).toBe(2);
    expect(result.aircraft[0].totalHours).toBe(3.5);
    expect(result.aircraft[0].hoursByMonth['2026-08']).toBe(3.5);
  });

  it('unsigning one of two signed flights reverts only that flight hours', () => {
    const ac = makeAircraft();
    const flight1 = makeFlight('fl-partial1', 'N123', 120);
    const flight2 = makeFlight('fl-partial2', 'N123', 90, '2026-08-21');

    const snap1 = getSnapshotTotals(ac, 2);
    const signed1 = signFlight(flight1, snap1);
    const acAfter1 = applySignToAircraft(ac, snap1);

    const snap2 = getSnapshotTotals(acAfter1, 1.5);
    const signed2 = signFlight(flight2, snap2);
    const acAfter2 = applySignToAircraft(acAfter1, snap2);

    const unsigned2 = unsignFlight(signed2);
    const acReverted = applyUnsignToAircraft(acAfter2, snap2);

    const result = computeAircraftUsage([signed1, unsigned2], [acReverted]);
    expect(result.fleet.totalHours).toBe(2);
    expect(result.fleet.totalMissions).toBe(1);
    expect(result.aircraft[0].totalHours).toBe(2);
    expect(result.aircraft[0].missionCount).toBe(1);
    expect(parseFloat(String(acReverted.totalHours))).toBe(102);
  });
});

describe('dashboard and fleet page consistency', () => {
  it('computeAircraftUsage produces identical fleet totals regardless of call order', () => {
    const ac = makeAircraft();
    const flight = makeFlight('fl-order', 'N123', 180);
    const snap = getSnapshotTotals(ac, 3);
    const signed = signFlight(flight, snap);
    const acAfter = applySignToAircraft(ac, snap);

    const resultA = computeAircraftUsage([signed], [acAfter]);
    const resultB = computeAircraftUsage([signed], [acAfter]);

    expect(resultA.fleet.totalHours).toBe(resultB.fleet.totalHours);
    expect(resultA.fleet.totalMissions).toBe(resultB.fleet.totalMissions);
    expect(resultA.aircraft[0].totalHours).toBe(resultB.aircraft[0].totalHours);
    expect(resultA.aircraft[0].missionCount).toBe(resultB.aircraft[0].missionCount);
    expect(resultA.fleet.byAircraft).toEqual(resultB.fleet.byAircraft);
  });

  it('fleet utilization shares stay in sync with per-aircraft hours', () => {
    const ac1 = makeAircraft({ id: 'N123', tailNumber: 'N123', totalHours: 50, hobbs: 300, landings: 20, engine1Hours: 50, engine1Cycles: 150 });
    const ac2 = makeAircraft({ id: 'N456', tailNumber: 'N456', totalHours: 150, hobbs: 700, landings: 80, engine1Hours: 150, engine1Cycles: 400 });
    const flight1 = makeFlight('fl-u1', 'N123', 120);
    const flight2 = makeFlight('fl-u2', 'N456', 240);

    const snap1 = getSnapshotTotals(ac1, 2);
    const snap2 = getSnapshotTotals(ac2, 4);

    const signed1 = signFlight(flight1, snap1);
    const signed2 = signFlight(flight2, snap2);
    const ac1After = applySignToAircraft(ac1, snap1);
    const ac2After = applySignToAircraft(ac2, snap2);

    const result = computeAircraftUsage([signed1, signed2], [ac1After, ac2After]);
    expect(result.fleet.totalHours).toBe(6);

    const n123 = result.fleet.byAircraft.find(a => a.aircraftId === 'N123');
    const n456 = result.fleet.byAircraft.find(a => a.aircraftId === 'N456');
    expect(n123?.totalHours).toBe(2);
    expect(n456?.totalHours).toBe(4);
    expect(n123?.utilization).toBeCloseTo(0.3333, 3);
    expect(n456?.utilization).toBeCloseTo(0.6667, 3);
    expect(n123!.utilization + n456!.utilization).toBeCloseTo(1, 4);
  });

  it('aircraft stats and fleet stats agree on hours by month', () => {
    const ac = makeAircraft();
    const flightAug = makeFlight('fl-aug', 'N123', 120, '2026-08-10');
    const flightSep = makeFlight('fl-sep', 'N123', 60, '2026-09-05');

    const snap1 = getSnapshotTotals(ac, 2);
    const signedAug = signFlight(flightAug, snap1);
    const acAfterAug = applySignToAircraft(ac, snap1);

    const snap2 = getSnapshotTotals(acAfterAug, 1);
    const signedSep = signFlight(flightSep, snap2);
    const acAfterSep = applySignToAircraft(acAfterAug, snap2);

    const result = computeAircraftUsage([signedAug, signedSep], [acAfterSep]);
    expect(result.aircraft[0].hoursByMonth['2026-08']).toBe(2);
    expect(result.aircraft[0].hoursByMonth['2026-09']).toBe(1);
    expect(result.fleet.totalHours).toBe(3);
    expect(result.aircraft[0].totalHours).toBe(3);
  });
});
