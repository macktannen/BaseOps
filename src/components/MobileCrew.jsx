import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, User, Helicopter } from 'lucide-react';
import { getColorForKey, getAccountColor, TAG_COLORS } from '../services/gridColors';
import { useData } from '../contexts/DataProvider';

const MobileCrew = () => {
  const { userPilots, userPassengers, crewSchedules, userFlights, userAccounts, calendarViewSettings } = useData();
  const [selectedId, setSelectedId] = useState('');
  const [activeFilter, setActiveFilter] = useState('pilot'); // 'pilot', 'crew', 'pax'
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const crew = React.useMemo(() => {
    const pilots = userPilots || [];
    const pax = userPassengers || [];
    const crewPax = pax.filter(p => p.isCrew);
    const passengerPax = pax.filter(p => !p.isCrew);
    
    return [
      ...pilots.map(p => ({ ...p, type: 'pilot' })),
      ...crewPax.map(p => ({ ...p, type: 'crew' })),
      ...passengerPax.map(p => ({ ...p, type: 'pax' }))
    ];
  }, [userPilots, userPassengers]);

  const schedules = crewSchedules || {};
  const flights = userFlights || [];
  const accountsList = userAccounts || [];
  const colorBy = calendarViewSettings?.schedulesGridColorBy || 'tag';

  useEffect(() => {
    if (crew.length > 0 && !selectedId) {
      const filtered = crew.filter(p => p.type === 'pilot');
      if (filtered.length > 0) setSelectedId(filtered[0].id);
    }
  }, [crew, selectedId]);

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeek, i));

  const filteredCrew = crew.filter(c => c.type === activeFilter);

  const getFlightColor = (f) => {
    if (colorBy === 'tag') return TAG_COLORS[f.tag] || '#8b5cf6';
    if (colorBy === 'aircraft') return getColorForKey(f.aircraftId || 'unknown');
    if (colorBy === 'account') return getAccountColor(f.accountId, accountsList);
    return '#8b5cf6';
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    const newFiltered = crew.filter(c => c.type === filter);
    if (newFiltered.length > 0) setSelectedId(newFiltered[0].id);
    else setSelectedId('');
  };

  const getDayFlights = (dateStr) => {
    return flights.filter(f => {
      return (f.legs || []).some(l => {
         const lDate = l.date || (f.date ? f.date.split('T')[0] : null);
         const lArrDate = l.arrDate || lDate;
         if (!lDate) return false;
         if (dateStr >= lDate && dateStr <= lArrDate) {
             if ((l.pilots && l.pilots.some(p => String(p) === String(selectedId))) || String(l.pilotId) === String(selectedId)) return true;
             if (l.passengers && l.passengers.some(p => String(p) === String(selectedId))) return true;
         }
         return false;
      });
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-color)' }}>
      {/* Top Header */}
      <div style={{ padding: '15px', backgroundColor: 'white', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
        
        {/* Header Row Segmented Control */}
        <div style={{ display: 'flex', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '8px', marginBottom: '15px' }}>
          {['pilot', 'crew', 'pax'].map(filter => (
            <button
              key={filter}
              onClick={() => handleFilterChange(filter)}
              style={{
                flex: 1,
                padding: '6px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                backgroundColor: activeFilter === filter ? 'white' : 'transparent',
                color: activeFilter === filter ? 'var(--primary-color)' : 'var(--text-muted)',
                boxShadow: activeFilter === filter ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {filter === 'pilot' ? 'Pilots' : filter === 'crew' ? 'Crew' : 'Passengers'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <div style={{ backgroundColor: 'var(--primary-light)', padding: '8px', borderRadius: '50%', color: 'var(--primary-color)' }}>
            <User size={20} />
          </div>
          <select 
            value={selectedId} 
            onChange={e => setSelectedId(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', backgroundColor: '#f7fafc' }}
          >
            {filteredCrew.length === 0 && <option value="">No personnel found</option>}
            {filteredCrew.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.type === 'pilot' ? 'Pilot' : c.type === 'crew' ? 'Crew' : 'Pax'})</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-outline" style={{ padding: '6px' }} onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}><ChevronLeft size={16} /></button>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
            {format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'MMM d, yyyy')}
          </div>
          <button className="btn btn-outline" style={{ padding: '6px' }} onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* 7-Day View */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {weekDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isToday = isSameDay(day, new Date());
            const schedKey = `${selectedId}_${dateStr}`;
            const dayStatus = schedules[schedKey] || 'Off';
            const dayFlights = getDayFlights(dateStr);

            return (
              <div key={dateStr} className="card" style={{ padding: '0', overflow: 'hidden', borderLeft: isToday ? '4px solid var(--primary-color)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  {/* Date Sidebar */}
                  <div style={{ width: '65px', backgroundColor: isToday ? 'var(--primary-light)' : '#f7fafc', padding: '10px 5px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{format(day, 'EEE')}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: isToday ? 'var(--primary-color)' : 'var(--text-main)' }}>{format(day, 'd')}</div>
                  </div>
                  
                  {/* Details */}
                  <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '4px 10px', 
                        borderRadius: '12px', 
                        backgroundColor: dayStatus === 'On Duty' ? '#e6fffa' : dayStatus === 'Vacation' ? '#faf5ff' : dayStatus === 'Training' ? '#ebf8ff' : '#edf2f7',
                        color: dayStatus === 'On Duty' ? '#285e61' : dayStatus === 'Vacation' ? '#6b46c1' : dayStatus === 'Training' ? '#2b6cb0' : '#4a5568',
                        fontWeight: 600 
                      }}>
                        {dayStatus}
                      </span>
                    </div>

                    {dayFlights.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                        {dayFlights.map(f => {
                          const flightColor = getFlightColor(f);
                          return (
                            <div key={f.id} style={{ display: 'flex', flexDirection: 'column', padding: '8px', border: `1px solid ${flightColor}`, borderRadius: '6px', backgroundColor: '#fff' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <Helicopter size={12} style={{ color: flightColor }} />
                                <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.85rem' }}>Flight #{f.flightNumber}</span>
                              </div>
                              {f.title && <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>{f.title}</div>}
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                {f.legs && f.legs.map((l, i) => (
                                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '4px 0', borderBottom: i < f.legs.length - 1 ? '1px solid #edf2f7' : 'none' }}>
                                    <div>
                                      <strong>{l.departure?.id || '?'}</strong> → <strong>{l.destination?.id || '?'}</strong>
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                                      {l.takeoffTime} - {l.landTime}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>No flights assigned</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MobileCrew;
