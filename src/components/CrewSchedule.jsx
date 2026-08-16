import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Filter, Settings, Settings2, Helicopter, X, GripVertical, Moon } from 'lucide-react';
import { startOfWeek, addDays, format, subWeeks, addWeeks } from 'date-fns';
import airportsData from '../data/airports.json';
import { mockCustomZones } from '../data';
import { getColorForKey, getAccountColor, TAG_COLORS } from '../services/gridColors';
import EventModal from './EventModal';
import useIsMobile from '../hooks/useIsMobile';
import MobileDropdownMenu from './MobileDropdownMenu';

const LEGEND = {
  'Note': '#f59e0b', 
  'Off Duty': '#ef4444', 
  'On Duty': '#22c55e', 
  'Training': '#eab308', 
  'Vacation': '#3b82f6', 
  'Overnight': '#6b7280'
};

const CustomStatusDropdown = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', backgroundColor: 'white' }}
      >
        {value && value !== 'Clear' ? (
          <><div style={{ width: 14, height: 14, backgroundColor: LEGEND[value], borderRadius: '2px' }}></div> {value}</>
        ) : (
          <span>-- Clear Status --</span>
        )}
      </div>
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid var(--border-color)', zIndex: 500, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div 
            onClick={() => { onChange('Clear'); setIsOpen(false); }}
            style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
          >
            -- Clear Status --
          </div>
          {Object.keys(LEGEND).map(s => (
            <div 
              key={s} 
              onClick={() => { onChange(s); setIsOpen(false); }}
              style={{ padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #eee' }}
            >
              <div style={{ width: 14, height: 14, backgroundColor: LEGEND[s], borderRadius: '2px' }}></div> {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CrewSchedule = () => {
  const isMobile = useIsMobile();
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [personnel, setPersonnel] = useState([]);
  const [flights, setFlights] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [activeFilter, setActiveFilter] = useState('All'); // 'All', 'Pilots', 'Crew', 'Passengers'
  const filterRef = useRef(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [cellModalOpen, setCellModalOpen] = useState(null); // { personId, dateStr, status, x, y }
  const [activeDuplicateStatus, setActiveDuplicateStatus] = useState(null);
  const [draggedPersonId, setDraggedPersonId] = useState(null);
  const [accountsList, setAccountsList] = useState([]);
  
  // Flight Modal state
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Grid color settings
  const [colorBy, setColorBy] = useState(() => localStorage.getItem('schedulesGridColorBy') || 'tag');
  const [colorSettingsOpen, setColorSettingsOpen] = useState(false);
  
  const [genPilotId, setGenPilotId] = useState('');
  const [genMode, setGenMode] = useState('7/7'); // '7/7' or 'specific'
  const [genDays, setGenDays] = useState([1, 2, 3, 4, 5]); // Default Mon-Fri
  const [genStartDate, setGenStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [everyOtherWeek, setEveryOtherWeek] = useState(false);

  // Removed filterRef and handleClickOutside as we're using segmented buttons now

  useEffect(() => {
    const pilots = JSON.parse(localStorage.getItem('userPilots') || '[]');
    const pax = JSON.parse(localStorage.getItem('userPassengers') || '[]');
    const crewPax = pax.filter(p => p.isCrew);
    const passengerPax = pax.filter(p => !p.isCrew);
    const allPersonnel = [...pilots.map(p => ({ ...p, type: 'pilot' })),
                         ...crewPax.map(p => ({ ...p, type: 'crew' })),
                         ...passengerPax.map(p => ({ ...p, type: 'pax' }))];
    
    const savedOrder = JSON.parse(localStorage.getItem('crewOrder') || '[]');
    if (savedOrder.length > 0) {
      allPersonnel.sort((a, b) => {
         const idxA = savedOrder.indexOf(a.id);
         const idxB = savedOrder.indexOf(b.id);
         if (idxA === -1 && idxB === -1) return 0;
         if (idxA === -1) return 1;
         if (idxB === -1) return -1;
         return idxA - idxB;
      });
    }
    setPersonnel(allPersonnel);
    
    setFlights(JSON.parse(localStorage.getItem('userFlights') || '[]'));
    setSchedules(JSON.parse(localStorage.getItem('crewSchedules') || '{}'));
    try {
      setAccountsList(JSON.parse(localStorage.getItem('userAccounts') || '[]'));
    } catch {}

    const handleStorage = () => {
      setFlights(JSON.parse(localStorage.getItem('userFlights') || '[]'));
      setSchedules(JSON.parse(localStorage.getItem('crewSchedules') || '{}'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const saveSchedules = (newSched) => {
    setSchedules(newSched);
    localStorage.setItem('crewSchedules', JSON.stringify(newSched));
  };

  const handleDropPerson = (targetPersonId) => {
    if (!draggedPersonId || draggedPersonId === targetPersonId) return;
    
    const newPersonnel = [...personnel];
    const draggedIdx = newPersonnel.findIndex(p => p.id === draggedPersonId);
    const targetIdx = newPersonnel.findIndex(p => p.id === targetPersonId);
    
    if (draggedIdx === -1 || targetIdx === -1) return;
    
    const [draggedItem] = newPersonnel.splice(draggedIdx, 1);
    newPersonnel.splice(targetIdx, 0, draggedItem);
    
    setPersonnel(newPersonnel);
    localStorage.setItem('crewOrder', JSON.stringify(newPersonnel.map(p => p.id)));
    setDraggedPersonId(null);
  };

  const handleCellClick = (personId, dateStr, status) => {
    const key = `${personId}_${dateStr}`;
    const newSched = { ...schedules };
    if (status === 'Clear' || !status) {
      delete newSched[key];
    } else if (newSched[key] === status) {
      delete newSched[key];
    } else {
      newSched[key] = status;
    }
    saveSchedules(newSched);
  };

  const handleSaveCellModal = () => {
    if (!cellModalOpen) return;
    const { personId, dateStr, status } = cellModalOpen;
    const key = `${personId}_${dateStr}`;
    const newSched = { ...schedules };
    if (status === 'Clear' || !status) {
      delete newSched[key];
    } else {
      newSched[key] = status;
    }
    saveSchedules(newSched);
    setCellModalOpen(null);
  };

  const runGenerator = () => {
    if (!genPilotId || !genStartDate) return;
    const newSched = { ...schedules };
    let currDate = new Date(genStartDate + 'T12:00:00Z');
    
    for (let day = 0; day < 365; day++) {
      const dateStr = currDate.toISOString().split('T')[0];
      const key = `${genPilotId}_${dateStr}`;
      
      let isOnDuty = false;
      if (genMode === '7/7') {
        isOnDuty = Math.floor(day / 7) % 2 === 0;
      } else {
        isOnDuty = genDays.includes(currDate.getUTCDay());
        if (everyOtherWeek) {
          if (Math.floor(day / 7) % 2 !== 0) isOnDuty = false;
        }
      }
      
      if (isOnDuty) {
        newSched[key] = 'On Duty';
      } else {
        delete newSched[key];
      }
      currDate.setDate(currDate.getDate() + 1);
    }
    saveSchedules(newSched);
    setGeneratorOpen(false);
  };

  const clearSchedule = () => {
    if (!genPilotId) return;
    if (!window.confirm("Are you sure you want to clear ALL scheduled statuses for this person?")) return;
    const newSched = { ...schedules };
    Object.keys(newSched).forEach(key => {
       if (key.startsWith(`${genPilotId}_`)) {
          delete newSched[key];
       }
    });
    saveSchedules(newSched);
    setGeneratorOpen(false);
  };

  const getFlightsForPersonAndDate = (personId, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return flights.filter(f => {
      return (f.legs || []).some(l => {
         const lDate = l.date || (f.date ? f.date.split('T')[0] : null);
         const lArrDate = l.arrDate || lDate;
         if (!lDate) return false;
         if (dateStr >= lDate && dateStr <= lArrDate) {
             // Check if personId matches any pilot or passenger ID (converting both to strings for safe matching)
             if ((l.pilots && l.pilots.some(p => String(p) === String(personId))) || String(l.pilotId) === String(personId)) return true;
             if (l.passengers && l.passengers.some(p => String(p) === String(personId))) return true;
         }
         return false;
      });
    });
  };

  const weekDays = [...Array(7)].map((_, i) => addDays(currentWeek, i));

  const getName = (loc) => {
    if (!loc) return '?';
    if (loc.type === 'airport') {
      const ap = airportsData.find(a => a.id === loc.id);
      return ap ? ap.id : loc.id;
    } else {
      let storedZones = [];
      try { storedZones = JSON.parse(localStorage.getItem('userCustomZones') || '[]'); } catch {}
      const cz = [...mockCustomZones, ...storedZones].find(c => c.id === loc.id);
      return cz ? (cz.id || cz.title) : loc.id;
    }
  };

  const getFlightColor = (f) => {
    if (colorBy === 'tag') {
      return TAG_COLORS[f.tag] || '#8b5cf6';
    }
    if (colorBy === 'aircraft') {
      return getColorForKey(f.aircraftId || 'unknown');
    }
    if (colorBy === 'account') {
      return getAccountColor(f.accountId, accountsList);
    }
    return '#8b5cf6';
  };

  const getColorLegend = () => {
    if (colorBy === 'tag') {
      const usedTags = [...new Set(flights.map(f => f.tag).filter(Boolean))];
      const entries = usedTags.length > 0
        ? usedTags.map(t => ({ label: t, color: TAG_COLORS[t] || '#8b5cf6' }))
        : [{ label: 'No tag', color: '#8b5cf6' }];
      return entries;
    }
    const keyField = colorBy === 'aircraft' ? 'aircraftId' : 'accountId';
    const keys = [...new Set(flights.map(f => f[keyField]).filter(Boolean))];
    if (keys.length === 0) return [{ label: 'None', color: '#8b5cf6' }];
    return keys.map(k => {
      let label = k;
      if (colorBy === 'account') {
        const acc = accountsList.find(a => a.id === k || a.name === k);
        if (acc) label = acc.name;
        return { label, color: getAccountColor(k, accountsList) };
      }
      return { label, color: getColorForKey(k) };
    });
  };

  const changeColorBy = (mode) => {
    setColorBy(mode);
    localStorage.setItem('schedulesGridColorBy', mode);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      {/* Top Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', backgroundColor: 'var(--panel-bg)', borderBottom: '1px solid var(--border-color)', borderRadius: '8px 8px 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="btn btn-outline" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}><ChevronLeft size={16}/></button>
          <h3 className="crew-header-title" style={{ margin: 0, minWidth: '200px', textAlign: 'center' }}>
            {format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'MMM d, yyyy')}
          </h3>
          <button className="btn btn-outline" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}><ChevronRight size={16}/></button>
          <button className="btn btn-outline" onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</button>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          
          {/* Header Row Segmented Control for Personnel Type */}
          <div style={{ display: 'flex', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '8px' }}>
            {['All', 'Pilots', 'Crew', 'Passengers'].map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  backgroundColor: activeFilter === filter ? 'white' : 'transparent',
                  color: activeFilter === filter ? 'var(--primary-color)' : 'var(--text-muted)',
                  boxShadow: activeFilter === filter ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {filter}
              </button>
            ))}
          </div>

          <button className="btn btn-outline schedule-generator-btn" onClick={() => setGeneratorOpen(true)}>
            <Settings size={16} /> Schedule Generator
          </button>
          <button
            className="btn btn-outline"
            onClick={() => setColorSettingsOpen(true)}
            title="Schedules Grid Settings"
            style={{ padding: '6px 10px', display: 'flex', alignItems: 'center' }}
          >
            <Settings2 size={16} />
          </button>
        </div>
      </div>

      {/* Color Settings Popup */}
      {colorSettingsOpen && (
        <div
          onClick={() => setColorSettingsOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '420px', backgroundColor: 'white', borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)', overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Schedules Grid Settings</h3>
              <button type="button" onClick={() => setColorSettingsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="var(--text-muted)"/></button>
            </div>
            <div style={{ padding: '20px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                Color Flight Boxes By
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { mode: 'tag', label: 'Tag' },
                  { mode: 'aircraft', label: 'Aircraft' },
                  { mode: 'account', label: 'Account' }
                ].map(opt => (
                  <label
                    key={opt.mode}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                      borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer',
                      backgroundColor: colorBy === opt.mode ? 'var(--primary-light)' : 'white'
                    }}
                  >
                    <input
                      type="radio"
                      name="colorBy"
                      checked={colorBy === opt.mode}
                      onChange={() => changeColorBy(opt.mode)}
                      style={{ accentColor: 'var(--primary-color)' }}
                    />
                    <span style={{ fontWeight: colorBy === opt.mode ? 'bold' : 'normal', fontSize: '0.9rem' }}>{opt.label}</span>
                  </label>
                ))}
              </div>

              <div style={{ marginTop: '18px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                  Legend
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {getColorLegend().map((entry, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '4px', backgroundColor: '#f7fafc', fontSize: '0.75rem' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: entry.color }}></div>
                      {entry.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Mode Floating Banner */}
      {activeDuplicateStatus && (
        <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100, backgroundColor: 'var(--primary-color)', color: 'white', padding: '10px 20px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 6px 15px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Painting Status:</span>
            <div style={{ width: 14, height: 14, backgroundColor: LEGEND[activeDuplicateStatus], borderRadius: '2px' }}></div> 
            <strong>{activeDuplicateStatus}</strong>
          </div>
          <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>(Click cells to assign)</span>
          <button className="btn btn-primary" style={{ border: '1px solid white', padding: '4px 12px', fontSize: '0.8rem', marginLeft: '10px' }} onClick={() => setActiveDuplicateStatus(null)}>Save Statuses</button>
        </div>
      )}

      {/* Gantt Grid */}
      <div style={{ flex: '1', overflow: 'auto', backgroundColor: '#f9fafb' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--panel-bg)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
            <tr>
              <th style={{ width: '200px', padding: '15px', borderRight: '1px solid var(--border-color)', textAlign: 'left' }}>Crew / Passenger</th>
              {weekDays.map(day => (
                <th key={day.toString()} style={{ padding: '10px', borderRight: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{format(day, 'EEE')}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{format(day, 'M/d')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {personnel.filter(p => activeFilter === 'All' || 
                                  (activeFilter === 'Pilots' && p.type === 'pilot') || 
                                  (activeFilter === 'Crew' && p.type === 'crew') || 
                                  (activeFilter === 'Passengers' && p.type === 'pax')).map((person, rowIndex) => (
              <tr 
                key={person.id} 
                draggable
                onDragStart={() => setDraggedPersonId(person.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropPerson(person.id)}
                className="crew-row"
                style={{ 
                  borderBottom: '1px solid #f1f5f9', 
                  backgroundColor: draggedPersonId === person.id 
                    ? '#e2e8f0' 
                    : (rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc'),
                  transition: 'background-color 0.15s ease'
                }}
              >
                <td style={{ 
                  padding: '12px 16px', 
                  borderRight: '1px solid #e2e8f0', 
                  borderLeft: person.type === 'pilot' ? '4px solid #3b82f6' : person.type === 'crew' ? '4px solid #f59e0b' : '4px solid #10b981',
                  verticalAlign: 'middle', 
                  cursor: 'grab',
                  backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: '#94a3b8' }}><GripVertical size={16} /></div>
                    <span style={{ 
                       fontSize: '0.68rem', 
                       fontWeight: 700, 
                       padding: '2px 8px', 
                       borderRadius: '4px', 
                       backgroundColor: person.type === 'pilot' ? '#eff6ff' : person.type === 'crew' ? '#fffbeb' : '#f0fdf4',
                       color: person.type === 'pilot' ? '#1d4ed8' : person.type === 'crew' ? '#b45309' : '#15803d',
                       border: `1px solid ${person.type === 'pilot' ? '#bfdbfe' : person.type === 'crew' ? '#fde68a' : '#bbf7d0'}`,
                       letterSpacing: '0.5px'
                    }}>
                      {person.type === 'pilot' ? 'PILOT' : person.type === 'crew' ? 'CREW' : 'PAX'}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{person.name}</span>
                  </div>
                </td>
                
                {weekDays.map(day => {
                  const dateStr = day.toISOString().split('T')[0];
                  const key = `${person.id}_${dateStr}`;
                  const cellStatus = schedules[key];
                  const dayFlights = getFlightsForPersonAndDate(person.id, day);
                  
                  return (
                    <td 
                      key={day.toString()} 
                      style={{ 
                        borderRight: '1px solid #f1f5f9', 
                        borderBottom: '1px solid #f1f5f9',
                        verticalAlign: 'top', 
                        padding: '6px 4px', 
                        position: 'relative', 
                        cursor: activeDuplicateStatus ? 'crosshair' : 'pointer',
                        backgroundColor: cellStatus ? undefined : (rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc')
                      }}
                      onClick={(e) => {
                         if (activeDuplicateStatus) {
                            handleCellClick(person.id, dateStr, activeDuplicateStatus);
                         } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            let x = rect.left;
                            let y = rect.bottom;
                            if (x > window.innerWidth - 300) x = window.innerWidth - 300;
                            if (y > window.innerHeight - 250) y = rect.top - 200;
                            setCellModalOpen({ personId: person.id, dateStr, status: cellStatus || 'On Duty', x, y });
                         }
                      }}
                    >
                      
                      {/* Status Background */}
                      {cellStatus && (
                         <div style={{ backgroundColor: LEGEND[cellStatus] || '#ccc', color: 'white', padding: '4px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px', marginBottom: '4px' }}>
                           {cellStatus}
                         </div>
                      )}

                      {/* Flight Cards */}
                      {dayFlights.map(f => {
                         const color = getFlightColor(f);
                         const firstLegDate = f.legs && f.legs[0] ? (f.legs[0].date || (f.date ? f.date.split('T')[0] : null)) : null;
                         const isOvernight = (f.legs || []).some(l => {
                           const depDate = l.date || (f.date ? f.date.split('T')[0] : null);
                           const arrDate = l.arrDate || depDate;
                           if (!depDate) return false;
                           return (arrDate > depDate) || (firstLegDate && depDate !== firstLegDate) || (firstLegDate && arrDate !== firstLegDate);
                         });
                         return (
                           <div 
                             key={f.id} 
                             onClick={(e) => {
                               e.stopPropagation();
                               setSelectedFlight(f);
                               setIsModalOpen(true);
                             }}
                             style={{ 
                               backgroundColor: color, color: 'white', padding: '6px', borderRadius: '4px', fontSize: '0.7rem', marginBottom: '4px',
                               cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', position: 'relative'
                             }}
                             title="Click to open flight card"
                           >
                             {isOvernight && (
                               <div 
                                 title="Overnight Flight"
                                 style={{
                                   position: 'absolute',
                                   top: '3px',
                                   right: '3px',
                                   backgroundColor: '#1a202c',
                                   color: '#f6e05e',
                                   padding: '2px',
                                   borderRadius: '50%',
                                   display: 'flex',
                                   alignItems: 'center',
                                   justifyContent: 'center',
                                   boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                   zIndex: 5
                                 }}
                               >
                                 <Moon size={9} color="#f6e05e" fill="#f6e05e" />
                               </div>
                             )}
                              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                                <Helicopter size={10} style={{ display: 'inline', marginRight: '4px' }}/>
                                #{f.flightNumber}
                              </div>
                             {f.legs && f.legs.length > 0 && f.legs.map((l, i) => (
                               <div key={i} style={{ opacity: 0.9 }}>
                                 {getName(l.departure)} &#8594; {getName(l.destination)}
                               </div>
                             ))}
                           </div>
                         );
                      })}
                    </td>
                  );
                })}
              </tr>
            ))}
            {personnel.filter(p => activeFilter === 'All' || 
                                  (activeFilter === 'Pilots' && p.type === 'pilot') || 
                                  (activeFilter === 'Crew' && p.type === 'crew') || 
                                  (activeFilter === 'Passengers' && p.type === 'pax')).length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No personnel visible for the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Legend */}
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', padding: '15px 20px', backgroundColor: 'var(--panel-bg)', borderTop: '1px solid var(--border-color)', borderRadius: '0 0 8px 8px', fontSize: '0.75rem', fontWeight: 'bold' }}>
        <span style={{ marginRight: '10px' }}>LEGEND:</span>
        {Object.entries(LEGEND).map(([name, color]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '14px', height: '14px', backgroundColor: color, borderRadius: '2px' }}></div>
            {name}
          </div>
        ))}
        {getColorLegend().map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '14px', height: '14px', backgroundColor: item.color, borderRadius: '2px' }}></div>
            {item.label}
          </div>
        ))}
      </div>

      {/* 7/7 Generator Modal */}
      {generatorOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div className="card" style={{ width: '450px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#fff', padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: 'var(--primary-color)' }}>Generate Schedule</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setGeneratorOpen(false)}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className={`btn ${genMode === '7/7' ? 'btn-primary' : 'btn-outline'}`} 
                  onClick={() => setGenMode('7/7')}
                  style={{ flex: 1, padding: '8px' }}
                >
                  7/7 Rotation
                </button>
                <button 
                  className={`btn ${genMode === 'specific' ? 'btn-primary' : 'btn-outline'}`} 
                  onClick={() => setGenMode('specific')}
                  style={{ flex: 1, padding: '8px' }}
                >
                  Specific Days
                </button>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Personnel</label>
                {isMobile ? (
                  <MobileDropdownMenu
                    value={genPilotId}
                    onChange={val => setGenPilotId(val)}
                    options={[{ value: '', label: '-- Select Personnel --' }, ...personnel.map(p => ({ value: p.id, label: p.name }))]}
                    placeholder="-- Select Personnel --"
                    style={{ width: '100%' }}
                  />
                ) : (
                  <select className="form-control" style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={genPilotId} onChange={e => setGenPilotId(e.target.value)}>
                    <option value="">-- Select Personnel --</option>
                    {personnel.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Start Date</label>
                <input type="date" className="form-control" style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }} value={genStartDate} onChange={e => setGenStartDate(e.target.value)} />
              </div>
              
              {genMode === 'specific' && (
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Days of Week (On Duty)</label>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {[
                      { label: 'Sun', val: 0 }, { label: 'Mon', val: 1 }, { label: 'Tue', val: 2 },
                      { label: 'Wed', val: 3 }, { label: 'Thu', val: 4 }, { label: 'Fri', val: 5 }, { label: 'Sat', val: 6 }
                    ].map(day => (
                      <button
                        key={day.val}
                        onClick={() => {
                          if (genDays.includes(day.val)) setGenDays(genDays.filter(d => d !== day.val));
                          else setGenDays([...genDays, day.val].sort());
                        }}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '4px',
                          border: `1px solid ${genDays.includes(day.val) ? 'var(--primary-color)' : 'var(--border-color)'}`,
                          backgroundColor: genDays.includes(day.val) ? 'var(--primary-color)' : 'white',
                          color: genDays.includes(day.val) ? 'white' : 'var(--text-color)',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          flex: '1 1 auto'
                        }}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '10px', fontSize: '0.9rem' }}>
                    <input 
                      type="checkbox" 
                      checked={everyOtherWeek}
                      onChange={(e) => setEveryOtherWeek(e.target.checked)}
                    />
                    Apply "Every Other Week" alternating schedule
                  </label>
                </div>
              )}
              <div style={{ padding: '10px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid #3b82f6', fontSize: '0.85rem', color: '#1e3a8a', lineHeight: '1.4' }}>
                <strong>Note:</strong> This will overwrite the next 365 days of their schedule. Any manual adjustments previously made in that timeframe will be reset to the new base rotation.
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
              <button className="btn btn-outline" style={{ color: '#e53e3e', borderColor: '#e53e3e', padding: '6px 12px' }} onClick={clearSchedule} disabled={!genPilotId}>Clear All for Person</button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-outline" style={{ padding: '6px 12px' }} onClick={() => setGeneratorOpen(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={runGenerator} disabled={!genPilotId || !genStartDate}>Generate 1-Year Schedule</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Itinerary Modal */}
      {cellModalOpen && (() => {
        const { personId, dateStr, status } = cellModalOpen;
        const person = personnel.find(p => p.id === personId);
        const dayFlights = getFlightsForPersonAndDate(personId, new Date(dateStr + 'T12:00:00'));

        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
          }}>
            <div className="card" style={{ width: '550px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#fff', padding: '0', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
              
              {/* Header */}
              <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--panel-bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ margin: 0, color: 'var(--primary-color)' }}>Daily Itinerary</h3>
                    <span style={{ 
                       fontSize: '0.65rem', 
                       fontWeight: 'bold', 
                       padding: '2px 6px', 
                       borderRadius: '4px', 
                       backgroundColor: person?.type === 'pilot' ? '#ebf8ff' : person?.type === 'crew' ? '#fefcbf' : '#f0fdf4',
                       color: person?.type === 'pilot' ? '#2b6cb0' : person?.type === 'crew' ? '#975a16' : '#166534',
                       border: `1px solid ${person?.type === 'pilot' ? '#90cdf4' : person?.type === 'crew' ? '#f6e05e' : '#86efac'}`
                    }}>
                      {person?.type === 'pilot' ? 'PILOT' : person?.type === 'crew' ? 'CREW' : 'PAX'}
                    </span>
                  </div>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setCellModalOpen(null)}><X size={20} /></button>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{person?.name}</div>
                <div style={{ color: 'var(--text-muted)' }}>{format(new Date(dateStr + 'T12:00:00'), 'EEEE, MMMM do, yyyy')}</div>
              </div>

              {/* Status Assignment */}
              <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>Duty Status</h4>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <CustomStatusDropdown 
                      value={status} 
                      onChange={v => setCellModalOpen({...cellModalOpen, status: v})}
                    />
                  </div>
                  <button className="btn btn-outline" style={{ color: '#e53e3e', borderColor: '#e53e3e', padding: '8px 12px' }} onClick={() => { handleCellClick(personId, dateStr, 'Clear'); setCellModalOpen({...cellModalOpen, status: 'Clear'}); }}>Clear</button>
                  <button className="btn btn-primary" onClick={handleSaveCellModal}>Save Status</button>
                </div>
              </div>

              {/* Flights List */}
              <div style={{ padding: '20px', flex: 1 }}>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '0.9rem' }}>Scheduled Flights ({dayFlights.length})</h4>
                
                {dayFlights.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    <Helicopter size={32} style={{ opacity: 0.3, marginBottom: '10px' }} />
                    <div>No flights scheduled for this day.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {dayFlights.map(f => {
                      const color = f.tag === 'Emergency' ? '#ed8936' : f.tag === 'Maintenance' ? '#e53e3e' : '#8b5cf6';
                      return (
                        <div key={f.id} style={{ border: `1px solid ${color}`, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                          <div style={{ backgroundColor: color, color: 'white', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                              <Helicopter size={16} style={{ display: 'inline', marginRight: '6px' }}/>
                              Flight #{f.flightNumber}
                            </div>
                            <button 
                              className="btn" 
                              style={{ padding: '4px 10px', fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
                              onClick={() => {
                                setCellModalOpen(null);
                                setSelectedFlight(f);
                                setIsModalOpen(true);
                              }}
                            >
                              Open Flight
                            </button>
                          </div>
                          <div style={{ padding: '15px', backgroundColor: 'white' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>{f.title || 'Untitled Flight'}</div>
                            {f.legs && f.legs.map((l, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < f.legs.length - 1 ? '1px solid #edf2f7' : 'none' }}>
                                <div style={{ fontSize: '0.9rem' }}>
                                  Leg {i + 1}: <strong>{getName(l.departure)}</strong> &#8594; <strong>{getName(l.destination)}</strong>
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                  {l.takeoffTime} - {l.landTime}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* Full Event Modal when a flight card is clicked */}
      {isModalOpen && selectedFlight && (
        <EventModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedFlight(null);
          }}
          flight={selectedFlight}
          onSave={(updatedFlight) => {
            try {
              const storedFlights = JSON.parse(localStorage.getItem('userFlights') || '[]');
              const idx = storedFlights.findIndex(f => f.id === updatedFlight.id);
              let newFlights;
              if (idx >= 0) {
                newFlights = storedFlights.map(f => f.id === updatedFlight.id ? updatedFlight : f);
              } else {
                newFlights = [...storedFlights, updatedFlight];
              }
              localStorage.setItem('userFlights', JSON.stringify(newFlights));
              setFlights(newFlights);
              window.dispatchEvent(new Event('storage'));
            } catch(e) {
              console.error(e);
            }
            setIsModalOpen(false);
            setSelectedFlight(null);
          }}
          onDelete={(flightId) => {
            try {
              const storedFlights = JSON.parse(localStorage.getItem('userFlights') || '[]');
              const newFlights = storedFlights.filter(f => f.id !== flightId);
              localStorage.setItem('userFlights', JSON.stringify(newFlights));
              setFlights(newFlights);
              window.dispatchEvent(new Event('storage'));
            } catch(e) {
              console.error(e);
            }
            setIsModalOpen(false);
            setSelectedFlight(null);
          }}
        />
      )}

    </div>
  );
};

export default CrewSchedule;
