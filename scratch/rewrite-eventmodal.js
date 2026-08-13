import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, MapPin, Plus, Minus, ArrowDown, GripVertical, Plane, MessageSquare, BookOpen, Clock } from 'lucide-react';
import { mockPilots, mockAircrafts, mockAccounts, mockCustomZones } from '../data';
import airportsData from '../data/airports.json';

// --- CUSTOM ZONE CREATION MODAL ---
const CustomZoneModal = ({ isOpen, onClose, onSave, initialSearch }) => {
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [hazards, setHazards] = useState('');

  useEffect(() => {
    if (initialSearch) {
      setTitle(initialSearch);
      setId(initialSearch.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 6));
    }
  }, [initialSearch]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const newZone = {
      id: id || `CZ-${Date.now().toString().slice(-4)}`,
      title,
      address,
      coordinates,
      contactName,
      contactPhone,
      hazards,
      usageCount: 1, // Start with 1 so it appears in recent
      type: 'custom'
    };
    onSave(newZone);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1100, padding: '20px'
    }}>
      <div className="card" style={{ width: '500px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ color: 'var(--primary-color)' }}>Create Custom Landing Zone</h3>
          <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>ID / Abbreviation</label>
              <input type="text" value={id} onChange={(e) => setId(e.target.value)} required placeholder="e.g. HOSP1"
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Location Name</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. North Hospital Helipad"
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Address (Optional)</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 123 Main St, City, ST"
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>GPS Coordinates (Optional)</label>
            <input type="text" value={coordinates} onChange={(e) => setCoordinates(e.target.value)} placeholder="e.g. 41.40338, 2.17403"
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Contact Name</label>
              <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Who to call"
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Contact Phone</label>
              <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Phone number"
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--accent-color)' }}>Hazards / Notes</label>
            <textarea value={hazards} onChange={(e) => setHazards(e.target.value)} placeholder="e.g. Power lines on short final approach"
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', minHeight: '80px', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit}>Save to Database</button>
          </div>
        </div>
      </div>
    </div>
  );
};


// --- LOCATION SELECT ---
const LocationSelect = ({ value, onChange, label, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(30);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  const listRef = useRef(null);
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking inside the custom modal
      if (document.getElementById('custom-zone-modal')) return;
      
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Fetch user-created zones from local storage to act as our persistent database
  const getStoredCustomZones = () => {
    try {
      return JSON.parse(localStorage.getItem('userCustomZones') || '[]');
    } catch (e) {
      return [];
    }
  };

  const getUsageCount = (id) => {
    try {
      const usageData = JSON.parse(localStorage.getItem('locationUsage') || '{}');
      return usageData[id] || 0;
    } catch (e) {
      return 0;
    }
  };

  const storedZones = getStoredCustomZones();

  const allLocations = [
    ...mockCustomZones.map(cz => {
      const override = storedZones.find(s => s.id === cz.id);
      const data = override || cz;
      return { ...data, isCustom: true, displayName: data.title, searchString: `${data.title} ${data.address || ''}`.toLowerCase(), usageCount: getUsageCount(data.id) };
    }),
    ...storedZones.filter(sz => sz.type === 'custom' && !mockCustomZones.find(c => c.id === sz.id)).map(cz => {
      return { ...cz, isCustom: true, displayName: cz.title, searchString: `${cz.title} ${cz.address || ''}`.toLowerCase(), usageCount: getUsageCount(cz.id) };
    }),
    ...airportsData.map(ap => {
      const override = storedZones.find(s => s.id === ap.id);
      const data = override || ap;
      return { ...data, isCustom: false, displayName: `${data.id} - ${data.title || data.name}`, searchString: `${data.id} ${data.title || data.name} ${data.address || data.municipality}`.toLowerCase(), usageCount: getUsageCount(data.id) };
    })
  ];

  const selectedDisplay = () => {
    if (!value) return placeholder || 'Select...';
    
    // First check custom zones or overrides
    const cz = [...mockCustomZones, ...storedZones].find(c => c.id === value.id);
    if (cz) return cz.title || cz.name || cz.id;

    // Then check raw airports
    if (value.type === 'airport') {
      const ap = airportsData.find(a => a.id === value.id);
      return ap ? `${ap.id} - ${ap.name}` : value.id;
    }
    
    return 'Custom Zone';
  };

  let displayList = [];
  if (search.trim() === '') {
    displayList = allLocations.filter(loc => loc.usageCount > 0).sort((a, b) => b.usageCount - a.usageCount);
  } else {
    displayList = allLocations.filter(loc => loc.searchString.includes(search.toLowerCase())).sort((a, b) => {
      if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
      return a.displayName.localeCompare(b.displayName);
    });
  }

  const visibleLocations = displayList.slice(0, visibleCount);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      setVisibleCount(prev => Math.min(prev + 30, displayList.length));
    }
  };

  useEffect(() => {
    setVisibleCount(30);
  }, [search]);

  const handleSaveCustomZone = (newZone) => {
    // Save to local storage database
    const currentZones = getStoredCustomZones();
    localStorage.setItem('userCustomZones', JSON.stringify([...currentZones, newZone]));
    
    // Auto increment usage so it shows up in recents
    const usageData = JSON.parse(localStorage.getItem('locationUsage') || '{}');
    usageData[newZone.id] = (usageData[newZone.id] || 0) + 1;
    localStorage.setItem('locationUsage', JSON.stringify(usageData));

    // Select it
    onChange({ type: 'custom', id: newZone.id });
    setIsCustomModalOpen(false);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={dropdownRef} style={{ display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative', flex: 1, minWidth: 0 }}>
      {label && <label style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>{label}</label>}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', 
          cursor: 'pointer', backgroundColor: 'white', display: 'flex', alignItems: 'center', gap: '8px',
          height: '36px', width: '100%', boxSizing: 'border-box'
        }}
      >
        <MapPin size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.875rem', color: value ? 'inherit' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
          {selectedDisplay()}
        </span>
      </div>

      {isOpen && !isCustomModalOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, 
          backgroundColor: 'white', border: '1px solid var(--border-color)', 
          borderRadius: '4px', zIndex: 10, maxHeight: '300px', 
          display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--shadow-md)', marginTop: '4px', minWidth: '250px'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>
            <input 
              type="text" 
              placeholder="Search by name, city, or ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.875rem', boxSizing: 'border-box' }}
              autoFocus
            />
          </div>
          
          <div ref={listRef} onScroll={handleScroll} style={{ overflowY: 'auto', flex: 1 }}>
            {search.trim() === '' && displayList.length > 0 && (
               <div style={{ padding: '6px 10px', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', backgroundColor: 'var(--bg-color)' }}>
                 Frequently Used
               </div>
            )}
            {search.trim() === '' && displayList.length === 0 && (
               <div style={{ padding: '12px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.8rem' }}>
                 Start typing to search...
               </div>
            )}

            {visibleLocations.map(loc => (
              <div 
                key={loc.isCustom ? `custom-${loc.id}` : `ap-${loc.id}`}
                onClick={() => { onChange({ type: loc.isCustom ? 'custom' : 'airport', id: loc.id }); setIsOpen(false); setSearch(''); }}
                style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.875rem' }}>{loc.isCustom ? loc.title : loc.id}</strong>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    {loc.usageCount > 0 && <span style={{ fontSize: '0.65rem', color: 'var(--primary-color)' }}>Used {loc.usageCount}x</span>}
                    {loc.isCustom && <span style={{ fontSize: '0.65rem', backgroundColor: '#e2e8f0', padding: '2px 4px', borderRadius: '4px' }}>Custom LZ</span>}
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {loc.isCustom ? loc.address : `${loc.name} - ${loc.municipality}, ${loc.state}`}
                </div>
              </div>
            ))}
            
            {/* Create Custom Location Button */}
            {search.trim() !== '' && (
              <div 
                onClick={() => setIsCustomModalOpen(true)}
                style={{ 
                  padding: '10px 12px', cursor: 'pointer', 
                  backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)',
                  fontWeight: '500', fontSize: '0.875rem',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  borderTop: '1px solid var(--primary-color)'
                }}
              >
                <Plus size={16} /> Add "{search}" as new Custom LZ...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Portal/Inline modal for custom zone creation */}
      <div id="custom-zone-modal">
        <CustomZoneModal 
          isOpen={isCustomModalOpen} 
          onClose={() => setIsCustomModalOpen(false)} 
          onSave={handleSaveCustomZone}
          initialSearch={search}
        />
      </div>
    </div>
  );
};


// --- EVENT MODAL ---
const EventModal = ({ isOpen, onClose, onSave, onDelete, onDuplicate, initialDate, flight, flightsCount }) => {
  const [date, setDate] = useState(initialDate ? initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [flightNumber, setFlightNumber] = useState('');
  const [title, setTitle] = useState('');
  const [accountId, setAccountId] = useState('');
  const [comments, setComments] = useState('');
  const [activeTab, setActiveTab] = useState('Comments');
  
  const [legs, setLegs] = useState([
    { departure: null, destination: null, takeoffTime: '08:00', landTime: '09:00', duration: 60, passengers: [], pilotId: '' }
  ]);

  const [aircraftId, setAircraftId] = useState('');
  const [pilotsList, setPilotsList] = useState([]);
  const [aircraftList, setAircraftList] = useState([]);
  const [passengersList, setPassengersList] = useState([]);

  useEffect(() => {
    try {
      const storedPilots = JSON.parse(localStorage.getItem('userPilots'));
      if (storedPilots && storedPilots.length > 0) setPilotsList(storedPilots);
      else setPilotsList(mockPilots);
    } catch(e) { setPilotsList(mockPilots); }

    try {
      const storedAircraft = JSON.parse(localStorage.getItem('userAircraft'));
      if (storedAircraft && storedAircraft.length > 0) setAircraftList(storedAircraft);
      else setAircraftList(mockAircrafts);
    } catch(e) { setAircraftList(mockAircrafts); }

    try {
      const storedPax = JSON.parse(localStorage.getItem('userPassengers'));
      if (storedPax && storedPax.length > 0) setPassengersList(storedPax);
    } catch(e) {}
  }, []);

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [draggableLegIndex, setDraggableLegIndex] = useState(null);

  useEffect(() => {
    if (flight) {
      setDate(flight.date ? new Date(flight.date).toISOString().split('T')[0] : '');
      setFlightNumber(flight.flightNumber || '');
      setTitle(flight.title || '');
      setAccountId(flight.accountId || '');
      setComments(flight.comments || '');
      
      if (flight.legs && flight.legs.length > 0) {
        const mappedLegs = flight.legs.map((l, i) => ({
          ...l,
          duration: l.duration || 60,
          passengers: l.passengers || (i === 0 && flight.passengers ? flight.passengers : []),
          pilotId: l.pilotId || (i === 0 && flight.pilotId ? flight.pilotId : '')
        }));
        setLegs(mappedLegs);
      } else {
        setLegs([{ departure: null, destination: null, takeoffTime: '08:00', landTime: '09:00', duration: 60, passengers: [], pilotId: '' }]);
      }
      setAircraftId(flight.aircraftId || '');
    } else {
      if (initialDate) setDate(initialDate.toISOString().split('T')[0]);
      setFlightNumber(flightsCount + 1);
    }
  }, [flight, initialDate, flightsCount]);

  if (!isOpen) return null;

  const addMinutes = (timeString, minsToAdd) => {
    if (!timeString) return '';
    const [h, m] = timeString.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m + minsToAdd, 0, 0);
    return d.toTimeString().slice(0, 5);
  };

  const getDurationMinutes = (takeoff, land) => {
    if (!takeoff || !land) return 60;
    const [th, tm] = takeoff.split(':').map(Number);
    const [lh, lm] = land.split(':').map(Number);
    let diff = (lh * 60 + lm) - (th * 60 + tm);
    if (diff < 0) diff += 24 * 60;
    return diff;
  };

  const recalculateLegTimes = (legArray) => {
    const newLegs = [...legArray];
    for (let i = 1; i < newLegs.length; i++) {
      const prevLand = newLegs[i - 1].landTime;
      const duration = newLegs[i].duration || getDurationMinutes(newLegs[i].takeoffTime, newLegs[i].landTime);
      newLegs[i].takeoffTime = addMinutes(prevLand, 15);
      newLegs[i].landTime = addMinutes(newLegs[i].takeoffTime, duration);
      newLegs[i].duration = duration;
    }
    return newLegs;
  };

  const getDistanceNM = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 3440.065;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getLocationCoords = (locationVal) => {
    if (!locationVal || !locationVal.id) return null;
    if (locationVal.type === 'airport') {
      const ap = airportsData.find(a => a.id === locationVal.id);
      return ap ? { lat: ap.lat, lon: ap.lon } : null;
    } else {
      let storedZones = [];
      try { storedZones = JSON.parse(localStorage.getItem('userCustomZones') || '[]'); } catch(e){}
      const cz = [...mockCustomZones, ...storedZones].find(c => c.id === locationVal.id);
      if (!cz) return null;
      if (cz.lat && cz.lon) return { lat: parseFloat(cz.lat), lon: parseFloat(cz.lon) };
      if (cz.coordinates) {
        const parts = cz.coordinates.split(',');
        if (parts.length === 2) return { lat: parseFloat(parts[0]), lon: parseFloat(parts[1]) };
      }
      return null;
    }
  };

  const calculateEstimatedMinutes = (dep, dest, acId) => {
    const coords1 = getLocationCoords(dep);
    const coords2 = getLocationCoords(dest);
    if (!coords1 || !coords2) return null;
    const distNM = getDistanceNM(coords1.lat, coords1.lon, coords2.lat, coords2.lon);
    if (distNM === null) return null;
    let speed = 120;
    if (acId) {
      const ac = aircraftList.find(a => a.id === acId);
      if (ac && ac.maxCruiseSpeed) speed = ac.maxCruiseSpeed;
    }
    const minutes = Math.ceil((distNM / speed) * 60);
    return { mins: Math.max(1, minutes), nm: Math.round(distNM) };
  };

  const handleUpdateLeg = (index, field, value) => {
    let newLegs = [...legs];
    newLegs[index][field] = value;
    
    if (field === 'departure' || field === 'destination') {
       const est = calculateEstimatedMinutes(newLegs[index].departure, newLegs[index].destination, aircraftId);
       if (est) {
         newLegs[index].duration = est.mins;
         newLegs[index].distance = est.nm;
         newLegs[index].landTime = addMinutes(newLegs[index].takeoffTime, est.mins);
         newLegs = recalculateLegTimes(newLegs);
       }
    } else if (field === 'duration') {
       const hours = parseFloat(value) || 0;
       const mins = Math.round(hours * 60);
       newLegs[index].duration = mins;
       newLegs[index].landTime = addMinutes(newLegs[index].takeoffTime, mins);
       newLegs = recalculateLegTimes(newLegs);
    } else if (field === 'takeoffTime' || field === 'landTime') {
      newLegs[index].duration = getDurationMinutes(newLegs[index].takeoffTime, newLegs[index].landTime);
      newLegs = recalculateLegTimes(newLegs);
    }
    
    setLegs(newLegs);
  };

  const handleSort = () => {
    let _legs = [...legs];
    const draggedItemContent = _legs.splice(dragItem.current, 1)[0];
    _legs.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    _legs = recalculateLegTimes(_legs);
    setLegs(_legs);
  };

  const handleAddLeg = () => {
    const lastLeg = legs[legs.length - 1];
    const newTakeoff = addMinutes(lastLeg.landTime, 15) || '10:00';
    const newLand = addMinutes(newTakeoff, 60) || '11:00';
    setLegs([...legs, { 
      departure: lastLeg.destination || null, 
      destination: null, 
      takeoffTime: newTakeoff, 
      landTime: newLand,
      duration: 60,
      passengers: [],
      pilotId: lastLeg.pilotId || ''
    }]);
  };

  const incrementUsage = (locationId) => {
    if (!locationId) return;
    try {
      const usageData = JSON.parse(localStorage.getItem('locationUsage') || '{}');
      usageData[locationId] = (usageData[locationId] || 0) + 1;
      localStorage.setItem('locationUsage', JSON.stringify(usageData));
    } catch (e) {}
  };

  const handleSubmit = () => {
    legs.forEach(leg => {
      if (leg.departure && leg.departure.id) incrementUsage(leg.departure.id);
      if (leg.destination && leg.destination.id) incrementUsage(leg.destination.id);
    });

    onSave({
      id: flight ? flight.id : undefined,
      flightNumber,
      title,
      accountId,
      legs,
      date: new Date(date).toISOString(),
      aircraftId,
      comments
    });
  };

  const isValidRoute = legs.every(l => l.departure !== null && l.destination !== null);
  
  const formatTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}H ${m}M`;
  };

  const getLocationDetails = (locVal) => {
    if (!locVal || !locVal.id) return { display: '', city: '' };
    if (locVal.type === 'airport') {
      const ap = airportsData.find(a => a.id === locVal.id);
      return ap ? { display: ap.id, city: `${ap.municipality || ap.name}, ${ap.state}`, name: ap.name } : { display: locVal.id, city: '' };
    } else {
      let storedZones = [];
      try { storedZones = JSON.parse(localStorage.getItem('userCustomZones') || '[]'); } catch(e){}
      const cz = [...mockCustomZones, ...storedZones].find(c => c.id === locVal.id);
      if (!cz) return { display: locVal.id, city: '' };
      return { display: cz.title, city: cz.address || 'Custom LZ', name: cz.title };
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px'
    }}>
      <div style={{ width: '95vw', maxWidth: '1400px', height: '90vh', backgroundColor: '#f4f5f7', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '15px 20px', borderBottom: '2px solid var(--border-color)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>TRIP # <strong style={{ color: 'var(--text-color)' }}>{flightNumber || 'NEW'}</strong></div>
            <div style={{ width: '1px', height: '30px', backgroundColor: 'var(--border-color)' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
               <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>TITLE</span>
               <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ border: 'none', fontWeight: 'bold', fontSize: '1rem', outline: 'none', color: 'var(--text-color)', width: '200px' }} placeholder="Enter Trip Title..." />
            </div>
            <div style={{ width: '1px', height: '30px', backgroundColor: 'var(--border-color)' }}></div>
            <div style={{ color: '#38a169', fontWeight: 'bold' }}>{flight ? 'Scheduled' : 'Draft'}</div>
            <div style={{ width: '1px', height: '30px', backgroundColor: 'var(--border-color)' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
               <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>ACCOUNT</span>
               <select value={accountId} onChange={e => setAccountId(e.target.value)} style={{ border: 'none', fontWeight: '500', outline: 'none', fontSize: '0.9rem', backgroundColor: 'transparent' }}>
                 <option value="">Select Account...</option>
                 {mockAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
               </select>
            </div>
            <div style={{ width: '1px', height: '30px', backgroundColor: 'var(--border-color)' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
               <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>AIRCRAFT</span>
               <select value={aircraftId} onChange={e => {
                  const newAcId = e.target.value;
                  setAircraftId(newAcId);
                  let newLegs = [...legs];
                  let changed = false;
                  for (let i = 0; i < newLegs.length; i++) {
                     const est = calculateEstimatedMinutes(newLegs[i].departure, newLegs[i].destination, newAcId);
                     if (est) {
                       newLegs[i].duration = est.mins;
                       newLegs[i].distance = est.nm;
                       newLegs[i].landTime = addMinutes(newLegs[i].takeoffTime, est.mins);
                       changed = true;
                     }
                  }
                  if (changed) setLegs(recalculateLegTimes(newLegs));
               }} style={{ border: 'none', fontWeight: '500', outline: 'none', fontSize: '0.9rem', backgroundColor: 'transparent' }}>
                 <option value="">Select Aircraft...</option>
                 {aircraftList.map(a => <option key={a.id} value={a.id}>{a.id} ({a.model})</option>)}
               </select>
            </div>
            <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <BookOpen size={12}/> FLIGHT TAGS
            </div>
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button type="button" onClick={handleSubmit} disabled={!isValidRoute} style={{ backgroundColor: '#48bb78', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: isValidRoute ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '5px' }}>
               ✓ RELEASED
            </button>
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="var(--text-muted)"/></button>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '0' }}>
            {legs.map((leg, index) => {
              const depLoc = getLocationDetails(leg.departure);
              const arrLoc = getLocationDetails(leg.destination);
              
              return (
                <React.Fragment key={index}>
                  <div 
                    draggable={draggableLegIndex === index}
                    onDragStart={(e) => (dragItem.current = index)}
                    onDragEnter={(e) => (dragOverItem.current = index)}
                    onDragEnd={() => { handleSort(); setDraggableLegIndex(null); }}
                    onDragOver={(e) => e.preventDefault()}
                    style={{ display: 'flex', backgroundColor: 'white', borderRadius: index === 0 ? '8px 8px 0 0' : '0', border: '1px solid var(--border-color)', borderBottom: 'none', overflow: 'hidden', minHeight: '120px' }}
                  >
                    {/* Leg Number */}
                    <div style={{ width: '60px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px 0', backgroundColor: '#fafbfc' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{index + 1}</div>
                      <div style={{ fontSize: '0.65rem', border: '1px solid #48bb78', color: '#48bb78', padding: '2px 6px', borderRadius: '12px', marginTop: '10px', backgroundColor: '#f0fff4' }}>0 Advisories</div>
                      <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', fontSize: '0.55rem', padding: '2px 6px', borderRadius: '12px', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '2px' }}><BookOpen size={10}/> LEG TAGS</div>
                      <div style={{ cursor: 'grab', marginTop: 'auto', paddingBottom: '10px' }} onMouseEnter={() => setDraggableLegIndex(index)} onMouseLeave={() => setDraggableLegIndex(null)}><GripVertical size={16} color="var(--text-muted)"/></div>
                    </div>

                    {/* Departure */}
                    <div style={{ flex: '1', padding: '15px 20px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{date}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                           <input type="time" value={leg.takeoffTime} onChange={e => handleUpdateLeg(index, 'takeoffTime', e.target.value)} style={{ fontSize: '1rem', fontWeight: 'bold', color: '#48bb78', border: 'none', outline: 'none', cursor: 'pointer' }} />
                           <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>[Zulu]</span>
                        </div>
                      </div>
                      <LocationSelect value={leg.departure} onChange={(val) => handleUpdateLeg(index, 'departure', val)} placeholder="Type origin..." />
                      {depLoc.display && (
                         <div style={{ marginTop: '5px' }}>
                           <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{depLoc.display}</div>
                           <div style={{ fontSize: '0.8rem' }}>{depLoc.name}</div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{depLoc.city}</span>
                              <span style={{ fontWeight: 'bold' }}>{leg.passengers.length} PAX</span>
                           </div>
                         </div>
                      )}
                    </div>

                    {/* Flight Path */}
                    <div style={{ width: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{leg.distance || '?'} NM</div>
                      <div style={{ display: 'flex', alignItems: 'center', color: 'var(--primary-color)', margin: '5px 0', width: '100%' }}>
                        <span style={{ flex: 1, borderTop: '2px dashed var(--border-color)' }}></span>
                        <Plane size={16} style={{ margin: '0 5px' }} />
                        <span style={{ flex: 1, borderTop: '2px dashed var(--border-color)' }}></span>
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'orange' }}>
                        <input type="number" value={leg.duration ? parseFloat((leg.duration / 60).toFixed(2)) : ''} onChange={e => handleUpdateLeg(index, 'duration', e.target.value)} style={{ width: '40px', border: 'none', outline: 'none', textAlign: 'center', color: 'orange', fontWeight: 'bold' }} /> HR
                      </div>
                    </div>

                    {/* Arrival */}
                    <div style={{ flex: '1', padding: '15px 20px', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{date}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                           <input type="time" value={leg.landTime} onChange={e => handleUpdateLeg(index, 'landTime', e.target.value)} style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-color)', border: 'none', outline: 'none', cursor: 'pointer' }} />
                           <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>[Zulu]</span>
                        </div>
                      </div>
                      <LocationSelect value={leg.destination} onChange={(val) => handleUpdateLeg(index, 'destination', val)} placeholder="Type destination..." />
                      {arrLoc.display && (
                         <div style={{ marginTop: '5px' }}>
                           <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{arrLoc.display}</div>
                           <div style={{ fontSize: '0.8rem' }}>{arrLoc.name}</div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{arrLoc.city}</span>
                           </div>
                         </div>
                      )}
                    </div>

                    {/* Crew & Pax (Right Sidebar) */}
                    <div style={{ width: '220px', padding: '15px', borderLeft: '1px solid var(--border-color)', backgroundColor: '#fafbfc', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                         <label style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Pilot / Crew</label>
                         <select value={leg.pilotId} onChange={e => handleUpdateLeg(index, 'pilotId', e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem', backgroundColor: 'white' }}>
                           <option value="">Select Pilot...</option>
                           {pilotsList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                         </select>
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                         <label style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Passengers ({leg.passengers.length})</label>
                         <div style={{ maxHeight: '80px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '5px', backgroundColor: 'white' }}>
                            {passengersList.length === 0 && <span style={{fontSize:'0.65rem', color:'var(--text-muted)'}}>No passengers available</span>}
                            {passengersList.map(pax => (
                              <label key={pax.id} style={{ display: 'block', fontSize: '0.75rem', cursor: 'pointer', marginBottom: '2px' }}>
                                <input 
                                  type="checkbox" 
                                  checked={leg.passengers.includes(pax.id) || leg.passengers.includes(pax.name)} 
                                  onChange={(e) => {
                                    const current = leg.passengers || [];
                                    if (e.target.checked) handleUpdateLeg(index, 'passengers', [...current, pax.id]);
                                    else handleUpdateLeg(index, 'passengers', current.filter(p => p !== pax.id && p !== pax.name));
                                  }}
                                  style={{ marginRight: '5px' }}
                                />
                                {pax.name}
                              </label>
                            ))}
                         </div>
                       </div>
                       {legs.length > 1 && (
                         <button onClick={() => handleRemoveLeg(index)} style={{ marginTop: 'auto', background: 'none', border: 'none', color: 'red', fontSize: '0.75rem', cursor: 'pointer', textAlign: 'right' }}>Remove Leg</button>
                       )}
                    </div>
                  </div>
                  
                  {/* Layover/Flight Time Bar */}
                  <div style={{ backgroundColor: '#d1d5db', padding: '6px 20px', fontSize: '0.65rem', fontWeight: 'bold', color: '#4b5563', display: 'flex', gap: '30px', alignItems: 'center', border: '1px solid #9ca3af', borderTop: 'none', borderRadius: index === legs.length - 1 ? '0 0 8px 8px' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Clock size={12}/> {formatTime(leg.duration)} FLIGHT</div>
                    {index < legs.length - 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>{formatTime(getDurationMinutes(leg.landTime, legs[index+1].takeoffTime))} LAYOVER</div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
            
            <div style={{ marginTop: '15px' }}>
              <button type="button" onClick={handleAddLeg} style={{ backgroundColor: 'white', border: '1px dashed var(--primary-color)', color: 'var(--primary-color)', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                 <Plus size={16}/> ADD LEG
              </button>
            </div>
          </div>

          {/* BOTTOM TABS */}
          <div style={{ backgroundColor: 'white', marginTop: 'auto', display: 'flex', borderTop: '1px solid var(--border-color)', minHeight: '200px' }}>
             <div style={{ width: '200px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                {['Comments', 'Permissions', 'History'].map(tab => (
                   <div 
                     key={tab} 
                     onClick={() => setActiveTab(tab)}
                     style={{ padding: '15px 20px', cursor: 'pointer', fontWeight: activeTab === tab ? 'bold' : 'normal', backgroundColor: activeTab === tab ? '#f4f5f7' : 'transparent', borderBottom: '1px solid var(--border-color)' }}
                   >
                     {tab}
                   </div>
                ))}
             </div>
             <div style={{ flex: 1, padding: '20px', backgroundColor: '#f4f5f7' }}>
                {activeTab === 'Comments' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                     <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Comment</label>
                     <textarea 
                       value={comments} 
                       onChange={e => setComments(e.target.value)}
                       placeholder="Add a comment that only staff see for this flight..." 
                       style={{ flex: 1, width: '100%', padding: '15px', borderRadius: '4px', border: '1px solid var(--border-color)', resize: 'none', backgroundColor: 'white' }}
                     />
                  </div>
                )}
                {activeTab !== 'Comments' && (
                  <div style={{ color: 'var(--text-muted)' }}>No {activeTab.toLowerCase()} to display.</div>
                )}
             </div>
          </div>

        </div>

        {/* FOOTER ACTIONS */}
        <div style={{ display: 'flex', width: '100%', height: '50px', flexShrink: 0 }}>
           <button onClick={() => onDuplicate && onDuplicate({ title, accountId, legs, aircraftId, comments })} style={{ flex: 1, backgroundColor: '#0071a4', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
              <BookOpen size={16}/> DUPLICATE
           </button>
           <button style={{ flex: 1, backgroundColor: '#0071a4', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
              <Plus size={16}/> FLIGHT UPLOADS
           </button>
           <button style={{ flex: 1, backgroundColor: '#0071a4', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
              <MessageSquare size={16}/> SUMMARY REPORT
           </button>
           <button onClick={() => flight && onDelete(flight.id)} style={{ flex: 1, backgroundColor: '#c53030', color: 'white', border: 'none', fontWeight: 'bold', cursor: flight ? 'pointer' : 'not-allowed', opacity: flight ? 1 : 0.5, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
              <Trash2 size={16}/> DELETE
           </button>
        </div>

      </div>
    </div>
  );
};

export default EventModal;
