import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, startOfMonth, endOfMonth, isSameMonth, isSameDay, parseISO, differenceInCalendarDays } from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronDown, Plus, GripVertical, Moon, Filter, RotateCcw, MessageSquare, Helicopter, X } from 'lucide-react';
import { mockFlights, mockPilots, mockAccounts, mockCustomZones } from '../data';
import airportsData from '../data/airports.json';
import EventModal from './EventModal';
import ConflictWarningModal from './ConflictWarningModal';
import { detectConflicts } from '../services/schedulingConflicts';
import { authService } from '../services/authService';
import { setPersonStatusForDate, removePersonStatusForDate, getPersonStatusForDate } from '../services/scheduleService';

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
  const isSelected = value && value !== 'Clear';

  return (
    <div style={{ position: 'relative' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          padding: '9px 12px', 
          border: '1px solid var(--border-color)', 
          borderRadius: '6px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          cursor: 'pointer', 
          backgroundColor: '#fff',
          transition: 'border-color 0.15s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isSelected ? (
            <>
              <div style={{ width: 14, height: 14, backgroundColor: LEGEND[value], borderRadius: '3px' }}></div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>{value}</span>
            </>
          ) : (
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>-- Select Status --</span>
          )}
        </div>
        <ChevronDown size={16} style={{ color: '#64748b', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
      </div>

      {isOpen && (
        <div style={{ 
          position: 'absolute', 
          top: 'calc(100% + 4px)', 
          left: 0, 
          right: 0, 
          backgroundColor: 'white', 
          border: '1px solid var(--border-color)', 
          borderRadius: '6px',
          zIndex: 500, 
          maxHeight: '220px', 
          overflowY: 'auto', 
          boxShadow: '0 6px 16px rgba(0,0,0,0.12)' 
        }}>
          <div 
            onClick={() => { onChange('Clear'); setIsOpen(false); }}
            style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', color: '#e53e3e', fontSize: '0.85rem', fontWeight: 600 }}
          >
            ✕ Clear Duty Status
          </div>
          {Object.keys(LEGEND).map(s => (
            <div 
              key={s} 
              onClick={() => { onChange(s); setIsOpen(false); }}
              style={{ 
                padding: '9px 12px', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                borderBottom: '1px solid #f1f5f9',
                backgroundColor: value === s ? '#f8fafc' : 'transparent',
                fontWeight: value === s ? 600 : 400,
                fontSize: '0.88rem'
              }}
            >
              <div style={{ width: 14, height: 14, backgroundColor: LEGEND[s], borderRadius: '3px' }}></div>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const getDefaultPilotForDate = (dateStr) => {
  try {
    const schedules = JSON.parse(localStorage.getItem('crewSchedules') || '{}');
    for (const [key, status] of Object.entries(schedules)) {
      if (key.endsWith(`_${dateStr}`) && status === 'On Duty') {
        return key.split('_')[0];
      }
    }
  } catch {}
  return '';
};

const DEFAULT_VIEW_SETTINGS = {
  compactMode: false,
  showCrewPills: true,
  fields: {
    aircraft: true,
    account: true,
    pilot: true,
    route: true,
    passengers: true
  },
  hiddenTags: [],
  hiddenStatuses: [],
  aircraftFilter: [],
  accountFilter: [],
  pilotFilter: []
};

const loadViewSettings = () => {
  try {
    const stored = localStorage.getItem('calendarViewSettings');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_VIEW_SETTINGS,
        ...parsed,
        fields: { ...DEFAULT_VIEW_SETTINGS.fields, ...(parsed.fields || {}) }
      };
    }
  } catch { /* ignore */ }
  return DEFAULT_VIEW_SETTINGS;
};

const CheckItem = ({ label, checked, onChange, disabled = false }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, padding: '3px 0', userSelect: 'none' }}>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} style={{ cursor: disabled ? 'not-allowed' : 'pointer', width: '15px', height: '15px', accentColor: 'var(--primary-color)' }} />
    <span>{label}</span>
  </label>
);

const viewSectionHeader = { fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', margin: '8px 0 6px 0' };

const CalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [flights, setFlights] = useState(() => {
    try {
      const stored = localStorage.getItem('userFlights');
      if (stored) return JSON.parse(stored);
    } catch {}
    return mockFlights;
  });
  const [isModalOpen, setIsModalOpen] = useState(() => {
    return !!sessionStorage.getItem('baseops_open_flight_id');
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingFlight, setEditingFlight] = useState(() => {
    const openId = sessionStorage.getItem('baseops_open_flight_id');
    if (!openId) return null;
    try {
      const stored = JSON.parse(localStorage.getItem('userFlights') || '[]');
      return stored.find(f => String(f.id) === String(openId)) || null;
    } catch { return null; }
  });
  const [pilotsList, setPilotsList] = useState([]);
  const [passengersList, setPassengersList] = useState([]);
  const [accountsList, setAccountsList] = useState([]);
  const [, setDraggableFlightId] = useState(null);
  const [pendingDuplicateFlight, setPendingDuplicateFlight] = useState(null);
  const [crewSchedules, setCrewSchedules] = useState({});
  const [viewSettings, setViewSettings] = useState(loadViewSettings);
  const [showViewPanel, setShowViewPanel] = useState(false);
  const [calendarNotes, setCalendarNotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('calendarNotes') || '{}');
    } catch { return {}; }
  });
  const [noteModal, setNoteModal] = useState({ open: false, date: null, dateEnd: null, title: '', content: '', editId: null });
  const [dropConflictModal, setDropConflictModal] = useState({ open: false, pilotConflicts: [], aircraftConflicts: [], pendingFlight: null });
  const [cellModalOpen, setCellModalOpen] = useState(null); // { personId, dateStr, status }

  const handleCellStatusClick = (personId, dateStr, status) => {
    try {
      const allPersonnel = [...(pilotsList || []), ...(passengersList || [])];
      const stored = JSON.parse(localStorage.getItem('crewSchedules') || '{}');
      const updated = setPersonStatusForDate(stored, personId, dateStr, status, allPersonnel);
      setCrewSchedules(updated);
      localStorage.setItem('crewSchedules', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('firestore-sync', { detail: { key: 'crewSchedules' } }));
    } catch (err) {
      console.error('Error saving crew schedule:', err);
    }
  };

  const handleSaveCellModal = () => {
    if (!cellModalOpen) return;
    const { personId, dateStr, status } = cellModalOpen;
    handleCellStatusClick(personId, dateStr, status);
    setCellModalOpen(null);
  };

  const updateViewSettings = (patch) => {
    setViewSettings(prev => {
      const next = { ...prev, ...patch, fields: { ...prev.fields, ...(patch.fields || {}) } };
      try { localStorage.setItem('calendarViewSettings', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const toggleInViewArray = (key, value) => {
    setViewSettings(prev => {
      const arr = prev[key] || [];
      const nextArr = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      const next = { ...prev, [key]: nextArr };
      try { localStorage.setItem('calendarViewSettings', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const resetViewSettings = () => {
    setViewSettings(DEFAULT_VIEW_SETTINGS);
    try { localStorage.setItem('calendarViewSettings', JSON.stringify(DEFAULT_VIEW_SETTINGS)); } catch { /* ignore */ }
  };

  const saveNotes = (notes) => {
    setCalendarNotes(notes);
    try { localStorage.setItem('calendarNotes', JSON.stringify(notes)); } catch {}
  };

  const openNoteModal = (date, existingNote = null) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setNoteModal({
      open: true,
      date: dateStr,
      dateEnd: dateStr,
      title: existingNote ? existingNote.title : '',
      content: existingNote ? existingNote.content : '',
      editId: existingNote ? existingNote.id : null
    });
  };

  const saveNote = () => {
    if (!noteModal.date || !noteModal.title.trim()) return;
    const title = noteModal.title.trim();
    const content = noteModal.content.trim();
    const start = new Date(noteModal.date + 'T00:00:00');
    const end = new Date((noteModal.dateEnd || noteModal.date) + 'T00:00:00');
    if (end < start) { /* swap if end is before start */ }
    const endDt = end < start ? start : end;
    const next = { ...calendarNotes };

    if (noteModal.editId) {
      // Editing: find old date, remove note, re-add at new start date
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
      // Adding: iterate from start to end
      let current = new Date(start);
      while (current <= endDt) {
        const dateStr = format(current, 'yyyy-MM-dd');
        const existing = next[dateStr] || [];
        existing.push({ id: Date.now() + current.getTime(), title, content });
        next[dateStr] = existing;
        current.setDate(current.getDate() + 1);
      }
    }

    saveNotes(next);
    setNoteModal({ open: false, date: null, dateEnd: null, title: '', content: '', editId: null });
  };

  const deleteNote = (dateStr, noteId) => {
    const existing = calendarNotes[dateStr] || [];
    const updated = existing.filter(n => n.id !== noteId);
    const next = { ...calendarNotes };
    if (updated.length === 0) delete next[dateStr];
    else next[dateStr] = updated;
    saveNotes(next);
  };

  const closeNoteModal = () => setNoteModal({ open: false, date: null, dateEnd: null, title: '', content: '', editId: null });

  React.useEffect(() => {
    try {
      const storedPilots = JSON.parse(localStorage.getItem('userPilots'));
      if (storedPilots && storedPilots.length > 0) {
        setPilotsList(storedPilots);
      } else {
        setPilotsList(mockPilots);
      }
    } catch {
      setPilotsList(mockPilots);
    }

    try {
      const storedPax = JSON.parse(localStorage.getItem('userPassengers'));
      if (storedPax && storedPax.length > 0) {
        setPassengersList(storedPax);
      }
    } catch {
      setPassengersList([]);
    }

    try {
      const storedScheds = JSON.parse(localStorage.getItem('crewSchedules') || '{}');
      setCrewSchedules(storedScheds);
    } catch {}

    try {
      const storedAccounts = JSON.parse(localStorage.getItem('userAccounts'));
      if (storedAccounts && storedAccounts.length > 0) setAccountsList(storedAccounts);
      else setAccountsList(mockAccounts);
    } catch { setAccountsList(mockAccounts); }
  }, []);

  // Listen for storage events and firestore sync to refresh flights and crew schedules
  useEffect(() => {
    const handleStorageSync = () => {
      try {
        const storedFlights = localStorage.getItem('userFlights');
        if (storedFlights) setFlights(JSON.parse(storedFlights));
      } catch { /* ignore parse errors */ }

      try {
        const storedScheds = localStorage.getItem('crewSchedules');
        if (storedScheds) setCrewSchedules(JSON.parse(storedScheds));
      } catch { /* ignore parse errors */ }

      try {
        const storedPilots = localStorage.getItem('userPilots');
        if (storedPilots) setPilotsList(JSON.parse(storedPilots));
      } catch { /* ignore */ }

      try {
        const storedPax = localStorage.getItem('userPassengers');
        if (storedPax) setPassengersList(JSON.parse(storedPax));
      } catch { /* ignore */ }
    };
    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('firestore-sync', handleStorageSync);
    return () => {
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('firestore-sync', handleStorageSync);
    };
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handlePrevMonth = () => setCurrentDate(addDays(monthStart, -1));
  const handleNextMonth = () => setCurrentDate(addDays(monthEnd, 1));

  const openModalForDate = (date) => {
    if (pendingDuplicateFlight) {
      const getNextFlightNumber = () => {
        let currentStored = [];
        try { currentStored = JSON.parse(localStorage.getItem('userFlights') || '[]'); } catch {}
        const allList = currentStored.length > 0 ? currentStored : flights;
        if (allList.length === 0) return 1;
        const maxNum = Math.max(0, ...allList.map(f => parseInt(f.flightNumber, 10) || 0));
        return maxNum + 1;
      };

      const targetDateStr = format(date, 'yyyy-MM-dd');
      const sourceDepDate = pendingDuplicateFlight.legs?.[0]?.date || 
                            pendingDuplicateFlight.date?.split?.('T')[0] || 
                            format(new Date(), 'yyyy-MM-dd');

      let offsetDays = 0;
      try {
        offsetDays = differenceInCalendarDays(parseISO(targetDateStr), parseISO(sourceDepDate));
      } catch {
        const sourceD = new Date(sourceDepDate + 'T12:00:00Z');
        const targetD = new Date(targetDateStr + 'T12:00:00Z');
        offsetDays = Math.round((targetD.getTime() - sourceD.getTime()) / (1000 * 60 * 60 * 24));
      }

      const shiftedLegs = (pendingDuplicateFlight.legs || []).map(l => {
        let newDepDate = l.date || sourceDepDate;
        let newArrDate = l.arrDate || newDepDate;

        try {
          if (newDepDate && offsetDays !== 0) {
            newDepDate = format(addDays(parseISO(newDepDate), offsetDays), 'yyyy-MM-dd');
          }
          if (newArrDate && offsetDays !== 0) {
            newArrDate = format(addDays(parseISO(newArrDate), offsetDays), 'yyyy-MM-dd');
          }
        } catch {
          if (newDepDate && offsetDays !== 0) {
            const d = new Date(newDepDate + 'T12:00:00Z');
            d.setUTCDate(d.getUTCDate() + offsetDays);
            newDepDate = d.toISOString().split('T')[0];
          }
          if (newArrDate && offsetDays !== 0) {
            const a = new Date(newArrDate + 'T12:00:00Z');
            a.setUTCDate(a.getUTCDate() + offsetDays);
            newArrDate = a.toISOString().split('T')[0];
          }
        }

        return {
          ...l,
          date: newDepDate,
          arrDate: newArrDate
        };
      });

      const newId = Date.now();
      const newFlightNumber = getNextFlightNumber();

      const flightData = { 
        ...pendingDuplicateFlight, 
        date: new Date(targetDateStr + 'T12:00:00Z').toISOString(), 
        legs: shiftedLegs,
        id: newId, 
        flightNumber: newFlightNumber
      };
      
      let currentStored = [];
      try { currentStored = JSON.parse(localStorage.getItem('userFlights') || '[]'); } catch {}
      const base = currentStored.length > 0 ? currentStored : flights;
      const updatedFlights = [...base, flightData];
      
      setFlights(updatedFlights);
      localStorage.setItem('userFlights', JSON.stringify(updatedFlights));
      window.dispatchEvent(new Event('storage'));
      setPendingDuplicateFlight(null);
      return;
    }
    setSelectedDate(date);
    setEditingFlight(null);
    sessionStorage.removeItem('baseops_open_flight_id');
    setIsModalOpen(true);
  };

  const openModalForFlight = (flight) => {
    if (pendingDuplicateFlight) return; // Don't open if placing a duplicate
    if (flight?.id) {
      sessionStorage.setItem('baseops_open_flight_id', String(flight.id));
    }
    setEditingFlight(flight);
    setIsModalOpen(true);
  };

  const handleSaveFlight = (flightData) => {
    let currentStored = [];
    try {
      currentStored = JSON.parse(localStorage.getItem('userFlights') || '[]');
    } catch {}
    if (!Array.isArray(currentStored) || currentStored.length === 0) {
      currentStored = flights;
    }

    let updatedFlights;
    let savedFlight = { ...flightData };

    if (editingFlight || flightData.id) {
      const targetId = flightData.id || editingFlight?.id;
      const existing = currentStored.find(f => String(f.id) === String(targetId) || (flightData.flightNumber && String(f.flightNumber) === String(flightData.flightNumber)));
      
      // Preserve uploads, expenses & flightLog if existing record had them
      if (existing) {
        if ((!savedFlight.uploads || savedFlight.uploads.length === 0) && (existing.uploads && existing.uploads.length > 0)) {
          savedFlight.uploads = existing.uploads;
        }
        if ((!savedFlight.expenses || savedFlight.expenses.length === 0) && (existing.expenses && existing.expenses.length > 0)) {
          savedFlight.expenses = existing.expenses;
        }
        if (!savedFlight.flightLog && existing.flightLog) {
          savedFlight.flightLog = existing.flightLog;
        }
      }

      let found = false;
      updatedFlights = currentStored.map(f => {
        if (String(f.id) === String(targetId) || (flightData.flightNumber && String(f.flightNumber) === String(flightData.flightNumber))) {
          found = true;
          return { ...f, ...savedFlight };
        }
        return f;
      });
      if (!found) {
        updatedFlights.push(savedFlight);
      }
      setEditingFlight(savedFlight);
    } else {
      savedFlight.id = Date.now();
      updatedFlights = [...currentStored, savedFlight];
      setEditingFlight(savedFlight);
    }

    setFlights(updatedFlights);
    localStorage.setItem('userFlights', JSON.stringify(updatedFlights));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('firestore-sync', { detail: { key: 'userFlights' } }));
  };

  const handleDeleteFlight = (flightId) => {
    let currentStored = [];
    try {
      currentStored = JSON.parse(localStorage.getItem('userFlights') || '[]');
    } catch {}
    const base = currentStored.length > 0 ? currentStored : flights;
    const targetFlight = base.find(f => String(f.id) === String(flightId));
    
    // Check admin authorization if flight is signed
    const currentUser = authService.getCurrentUser() || { role: 'admin' };
    const isAdmin = currentUser?.role === 'admin';
    const isSigned = !!(targetFlight?.flightLog?.signature || targetFlight?.flightLog?.isLocked);
    
    if (isSigned && !isAdmin) {
      alert('This flight has a signed flight log and can only be deleted by an administrator.');
      return;
    }

    const updatedFlights = base.filter(f => String(f.id) !== String(flightId));
    setFlights(updatedFlights);
    localStorage.setItem('userFlights', JSON.stringify(updatedFlights));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('firestore-sync', { detail: { key: 'userFlights' } }));
    setIsModalOpen(false);
  };

  const getFlightPilotIds = (flight) => {
    const ids = new Set();
    if (flight.legs && flight.legs.length > 0) {
      flight.legs.forEach(l => {
        if (l.pilots && l.pilots.length > 0) {
          l.pilots.forEach(p => ids.add(String(p)));
        } else if (l.pilotId) {
          ids.add(String(l.pilotId));
        }
      });
    } else if (flight.pilotId) {
      ids.add(String(flight.pilotId));
    }
    return ids;
  };

  const flightPassesFilters = (flight) => {
    const status = flight.status || 'Confirmed';
    if (flight.tag && viewSettings.hiddenTags.includes(flight.tag)) return false;
    if (viewSettings.hiddenStatuses.includes(status)) return false;
    if (viewSettings.aircraftFilter.length > 0 && !viewSettings.aircraftFilter.includes(flight.aircraftId)) return false;
    if (viewSettings.accountFilter.length > 0 && !viewSettings.accountFilter.includes(flight.accountId)) return false;
    if (viewSettings.pilotFilter.length > 0) {
      const pilotIds = getFlightPilotIds(flight);
      const hasMatch = viewSettings.pilotFilter.some(pid => pilotIds.has(String(pid)));
      if (!hasMatch) return false;
    }
    return true;
  };

  const aircraftOptions = useMemo(() => [...new Set(flights.map(f => f.aircraftId).filter(Boolean))].sort(), [flights]);
  const tagOptions = useMemo(() => [...new Set(flights.map(f => f.tag).filter(Boolean))].sort(), [flights]);
  const statusOptions = useMemo(() => [...new Set(flights.map(f => f.status || 'Confirmed'))].sort(), [flights]);

  const getFlightsForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayFlights = flights.filter(f => {
      if (f.legs && f.legs.length > 0) {
        return f.legs.some(l => {
          const lDate = l.date || (f.date ? f.date.split('T')[0] : null);
          const lArrDate = l.arrDate || lDate;
          if (!lDate) return false;
          return dateStr >= lDate && dateStr <= lArrDate;
        });
      } else if (f.date) {
        return isSameDay(new Date(f.date), date);
      }
      return false;
    }).filter(flightPassesFilters);

    return dayFlights.sort((a, b) => {
      const getFirstTime = (flight) => {
        if (!flight.legs || flight.legs.length === 0) return '23:59';
        const legsOnDay = flight.legs.filter(l => {
          const lDate = l.date || (flight.date ? flight.date.split('T')[0] : null);
          if (!lDate) return false;
          const d = new Date(lDate + 'T12:00:00Z');
          return d.getUTCFullYear() === date.getFullYear() && d.getUTCMonth() === date.getMonth() && d.getUTCDate() === date.getDate();
        });
        if (legsOnDay.length > 0 && legsOnDay[0].takeoffTime) {
          return legsOnDay[0].takeoffTime;
        }
        return '23:59';
      };
      return getFirstTime(a).localeCompare(getFirstTime(b));
    });
  };

  const handleDragStart = (e, flightId, sourceDay) => {
    e.dataTransfer.setData('flightId', flightId);
    if (sourceDay) {
      e.dataTransfer.setData('sourceDay', sourceDay.toISOString());
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
  };

  const handleDrop = (e, date) => {
    e.preventDefault();
    const flightId = e.dataTransfer.getData('flightId');
    const sourceDayStr = e.dataTransfer.getData('sourceDay');
    
    if (flightId) {
      const id = parseInt(flightId, 10);
      if (id && date) {
        const targetDateStr = format(date, 'yyyy-MM-dd');
        
        const sourceFlight = flights.find(f => f.id === id);
        if (!sourceFlight) return;

        const isFlightSigned = !!(sourceFlight.flightLog?.signature || sourceFlight.flightLog?.isLocked);
        if (isFlightSigned) {
          alert('This flight has a signed flight log and cannot be moved to a different day. It must remain as logged on the date flown.');
          return;
        }

        const legs = sourceFlight.legs || [];
        const sourceDepDate = sourceDayStr ? sourceDayStr.split('T')[0] : (legs[0]?.date || (sourceFlight.date ? sourceFlight.date.split('T')[0] : targetDateStr));
        
        let offsetDays = 0;
        if (sourceDepDate && sourceDepDate !== targetDateStr) {
           const sourceD = new Date(sourceDepDate + 'T12:00:00Z');
           const targetD = new Date(targetDateStr + 'T12:00:00Z');
           offsetDays = Math.round((targetD.getTime() - sourceD.getTime()) / (1000 * 60 * 60 * 24));
        }

        const newLegs = legs.map(l => {
           const lDepDateStr = l.date || sourceDepDate;
           const lArrDateStr = l.arrDate || lDepDateStr;

           const legMatchesSource = !sourceDayStr || legs.length === 1 || (sourceDepDate >= lDepDateStr && sourceDepDate <= lArrDateStr);

           if (legMatchesSource && offsetDays !== 0) {
              let newDepDate = lDepDateStr;
              let newArrDate = lArrDateStr;

              if (lDepDateStr) {
                const d = new Date(lDepDateStr + 'T12:00:00Z');
                d.setDate(d.getDate() + offsetDays);
                newDepDate = d.toISOString().split('T')[0];
              }
              if (lArrDateStr) {
                const a = new Date(lArrDateStr + 'T12:00:00Z');
                a.setDate(a.getDate() + offsetDays);
                newArrDate = a.toISOString().split('T')[0];
              }

              if (newArrDate < newDepDate) {
                newArrDate = newDepDate;
              }

              return {
                ...l,
                date: newDepDate,
                arrDate: newArrDate,
                pilotId: l.pilotId || (l.pilots && l.pilots.length > 0 ? l.pilots[0] : getDefaultPilotForDate(newDepDate))
              };
           }

           return l;
        });

        const sortedDates = newLegs.map(l => l.date).filter(Boolean).sort();
        const earliestDate = sortedDates[0] || targetDateStr;
        const newFlightDate = new Date(earliestDate + 'T12:00:00Z').toISOString();

        const updatedFlight = { ...sourceFlight, date: newFlightDate, legs: newLegs };

        const { pilotConflicts, aircraftConflicts } = detectConflicts(updatedFlight, flights);

        if (pilotConflicts.length > 0 || aircraftConflicts.length > 0) {
          setDropConflictModal({ open: true, pilotConflicts, aircraftConflicts, pendingFlight: updatedFlight });
          return;
        }

        const updatedFlights = flights.map(f => f.id === id ? updatedFlight : f);
        setFlights(updatedFlights);
        localStorage.setItem('userFlights', JSON.stringify(updatedFlights));
        window.dispatchEvent(new Event('storage'));
      }
    }
  };

  const applyDropFlight = () => {
    if (!dropConflictModal.pendingFlight) return;
    const pf = dropConflictModal.pendingFlight;
    const updatedFlights = flights.map(f => f.id === pf.id ? pf : f);
    setFlights(updatedFlights);
    localStorage.setItem('userFlights', JSON.stringify(updatedFlights));
    window.dispatchEvent(new Event('storage'));
    setDropConflictModal({ open: false, pilotConflicts: [], aircraftConflicts: [], pendingFlight: null });
  };

  const getStoredCustomZones = () => {
    try {
      return JSON.parse(localStorage.getItem('userCustomZones') || '[]');
    } catch {
      return [];
    }
  };

  const getAircraftColor = (aircraftId) => {
    if (!aircraftId) return 'var(--primary-light)';
    const colors = [
      '#4376ac', // primary-light
      '#2a9d8f', // teal
      '#e76f51', // burnt orange
      '#1e3a8a', // royal blue
      '#059669', // emerald green
      '#b45309', // amber/brown
      '#374151', // slate grey
      '#0e7490', // cyan/ocean blue
    ];
    let hash = 0;
    for (let i = 0; i < aircraftId.length; i++) {
      hash = aircraftId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getName = (loc) => {
    if (!loc) return '?';
    if (loc.type === 'airport') {
      const ap = airportsData.find(a => a.id === loc.id);
      return ap ? ap.id : loc.id;
    } else {
      const storedZones = getStoredCustomZones();
      const cz = [...mockCustomZones, ...storedZones].find(c => c.id === loc.id);
      return cz ? (cz.id || cz.title) : loc.id;
    }
  };

  const renderRouteDetails = (flight, currentDay, showPassengers) => {
    if (flight.legs && flight.legs.length > 0) {
      const legsForDay = flight.legs.filter(l => {
         const lDate = l.date || (flight.date ? flight.date.split('T')[0] : null);
         if (!lDate) return true;
         const d = new Date(lDate + 'T12:00:00Z');
         return currentDay ? (d.getUTCFullYear() === currentDay.getFullYear() && d.getUTCMonth() === currentDay.getMonth() && d.getUTCDate() === currentDay.getDate()) : true;
      });

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
          {legsForDay.map((leg, idx) => {
            const paxNames = showPassengers ? (leg.passengers || []).map(pId => {
              const foundPax = passengersList.find(p => p.id === pId);
              return foundPax ? foundPax.name : pId;
            }).join(', ') : '';

            return (
              <div key={idx} style={{ fontSize: '0.65rem', borderLeft: '2px solid rgba(255,255,255,0.3)', paddingLeft: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div><strong>{getName(leg.departure)}</strong> ({leg.takeoffTime}) &#8594; <strong>{getName(leg.destination)}</strong> ({leg.landTime})</div>
                {paxNames && <div style={{ color: 'rgba(255,255,255,0.85)', fontStyle: 'italic' }}>Pax: {paxNames}</div>}
              </div>
            );
          })}
        </div>
      );
    }
    
    // Fallback for legacy mock flight route string / object
    return (
      <div style={{ fontSize: '0.7rem' }}>
        <strong>Time:</strong> {flight.takeoffTime} - {flight.landTime}
      </div>
    );
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn btn-outline" onClick={handlePrevMonth}><ChevronLeft size={16}/></button>
          <h2 style={{ minWidth: '150px', textAlign: 'center' }}>{format(currentDate, 'MMMM yyyy')}</h2>
          <button className="btn btn-outline" onClick={handleNextMonth}><ChevronRight size={16}/></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-outline"
            onClick={() => setShowViewPanel(prev => !prev)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: showViewPanel ? 'var(--primary-light)' : undefined, color: showViewPanel ? 'white' : undefined }}
          >
            <Filter size={16} /> View
          </button>
          {pendingDuplicateFlight ? (
            <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '8px 16px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>Click a date to place the duplicated flight...</span>
              <button className="btn btn-outline" style={{ color: 'white', borderColor: 'white', padding: '4px 8px' }} onClick={() => setPendingDuplicateFlight(null)}>Cancel</button>
            </div>
          ) : (
            <>
              <button className="btn btn-primary" onClick={() => openModalForDate(new Date())}>
                <Plus size={16} /> Schedule Flight
              </button>
              <button className="btn btn-outline" onClick={() => openNoteModal(new Date())} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={16} /> Notes
              </button>
            </>
          )}
        </div>
      </div>

      {showViewPanel && (
        <div style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
              <Filter size={18} color="var(--primary-color)" /> Calendar View Options
            </h3>
            <button className="btn btn-outline" onClick={resetViewSettings} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '4px 10px' }}>
              <RotateCcw size={14} /> Reset
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ ...viewSectionHeader, marginTop: 0 }}>Display</div>
              <CheckItem label="Compact flight cards" checked={viewSettings.compactMode} onChange={() => updateViewSettings({ compactMode: !viewSettings.compactMode })} />
              <CheckItem label="Crew status bubbles" checked={viewSettings.showCrewPills} onChange={() => updateViewSettings({ showCrewPills: !viewSettings.showCrewPills })} />
            </div>

            <div>
              <div style={{ ...viewSectionHeader, marginTop: 0 }}>Flight Card Fields</div>
              <CheckItem label="Aircraft" checked={viewSettings.fields.aircraft} disabled={viewSettings.compactMode} onChange={() => updateViewSettings({ fields: { aircraft: !viewSettings.fields.aircraft } })} />
              <CheckItem label="Account" checked={viewSettings.fields.account} disabled={viewSettings.compactMode} onChange={() => updateViewSettings({ fields: { account: !viewSettings.fields.account } })} />
              <CheckItem label="Pilot" checked={viewSettings.fields.pilot} disabled={viewSettings.compactMode} onChange={() => updateViewSettings({ fields: { pilot: !viewSettings.fields.pilot } })} />
              <CheckItem label="Route / Legs" checked={viewSettings.fields.route} disabled={viewSettings.compactMode} onChange={() => updateViewSettings({ fields: { route: !viewSettings.fields.route } })} />
              <CheckItem label="Passengers" checked={viewSettings.fields.passengers} disabled={viewSettings.compactMode} onChange={() => updateViewSettings({ fields: { passengers: !viewSettings.fields.passengers } })} />
            </div>

            <div>
              <div style={{ ...viewSectionHeader, marginTop: 0 }}>Hide By Tag</div>
              {tagOptions.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No tags in use</div>}
              {tagOptions.map(tag => (
                <CheckItem key={tag} label={`Hide ${tag}`} checked={viewSettings.hiddenTags.includes(tag)} onChange={() => toggleInViewArray('hiddenTags', tag)} />
              ))}
              <div style={viewSectionHeader}>Hide By Status</div>
              {statusOptions.map(status => (
                <CheckItem key={status} label={`Hide ${status}`} checked={viewSettings.hiddenStatuses.includes(status)} onChange={() => toggleInViewArray('hiddenStatuses', status)} />
              ))}
            </div>

            <div>
              <div style={{ ...viewSectionHeader, marginTop: 0 }}>Only Show Aircraft</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>None selected = show all</div>
              {aircraftOptions.map(ac => (
                <CheckItem key={ac} label={ac} checked={viewSettings.aircraftFilter.includes(ac)} onChange={() => toggleInViewArray('aircraftFilter', ac)} />
              ))}
            </div>

            <div>
              <div style={{ ...viewSectionHeader, marginTop: 0 }}>Only Show Account</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>None selected = show all</div>
              {accountsList.map(ac => (
                <CheckItem key={ac.id} label={ac.name} checked={viewSettings.accountFilter.includes(ac.id)} onChange={() => toggleInViewArray('accountFilter', ac.id)} />
              ))}
            </div>

            <div>
              <div style={{ ...viewSectionHeader, marginTop: 0 }}>Only Show Pilot</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>None selected = show all</div>
              {pilotsList.map(p => (
                <CheckItem key={p.id} label={p.name} checked={viewSettings.pilotFilter.includes(String(p.id))} onChange={() => toggleInViewArray('pilotFilter', String(p.id))} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="calendar-grid">
        {weekDays.map(day => (
          <div key={day} className="calendar-day-header">
            {day}
          </div>
        ))}
        
        {days.map(day => {
          const dayFlights = getFlightsForDay(day);
          return (
            <div 
              key={day.toString()} 
              className={`calendar-cell ${!isSameMonth(day, monthStart) ? 'muted' : ''}`}
              onClick={() => openModalForDate(day)}
              onDragOver={handleDragOver}
              onDrop={(e) => {
                e.stopPropagation();
                handleDrop(e, day);
              }}
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
            >
              <div className="day-number">
                {format(day, dateFormat)}
              </div>
              {(calendarNotes[format(day, 'yyyy-MM-dd')] || []).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '4px' }}>
                  {calendarNotes[format(day, 'yyyy-MM-dd')].map(note => (
                    <div
                      key={note.id}
                      title={note.content || note.title}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (pendingDuplicateFlight) {
                          openModalForDate(day);
                        } else {
                          openNoteModal(day, note);
                        }
                      }}
                      style={{
                        backgroundColor: '#edf2f7',
                        color: '#4a5568',
                        padding: '3px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        borderLeft: '3px solid #a0aec0',
                        lineHeight: '1.3'
                      }}
                    >
                      {note.title}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {dayFlights.map(flight => {
                  const firstLegPilots = flight.legs && flight.legs[0]
                    ? (flight.legs[0].pilots && flight.legs[0].pilots.length > 0 ? flight.legs[0].pilots : (flight.legs[0].pilotId ? [flight.legs[0].pilotId] : []))
                    : (flight.pilotId ? [flight.pilotId] : []);
                  const pilotName = firstLegPilots.map(pId => {
                    const p = pilotsList.find(item => String(item.id) === String(pId) || item.name === pId);
                    return p ? p.name : pId;
                  }).join(', ') || 'Unknown';
                  const account = accountsList.find(a => a.id === flight.accountId);
                  const accountName = account ? account.name : 'No Account';
                  
                  const firstLegDate = flight.legs && flight.legs[0] ? (flight.legs[0].date || (flight.date ? flight.date.split('T')[0] : null)) : null;
                  const isOvernight = (flight.legs || []).some(l => {
                    const depDate = l.date || (flight.date ? flight.date.split('T')[0] : null);
                    const arrDate = l.arrDate || depDate;
                    if (!depDate) return false;
                    return (arrDate > depDate) || (firstLegDate && depDate !== firstLegDate) || (firstLegDate && arrDate !== firstLegDate);
                  });

                  const isFlightSigned = !!(flight.flightLog?.signature || flight.flightLog?.isLocked);

                  return (
                    <div 
                      key={flight.id} 
                      className="event-badge"
                      draggable={!isFlightSigned}
                      onDragStart={(e) => {
                        if (isFlightSigned) {
                          e.preventDefault();
                          return;
                        }
                        handleDragStart(e, flight.id, day);
                      }}
                      onDragEnd={() => setDraggableFlightId(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (pendingDuplicateFlight) {
                          openModalForDate(day);
                        } else {
                          openModalForFlight(flight);
                        }
                      }}
                      style={{
                        whiteSpace: 'normal',
                        padding: '6px 8px',
                        lineHeight: '1.4',
                        backgroundColor: getAircraftColor(flight.aircraftId),
                        borderLeft: '4px solid rgba(0,0,0,0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        position: 'relative',
                        userSelect: 'text'
                      }}
                    >
                      {/* Top Right Overnight Symbol */}
                      {isOvernight && (
                        <div 
                          title="Overnight Flight (Spans multiple days)"
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
                            justifyContent: 'center',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            zIndex: 5
                          }}
                        >
                          <Moon size={11} color="#f6e05e" fill="#f6e05e" />
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                        <div 
                          style={{ 
                            cursor: isFlightSigned ? 'not-allowed' : 'grab', 
                            marginTop: '1px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            opacity: isFlightSigned ? 0.35 : 0.7
                          }}
                          title={isFlightSigned ? "Signed flights cannot be moved to a different day" : "Drag to move flight"}
                          onMouseEnter={() => !isFlightSigned && setDraggableFlightId(flight.id)}
                          onMouseLeave={() => setDraggableFlightId(null)}
                          onClick={(e) => e.stopPropagation()} // Prevent modal from opening when clicking drag handle
                        >
                          <GripVertical size={14} color="var(--primary-color)" />
                        </div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                          <span>#{flight.flightNumber}: {flight.title}</span>
                        </div>
                      </div>
                      {!viewSettings.compactMode && viewSettings.fields.aircraft && (
                        <div style={{ fontSize: '0.7rem' }}>{flight.aircraftId}</div>
                      )}
                      {!viewSettings.compactMode && viewSettings.fields.account && (
                        <div style={{ fontSize: '0.7rem' }}>{accountName}</div>
                      )}
                      {!viewSettings.compactMode && viewSettings.fields.pilot && (
                        <div style={{ fontSize: '0.7rem' }}><strong>{firstLegPilots.length > 1 ? 'Pilots:' : 'Pilot:'}</strong> {pilotName}</div>
                      )}

                      {!viewSettings.compactMode && viewSettings.fields.route && renderRouteDetails(flight, day, viewSettings.fields.passengers)}

                      {!viewSettings.compactMode && (
                        <div style={{ display: 'flex', gap: '5px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{
                            backgroundColor: 'rgba(255,255,255,0.4)',
                            color: '#2d3748',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                          }}>{flight.status || 'Confirmed'}</span>

                          {flight.tag && (
                            <span style={{
                              backgroundColor: flight.tag === 'Emergency' ? '#ed8936' : flight.tag === 'Maintenance' ? '#e53e3e' : '#e53e3e',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.65rem',
                              fontWeight: 'bold'
                            }}>
                              {flight.tag} {flight.tag === 'Emergency' || flight.tag === 'Maintenance' ? 'Flight' : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {viewSettings.showCrewPills && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: 'auto', paddingTop: '8px' }}>
                {Object.keys(crewSchedules).map(key => {
                   const dayStr = format(day, 'yyyy-MM-dd');
                   const dateSuffix = `_${dayStr}`;
                   if (!key.endsWith(dateSuffix) && !key.includes(dayStr)) return null;
                   const pId = key.includes(dateSuffix) ? key.substring(0, key.lastIndexOf(dateSuffix)) : key.split('_')[0];
                   const dateStr = dayStr;
                   
                   const status = crewSchedules[key];
                   if (!status || status === 'Clear') return null;
                   const pilot = (pilotsList || []).find(p => String(p.id) === String(pId) || p.name === pId);
                   const pax = (passengersList || []).find(p => String(p.id) === String(pId) || p.name === pId);
                   if (!pilot && !pax) return null;
                   const person = pilot || pax;
                   const name = person.name;
                   
                   const LEGEND = {
                     'Note': '#f59e0b', 
                     'Off Duty': '#ef4444', 
                     'On Duty': '#22c55e', 
                     'Training': '#eab308', 
                     'Vacation': '#3b82f6', 
                     'Overnight': '#6b7280'
                   };
                   const color = LEGEND[status] || '#ccc';

                   return (
                     <div 
                       key={key} 
                       onClick={(e) => {
                         e.stopPropagation();
                         setCellModalOpen({ personId: pId, dateStr, status: status || '' });
                       }}
                       title={`Click to edit ${name}'s itinerary for ${dateStr}`}
                       style={{
                         backgroundColor: color,
                         color: 'white',
                         padding: '3px 7px',
                         borderRadius: '4px',
                         fontSize: '0.7rem',
                         fontWeight: 'bold',
                         display: 'flex',
                         justifyContent: 'space-between',
                         alignItems: 'center',
                         cursor: 'pointer',
                         boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                         transition: 'transform 0.1s ease, filter 0.1s ease'
                       }}
                     >
                       <span>{name}</span>
                       <span style={{ opacity: 0.9, fontSize: '0.62rem', textTransform: 'uppercase' }}>{status}</span>
                     </div>
                   );
                })}
              </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Notes Modal */}
      {noteModal.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={closeNoteModal}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', width: '480px', maxWidth: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} color="var(--text-muted)" /> {noteModal.editId ? 'Edit Note' : 'Add Note'}
              </h3>
              <button onClick={closeNoteModal} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            {!noteModal.editId && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Start Date</label>
                  <input
                    type="date"
                    value={noteModal.date}
                    onChange={e => setNoteModal(prev => ({ ...prev, date: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>End Date</label>
                  <input
                    type="date"
                    value={noteModal.dateEnd || noteModal.date}
                    min={noteModal.date}
                    onChange={e => setNoteModal(prev => ({ ...prev, dateEnd: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}
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
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Title</label>
              <input
                type="text"
                value={noteModal.title}
                onChange={e => setNoteModal(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Note title..."
                autoFocus
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}
                onKeyDown={e => { if (e.key === 'Enter') saveNote(); }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Notes</label>
              <textarea
                value={noteModal.content}
                onChange={e => setNoteModal(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter notes here..."
                rows={5}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {noteModal.editId && (
                <button className="btn btn-outline" style={{ color: '#e53e3e', borderColor: '#e53e3e' }} onClick={() => { deleteNote(noteModal.date, noteModal.editId); closeNoteModal(); }}>
                  Delete
                </button>
              )}
              <button className="btn btn-outline" onClick={closeNoteModal}>Cancel</button>
              <button className="btn btn-primary" onClick={saveNote}>{noteModal.editId ? 'Save' : 'Add Note'}</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (() => {
        const sortedFlights = [...flights].sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA !== dateB) return dateA - dateB;
          const timeA = a.legs && a.legs[0] ? a.legs[0].takeoffTime : '00:00';
          const timeB = b.legs && b.legs[0] ? b.legs[0].takeoffTime : '00:00';
          return timeA.localeCompare(timeB);
        });
        
        const currentFlightIndex = editingFlight ? sortedFlights.findIndex(f => f.id === editingFlight.id) : -1;
        const hasPrev = currentFlightIndex > 0;
        const hasNext = currentFlightIndex !== -1 && currentFlightIndex < sortedFlights.length - 1;

        const handleNavigate = (direction) => {
          if (direction === 'prev' && hasPrev) {
            const prevFlight = sortedFlights[currentFlightIndex - 1];
            setEditingFlight(prevFlight);
            setSelectedDate(new Date(prevFlight.date));
          } else if (direction === 'next' && hasNext) {
            const nextFlight = sortedFlights[currentFlightIndex + 1];
            setEditingFlight(nextFlight);
            setSelectedDate(new Date(nextFlight.date));
          }
        };

        return (
          <EventModal 
            isOpen={isModalOpen} 
            onClose={() => {
              sessionStorage.removeItem('baseops_open_flight_id');
              setIsModalOpen(false);
            }} 
            onSave={handleSaveFlight}
            onDelete={handleDeleteFlight}
            onDuplicate={(flightData) => {
              sessionStorage.removeItem('baseops_open_flight_id');
              setPendingDuplicateFlight(flightData);
              setIsModalOpen(false);
            }}
            onNavigate={handleNavigate}
            hasPrev={hasPrev}
            hasNext={hasNext}
            initialDate={selectedDate}
            flight={editingFlight}
            flightsCount={flights.length === 0 ? 0 : Math.max(...flights.map(f => parseInt(f.flightNumber) || 0))}
          />
        );
      })()}

      {dropConflictModal.open && (
        <ConflictWarningModal
          pilotConflicts={dropConflictModal.pilotConflicts}
          aircraftConflicts={dropConflictModal.aircraftConflicts}
          pilotNames={Object.fromEntries(pilotsList.map(p => [String(p.id), p.name]))}
          onProceed={applyDropFlight}
          onCancel={() => setDropConflictModal({ open: false, pilotConflicts: [], aircraftConflicts: [], pendingFlight: null })}
        />
      )}

      {/* Daily Itinerary Modal */}
      {cellModalOpen && (() => {
        const { personId, dateStr, status } = cellModalOpen;
        const pilot = pilotsList.find(p => String(p.id) === String(personId) || p.name === personId);
        const pax = passengersList.find(p => String(p.id) === String(personId) || p.name === personId);
        const person = pilot ? { ...pilot, type: 'pilot' } : pax ? { ...pax, type: pax.isCrew ? 'crew' : 'pax' } : { id: personId, name: personId, type: 'pilot' };
        
        const targetDate = new Date(dateStr + 'T12:00:00');
        const dayFlights = (flights || []).filter(f => {
          const fDate = f.date ? f.date.split('T')[0] : '';
          const legs = f.legs || [];
          if (legs.length === 0) {
            const hasPerson = (f.pilotId === personId) || (f.passengers && f.passengers.includes(personId));
            return fDate === dateStr && hasPerson;
          }
          return legs.some(l => {
            const lDate = l.date || fDate;
            const hasPerson = (l.pilotId === personId) || (l.pilots && l.pilots.includes(personId)) || (l.passengers && l.passengers.includes(personId));
            return lDate === dateStr && hasPerson;
          });
        });

        const getName = (val) => {
          if (!val) return '';
          if (airportsData[val]) return val;
          const zone = mockCustomZones.find(z => z.id === val || z.name === val);
          if (zone) return zone.name;
          return val;
        };

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
                       fontSize: '0.68rem', 
                       fontWeight: 700, 
                       padding: '2px 6px', 
                       borderRadius: '4px', 
                       backgroundColor: person?.type === 'pilot' ? '#bee3f8' : person?.type === 'crew' ? '#fefcbf' : '#c6f6d5',
                       color: person?.type === 'pilot' ? '#2b6cb0' : person?.type === 'crew' ? '#975a16' : '#22543d',
                       border: `1px solid ${person?.type === 'pilot' ? '#90cdf4' : person?.type === 'crew' ? '#f6e05e' : '#9ae6b4'}`
                    }}>
                      {person?.type === 'pilot' ? 'PILOT' : person?.type === 'crew' ? 'CREW' : 'PAX'}
                    </span>
                  </div>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setCellModalOpen(null)}><X size={20} /></button>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{person?.name}</div>
                <div style={{ color: 'var(--text-muted)' }}>{format(targetDate, 'EEEE, MMMM do, yyyy')}</div>
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
                  <button 
                    className="btn btn-outline" 
                    style={{ color: '#e53e3e', borderColor: '#e53e3e', padding: '8px 14px' }} 
                    onClick={() => { 
                      handleCellStatusClick(personId, dateStr, 'Clear'); 
                      setCellModalOpen(null); 
                    }}
                  >
                    Clear
                  </button>
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
                                openModalForFlight(f);
                              }}
                            >
                              Open Flight
                            </button>
                          </div>
                          <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'white' }}>
                            <div><strong>Aircraft:</strong> {f.aircraftId || 'None'}</div>
                            {f.legs && f.legs.length > 0 && (
                              <div>
                                <strong>Route:</strong>
                                <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
                                  {f.legs.map((l, i) => (
                                    <li key={i}>{getName(l.departure)} &#8594; {getName(l.destination)} ({l.takeoffTime || '--:--'} - {l.landTime || '--:--'})</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default CalendarView;
