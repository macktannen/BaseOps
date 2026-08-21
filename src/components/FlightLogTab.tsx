import { useState, useEffect } from 'react';
import { Lock, Unlock, PenTool, Trash2, ChevronDown, ChevronUp, History } from 'lucide-react';
import { authService } from '../services/authService';
import type { SessionUser } from '../services/authService';
import useIsMobile from '../hooks/useIsMobile';
import MobileDropdownMenu from './MobileDropdownMenu';
import { useData } from '../contexts/DataProvider';
import type { FlightLog as DomainFlightLog, FlightLeg, Aircraft, Pilot } from '../types';

interface LegActual {
  flightHrs?: string | number;
  blockHrs?: string | number;
  hobbs?: string | number;
  engineCycles?: string | number;
  engine1Cycles?: string | number;
  engine2Cycles?: string | number;
  engine1Hrs?: string | number;
  engine2Hrs?: string | number;
  landings?: string | number;
  landingType?: string;
  fuelPurchased?: string | number;
}

export interface FlightReading {
  flightHrs?: number | string;
  landings?: number | string;
  hobbs?: number | string;
  engine1Hours?: number | string;
  engine1Cycles?: number | string;
  engine2Hours?: number | string;
  engine2Cycles?: number | string;
}

export interface FlightLogAircraftTotals {
  flightBefore?: number | string;
  hobbsBefore?: number | string;
  landingsBefore?: number | string;
  engine1Before?: number | string;
  engine2Before?: number | string;
  cycles1Before?: number | string;
  cycles2Before?: number | string;
  changeFlight?: number;
  changeHobbs?: number;
  changeLandings?: number;
  changeEngine1Hours?: number;
  changeEngine2Hours?: number;
  changeEngine1Cycles?: number;
  changeEngine2Cycles?: number;
  dualEngine?: boolean;
  flightReadings?: FlightReading[];
}

interface FlightLog extends DomainFlightLog {
  legsActuals?: LegActual[];
  aircraftTotals?: FlightLogAircraftTotals;
}

interface FlightLogTabProps {
  legs: FlightLeg[];
  flightLog?: unknown;
  setFlightLog?: (log: FlightLog) => void;
  persistFlightLog?: (log: FlightLog) => void;
  onSign?: (log: FlightLog, totals: FlightLogAircraftTotals) => void;
  onClearSignature?: () => void;
  onToggleLock?: (locked: boolean) => void;
  aircraftId?: string;
  aircraftList?: Aircraft[];
  pilotsList?: Pilot[];
  authoritativeBaseline?: FlightLogAircraftTotals | null;
  refreshAircraft?: () => Promise<Aircraft[] | null>;
}

const FlightLogTab = ({ legs, flightLog, setFlightLog, persistFlightLog, onSign, onClearSignature, onToggleLock, aircraftId, aircraftList, pilotsList, authoritativeBaseline, refreshAircraft }: FlightLogTabProps) => {
  const isMobile = useIsMobile();
  const [auditExpanded, setAuditExpanded] = useState(false);
  const { userAircraft } = useData();

  const defaultLegsActuals = legs.map(() => ({
    flightHrs: '', blockHrs: '', hobbs: '', engineCycles: '', engine1Cycles: '', engine2Cycles: '', engine1Hrs: '', engine2Hrs: '', landings: '', landingType: '', fuelPurchased: ''
  }));

  const log = flightLog && typeof flightLog === 'object' ? (flightLog as FlightLog) : {};
  const legsActuals = (log.legsActuals && log.legsActuals.length > 0) ? log.legsActuals : defaultLegsActuals;

  const currentUser: SessionUser = authService.getCurrentUser() || { id: 'admin', uid: 'admin', name: 'Admin', email: '', roles: ['admin'], role: 'admin', viewOwnFlightsOnly: false };
  const isAdmin = currentUser?.role === 'admin';
  const firstLegPilots = legs[0]?.pilots && legs[0]?.pilots.length > 0
    ? legs[0].pilots
    : (legs[0]?.pilotId ? [legs[0].pilotId] : []);
  
  const assignedPilotNames = firstLegPilots.map((pId: string) => {
    const p = pilotsList?.find(item => item.id === pId || item.name === pId);
    return p ? p.name : pId;
  });

  const canSign = isAdmin || assignedPilotNames.some(name => name === currentUser?.name || name === currentUser?.id);
  const isEditable = !log.isLocked;
  const [aircraft, setAircraft] = useState<Aircraft | null>(null);

  // Sync directly to parent and persistent storage
  const updateLog = (updater: FlightLog | ((current: FlightLog) => FlightLog)) => {
    const current: FlightLog = {
      legsActuals,
      signature: log.signature || null,
      isLocked: log.isLocked || false,
      aircraftTotals: log.aircraftTotals || undefined,
      auditLog: log.auditLog || [],
      ...log
    };
    const next = typeof updater === 'function' ? updater(current) : updater;
    if (setFlightLog) setFlightLog(next);
    if (persistFlightLog) persistFlightLog(next);
  };

  // Load and listen to aircraft baseline data in real time (WITHOUT modifying log state)
  useEffect(() => {
    if (aircraftId) {
      try {
        const storedAircraft = userAircraft || [];
        const ac = storedAircraft.find(a => a.id === aircraftId) || aircraftList?.find(a => a.id === aircraftId);
        if (ac) setAircraft(ac);
      } catch(e) { console.error(e); }
    }
  }, [aircraftId, aircraftList, userAircraft]);

  useEffect(() => {
    if (!refreshAircraft || !aircraftId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const fresh = await refreshAircraft();
        if (cancelled || !Array.isArray(fresh)) return;
        const ac = fresh.find(a => a.id === aircraftId);
        if (ac) setAircraft(ac);
      } catch (err) { console.error(err); }
    };
    load();
    return () => { cancelled = true; };
  }, [aircraftId, refreshAircraft]);

  const isTwin = aircraft?.dualEngine || log.aircraftTotals?.dualEngine || false;

  const handleUpdateLeg = (index: number, field: keyof LegActual, value: string) => {
    const newLegs = [...legsActuals];
    if (!newLegs[index]) {
       newLegs[index] = { flightHrs: '', blockHrs: '', hobbs: '', engineCycles: '', engine1Cycles: '', engine2Cycles: '', engine1Hrs: '', engine2Hrs: '', landings: '', landingType: '', fuelPurchased: '' };
    }
    newLegs[index][field] = value;
    updateLog(prev => ({ ...prev, legsActuals: newLegs }));
  };

  const calculateTotals = () => {
    let flight = 0, block = 0, hobbs = 0, pax = 0, lndgs = 0;
    let cycles1 = 0, cycles2 = 0;
    let eng1HrsTotal = 0, eng2HrsTotal = 0;
    let fuelPurchasedTotal = 0;

    legsActuals.forEach((l, idx) => {
      const fHrs = parseFloat(String(l.flightHrs || 0));
      flight += fHrs;
      block += parseFloat(String(l.blockHrs || 0));
      hobbs += parseFloat(String(l.hobbs || 0));
      lndgs += parseInt(String(l.landings || 0), 10);
      fuelPurchasedTotal += parseFloat(String(l.fuelPurchased || 0));

      // Auto-calculate PAX from passengers input on the flight plan page
      const legObj = legs[idx];
      const legPaxCount = Array.isArray(legObj?.passengers)
        ? legObj.passengers.length
        : (parseInt(String(legObj?.passengers || legObj?.pax || 0), 10) || 0);
      pax += legPaxCount;

      // Engine 1
      const c1 = parseInt(String(l.engine1Cycles !== undefined && l.engine1Cycles !== '' ? l.engine1Cycles : (l.engineCycles || 0)), 10);
      cycles1 += c1;
      const e1h = l.engine1Hrs !== undefined && l.engine1Hrs !== '' ? parseFloat(String(l.engine1Hrs)) : fHrs;
      eng1HrsTotal += e1h;

      // Engine 2
      const c2 = parseInt(String(l.engine2Cycles || 0), 10);
      cycles2 += c2;
      const e2h = l.engine2Hrs !== undefined && l.engine2Hrs !== '' ? parseFloat(String(l.engine2Hrs)) : fHrs;
      eng2HrsTotal += e2h;
    });

    return {
      flight: flight.toFixed(1),
      block: block.toFixed(1),
      hobbs: hobbs.toFixed(1),
      pax,
      lndgs,
      cycles1,
      cycles2,
      fuelPurchasedTotal: Math.round(fuelPurchasedTotal * 10) / 10,
      eng1HrsTotal: eng1HrsTotal.toFixed(1),
      eng2HrsTotal: eng2HrsTotal.toFixed(1)
    };
  };

  const totals = calculateTotals();

  // Auto-calculated changes based on legs
  const changeHobbs = parseFloat(totals.hobbs) || 0;
  const changeFlight = parseFloat(totals.flight) || 0;
  const changeLandings = totals.lndgs || 0;
  const changeEngine1Cycles = totals.cycles1 || 0;
  const changeEngine2Cycles = totals.cycles2 || 0;
  const changeEngine1Hours = parseFloat(totals.eng1HrsTotal) || 0;
  const changeEngine2Hours = parseFloat(totals.eng2HrsTotal) || 0;

  const isCurrentlySigned = !!(log.signature);

  const toNum = (val: unknown): number => {
    const parsed = parseFloat(String(val ?? ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const toInt = (val: unknown): number => {
    const parsed = parseInt(String(val ?? ''), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const resolveBaselines = (ac: Aircraft | null) => {
    const snapshot = log.aircraftTotals;
    const authored = authoritativeBaseline;

    const resolveHours = (snapshotVal: number | string | undefined, authoredVal: number | string | undefined, currentVal: unknown, change: number): number => {
      if (snapshotVal !== undefined) return toNum(snapshotVal);
      const source = authoredVal !== undefined ? toNum(authoredVal) : toNum(currentVal);
      return isCurrentlySigned ? Math.max(0, source - change) : source;
    };

    const resolveCount = (snapshotVal: number | string | undefined, authoredVal: number | string | undefined, currentVal: unknown, change: number): number => {
      if (snapshotVal !== undefined) return toInt(snapshotVal);
      const source = authoredVal !== undefined ? toInt(authoredVal) : toInt(currentVal);
      return isCurrentlySigned ? Math.max(0, source - change) : source;
    };

    return {
      flightBefore: resolveHours(snapshot?.flightBefore, authored?.flightBefore, ac?.totalHours || 0, changeFlight),
      landingsBefore: resolveCount(snapshot?.landingsBefore, authored?.landingsBefore, ac?.landings || 0, changeLandings),
      hobbsBefore: resolveHours(snapshot?.hobbsBefore, authored?.hobbsBefore, ac?.hobbs || 0, changeHobbs),
      engine1Before: resolveHours(snapshot?.engine1Before, authored?.engine1Before, ac?.engine1Hours || ac?.engineHours || ac?.totalHours || 0, changeEngine1Hours),
      cycles1Before: resolveCount(snapshot?.cycles1Before, authored?.cycles1Before, ac?.engine1Cycles || ac?.engineCycles || 0, changeEngine1Cycles),
      engine2Before: resolveHours(snapshot?.engine2Before, authored?.engine2Before, ac?.engine2Hours || 0, changeEngine2Hours),
      cycles2Before: resolveCount(snapshot?.cycles2Before, authored?.cycles2Before, ac?.engine2Cycles || 0, changeEngine2Cycles)
    };
  };

  const baselines = resolveBaselines(aircraft);
  const { flightBefore, landingsBefore, hobbsBefore, engine1Before, cycles1Before, engine2Before, cycles2Before } = baselines;


  const handleSign = async () => {
    let baselineSource = aircraft;
    if (refreshAircraft && aircraftId) {
      try {
        const fresh = await refreshAircraft();
        const ac = Array.isArray(fresh) ? fresh.find(a => a.id === aircraftId) : undefined;
        if (ac) {
          setAircraft(ac);
          baselineSource = ac;
        }
      } catch (err) { console.error(err); }
    }

    const freshBaselines = resolveBaselines(baselineSource);
    const snapshottedTotals: FlightLogAircraftTotals = {
      flightBefore: freshBaselines.flightBefore,
      hobbsBefore: freshBaselines.hobbsBefore,
      landingsBefore: freshBaselines.landingsBefore,
      engine1Before: freshBaselines.engine1Before,
      engine2Before: freshBaselines.engine2Before,
      cycles1Before: freshBaselines.cycles1Before,
      cycles2Before: freshBaselines.cycles2Before,
      changeFlight,
      changeHobbs,
      changeLandings,
      changeEngine1Hours,
      changeEngine2Hours,
      changeEngine1Cycles,
      changeEngine2Cycles,
      dualEngine: !!isTwin
    };

    if (onSign) {
      onSign(log, snapshottedTotals);
    }
  };

  const handleClearSignatureClick = async () => {
    if (refreshAircraft) {
      try { await refreshAircraft(); } catch (err) { console.error(err); }
    }
    if (onClearSignature) onClearSignature();
  };

  // handleClearSignature is now handled entirely by the parent (EventModal)
  // via the onClearSignature prop — no local logic needed
  
  const handleToggleLock = () => {
    const hoursSinceSign = log.signature?.isoTimestamp ? (Date.now() - new Date(log.signature.isoTimestamp).getTime()) / (1000 * 60 * 60) : 0;
    const canToggle = isAdmin || (canSign && hoursSinceSign <= 24);
    if (!canToggle) return;
    
    const newLocked = !log.isLocked;
    const action = newLocked ? 'locked' : 'unlocked';

    const nextLog = {
      ...log,
      isLocked: newLocked,
      auditLog: [...(log.auditLog || []), `Log ${action} by Admin (${currentUser.name}) on ${new Date().toLocaleString()}`]
    };
    setFlightLog(nextLog);
    if (persistFlightLog) persistFlightLog(nextLog);

    if (onToggleLock) {
      onToggleLock(newLocked);
    }
  };

  const handleDeleteAuditEntry = (originalIndex: number) => {
    const updatedAudit = (log.auditLog || []).filter((_, idx) => idx !== originalIndex);
    const nextLog = {
      ...log,
      auditLog: updatedAudit
    };
    setFlightLog(nextLog);
    if (persistFlightLog) {
      persistFlightLog(nextLog);
    }
  };

  const formatLoc = (loc: unknown) => {
    if (!loc || typeof loc !== 'object') return '';
    const typed = loc as { type?: string; id?: string };
    if (typed.type === 'airport') return typed.id;
    return typed.id || 'Custom';
  };


  return (
    <div style={{ display: 'block', minHeight: '100%', backgroundColor: '#f4f5f7', padding: '10px' }}>
      
      {/* 1. LEGS ACTUALS */}
      <div className="card" style={{ padding: '0', overflowX: 'auto', marginBottom: '10px', flexShrink: 0 }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
          <thead>
            <tr>
              <th style={{ borderRight: '1px solid #e2e8f0', padding: '2px 4px' }}></th>
              <th colSpan={3} style={{ textAlign: 'center', borderRight: '1px solid #e2e8f0', padding: '2px 4px', backgroundColor: '#e2e8f0' }}>Utilization</th>
              <th colSpan={isTwin ? 4 : 3} style={{ textAlign: 'center', borderRight: '1px solid #e2e8f0', padding: '2px 4px', backgroundColor: '#edf2f7' }}>
                {isTwin ? 'Twin Engine Meters & Cycles' : 'Engine Meters & Landings'}
              </th>
              <th colSpan={3} style={{ textAlign: 'center', padding: '2px 4px', backgroundColor: '#e2e8f0' }}>Flight Info</th>
            </tr>
            <tr style={{ backgroundColor: '#f7fafc' }}>
              <th style={{ minWidth: '90px', padding: '2px 4px', borderRight: '1px solid #e2e8f0' }}>MSN #</th>
              <th style={{ padding: '2px 4px' }}>Flight (Hrs)</th>
              <th style={{ padding: '2px 4px' }}>Block (Hrs)</th>
              <th style={{ borderRight: '1px solid #e2e8f0', padding: '2px 4px' }}>Hobbs</th>

              {isTwin ? (
                <>
                  <th style={{ padding: '2px 4px' }}>Eng 1 (Hrs)</th>
                  <th style={{ padding: '2px 4px' }}>Eng 2 (Hrs)</th>
                  <th style={{ padding: '2px 4px' }}>Eng 1 Cyc</th>
                  <th style={{ borderRight: '1px solid #e2e8f0', padding: '2px 4px' }}>Eng 2 Cyc</th>
                </>
              ) : (
                 <>
                   <th style={{ padding: '2px 4px' }}>Eng (Hrs)</th>
                   <th style={{ borderRight: '1px solid #e2e8f0', padding: '2px 4px' }}>Eng Cycles</th>
                 </>
               )}

              <th style={{ padding: '2px 4px' }}>Landings (#)</th>
              <th style={{ padding: '2px 4px' }}>Landing Type</th>
              <th style={{ padding: '2px 4px', textAlign: 'center', minWidth: '75px' }}>Fuel (Gal)</th>
            </tr>
          </thead>
          <tbody>
            {legs.map((leg, index) => {
               const act = legsActuals[index] || {};
               return (
                 <tr key={index}>
                   <td style={{ fontWeight: 'bold', padding: '2px 4px', borderRight: '1px solid #e2e8f0' }}>{formatLoc(leg.departure)} &rarr; {formatLoc(leg.destination)}</td>
                    <td style={{ padding: '2px 4px' }}><input type="number" step="0.1" value={String(act.flightHrs || '')} disabled={!isEditable} onChange={e => handleUpdateLeg(index, 'flightHrs', e.target.value)} style={{ width: '45px', padding: '1px 2px', fontSize: '0.7rem' }} /></td>
                    <td style={{ padding: '2px 4px' }}><input type="number" step="0.1" value={String(act.blockHrs || '')} disabled={!isEditable} onChange={e => handleUpdateLeg(index, 'blockHrs', e.target.value)} style={{ width: '45px', padding: '1px 2px', fontSize: '0.7rem' }} /></td>
                    <td style={{ borderRight: '1px solid #e2e8f0', padding: '2px 4px' }}><input type="number" step="0.1" value={String(act.hobbs || '')} disabled={!isEditable} onChange={e => handleUpdateLeg(index, 'hobbs', e.target.value)} style={{ width: '45px', padding: '1px 2px', fontSize: '0.7rem' }} /></td>

                   {isTwin ? (
                     <>
                       <td style={{ padding: '2px 4px' }}>
                          <input type="number" step="0.1" value={act.engine1Hrs !== undefined ? String(act.engine1Hrs) : ''} placeholder={String(act.flightHrs || '0.0')} disabled={!isEditable} onChange={e => handleUpdateLeg(index, 'engine1Hrs', e.target.value)} style={{ width: '45px', padding: '1px 2px', fontSize: '0.7rem' }} />
                       </td>
                       <td style={{ padding: '2px 4px' }}>
                          <input type="number" step="0.1" value={act.engine2Hrs !== undefined ? String(act.engine2Hrs) : ''} placeholder={String(act.flightHrs || '0.0')} disabled={!isEditable} onChange={e => handleUpdateLeg(index, 'engine2Hrs', e.target.value)} style={{ width: '45px', padding: '1px 2px', fontSize: '0.7rem' }} />
                       </td>
                       <td style={{ padding: '2px 4px' }}>
                          <input type="number" value={act.engine1Cycles !== undefined ? String(act.engine1Cycles) : String(act.engineCycles || '')} disabled={!isEditable} onChange={e => handleUpdateLeg(index, 'engine1Cycles', e.target.value)} style={{ width: '40px', padding: '1px 2px', fontSize: '0.7rem' }} />
                       </td>
                       <td style={{ borderRight: '1px solid #e2e8f0', padding: '2px 4px' }}>
                          <input type="number" value={String(act.engine2Cycles || '')} disabled={!isEditable} onChange={e => handleUpdateLeg(index, 'engine2Cycles', e.target.value)} style={{ width: '40px', padding: '1px 2px', fontSize: '0.7rem' }} />
                       </td>
                     </>
                    ) : (
                      <>
                        <td style={{ padding: '2px 4px' }}>
                          <input type="number" step="0.1" value={act.engine1Hrs !== undefined ? String(act.engine1Hrs) : ''} placeholder={String(act.flightHrs || '0.0')} disabled={!isEditable} onChange={e => handleUpdateLeg(index, 'engine1Hrs', e.target.value)} style={{ width: '45px', padding: '1px 2px', fontSize: '0.7rem' }} />
                        </td>
                        <td style={{ borderRight: '1px solid #e2e8f0', padding: '2px 4px' }}>
                           <input type="number" value={act.engineCycles !== undefined ? String(act.engineCycles) : String(act.engine1Cycles || '')} disabled={!isEditable} onChange={e => handleUpdateLeg(index, 'engineCycles', e.target.value)} style={{ width: '50px', padding: '1px 2px', fontSize: '0.7rem' }} />
                        </td>
                      </>
                    )}

                    <td style={{ padding: '2px 4px' }}><input type="number" value={String(act.landings || '')} disabled={!isEditable} onChange={e => handleUpdateLeg(index, 'landings', e.target.value)} style={{ width: '45px', padding: '1px 2px', fontSize: '0.7rem' }} /></td>
                    <td style={{ padding: '2px 4px' }}>
                       {isMobile ? (
                         <MobileDropdownMenu
                           value={act.landingType}
                           disabled={!isEditable}
                            onChange={val => handleUpdateLeg(index, 'landingType', String(val))}
                           options={[
                             { value: '', label: 'Select...' },
                             { value: 'Day', label: 'Day' },
                             { value: 'Night', label: 'Night' },
                             { value: 'NVG', label: 'NVG' },
                           ]}
                           placeholder="Select..."
                           style={{ minWidth: '110px', fontSize: '0.7rem' }}
                         />
                       ) : (
                         <select value={act.landingType} disabled={!isEditable} onChange={e => handleUpdateLeg(index, 'landingType', e.target.value)} style={{ minWidth: '110px', fontSize: '0.7rem' }}>
                            <option value="">Select...</option>
                            <option value="Day">Day</option>
                            <option value="Night">Night</option>
                            <option value="NVG">NVG</option>
                         </select>
                       )}
                    </td>
                   <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={act.fuelPurchased !== undefined && act.fuelPurchased !== null ? String(act.fuelPurchased) : ''}
                        disabled={!isEditable}
                        onChange={e => handleUpdateLeg(index, 'fuelPurchased', e.target.value)}
                        style={{ width: '55px', padding: '1px 2px', fontSize: '0.7rem', textAlign: 'right' }}
                        title="Fuel purchased for this leg in gallons"
                      />
                   </td>
                 </tr>
               );
            })}
            <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 'bold' }}>
              <td style={{ padding: '2px 4px', borderRight: '1px solid #e2e8f0' }}>Totals</td>
              <td style={{ padding: '2px 4px' }}>{totals.flight}</td>
              <td style={{ padding: '2px 4px' }}>{totals.block}</td>
              <td style={{ borderRight: '1px solid #e2e8f0', padding: '2px 4px' }}>{totals.hobbs}</td>
              {isTwin ? (
                 <>
                   <td style={{ padding: '2px 4px' }}>{totals.eng1HrsTotal}</td>
                   <td style={{ padding: '2px 4px' }}>{totals.eng2HrsTotal}</td>
                   <td style={{ padding: '2px 4px' }}>{totals.cycles1}</td>
                   <td style={{ borderRight: '1px solid #e2e8f0', padding: '2px 4px' }}>{totals.cycles2}</td>
                 </>
               ) : (
                 <>
                   <td style={{ padding: '2px 4px' }}>{totals.eng1HrsTotal}</td>
                   <td style={{ borderRight: '1px solid #e2e8f0', padding: '2px 4px' }}>{totals.cycles1}</td>
                 </>
               )}
              <td style={{ padding: '2px 4px' }}>{totals.lndgs}</td>
              <td style={{ padding: '2px 4px' }}></td>
              <td style={{ padding: '2px 4px', textAlign: 'center', fontSize: '0.7rem' }}>
                {totals.fuelPurchasedTotal > 0 ? `${totals.fuelPurchasedTotal}` : '-'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 2. SIGNATURE */}
      <div className="card" style={{ marginBottom: '10px', display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'center', padding: '6px 10px', flexShrink: 0 }}>
        <h4 style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Signature</h4>
        <div style={{ display: 'flex', alignItems: 'center' }}>
           {log.signature ? (
             <div style={{ padding: '2px 8px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: '#f0fff4', color: '#276749', display: 'flex', alignItems: 'center', gap: '10px' }}>
               <div style={{ fontFamily: 'cursive', fontSize: '1rem', borderBottom: '1px solid #276749' }}>
                 {log.signature.name}
               </div>
               <div style={{ fontSize: '0.65rem', display: 'flex', flexDirection: 'column' }}>
                  <span>By: {log.signature.name}</span>
                  <span>{log.signature.timestamp}</span>
               </div>
             </div>
           ) : (
             <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4px 8px', border: '1px dashed var(--border-color)', borderRadius: '4px' }}>
                <button type="button" className="btn btn-primary" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={handleSign} disabled={!canSign}>
                  <PenTool size={12} style={{ marginRight: '4px' }} /> 
                  {canSign ? 'Sign Logbook' : 'Only assigned pilot or admin can sign'}
                </button>
             </div>
           )}
        </div>
      </div>

      {/* 3. AIRCRAFT TOTALS (Mirroring Aircraft Page 7 Boxes) */}
      <div className="card" style={{ padding: '0', overflowX: 'auto', marginBottom: '10px', flexShrink: 0 }}>
        <div style={{ padding: '4px 10px', backgroundColor: '#edf2f7', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>Aircraft Logbook Totals {aircraftId && `(${aircraftId})`}</span>
          {isTwin && <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Twin Engine Aircraft</span>}
        </div>
        <table className="data-table" style={{ width: '100%', fontSize: '0.75rem' }}>
          <thead>
            <tr>
              <th style={{ width: '200px', padding: '2px 4px' }}>Meter</th>
              <th style={{ padding: '2px 4px' }}>Before</th>
              <th style={{ padding: '2px 4px' }}>After</th>
              <th style={{ width: '100px', textAlign: 'right', padding: '2px 4px' }}>Change</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 'bold', padding: '2px 4px' }}>Aircraft Hours</td>
              <td style={{ padding: '2px 4px' }}>{flightBefore.toFixed(1)}</td>
              <td style={{ padding: '2px 4px' }}>{(flightBefore + changeFlight).toFixed(1)}</td>
              <td style={{ textAlign: 'right', color: changeFlight > 0 ? 'green' : 'inherit', padding: '2px 4px' }}>+{changeFlight.toFixed(1)}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', padding: '2px 4px' }}>Aircraft Landings</td>
              <td style={{ padding: '2px 4px' }}>{landingsBefore}</td>
              <td style={{ padding: '2px 4px' }}>{landingsBefore + changeLandings}</td>
              <td style={{ textAlign: 'right', color: changeLandings > 0 ? 'green' : 'inherit', padding: '2px 4px' }}>+{changeLandings}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', padding: '2px 4px' }}>{isTwin ? 'Engine 1 Hours' : 'Engine Hours'}</td>
              <td style={{ padding: '2px 4px' }}>{engine1Before.toFixed(1)}</td>
              <td style={{ padding: '2px 4px' }}>{(engine1Before + changeEngine1Hours).toFixed(1)}</td>
              <td style={{ textAlign: 'right', color: changeEngine1Hours > 0 ? 'green' : 'inherit', padding: '2px 4px' }}>+{changeEngine1Hours.toFixed(1)}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', padding: '2px 4px' }}>{isTwin ? 'Engine 1 Cycles' : 'Engine Cycles'}</td>
              <td style={{ padding: '2px 4px' }}>{cycles1Before}</td>
              <td style={{ padding: '2px 4px' }}>{cycles1Before + changeEngine1Cycles}</td>
              <td style={{ textAlign: 'right', color: changeEngine1Cycles > 0 ? 'green' : 'inherit', padding: '2px 4px' }}>+{changeEngine1Cycles}</td>
            </tr>
            {isTwin && (
              <>
                <tr>
                  <td style={{ fontWeight: 'bold', padding: '2px 4px' }}>Engine 2 Hours</td>
                  <td style={{ padding: '2px 4px' }}>{engine2Before.toFixed(1)}</td>
                  <td style={{ padding: '2px 4px' }}>{(engine2Before + changeEngine2Hours).toFixed(1)}</td>
                  <td style={{ textAlign: 'right', color: changeEngine2Hours > 0 ? 'green' : 'inherit', padding: '2px 4px' }}>+{changeEngine2Hours.toFixed(1)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold', padding: '2px 4px' }}>Engine 2 Cycles</td>
                  <td style={{ padding: '2px 4px' }}>{cycles2Before}</td>
                  <td style={{ padding: '2px 4px' }}>{cycles2Before + changeEngine2Cycles}</td>
                  <td style={{ textAlign: 'right', color: changeEngine2Cycles > 0 ? 'green' : 'inherit', padding: '2px 4px' }}>+{changeEngine2Cycles}</td>
                </tr>
              </>
            )}
            <tr>
              <td style={{ fontWeight: 'bold', padding: '2px 4px' }}>Hobbs Meter</td>
              <td style={{ padding: '2px 4px' }}>{hobbsBefore.toFixed(1)}</td>
              <td style={{ padding: '2px 4px' }}>{(hobbsBefore + changeHobbs).toFixed(1)}</td>
              <td style={{ textAlign: 'right', color: changeHobbs > 0 ? 'green' : 'inherit', padding: '2px 4px' }}>+{changeHobbs.toFixed(1)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. LOG SUMMARY */}
      <div className="card" style={{ padding: '0', overflowX: 'auto', marginBottom: '10px', flexShrink: 0 }}>
        <div style={{ padding: '4px 10px', backgroundColor: '#edf2f7', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', fontSize: '0.75rem' }}>
          Aircraft Log Summary
        </div>
        <table className="data-table" style={{ width: '100%', fontSize: '0.7rem' }}>
          <thead>
            <tr>
              <th style={{ padding: '2px 4px' }}>MSN #</th>
              <th style={{ padding: '2px 4px' }}>Date (UTC)</th>
              <th style={{ padding: '2px 4px' }}>Flt Hrs</th>
              <th style={{ padding: '2px 4px' }}>Blk Hrs</th>
              <th style={{ padding: '2px 4px' }}>Hobbs</th>
              <th style={{ padding: '2px 4px' }}>PIC</th>
              <th style={{ padding: '2px 4px' }}>SIC</th>
              <th style={{ padding: '2px 4px' }}>PAX</th>
            </tr>
          </thead>
          <tbody>
             {legs.map((leg, index) => {
                const act = legsActuals[index] || {};
                const legPilots = leg.pilots && leg.pilots.length > 0 ? leg.pilots : (leg.pilotId ? [leg.pilotId] : []);
                const roles = leg.pilotRoles || {};

                let picId = Object.keys(roles).find(id => roles[id] === 'PIC');
                if (!picId && legPilots.length > 0) picId = legPilots[0];

                let sicIds = Object.keys(roles).filter(id => roles[id] === 'SIC');
                if (sicIds.length === 0 && legPilots.length > 1) {
                  sicIds = legPilots.filter(id => id !== picId);
                }

                const getPilotDisplayName = (pId: string) => {
                  if (!pId) return '';
                  const p = pilotsList?.find(item => item.id === pId || item.name === pId);
                  return p ? p.name : pId;
                };

                const picName = picId ? getPilotDisplayName(picId) : 'Unknown';
                const sicName = sicIds.map(getPilotDisplayName).join(', ');
                const legPaxCount = Array.isArray(leg.passengers)
                  ? leg.passengers.length
                  : (parseInt(String(leg.passengers || leg.pax || 0), 10) || 0);

                return (
                  <tr key={index}>
                    <td style={{ padding: '2px 4px' }}>{formatLoc(leg.departure)} &rarr; {formatLoc(leg.destination)}</td>
                    <td style={{ padding: '2px 4px' }}>{leg.date}{leg.arrDate && leg.arrDate !== leg.date ? ` \u2192 ${leg.arrDate}` : ''}</td>
                    <td style={{ padding: '2px 4px' }}>{act.flightHrs || '0.0'}</td>
                    <td style={{ padding: '2px 4px' }}>{act.blockHrs || '0.0'}</td>
                    <td style={{ padding: '2px 4px' }}>{act.hobbs || '0.0'}</td>
                    <td style={{ padding: '2px 4px' }}>{picName}</td>
                    <td style={{ padding: '2px 4px' }}>{sicName}</td>
                    <td style={{ padding: '2px 4px', fontWeight: 'bold' }}>{legPaxCount}</td>
                  </tr>
                );
              })}
             <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 'bold' }}>
               <td style={{ padding: '2px 4px' }}>Totals</td>
               <td style={{ padding: '2px 4px' }}></td>
               <td style={{ padding: '2px 4px' }}>{totals.flight}</td>
               <td style={{ padding: '2px 4px' }}>{totals.block}</td>
               <td style={{ padding: '2px 4px' }}>{totals.hobbs}</td>
               <td style={{ padding: '2px 4px' }}></td>
               <td style={{ padding: '2px 4px' }}></td>
               <td style={{ padding: '2px 4px' }}>{totals.pax}</td>
             </tr>
          </tbody>
        </table>
      </div>
 
      {/* 4. AUDIT LOG */}
      {log.auditLog && log.auditLog.length > 0 && (() => {
        const indexedAuditLog = log.auditLog.map((text, originalIndex) => ({ text, originalIndex }));
        const reversedAuditLog = [...indexedAuditLog].reverse();
        const entriesToDisplay = (isAdmin && auditExpanded) ? reversedAuditLog : [reversedAuditLog[0]];

        return (
          <div style={{ padding: '10px 12px', fontSize: '0.75rem', color: '#742a2a', backgroundColor: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '4px', marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: '#c53030' }}>
                <History size={14} />
                <span>Flight Log Audit Trail {isAdmin && `(${log.auditLog.length})`}</span>
              </div>
              {isAdmin && log.auditLog.length > 1 && (
                <button
                  type="button"
                  onClick={() => setAuditExpanded(prev => !prev)}
                  style={{
                    background: 'none',
                    border: '1px solid #feb2b2',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '0.7rem',
                    color: '#c53030',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  {auditExpanded ? <><ChevronUp size={12} /> Collapse</> : <><ChevronDown size={12} /> Expand All ({log.auditLog.length})</>}
                </button>
              )}
            </div>
            <ul style={{ margin: '4px 0 0 0', padding: 0, listStyle: 'none', maxHeight: auditExpanded ? '200px' : 'none', overflowY: auditExpanded ? 'auto' : 'visible' }}>
              {entriesToDisplay.map((item) => (
                <li 
                  key={item.originalIndex} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    justifyContent: 'space-between', 
                    gap: '8px', 
                    padding: '3px 0', 
                    borderBottom: '1px dashed rgba(254, 178, 178, 0.4)',
                    fontSize: '0.75rem',
                    lineHeight: '1.3'
                  }}
                >
                  <span style={{ flex: 1 }}>• {item.text}</span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAuditEntry(item.originalIndex)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#e53e3e',
                        cursor: 'pointer',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: 0.75
                      }}
                      title="Delete this audit entry (Admin only)"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {isAdmin && !auditExpanded && log.auditLog.length > 1 && (
              <div 
                onClick={() => setAuditExpanded(true)}
                style={{ fontSize: '0.7rem', color: '#c53030', marginTop: '4px', cursor: 'pointer', fontStyle: 'italic', textDecoration: 'underline' }}
              >
                + {log.auditLog.length - 1} older audit record{log.auditLog.length - 1 > 1 ? 's' : ''} (click to expand)
              </div>
            )}
          </div>
        );
      })()}

      {/* 5. ACTION BUTTONS */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" className="btn" style={{ backgroundColor: '#e53e3e', color: 'white', fontWeight: 'bold', padding: '4px 8px', fontSize: '0.7rem' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClearSignatureClick(); }} disabled={!log.signature || (!isAdmin && !canSign)}>
           <Trash2 size={12} style={{ marginRight: '4px' }} /> CLEAR SIGNATURE
        </button>
        {log.signature && (() => {
           const hoursSinceSign = log.signature.isoTimestamp ? (Date.now() - new Date(log.signature.isoTimestamp).getTime()) / (1000 * 60 * 60) : 0;
           const canToggle = isAdmin || (canSign && hoursSinceSign <= 24);
           
           return (
             <button 
               type="button" 
               className="btn btn-primary" 
               onClick={handleToggleLock}
               disabled={!canToggle}
               title={!canToggle && !isAdmin ? "Only admins can unlock after 24 hours" : ""}
               style={{ 
                  flex: 'none', 
                  backgroundColor: log.isLocked ? '#e53e3e' : '#48bb78', 
                  fontWeight: 'bold', padding: '4px 8px', fontSize: '0.7rem',
                  opacity: canToggle ? 1 : 0.5, cursor: canToggle ? 'pointer' : 'not-allowed'
               }}>
                {log.isLocked ? <Lock size={12} style={{ marginRight: '4px' }} /> : <Unlock size={12} style={{ marginRight: '4px' }} />}
                {log.isLocked ? 'LOCKED' : 'UNLOCKED'}
             </button>
           );
        })()}
      </div>

    </div>
  );
};

export default FlightLogTab;
