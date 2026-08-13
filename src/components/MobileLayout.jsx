import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Users, Plane, DollarSign, MoreHorizontal, Building, Settings, LogOut, X, ChevronLeft, ChevronRight, BookOpen, Plus, MessageSquare } from 'lucide-react';
import Logo from './Logo';
import packageJson from '../../package.json';
import { useAuth } from '../contexts/useAuth';
import { can as permCan } from '../services/permissionService';
import { initDataSync } from '../services/dataSyncService';
import SyncStatusIndicator from './SyncStatusIndicator';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, addMonths, subMonths, isSameDay, getDay } from 'date-fns';

import MobileCrew from './MobileCrew';
import SettingsView from './SettingsView';
import EventModal from './EventModal';
import MobileFleet from './MobileFleet';
import MobileExpenses from './MobileExpenses';
import MobileAccounts from './MobileAccounts';
import { mockFlights } from '../data';

const APP_VERSION = `v${packageJson.version}`;

const TAB_TITLES = {
  calendar: 'Flights',
  crew: 'Crew',
  airports: 'Locations',
  aircraft: 'Fleet',
  accounts: 'Accounts',
  expenses: 'Expenses',
  settings: 'Settings'
};

export default function MobileLayout() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [moreOpen, setMoreOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [selectedDay, setSelectedDay] = useState(new Date());
  const [miniCalMonth, setMiniCalMonth] = useState(new Date());
  const [flights, setFlights] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [crewList, setCrewList] = useState([]);
  const [accountsList, setAccountsList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlight, setEditingFlight] = useState(null);
  const [duplicateFlightData, setDuplicateFlightData] = useState(null);
  const [duplicateDate, setDuplicateDate] = useState('');
  const [calendarNotes, setCalendarNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('calendarNotes') || '{}'); } catch { return {}; }
  });
  const [noteModal, setNoteModal] = useState({ open: false, date: null, dateEnd: null, title: '', content: '', editId: null });

  useEffect(() => {
    const cleanup = initDataSync(() => {
      window.dispatchEvent(new Event('storage'));
    });
    return cleanup;
  }, []);

  useEffect(() => {
    document.body.classList.add('is-mobile-layout');
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.classList.remove('is-mobile-layout');
      document.documentElement.style.overflow = '';
    };
  }, []);

  const loadData = () => {
    try {
      const stored = localStorage.getItem('userFlights');
      if (stored) {
        setFlights(JSON.parse(stored));
      } else {
        setFlights(mockFlights);
      }
    } catch { setFlights(mockFlights); }

    try {
      setSchedules(JSON.parse(localStorage.getItem('crewSchedules') || '{}'));
    } catch {}

    try {
      const pilots = JSON.parse(localStorage.getItem('userPilots') || '[]');
      const pax = JSON.parse(localStorage.getItem('userPassengers') || '[]');
      const crewPax = pax.filter(p => p.isCrew);
      const passengerPax = pax.filter(p => !p.isCrew);
      setCrewList([
        ...pilots.map(p => ({ ...p, type: 'pilot' })),
        ...crewPax.map(p => ({ ...p, type: 'crew' })),
        ...passengerPax.map(p => ({ ...p, type: 'pax' }))
      ]);
    } catch {}

    try {
      const accs = JSON.parse(localStorage.getItem('userAccounts') || '[]');
      setAccountsList(accs);
    } catch {}
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleDuplicate = (flightData) => {
    setDuplicateFlightData(flightData);
    setDuplicateDate(selectedDay ? format(selectedDay, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0]);
  };

  const confirmDuplicate = () => {
    if (!duplicateFlightData || !duplicateDate) return;
    const getNextFlightNumber = () => {
      if (flights.length === 0) return 1;
      const maxNum = Math.max(...flights.map(f => parseInt(f.flightNumber) || 0));
      return maxNum + 1;
    };
    const shiftLegDate = (d) => {
      if (!d) return d;
      const base = new Date((duplicateFlightData.legs?.[0]?.date || duplicateFlightData.date?.split?.('T')[0] || d) + 'T00:00:00');
      const target = new Date(duplicateDate + 'T00:00:00');
      const diff = Math.round((target.getTime() - base.getTime()) / 86400000);
      const dt = new Date(d + 'T00:00:00');
      dt.setDate(dt.getDate() + diff);
      return format(dt, 'yyyy-MM-dd');
    };
    const newLegs = (duplicateFlightData.legs || []).map(l => ({
      ...l,
      date: shiftLegDate(l.date),
      arrDate: shiftLegDate(l.arrDate || l.date)
    }));
    const newFlight = {
      ...duplicateFlightData,
      date: new Date(duplicateDate + 'T12:00:00').toISOString(),
      id: Date.now(),
      flightNumber: getNextFlightNumber(),
      legs: newLegs
    };
    try {
      const stored = JSON.parse(localStorage.getItem('userFlights') || '[]');
      stored.push(newFlight);
      localStorage.setItem('userFlights', JSON.stringify(stored));
      window.dispatchEvent(new Event('storage'));
    } catch {}
    setDuplicateFlightData(null);
    setDuplicateDate('');
    setIsModalOpen(false);
    setEditingFlight(null);
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setMoreOpen(false);
    if (tab === 'calendar') setSelectedDay(new Date());
  };

  const openNoteModal = (date, existingNote = null) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (existingNote) {
      setNoteModal({ open: true, date: dateStr, dateEnd: dateStr, title: existingNote.title, content: existingNote.content || '', editId: existingNote.id });
    } else {
      setNoteModal({ open: true, date: dateStr, dateEnd: dateStr, title: '', content: '', editId: null });
    }
  };

  const closeNoteModal = () => setNoteModal({ open: false, date: null, dateEnd: null, title: '', content: '', editId: null });

  const saveNote = () => {
    if (!noteModal.date || !noteModal.title.trim()) return;
    const title = noteModal.title.trim();
    const content = noteModal.content.trim();
    const start = new Date(noteModal.date + 'T00:00:00');
    const end = new Date((noteModal.dateEnd || noteModal.date) + 'T00:00:00');
    const endDt = end < start ? start : end;
    const next = { ...calendarNotes };

    if (noteModal.editId) {
      for (const [d, notes] of Object.entries(next)) {
        const idx = notes.findIndex(n => n.id === noteModal.editId);
        if (idx !== -1) {
          next[d] = notes.filter(n => n.id !== noteModal.editId);
          if (next[d].length === 0) delete next[d];
          break;
        }
      }
      const dateStr = noteModal.date;
      const existing = next[dateStr] || [];
      next[dateStr] = [...existing, { id: noteModal.editId, title, content }];
    } else {
      let current = new Date(start);
      while (current <= endDt) {
        const dateStr = format(current, 'yyyy-MM-dd');
        const existing = next[dateStr] || [];
        next[dateStr] = [...existing, { id: `note_${Date.now()}_${dateStr}`, title, content }];
        current.setDate(current.getDate() + 1);
      }
    }

    setCalendarNotes(next);
    try { localStorage.setItem('calendarNotes', JSON.stringify(next)); } catch {}
    closeNoteModal();
  };

  const deleteNote = (dateStr, noteId) => {
    const next = { ...calendarNotes };
    next[dateStr] = (next[dateStr] || []).filter(n => n.id !== noteId);
    setCalendarNotes(next);
    try { localStorage.setItem('calendarNotes', JSON.stringify(next)); } catch {}
  };

  const monthStart = startOfMonth(miniCalMonth);
  const monthEnd = endOfMonth(miniCalMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);

  const flightsByDate = useMemo(() => {
    const map = {};
    flights.forEach(f => {
      if (f.legs && f.legs.length > 0) {
        f.legs.forEach(l => {
          const d = l.date || (f.date ? f.date.split('T')[0] : null);
          if (d) {
            if (!map[d]) map[d] = [];
            map[d].push(f);
          }
        });
      } else if (f.date) {
        const d = f.date.split('T')[0];
        if (!map[d]) map[d] = [];
        map[d].push(f);
      }
    });
    return map;
  }, [flights]);

  const selectedDateStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;

  const uniqueFlights = useMemo(() => {
    const selectedFlights = selectedDateStr ? (flightsByDate[selectedDateStr] || []) : [];
    const seen = new Set();
    return selectedFlights.filter(f => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });
  }, [selectedDateStr, flightsByDate]);

  const renderMiniCalendar = () => (
    <div style={{ padding: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <button className="btn btn-outline" style={{ padding: '6px' }} onClick={() => setMiniCalMonth(subMonths(miniCalMonth, 1))}>
          <ChevronLeft size={18} />
        </button>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>{format(miniCalMonth, 'MMMM yyyy')}</h3>
        <button className="btn btn-outline" style={{ padding: '6px' }} onClick={() => setMiniCalMonth(addMonths(miniCalMonth, 1))}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mobile-mini-cal-grid" style={{ textAlign: 'center' }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
        ))}

        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} style={{ padding: '6px' }} />
        ))}

        {daysInMonth.map(day => {
          const ds = format(day, 'yyyy-MM-dd');
          const dayFlights = flightsByDate[ds] || [];
          const dayNotes = calendarNotes[ds] || [];
          const hasFlight = dayFlights.length > 0;
          const hasNote = dayNotes.length > 0;
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDay && isSameDay(day, selectedDay);

          return (
            <div
              key={ds}
              onClick={() => setSelectedDay(day)}
              style={{
                padding: '4px 2px',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: isSelected ? 'var(--primary-color)' : isToday ? '#ebf8ff' : 'transparent',
                color: isSelected ? 'white' : 'var(--text-main)',
                fontWeight: isToday ? 700 : 400,
                fontSize: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                minHeight: '36px',
                justifyContent: 'center',
                position: 'relative'
              }}
            >
              {day.getDate()}
              {hasFlight && (
                <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                  {dayFlights.length <= 3 ? (
                    dayFlights.map((f, i) => (
                      <div key={i} style={{
                        width: '5px', height: '5px', borderRadius: '50%',
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.8)' :
                          f.tag === 'Emergency' ? '#ed8936' : f.tag === 'Maintenance' ? '#e53e3e' : 'var(--primary-color)'
                      }} />
                    ))
                  ) : (
                    <>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--primary-color)' }} />
                      <span style={{ fontSize: '0.55rem', color: isSelected ? 'rgba(255,255,255,0.9)' : 'var(--text-muted)', fontWeight: 600 }}>+{dayFlights.length}</span>
                    </>
                  )}
                </div>
              )}
              {hasNote && (
                <div style={{ width: '12px', height: '2px', borderRadius: '1px', backgroundColor: isSelected ? 'rgba(255,255,255,0.6)' : '#a0aec0', marginTop: '1px' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDayDetail = () => {
    if (!selectedDay) return null;

    const getName = (loc) => {
      if (!loc) return '?';
      if (loc.type === 'airport') return loc.id;
      return loc.id || '?';
    };

    const daySchedules = crewList.map(person => {
      const key = `${person.id}_${selectedDateStr}`;
      const status = schedules[key];
      if (status && status !== 'Off') {
        return { person, status };
      }
      return null;
    }).filter(Boolean);

    return (
      <div style={{ padding: '0 12px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', position: 'sticky', top: 0, backgroundColor: 'var(--bg-color)', padding: '8px 0', zIndex: 5 }}>
          <div style={{ flex: 1 }} />
          <h3 style={{ margin: 0, fontSize: '0.95rem', flex: 2, textAlign: 'center' }}>{format(selectedDay, 'EEEE, MMM d, yyyy')}</h3>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
            <button
              onClick={() => { setEditingFlight({ date: format(selectedDay, 'yyyy-MM-dd'), legs: [{ date: format(selectedDay, 'yyyy-MM-dd') }] }); setIsModalOpen(true); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', padding: '6px', display: 'flex', alignItems: 'center', borderRadius: '6px' }}
              title="Add Flight"
            >
              <Plus size={18} />
            </button>
            <button
              onClick={() => openNoteModal(selectedDay)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', padding: '6px', display: 'flex', alignItems: 'center', borderRadius: '6px' }}
              title="Add Note"
            >
              <MessageSquare size={18} />
            </button>
          </div>
        </div>

        {uniqueFlights.length === 0 && daySchedules.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: '0.9rem' }}>
            Nothing scheduled for this day.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* Flights Section */}
            {uniqueFlights.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Flights & Events</h4>
                {uniqueFlights.map(f => {
                  const tagColor = f.tag === 'Emergency' ? '#ed8936' : f.tag === 'Maintenance' ? '#e53e3e' : f.tag === 'Training' ? '#805ad5' : 'var(--primary-color)';
                  
                  const firstLegPilots = f.legs && f.legs[0]
                    ? (f.legs[0].pilots && f.legs[0].pilots.length > 0 ? f.legs[0].pilots : (f.legs[0].pilotId ? [f.legs[0].pilotId] : []))
                    : (f.pilotId ? [f.pilotId] : []);
                  const pilotName = firstLegPilots.map(pId => {
                    const p = crewList.find(item => String(item.id) === String(pId) || item.name === pId);
                    return p ? p.name : pId;
                  }).join(', ') || 'Unknown';
                  const account = accountsList.find(a => a.id === f.accountId);
                  const accountName = account ? account.name : 'No Account';
                  
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
                      className="card"
                      onClick={() => { setEditingFlight(f); setIsModalOpen(true); }}
                      style={{ padding: '14px', cursor: 'pointer', borderLeft: `4px solid ${tagColor}`, position: 'relative' }}
                    >
                      {/* Top Right Overnight Symbol */}
                      {isOvernight && (
                        <div 
                          title="Overnight Flight"
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            backgroundColor: '#1a202c',
                            color: '#f6e05e',
                            padding: '3px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-color)' }}>
                          <Plane size={14} style={{ display: 'inline', marginRight: '6px' }} />
                          #{f.flightNumber} {f.title || ''}
                        </div>
                      </div>
                      
                      {f.aircraftId && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>{f.aircraftId}</div>
                      )}
                      {f.accountId && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>{accountName}</div>
                      )}
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}><strong>{firstLegPilots.length > 1 ? 'Pilots:' : 'Pilot:'}</strong> {pilotName}</div>

                      {f.legs && f.legs.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px' }}>
                          {f.legs.map((l, i) => {
                            const paxNames = (l.passengers || []).map(pId => {
                              const foundPax = crewList.find(p => p.id === pId);
                              return foundPax ? foundPax.name : pId;
                            }).join(', ');
                            return (
                              <div key={i} style={{ fontSize: '0.82rem', borderLeft: '2px solid var(--border-color)', paddingLeft: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div>
                                  <span style={{ fontWeight: 600 }}>{getName(l.departure)}</span> ({l.takeoffTime}) &#8594; <span style={{ fontWeight: 600 }}>{getName(l.destination)}</span> ({l.landTime})
                                </div>
                                {paxNames && <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem' }}>Pax: {paxNames}</div>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '5px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{
                          backgroundColor: '#edf2f7',
                          color: '#2d3748',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          fontWeight: 'bold',
                          textTransform: 'uppercase'
                        }}>{f.status || 'Confirmed'}</span>

                        {f.tag && (
                          <span style={{
                            backgroundColor: tagColor,
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 'bold'
                          }}>
                            {f.tag}
                          </span>
                        )}
                      </div>

                      {(f.opsNotes || f.comments) && (
                        <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#f7fafc', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-main)' }}>
                          {f.opsNotes && <div style={{ marginBottom: f.comments ? '4px' : 0 }}><strong>Ops:</strong> {f.opsNotes}</div>}
                          {f.comments && <div><strong>Crew:</strong> {f.comments}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Crew Schedules Section */}
            {daySchedules.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px' }}>
                <h4 style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Crew & Passenger Status</h4>
                <div className="card" style={{ padding: '0' }}>
                  {daySchedules.map((s, index) => (
                    <div key={index} style={{ 
                      padding: '12px 15px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      borderBottom: index < daySchedules.length - 1 ? '1px solid var(--border-color)' : 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Users size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{s.person.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.person.type === 'pilot' ? 'Pilot' : s.person.type === 'crew' ? 'Crew' : 'Passenger'}</div>
                        </div>
                      </div>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '4px 10px', 
                        borderRadius: '12px', 
                        backgroundColor: s.status === 'On Duty' ? '#e6fffa' : s.status === 'Vacation' ? '#faf5ff' : s.status === 'Training' ? '#ebf8ff' : '#fff5f5',
                        color: s.status === 'On Duty' ? '#285e61' : s.status === 'Vacation' ? '#6b46c1' : s.status === 'Training' ? '#2b6cb0' : '#c53030',
                        fontWeight: 600 
                      }}>
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    );
  };

  const renderCalendarTab = () => (
    <div>
      {renderMiniCalendar()}
      {selectedDay ? renderDayDetail() : (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '0.85rem' }}>
          Tap a day to see flight details
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    if (activeTab === 'calendar') return renderCalendarTab();
    if (activeTab === 'crew') return <MobileCrew />;
    if (activeTab === 'aircraft') return <MobileFleet />;
    if (activeTab === 'accounts') return <MobileAccounts mode="accounts" />;
    if (activeTab === 'contacts') return <MobileAccounts mode="contacts" />;
    if (activeTab === 'expenses') return <MobileExpenses />;
    if (activeTab === 'settings') return <SettingsView />;
    return null;
  };

  const primaryTabs = [
    { id: 'calendar', icon: CalendarIcon, label: 'Flights' },
    { id: 'crew', icon: Users, label: 'Crew' },
    { id: 'aircraft', icon: Plane, label: 'Fleet' },
    { id: 'expenses', icon: DollarSign, label: 'Expenses' }
  ];

  const moreTabs = [
    ...(permCan(currentUser, 'manageAccounts') ? [{ id: 'accounts', icon: Building, label: 'Accounts' }] : []),
    { id: 'contacts', icon: Users, label: 'Contacts' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  const filteredPrimaryTabs = primaryTabs.filter(t => {
    if (t.id === 'expenses') return permCan(currentUser, 'viewExpensesOverview');
    return true;
  });

  return (
    <div className="mobile-layout" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: 'var(--bg-color)', position: 'fixed', top: 0, left: 0 }}>
      <div style={{
        height: '50px',
        backgroundColor: 'var(--primary-color)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        flexShrink: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Logo size={20} light={true} />
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{TAB_TITLES[activeTab] || 'BaseOps'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <SyncStatusIndicator />
          <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{APP_VERSION}</span>
          <div
            onClick={() => setActiveTab('settings')}
            style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center' }}>
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="mobile-content" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', minHeight: 0 }}>
        <div style={{ width: '100%', maxWidth: '100vw', overflowX: 'hidden', boxSizing: 'border-box' }}>
          {renderContent()}
        </div>
      </div>

      {moreOpen && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 998 }} onClick={() => setMoreOpen(false)} />
          <div style={{
            position: 'fixed',
            bottom: '60px',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            borderTop: '1px solid var(--border-color)',
            borderRadius: '16px 16px 0 0',
            padding: '16px',
            zIndex: 999,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>More</span>
              <X size={20} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setMoreOpen(false)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {moreTabs.map(t => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleTabClick(t.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px', borderRadius: '8px', cursor: 'pointer',
                      backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                      color: isActive ? 'white' : 'var(--text-main)',
                      fontWeight: isActive ? 600 : 400
                    }}
                  >
                    <Icon size={20} />
                    <span>{t.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div style={{
        height: '56px',
        backgroundColor: 'white',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        flexShrink: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 100
      }}>
        {filteredPrimaryTabs.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <div
              key={t.id}
              onClick={() => handleTabClick(t.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                cursor: 'pointer', padding: '4px 12px',
                color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 400
              }}
            >
              <Icon size={22} />
              <span style={{ fontSize: '0.65rem' }}>{t.label}</span>
            </div>
          );
        })}
        <div
          onClick={() => setMoreOpen(!moreOpen)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
            cursor: 'pointer', padding: '4px 12px',
            color: moreOpen || ['airports', 'accounts', 'settings'].includes(activeTab) ? 'var(--primary-color)' : 'var(--text-muted)',
            fontWeight: moreOpen ? 600 : 400
          }}
        >
          <MoreHorizontal size={22} />
          <span style={{ fontSize: '0.65rem' }}>More</span>
        </div>
      </div>

      {isModalOpen && editingFlight && (() => {
        const sortedFlights = [...flights].sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA !== dateB) return dateA - dateB;
          const timeA = a.legs && a.legs[0] ? a.legs[0].takeoffTime : '00:00';
          const timeB = b.legs && b.legs[0] ? b.legs[0].takeoffTime : '00:00';
          return timeA.localeCompare(timeB);
        });
        
        const currentFlightIndex = sortedFlights.findIndex(f => f.id === editingFlight.id);
        const hasPrev = currentFlightIndex > 0;
        const hasNext = currentFlightIndex !== -1 && currentFlightIndex < sortedFlights.length - 1;

        const handleNavigate = (direction) => {
          if (direction === 'prev' && hasPrev) {
            setEditingFlight(sortedFlights[currentFlightIndex - 1]);
          } else if (direction === 'next' && hasNext) {
            setEditingFlight(sortedFlights[currentFlightIndex + 1]);
          }
        };

        return (
          <EventModal
            flight={editingFlight}
            isOpen={isModalOpen}
            onClose={() => { setIsModalOpen(false); setEditingFlight(null); }}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onNavigate={handleNavigate}
            onDuplicate={handleDuplicate}
            flightsCount={flights.length === 0 ? 0 : Math.max(...flights.map(f => parseInt(f.flightNumber) || 0))}
            onSave={(updatedFlight) => {
              try {
                const stored = JSON.parse(localStorage.getItem('userFlights') || '[]');
                const idx = stored.findIndex(f => f.id === updatedFlight.id);
                if (idx !== -1) stored[idx] = updatedFlight;
                else stored.push(updatedFlight);
                localStorage.setItem('userFlights', JSON.stringify(stored));
                window.dispatchEvent(new Event('storage'));
              } catch {}
              setIsModalOpen(false);
              setEditingFlight(null);
            }}
            onDelete={(flightId) => {
              try {
                const stored = JSON.parse(localStorage.getItem('userFlights') || '[]');
                const updated = stored.filter(f => f.id !== flightId);
                localStorage.setItem('userFlights', JSON.stringify(updated));
                window.dispatchEvent(new Event('storage'));
              } catch {}
              setIsModalOpen(false);
              setEditingFlight(null);
            }}
          />
        );
      })()}

    {duplicateFlightData && (
      <div
        onClick={() => { setDuplicateFlightData(null); setDuplicateDate(''); }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '20px'
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="card"
          style={{
            width: '100%', maxWidth: '340px', padding: '0', borderRadius: '12px',
            backgroundColor: 'var(--bg-color)', boxShadow: '0 15px 40px rgba(0,0,0,0.35)', overflow: 'hidden'
          }}
        >
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%', margin: '0 auto 12px',
              backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <BookOpen size={22} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: 'var(--text-main)' }}>Duplicate Flight</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Choose a date for the duplicated flight.</p>
            <input
              type="date"
              value={duplicateDate}
              onChange={(e) => setDuplicateDate(e.target.value)}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)',
                fontSize: '1rem', backgroundColor: 'white', color: 'var(--text-main)', cursor: 'pointer', textAlign: 'center'
              }}
            />
          </div>
          <div style={{ display: 'flex', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => { setDuplicateFlightData(null); setDuplicateDate(''); }}
              style={{
                flex: 1, padding: '14px', border: 'none', background: 'transparent',
                fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <div style={{ width: '1px', backgroundColor: 'var(--border-color)' }} />
            <button
              type="button"
              onClick={confirmDuplicate}
              disabled={!duplicateDate}
              style={{
                flex: 1, padding: '14px', border: 'none', background: 'transparent',
                fontSize: '0.9rem', fontWeight: 700, color: duplicateDate ? 'var(--primary-color)' : 'var(--text-muted)', cursor: duplicateDate ? 'pointer' : 'not-allowed'
              }}
            >
              Duplicate
            </button>
          </div>
        </div>
      </div>
    )}

    {noteModal.open && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
              <MessageSquare size={18} color="var(--text-muted)" /> {noteModal.editId ? 'Edit Note' : 'Add Note'}
            </h3>
            <button onClick={closeNoteModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1 }}>
            {!noteModal.editId && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Start Date</label>
                  <input
                    type="date"
                    value={noteModal.date}
                    onChange={e => setNoteModal(prev => ({ ...prev, date: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>End Date</label>
                  <input
                    type="date"
                    value={noteModal.dateEnd || noteModal.date}
                    min={noteModal.date}
                    onChange={e => setNoteModal(prev => ({ ...prev, dateEnd: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            )}
            {noteModal.editId && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Date: <strong>{noteModal.date}</strong>
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Title</label>
              <input
                type="text"
                value={noteModal.title}
                onChange={e => setNoteModal(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Note title..."
                autoFocus
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                onKeyDown={e => { if (e.key === 'Enter') saveNote(); }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Notes</label>
              <textarea
                value={noteModal.content}
                onChange={e => setNoteModal(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter notes here..."
                rows={4}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', borderTop: '1px solid var(--border-color)' }}>
            {noteModal.editId && (
              <>
                <button
                  onClick={() => { deleteNote(noteModal.date, noteModal.editId); closeNoteModal(); }}
                  style={{ flex: 1, padding: '14px', border: 'none', background: 'transparent', fontSize: '0.9rem', fontWeight: 600, color: '#e53e3e', cursor: 'pointer' }}
                >
                  Delete
                </button>
                <div style={{ width: '1px', backgroundColor: 'var(--border-color)' }} />
              </>
            )}
            <button
              onClick={closeNoteModal}
              style={{ flex: 1, padding: '14px', border: 'none', background: 'transparent', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <div style={{ width: '1px', backgroundColor: 'var(--border-color)' }} />
            <button
              onClick={saveNote}
              disabled={!noteModal.title.trim()}
              style={{ flex: 1, padding: '14px', border: 'none', background: 'transparent', fontSize: '0.9rem', fontWeight: 700, color: noteModal.title.trim() ? 'var(--primary-color)' : 'var(--text-muted)', cursor: noteModal.title.trim() ? 'pointer' : 'not-allowed' }}
            >
              {noteModal.editId ? 'Save' : 'Add Note'}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
