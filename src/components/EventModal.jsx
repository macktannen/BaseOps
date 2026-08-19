import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, MapPin, Plus, GripVertical, BookOpen, Clock, ChevronLeft, ChevronRight, ChevronDown, Upload, FileText, Download, Paperclip, Eye, Image, File } from 'lucide-react';
import { mockPilots, mockCustomZones, mockAccounts, mockVendors } from '../data';
import airportsData from '../data/airports.json';
import tzlookup from 'tz-lookup';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import FlightLogTab from './FlightLogTab';
import ExpensesTab from './ExpensesTab';
import SaveButton from './SaveButton';
import ConflictWarningModal from './ConflictWarningModal';
import { detectConflicts } from '../services/schedulingConflicts';
import { FileStorageService } from '../services/FileStorageService';
import { authService } from '../services/authService';
import useIsMobile from '../hooks/useIsMobile';
import MobileDropdownMenu from './MobileDropdownMenu';
import { useData } from '../contexts/DataProvider';

const getDefaultPilotForDate = (dateStr, schedules, storedPilots) => {
  if (!dateStr || !schedules) return '';
  const allPilots = storedPilots?.length > 0 ? storedPilots : mockPilots;

  for (const [key, status] of Object.entries(schedules)) {
    if (key.endsWith(`_${dateStr}`) && (status === 'On Duty' || status === 'Duty/Training')) {
      const rawPersonId = key.substring(0, key.lastIndexOf(`_${dateStr}`));
      const matchedPilot = allPilots.find(p => p.id === rawPersonId || p.name === rawPersonId);
      if (matchedPilot) return matchedPilot.id;
    }
  }
  return '';
};

const getDefaultPassengersForDate = (dateStr, schedules, storedPax) => {
  if (!dateStr || !schedules || !storedPax) return [];
  
  const onDutyPax = [];
  for (const [key, status] of Object.entries(schedules)) {
    if (key.endsWith(`_${dateStr}`) && (status === 'On Duty' || status === 'Duty/Training')) {
      const rawPersonId = key.substring(0, key.lastIndexOf(`_${dateStr}`));
      const matchedPax = storedPax.find(p => p.id === rawPersonId || p.name === rawPersonId);
      if (matchedPax) {
        onDutyPax.push(matchedPax.id);
      }
    }
  }
  return onDutyPax;
};

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
      const customModal = document.getElementById('custom-zone-modal');
      if (customModal && customModal.contains(event.target)) return;
      
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const { userCustomZones, locationUsage, updateData } = useData();

  const getUsageCount = (id) => {
    return locationUsage?.[id] || 0;
  };

  const storedZones = userCustomZones || [];

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
    const currentZones = storedZones;
    updateData('userCustomZones', [...currentZones, newZone]);
    
    const currentUsage = { ...(locationUsage || {}) };
    currentUsage[newZone.id] = (currentUsage[newZone.id] || 0) + 1;
    updateData('locationUsage', currentUsage);

    // Select it
    onChange({ type: 'custom', id: newZone.id });
    setIsCustomModalOpen(false);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={dropdownRef} style={{ display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative', flex: 1, minWidth: 0, zIndex: isOpen ? 100 : 1 }}>
      {label && <label style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>{label}</label>}
      <div 
        style={{ 
          padding: '0 8px', borderRadius: '4px', border: '1px solid var(--border-color)', 
          backgroundColor: 'white', display: 'flex', alignItems: 'center',
          height: '36px', width: '100%', boxSizing: 'border-box'
        }}
      >
        <MapPin size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <input 
          type="text"
          placeholder={placeholder || 'Select...'}
          value={isOpen ? search : (value ? selectedDisplay() : '')}
          onFocus={() => { setIsOpen(true); setSearch(''); }}
          onChange={(e) => { setSearch(e.target.value); if(!isOpen) setIsOpen(true); }}
          style={{ 
            border: 'none', outline: 'none', background: 'transparent', width: '100%', 
            fontSize: '0.875rem', paddingLeft: '8px', color: 'inherit'
          }}
        />
      </div>

      {isOpen && !isCustomModalOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, 
          backgroundColor: 'white', border: '1px solid var(--border-color)', 
          borderRadius: '4px', zIndex: 10, maxHeight: '300px', 
          display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--shadow-md)', marginTop: '4px', minWidth: '250px'
        }}>
          
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


// --- PASSENGER SELECT ---
const PassengerSelect = ({ passengers, onAdd, onRemove, passengersList, onAddNew }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newPaxForm, setNewPaxForm] = useState({ name: '', weight: '', email: '', phone: '', company: '', title: '', emergencyContact: '', medicalNotes: '', notes: '' });
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const paxOnLeg = passengers || [];
  const availablePax = passengersList
    .filter(p => !p.isCrew)
    .sort((a, b) => a.name.localeCompare(b.name));

  const filtered = search.trim()
    ? availablePax.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()) || (p.company && p.company.toLowerCase().includes(search.toLowerCase())))
    : availablePax;

  const selectedNames = paxOnLeg.map(id => passengersList.find(p => p.id === id)).filter(Boolean);

  const handleAddPax = (paxId) => {
    if (!paxOnLeg.includes(paxId)) {
      onAdd(paxId);
    }
    setSearch('');
    setIsOpen(false);
  };

  const handleCreateAndAdd = () => {
    if (!newPaxForm.name.trim()) return;
    const newId = newPaxForm.name.trim();
    const newPax = {
      id: newId,
      name: newPaxForm.name.trim(),
      weight: newPaxForm.weight ? parseInt(newPaxForm.weight) : 0,
      email: newPaxForm.email,
      phone: newPaxForm.phone,
      company: newPaxForm.company,
      title: newPaxForm.title,
      isCrew: false,
      emergencyContact: newPaxForm.emergencyContact,
      medicalNotes: newPaxForm.medicalNotes,
      notes: newPaxForm.notes
    };
    onAddNew(newPax, newId);
    setNewPaxForm({ name: '', weight: '', email: '', phone: '', company: '', title: '', emergencyContact: '', medicalNotes: '', notes: '' });
    setShowNewModal(false);
    setSearch('');
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', flex: 1, minWidth: 0, zIndex: isOpen ? 2000 : 1 }}>
      <div
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        style={{
          padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)',
          backgroundColor: 'white', display: 'flex', alignItems: 'center',
          minHeight: '28px', cursor: 'pointer', fontSize: '0.75rem', gap: '4px'
        }}
      >
        <input
          type="text"
          placeholder="Add Passenger..."
          value={isOpen ? search : (selectedNames.length > 0 ? `${selectedNames.length} passenger${selectedNames.length > 1 ? 's' : ''}` : '')}
          readOnly={!isOpen}
          onFocus={() => setIsOpen(true)}
          onChange={e => setSearch(e.target.value)}
          style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
        />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          backgroundColor: 'white', border: '1px solid var(--border-color)',
          borderRadius: '4px', zIndex: 2001, maxHeight: '250px',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', marginTop: '2px', minWidth: '220px'
        }}>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 && (
              <div style={{ padding: '10px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.8rem' }}>
                {search ? 'No matches found' : 'No passengers available'}
              </div>
            )}
            {filtered.map(p => (
              <div
                key={p.id}
                onClick={() => handleAddPax(p.id)}
                style={{
                  padding: '7px 10px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0',
                  backgroundColor: paxOnLeg.includes(p.id) ? '#f0f7ff' : 'white',
                  fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                <span>{p.name}{p.company ? ` (${p.company})` : ''}</span>
                {paxOnLeg.includes(p.id) && <span style={{ fontSize: '0.65rem', color: 'var(--primary-color)', fontWeight: 600 }}>Added</span>}
              </div>
            ))}
            <div
              onClick={() => setShowNewModal(true)}
              style={{
                padding: '8px 10px', cursor: 'pointer',
                backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)',
                fontWeight: 500, fontSize: '0.8rem',
                display: 'flex', alignItems: 'center', gap: '6px',
                borderTop: '1px solid var(--primary-color)'
              }}
            >
              <Plus size={14} /> {search ? `Add "${search}" as new passenger...` : 'Add New Passenger...'}
            </div>
          </div>
        </div>
      )}

      {selectedNames.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
          {selectedNames.map(p => (
            <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '3px', padding: '1px 5px', fontSize: '0.62rem', lineHeight: '1.4', userSelect: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <span style={{ padding: '0 2px', fontWeight: 'bold' }}>{p.name}</span>
              <span onClick={() => onRemove(p.id)} style={{ cursor: 'pointer', marginLeft: '2px', display: 'inline-flex', alignItems: 'center', borderLeft: '1px solid rgba(0,0,0,0.12)', backgroundColor: 'rgba(0,0,0,0.05)', padding: '1px 4px', borderRadius: '0 3px 3px 0', color: '#475569' }}>
                <X size={9} strokeWidth={2.5} />
              </span>
            </span>
          ))}
        </div>
      )}

      {showNewModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }} onClick={() => setShowNewModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', width: '500px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Add New Passenger</h3>
              <button type="button" onClick={() => setShowNewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="var(--text-muted)" /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Name *</label>
                  <input type="text" value={newPaxForm.name} onChange={e => setNewPaxForm({ ...newPaxForm, name: e.target.value })} placeholder="Full name" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Weight (lbs)</label>
                  <input type="number" value={newPaxForm.weight} onChange={e => setNewPaxForm({ ...newPaxForm, weight: e.target.value })} placeholder="155" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Email</label>
                  <input type="email" value={newPaxForm.email} onChange={e => setNewPaxForm({ ...newPaxForm, email: e.target.value })} placeholder="email@example.com" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Phone</label>
                  <input type="tel" value={newPaxForm.phone} onChange={e => setNewPaxForm({ ...newPaxForm, phone: e.target.value })} placeholder="(555) 123-4567" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Company</label>
                  <input type="text" value={newPaxForm.company} onChange={e => setNewPaxForm({ ...newPaxForm, company: e.target.value })} placeholder="Company name" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Title</label>
                  <input type="text" value={newPaxForm.title} onChange={e => setNewPaxForm({ ...newPaxForm, title: e.target.value })} placeholder="Job title" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Emergency Contact</label>
                <input type="text" value={newPaxForm.emergencyContact} onChange={e => setNewPaxForm({ ...newPaxForm, emergencyContact: e.target.value })} placeholder="Name - Phone" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Medical Notes</label>
                <input type="text" value={newPaxForm.medicalNotes} onChange={e => setNewPaxForm({ ...newPaxForm, medicalNotes: e.target.value })} placeholder="Allergies, conditions, etc." style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Notes</label>
                <textarea value={newPaxForm.notes} onChange={e => setNewPaxForm({ ...newPaxForm, notes: e.target.value })} placeholder="Any additional notes..." rows={2} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowNewModal(false)} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                <button type="button" onClick={handleCreateAndAdd} disabled={!newPaxForm.name.trim()} style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', backgroundColor: newPaxForm.name.trim() ? 'var(--primary-color)' : '#ccc', color: 'white', cursor: newPaxForm.name.trim() ? 'pointer' : 'not-allowed', fontSize: '0.85rem', fontWeight: 600 }}>Add Passenger</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// --- PILOT SELECT ---
const PilotSelect = ({ pilots, pilotsList, onAdd, onRemove, onToggleRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pilotsOnLeg = pilots || [];
  const sortedPilots = [...pilotsList].sort((a, b) => a.name.localeCompare(b.name));

  const filtered = search.trim()
    ? sortedPilots.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()))
    : sortedPilots;

  const selectedPilots = pilotsOnLeg.map(id => pilotsList.find(p => p.id === id)).filter(Boolean);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', flex: 1, minWidth: 0, zIndex: isOpen ? 2000 : 1 }}>
      <div
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        style={{
          padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)',
          backgroundColor: 'white', display: 'flex', alignItems: 'center',
          minHeight: '28px', cursor: 'pointer', fontSize: '0.75rem'
        }}
      >
        <input
          type="text"
          placeholder="Add Pilot..."
          value={isOpen ? search : (selectedPilots.length > 0 ? `${selectedPilots.length} pilot${selectedPilots.length > 1 ? 's' : ''}` : '')}
          readOnly={!isOpen}
          onFocus={() => setIsOpen(true)}
          onChange={e => setSearch(e.target.value)}
          style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
        />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          backgroundColor: 'white', border: '1px solid var(--border-color)',
          borderRadius: '4px', zIndex: 2001, maxHeight: '250px',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', marginTop: '2px', minWidth: '220px'
        }}>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 && (
              <div style={{ padding: '10px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.8rem' }}>
                {search ? 'No matches found' : 'No pilots available'}
              </div>
            )}
            {filtered.map(p => (
              <div
                key={p.id}
                onClick={() => { if (!pilotsOnLeg.includes(p.id)) onAdd(p.id); setSearch(''); setIsOpen(false); }}
                style={{
                  padding: '7px 10px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0',
                  backgroundColor: pilotsOnLeg.includes(p.id) ? '#f0f7ff' : 'white',
                  fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                <span>{p.name}</span>
                {pilotsOnLeg.includes(p.id) && <span style={{ fontSize: '0.65rem', color: 'var(--primary-color)', fontWeight: 600 }}>Added</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


// --- MOBILE SCROLL PICKER ---
const TIME_ITEMS = (() => {
  const items = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      items.push({ value: val, label: val });
    }
  }
  return items;
})();

const DURATION_ITEMS = (() => {
  const items = [];
  for (let i = 1; i <= 240; i++) {
    const hrs = i / 10;
    items.push({ value: String(hrs), label: `${hrs.toFixed(1)} HR` });
  }
  return items;
})();

const DurationPicker = ({ value, onChange, color, style }) => {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value || '');
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    setInputVal(value || '');
  }, [value, open]);

  useEffect(() => {
    if (open && listRef.current && value) {
      const idx = DURATION_ITEMS.findIndex(i => String(i.value) === String(value));
      if (idx >= 0) {
        setTimeout(() => { if (listRef.current) listRef.current.scrollTop = idx * 33 - 60; }, 0);
      }
    }
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const commitInput = () => {
    const num = parseFloat(inputVal);
    if (!isNaN(num) && num >= 0) {
      const clamped = Math.min(24, Math.max(0, Math.round(num * 10) / 10));
      onChange(String(clamped.toFixed(1)));
    }
    setOpen(false);
  };

  const currentValue = value || '0.0';

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: 'rgba(0,0,0,0.04)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, color: color || 'var(--text-main)', padding: '2px 3px', minWidth: '36px', justifyContent: 'center', fontSize: 'inherit', lineHeight: 1, ...style }}
      >
        {currentValue}
        <ChevronDown size={11} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>
      <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', zIndex: 3000, marginTop: '4px', backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', minWidth: '100px', display: open ? 'block' : 'none' }}>
        <div style={{ padding: '6px', borderBottom: '1px solid var(--border-color)' }}>
          <input
            ref={inputRef}
            type="number"
            step="0.1"
            min="0"
            max="24"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitInput(); if (e.key === 'Escape') setOpen(false); }}
            onBlur={commitInput}
            style={{ width: '100%', padding: '4px 6px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div ref={listRef} style={{ maxHeight: '180px', overflowY: 'auto' }}>
          {DURATION_ITEMS.map(item => (
            <div
              key={item.value}
              onMouseDown={(e) => { e.preventDefault(); onChange(item.value); setOpen(false); }}
              style={{
                padding: '6px 10px', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'center',
                backgroundColor: String(item.value) === String(currentValue) ? 'var(--primary-light)' : 'transparent',
                color: String(item.value) === String(currentValue) ? 'var(--primary-color)' : 'var(--text-main)',
                fontWeight: String(item.value) === String(currentValue) ? 700 : 400, whiteSpace: 'nowrap',
                borderBottom: '1px solid #edf2f7'
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MobileScrollPicker = ({ value, items, onChange, color, style }) => {
  const [open, setOpen] = useState(false);
  const listRef = useRef(null);
  const wrapRef = useRef(null);
  const selectedIdx = items.findIndex(i => String(i.value) === String(value));

  useEffect(() => {
    if (open && listRef.current && selectedIdx >= 0) {
      setTimeout(() => { if (listRef.current) listRef.current.scrollTop = selectedIdx * 33 - 60; }, 0);
    }
  }, [open, selectedIdx]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.04)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: color || 'var(--text-main)', padding: '4px 8px', minWidth: '72px', justifyContent: 'center', ...style }}
      >
        {value || '--:--'}
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>
      <div
        ref={listRef}
        style={{ position: 'absolute', top: '100%', right: 0, zIndex: 3000, marginTop: '4px', backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', maxHeight: '220px', overflowY: 'auto', minWidth: '90px', display: open ? 'block' : 'none' }}
      >
        {items.map(item => (
          <div
            key={item.value}
            onMouseDown={(e) => { e.preventDefault(); onChange(item.value); setOpen(false); }}
            style={{
              padding: '7px 12px', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'center',
              backgroundColor: String(item.value) === String(value) ? 'var(--primary-light)' : 'transparent',
              color: String(item.value) === String(value) ? 'var(--primary-color)' : 'var(--text-main)',
              fontWeight: String(item.value) === String(value) ? 700 : 400, whiteSpace: 'nowrap',
              borderBottom: '1px solid #edf2f7'
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
};


const normalizeStatus = (s) => {
  if (!s) return 'confirmed';
  const lower = String(s).toLowerCase().trim();
  if (lower === 'completed') return 'completed';
  if (lower === 'confirmed') return 'confirmed';
  if (lower === 'on hold' || lower === 'onhold') return 'on hold';
  if (lower === 'maintenance') return 'maintenance';
  if (lower === 'canceled' || lower === 'cancelled') return 'canceled';
  return lower;
};

// --- EVENT MODAL ---
const EventModal = ({ isOpen, onClose, onSave, onDelete, onDuplicate, onNavigate, hasPrev, hasNext, initialDate, flight, flightsCount, defaultActiveView = 'Plan' }) => {
  const isMobile = useIsMobile();
  const [isSaved, setIsSaved] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  
  let initialDateStr = '';
  if (initialDate instanceof Date) {
     const y = initialDate.getFullYear();
     const m = String(initialDate.getMonth() + 1).padStart(2, '0');
     const d = String(initialDate.getDate()).padStart(2, '0');
     initialDateStr = `${y}-${m}-${d}`;
  } else if (typeof initialDate === 'string' && initialDate) {
     initialDateStr = initialDate.split('T')[0];
  } else if (flight?.date) {
     initialDateStr = flight.date.split('T')[0];
  } else {
     const now = new Date();
     const y = now.getFullYear();
     const m = String(now.getMonth() + 1).padStart(2, '0');
     const d = String(now.getDate()).padStart(2, '0');
     initialDateStr = `${y}-${m}-${d}`;
  }

  const [date, setDate] = useState(initialDateStr);
  const [flightNumber, setFlightNumber] = useState(() => flight?.flightNumber != null ? String(flight.flightNumber).replace(/^FLT-/i, '') : (flightsCount != null ? String(flightsCount + 1) : '1'));
  const [title, setTitle] = useState('');
  const [accountId, setAccountId] = useState('');
  const [comments, setComments] = useState('');
  const [opsNotes, setOpsNotes] = useState('');
  const [activeTab, setActiveTab] = useState('Crew Notes');
  const [status, setStatus] = useState(() => (flight?.flightLog?.signature ? 'completed' : normalizeStatus(flight?.status || 'on hold')));
  const [tag, setTag] = useState('');
  
  const [activeView, setActiveView] = useState(defaultActiveView || 'Plan'); // 'Plan' or 'Log' or 'Expenses'
  const prevFlightIdRef = useRef(flight?.id ? String(flight.id) : (flight ? String(flight.flightNumber || 'new') : 'new'));
  const [flightLog, setFlightLog] = useState(() => flight?.flightLog || {});
  const suppressSyncRef = useRef(false); // Guard against sync overwrites during active unsign
  const hasInitialSyncedRef = useRef(false); // Skip banner on first sync
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [conflictModal, setConflictModal] = useState({ open: false, pilotConflicts: [], aircraftConflicts: [] });
  const [expenses, setExpenses] = useState([]);
  const getExpensesPendingDeletesRef = useRef(null);
  const [pendingRemoteChanges, setPendingRemoteChanges] = useState(null);

  const { userPilots, userAircraft, userPassengers, userAccounts, userVendors, userFlights, userCustomZones, crewSchedules, locationUsage, updateData, updateDataBatch, saveFlight, deleteFlight } = useData();

  const pilotsList = userPilots || [];
  const aircraftList = userAircraft || [];
  const passengersList = userPassengers || [];
  const accountsList = userAccounts || [];
  const vendorsList = userVendors || [];

  const [legs, setLegs] = useState([
    { departure: null, destination: null, takeoffTime: '08:00', landTime: '09:00', duration: 60, passengers: [], pilotId: getDefaultPilotForDate(initialDateStr, crewSchedules, pilotsList), date: initialDateStr }
  ]);

  const [aircraftId, setAircraftId] = useState('');
  const [showUploads, setShowUploads] = useState(false);
  const [uploads, setUploads] = useState(flight?.uploads || []);
  const [uploading, setUploading] = useState(false);
  const [viewerFile, setViewerFile] = useState(null);
  const fileInputRef = useRef(null);

  const VIEWABLE_TYPES = {
    'image/png': true, 'image/jpeg': true, 'image/jpg': true, 'image/gif': true,
    'image/webp': true, 'image/svg+xml': true, 'image/heic': true, 'image/heif': true,
    'application/pdf': true,
    'text/plain': true, 'text/csv': true, 'text/html': true, 'text/xml': true,
    'application/json': true, 'application/geo+json': true,
    'video/mp4': true, 'video/webm': true, 'video/quicktime': true,
    'audio/mpeg': true, 'audio/wav': true,
  };

  const isViewable = (file) => {
    if (file.type && VIEWABLE_TYPES[file.type]) return true;
    const ext = (file.name || '').split('.').pop()?.toLowerCase();
    return ['png','jpg','jpeg','gif','webp','svg','heic','heif','pdf','txt','csv','html','json','geojson','xml','mp4','webm','mov','mp3','wav'].includes(ext);
  };

  const getFileIcon = (file) => {
    const ext = (file.name || '').split('.').pop()?.toLowerCase();
    if (['png','jpg','jpeg','gif','webp','svg','heic','heif'].includes(ext)) return <Image size={14} color="#38a169" />;
    if (ext === 'pdf') return <FileText size={14} color="#e53e3e" />;
    if (['kml','kmz','geojson','gpx','shp'].includes(ext)) return <MapPin size={14} color="#d69e2e" />;
    return <File size={14} color="var(--primary-color)" />;
  };

  // Sync open flight with global data changes automatically
  useEffect(() => {
    if (!flight || !flight.id) return;
    if (suppressSyncRef.current) return;
    
    const updatedFlight = (userFlights || []).find(f => String(f.id) === String(flight.id) || (flight.flightNumber && String(f.flightNumber) === String(flight.flightNumber)));
    if (!updatedFlight) return;

    // Always auto-sync if a flight log signature was added (authoritative, locks the flight)
    const remoteSigned = !!(updatedFlight.flightLog?.signature);
    const localSigned = !!(flightLog?.signature);
    if (remoteSigned && !localSigned) {
      if (updatedFlight.expenses) setExpenses(updatedFlight.expenses);
      if (updatedFlight.uploads) setUploads(updatedFlight.uploads);
      if (updatedFlight.flightLog) setFlightLog(updatedFlight.flightLog);
      if (updatedFlight.status) setStatus(normalizeStatus(updatedFlight.status));
      hasInitialSyncedRef.current = true;
      return;
    }

    // On first sync, auto-sync silently (no banner) since state was just initialized
    if (!hasInitialSyncedRef.current) {
      hasInitialSyncedRef.current = true;
      // Auto-sync to ensure state matches Firestore exactly
      if (updatedFlight.expenses) setExpenses(updatedFlight.expenses);
      if (updatedFlight.uploads) setUploads(updatedFlight.uploads);
      if (updatedFlight.flightLog) setFlightLog(updatedFlight.flightLog);
      if (updatedFlight.status) setStatus(normalizeStatus(updatedFlight.status));
      return;
    }

    // Check if we have unsaved local changes
    if (hasUnsavedChanges()) {
      // Detect what changed
      const changes = [];
      if (JSON.stringify(updatedFlight.expenses) !== JSON.stringify(expenses)) changes.push('Expenses');
      if (JSON.stringify(updatedFlight.uploads) !== JSON.stringify(uploads)) changes.push('Uploads');
      if (JSON.stringify(updatedFlight.flightLog) !== JSON.stringify(flightLog)) changes.push('Flight Log');
      if (normalizeStatus(updatedFlight.status || '') !== status) changes.push('Status');
      if (JSON.stringify(updatedFlight.legs) !== JSON.stringify(legs)) changes.push('Route/Legs');
      if ((updatedFlight.title || '') !== title) changes.push('Title');
      if ((updatedFlight.comments || '') !== comments) changes.push('Comments');
      if ((updatedFlight.opsNotes || '') !== opsNotes) changes.push('Ops Notes');
      
      if (changes.length > 0) {
        setPendingRemoteChanges({ changes, updatedFlight });
      }
      return;
    }

    // No unsaved changes — auto-sync as before
    if (updatedFlight.expenses) setExpenses(updatedFlight.expenses);
    if (updatedFlight.uploads) setUploads(updatedFlight.uploads);
    if (updatedFlight.flightLog) setFlightLog(updatedFlight.flightLog);
    if (updatedFlight.status) setStatus(normalizeStatus(updatedFlight.status));
  }, [flight, userFlights]);

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [draggableLegIndex, setDraggableLegIndex] = useState(null);

  const currentUser = authService.getCurrentUser() || { name: 'Admin', role: 'admin' };
  const isAdmin = currentUser?.role === 'admin';
  const isFlightSigned = !!(flightLog?.signature);

  // ── ATOMIC SIGN FLIGHT LOG ──
  const handleSignFlight = (logData, snapshottedTotals) => {
    if (!aircraftId) return;

    // STEP 1: Block remote sync overwrites during sign
    suppressSyncRef.current = true;

    // STEP 2: Update aircraft record in single atomic commit
    let pendingAircraftUpdate = null;
    try {
      const storedAircraft = [...(userAircraft || [])];
      const acIndex = storedAircraft.findIndex(a => a.id === aircraftId);
      if (acIndex >= 0) {
        const ac = { ...storedAircraft[acIndex] };
        const isTwin = ac.dualEngine || snapshottedTotals.dualEngine;

        ac.totalHours = (Math.round((parseFloat(snapshottedTotals.flightBefore || 0) + snapshottedTotals.changeFlight) * 10) / 10).toFixed(1);
        ac.landings = parseInt(snapshottedTotals.landingsBefore || 0) + snapshottedTotals.changeLandings;
        ac.hobbs = (Math.round((parseFloat(snapshottedTotals.hobbsBefore || 0) + snapshottedTotals.changeHobbs) * 10) / 10).toFixed(1);

        ac.engine1Hours = (Math.round((parseFloat(snapshottedTotals.engine1Before || 0) + snapshottedTotals.changeEngine1Hours) * 10) / 10).toFixed(1);
        ac.engineHours = ac.engine1Hours;
        ac.engine1Cycles = parseInt(snapshottedTotals.cycles1Before || 0) + snapshottedTotals.changeEngine1Cycles;
        ac.engineCycles = ac.engine1Cycles;

        if (isTwin) {
          ac.engine2Hours = (Math.round((parseFloat(snapshottedTotals.engine2Before || 0) + snapshottedTotals.changeEngine2Hours) * 10) / 10).toFixed(1);
          ac.engine2Cycles = parseInt(snapshottedTotals.cycles2Before || 0) + snapshottedTotals.changeEngine2Cycles;
        }

        if (!ac.auditLog) ac.auditLog = [];
        ac.auditLog.push(`Signed flight #${flightNumber || ''} by ${currentUser?.name || 'Pilot'} on ${new Date().toLocaleString()}: +${snapshottedTotals.changeFlight}h`);
        
        storedAircraft[acIndex] = ac;
        pendingAircraftUpdate = storedAircraft;
      }
    } catch (err) {
      console.error('Failed to update aircraft on sign:', err);
    }

    // STEP 3: Build the signed flight log
    const signedLog = {
      ...logData,
      isLocked: true,
      aircraftTotals: snapshottedTotals,
      signature: {
        name: currentUser?.name || 'Pilot',
        timestamp: new Date().toLocaleString(),
        isoTimestamp: new Date().toISOString()
      },
      auditLog: [
        ...(logData.auditLog || []),
        `Signed by ${currentUser?.name || 'Pilot'} on ${new Date().toLocaleString()}`
      ]
    };

    // STEP 4: Update React state
    setFlightLog(signedLog);
    setStatus('completed');

    // STEP 5: Persist flight + aircraft in single batched write
    performSave(signedLog, 'completed', false, pendingAircraftUpdate ? { userAircraft: pendingAircraftUpdate } : null);

    // STEP 6: Release sync guard
    setTimeout(() => { suppressSyncRef.current = false; }, 10000);
  };

  // ── CLEAR SIGNATURE (single atomic operation) ──
  const handleClearSignature = () => {
    if (!flightLog?.signature) return;
    
    // STEP 1: Block all sync overwrites immediately
    suppressSyncRef.current = true;

    // STEP 2: Revert aircraft totals from the snapshot
    let pendingAircraftUpdate = null;
    const totals = flightLog.aircraftTotals;
    if (aircraftId && totals) {
      try {
        const storedAircraft = [...(userAircraft || [])];
        const acIndex = storedAircraft.findIndex(a => a.id === aircraftId);
        if (acIndex >= 0) {
          const ac = { ...storedAircraft[acIndex] };
          if (totals.flightBefore !== undefined) ac.totalHours = parseFloat(totals.flightBefore).toFixed(1);
          if (totals.landingsBefore !== undefined) ac.landings = parseInt(totals.landingsBefore);
          if (totals.hobbsBefore !== undefined) ac.hobbs = parseFloat(totals.hobbsBefore).toFixed(1);
          if (totals.engine1Before !== undefined) {
            ac.engine1Hours = parseFloat(totals.engine1Before).toFixed(1);
            ac.engineHours = ac.engine1Hours;
          }
          if (totals.cycles1Before !== undefined) {
            ac.engine1Cycles = parseInt(totals.cycles1Before);
            ac.engineCycles = ac.engine1Cycles;
          }
          if (totals.dualEngine && totals.engine2Before !== undefined) {
            ac.engine2Hours = parseFloat(totals.engine2Before).toFixed(1);
            ac.engine2Cycles = parseInt(totals.cycles2Before || 0);
          }
          if (!ac.auditLog) ac.auditLog = [];
          ac.auditLog.push(`Signature cleared & meters reverted by ${currentUser?.name || 'Admin'} on ${new Date().toLocaleString()}`);
          storedAircraft[acIndex] = ac;
          pendingAircraftUpdate = storedAircraft;
        }
      } catch (e) { console.error('Failed to revert aircraft totals:', e); }
    }

    // STEP 3: Build the clean unsigned flight log
    const unsignedLog = {
      ...flightLog,
      signature: null,
      isLocked: false,
      aircraftTotals: null,
      auditLog: [
        ...(flightLog.auditLog || []),
        `Signature cleared by ${currentUser?.name || 'Admin'} on ${new Date().toLocaleString()}`
      ]
    };

    // STEP 4: Update ALL React state synchronously
    setFlightLog(unsignedLog);
    setStatus('confirmed');

    // STEP 5: Persist atomically via performSave
    performSave(unsignedLog, 'confirmed', false, pendingAircraftUpdate ? { userAircraft: pendingAircraftUpdate } : null);

    // STEP 6: Release the sync guard after Firestore echo settles
    setTimeout(() => { suppressSyncRef.current = false; }, 10000);
  };

  // ── TOGGLE LOCK (single atomic operation) ──
  const handleToggleLock = (newLocked) => {
    if (!aircraftId) return;

    let pendingAircraftUpdate = null;
    try {
      const storedAircraft = [...(userAircraft || [])];
      const acIndex = storedAircraft.findIndex(a => a.id === aircraftId);
      if (acIndex >= 0) {
        const ac = { ...storedAircraft[acIndex] };
        const totals = flightLog?.aircraftTotals;
        if (totals) {
          const isTwin = ac.dualEngine || totals.dualEngine;
          const multiplier = newLocked ? 1 : -1;

          ac.totalHours = (Math.round((parseFloat(totals.flightBefore || 0) + (totals.changeFlight || 0) * multiplier) * 10) / 10).toFixed(1);
          ac.landings = parseInt(totals.landingsBefore || 0) + Math.round((totals.changeLandings || 0) * multiplier);
          ac.hobbs = (Math.round((parseFloat(totals.hobbsBefore || 0) + (totals.changeHobbs || 0) * multiplier) * 10) / 10).toFixed(1);
          ac.engine1Hours = (Math.round((parseFloat(totals.engine1Before || 0) + (totals.changeEngine1Hours || 0) * multiplier) * 10) / 10).toFixed(1);
          ac.engineHours = ac.engine1Hours;
          ac.engine1Cycles = parseInt(totals.cycles1Before || 0) + Math.round((totals.changeEngine1Cycles || 0) * multiplier);
          ac.engineCycles = ac.engine1Cycles;
          if (isTwin) {
            ac.engine2Hours = (Math.round((parseFloat(totals.engine2Before || 0) + (totals.changeEngine2Hours || 0) * multiplier) * 10) / 10).toFixed(1);
            ac.engine2Cycles = parseInt(totals.cycles2Before || 0) + Math.round((totals.changeEngine2Cycles || 0) * multiplier);
          }

          if (!ac.auditLog) ac.auditLog = [];
          const action = newLocked ? 'Locked' : 'Unlocked';
          ac.auditLog.push(`${action} flight #${flightNumber || ''} by ${currentUser?.name || 'Admin'} on ${new Date().toLocaleString()}`);
        }
        storedAircraft[acIndex] = ac;
        pendingAircraftUpdate = storedAircraft;
      }
    } catch (err) {
      console.error('Failed to update aircraft on toggle lock:', err);
    }

    performSave(null, null, false, pendingAircraftUpdate ? { userAircraft: pendingAircraftUpdate } : null);
  };

  const persistFlightLogToFlight = (nextFlightLog) => {
    if (!flight) return;
    try {
      const isSigned = !!(nextFlightLog?.signature);
      setStatus(isSigned ? 'completed' : 'confirmed');

      const existingFlight = (userFlights || []).find(f =>
        (flight?.id && String(f.id) === String(flight.id)) ||
        (flight?.flightNumber && String(f.flightNumber) === String(flight.flightNumber))
      );

      const updatedFlight = {
        ...(existingFlight || flight),
        id: existingFlight?.id || flight?.id || Date.now(),
        flightNumber: existingFlight?.flightNumber || flight?.flightNumber,
        flightLog: nextFlightLog,
        status: isSigned ? 'completed' : ((existingFlight?.status === 'completed') ? 'confirmed' : (existingFlight?.status || 'confirmed'))
      };

      saveFlight(updatedFlight);
    } catch (e) {
      console.error('Failed to persist flightLog to flight:', e);
    }
  };

  const persistUploadsToFlight = (nextUploads) => {
    if (!flight && (!nextUploads || nextUploads.length === 0)) return;
    try {
      const existingFlight = (userFlights || []).find(f =>
        (flight?.id && String(f.id) === String(flight.id)) ||
        (flight?.flightNumber && String(f.flightNumber) === String(flight.flightNumber))
      );

      const updatedFlight = {
        ...(existingFlight || flight),
        id: existingFlight?.id || flight?.id || Date.now(),
        flightNumber: existingFlight?.flightNumber || flight?.flightNumber,
        uploads: nextUploads
      };

      saveFlight(updatedFlight);
    } catch (e) {
      console.error('Failed to persist uploads to flight:', e);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const flightId = flight?.id || `new_${Date.now()}`;
    setUploading(true);
    try {
      const results = await Promise.all(files.map(f => FileStorageService.saveFile(flightId, f)));
      const resizeFailures = results.filter(r => r.resizeFailed);
      if (resizeFailures.length > 0) {
        const names = resizeFailures.map(r => r.name).join(', ');
        alert(`Image compression failed for: ${names}. Files were uploaded at full size, which may use more storage than expected.`);
      }
      const nextUploads = [...uploads, ...results];
      setUploads(nextUploads);
      persistUploadsToFlight(nextUploads);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteUpload = async (upload) => {
    if (!window.confirm(`Delete "${upload.name}"?`)) return;
    try {
      await FileStorageService.deleteFile(upload.storagePath);
      const nextUploads = uploads.filter(u => u.id !== upload.id);
      setUploads(nextUploads);
      persistUploadsToFlight(nextUploads);
    } catch (err) {
      console.error('Delete failed:', err);
      alert(err.message || 'Failed to delete file. The file may still exist in cloud storage.');
    }
  };

  const handleDownloadUpload = async (upload) => {
    try {
      await FileStorageService.downloadFile(upload.storagePath, upload, upload.name);
    } catch (err) {
      console.error('Download failed:', err);
      const url = await FileStorageService.getFileUrl(upload.storagePath) || upload.url;
      if (url) {
        window.open(url, '_blank');
      }
    }
  };

  const handleViewUpload = async (upload) => {
    try {
      const url = await FileStorageService.getFileUrl(upload.storagePath) || upload.url;
      setViewerFile({ ...upload, url });
    } catch (err) {
      console.error('View failed:', err);
      if (upload.url) setViewerFile(upload);
    }
  };

  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    const currentFlightId = flight?.id ? String(flight.id) : (flight ? String(flight.flightNumber || 'new') : 'new');
    const isOpening = isOpen && !prevIsOpenRef.current;
    const isFlightChanged = prevFlightIdRef.current !== currentFlightId;
    prevIsOpenRef.current = isOpen;

    if (!isOpen) return;

    if (isOpening || isFlightChanged) {
      prevFlightIdRef.current = currentFlightId;
      hasInitialSyncedRef.current = false; // Reset so first sync is silent
      setActiveView(defaultActiveView || 'Plan');
      setHeaderCollapsed(false);

      if (flight) {
        setDate(flight.date ? flight.date.split('T')[0] : initialDateStr);
        setFlightNumber(flight.flightNumber != null ? String(flight.flightNumber).replace(/^FLT-/i, '') : (flightsCount != null ? String(flightsCount + 1) : '1'));
        setTitle(flight.title || '');
        setAccountId(flight.accountId || '');
        setComments(flight.comments || '');
        setOpsNotes(flight.opsNotes || '');
        const currentFlightLog = flight.flightLog || {};
        if (!suppressSyncRef.current) {
          setFlightLog(currentFlightLog);
          if (currentFlightLog.signature) {
            setStatus('completed');
          } else {
            setStatus(normalizeStatus(flight.status || 'confirmed'));
          }
        }
        setTag(flight.tag || '');
        setExpenses(flight.expenses || []);
        setUploads(flight.uploads || []);
        
        if (flight.legs && flight.legs.length > 0) {
          const mappedLegs = flight.legs.map((l, i) => {
            let dist = l.distance;
            if (!dist && l.departure && l.destination) {
               const coords1 = getLocationCoords(l.departure);
               const coords2 = getLocationCoords(l.destination);
               if (coords1 && coords2) {
                  const rawDist = getDistanceNM(coords1.lat, coords1.lon, coords2.lat, coords2.lon);
                  if (rawDist !== null) dist = Math.round(rawDist);
               }
            }
            const takeoffDate = l.date || (flight.date ? flight.date.split('T')[0] : initialDateStr);
            const rawPilots = l.pilots && Array.isArray(l.pilots) && l.pilots.length > 0
              ? l.pilots
              : (l.pilotId ? [l.pilotId] : (i === 0 && flight.pilotId ? [flight.pilotId] : []));
            return {
              ...l,
              duration: l.duration || 60,
              distance: dist,
              passengers: l.passengers || (i === 0 && flight.passengers ? flight.passengers : []),
              pilots: rawPilots,
              pilotId: rawPilots[0] || '',
              date: takeoffDate,
              arrDate: l.arrDate || takeoffDate
            };
          });
          setLegs(mappedLegs);
        } else {
          const defaultPilot = getDefaultPilotForDate(initialDateStr, crewSchedules, pilotsList);
          const pilotsArr = defaultPilot ? [defaultPilot] : [];
          setLegs([{ departure: null, destination: null, takeoffTime: '08:00', landTime: '09:00', duration: 60, distance: null, passengers: [], pilots: pilotsArr, pilotId: defaultPilot, date: initialDateStr, arrDate: initialDateStr }]);
        }
        setAircraftId(flight.aircraftId || '');
      } else {
        setDate(initialDateStr);
        setFlightNumber(flightsCount != null ? String(flightsCount + 1) : '1');
        setTitle('');
        setAccountId('');
        setComments('');
        setOpsNotes('');
        setStatus('on hold');
        setTag('');
        setFlightLog({});
        setExpenses([]);
        setAircraftId('');
        const defaultPilot = getDefaultPilotForDate(initialDateStr, crewSchedules, pilotsList);
        const defaultPax = getDefaultPassengersForDate(initialDateStr, crewSchedules, passengersList);
        const pilotsArr = defaultPilot ? [defaultPilot] : [];
        setLegs([{ 
          departure: null, 
          destination: null, 
          takeoffTime: '08:00', 
          landTime: '09:00', 
          duration: 60, 
          distance: null, 
          passengers: defaultPax, 
          pilots: pilotsArr,
          pilotId: defaultPilot, 
          date: initialDateStr,
          arrDate: initialDateStr
        }]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, flight, initialDateStr]);

  if (!isOpen) return null;

  // Safely get timezone; fallback to browser TZ if missing
  const getLocationTimeZone = (locationVal) => {
    const coords = getLocationCoords(locationVal);
    if (coords && coords.lat && coords.lon) {
      try {
        return tzlookup(coords.lat, coords.lon);
      } catch {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
      }
    }
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  const getTzAbbreviation = (timeZone, dateStr, timeStr) => {
    if (!timeZone) return '';
    try {
      const d = toDate(`${dateStr || new Date().toISOString().split('T')[0]}T${timeStr || '12:00'}:00`, { timeZone });
      return formatInTimeZone(d, timeZone, 'zzz');
    } catch {
      return timeZone;
    }
  };

  const recalculateLegTimes = (legsArray) => {
    return legsArray.map(leg => {
      if (!leg.departure || !leg.destination || !leg.takeoffTime || !leg.duration) return leg;
      return calculateSingleLegArrival(leg);
    });
  };

  const calculateSingleLegArrival = (leg) => {
    const depTz = getLocationTimeZone(leg.departure);
    const arrTz = getLocationTimeZone(leg.destination);
    const takeoffDate = leg.date || new Date().toISOString().split('T')[0];
    const takeoffTime = leg.takeoffTime || "08:00";
    const durationMins = leg.duration || 60;

    const depAbs = toDate(`${takeoffDate}T${takeoffTime}:00`, { timeZone: depTz });
    if (isNaN(depAbs.getTime())) return leg;

    const arrAbs = new Date(depAbs.getTime() + durationMins * 60000);
    if (!isNaN(arrAbs.getTime())) {
      return {
        ...leg,
        date: takeoffDate,
        landTime: formatInTimeZone(arrAbs, arrTz, 'HH:mm'),
        arrDate: formatInTimeZone(arrAbs, arrTz, 'yyyy-MM-dd')
      };
    }
    return leg;
  };

  const calculateSingleLegDuration = (leg, autoPushDate = true) => {
    const depTz = getLocationTimeZone(leg.departure);
    const arrTz = getLocationTimeZone(leg.destination);
    const takeoffDate = leg.date || new Date().toISOString().split('T')[0];
    const takeoffTime = leg.takeoffTime || "08:00";
    let arrDateStr = leg.arrDate || takeoffDate;
    if (arrDateStr < takeoffDate) arrDateStr = takeoffDate;
    const landTimeStr = leg.landTime || takeoffTime;

    const depAbs = toDate(`${takeoffDate}T${takeoffTime}:00`, { timeZone: depTz });
    let arrAbs = toDate(`${arrDateStr}T${landTimeStr}:00`, { timeZone: arrTz });

    if (isNaN(depAbs.getTime()) || isNaN(arrAbs.getTime())) return leg;

    let diffMins = (arrAbs.getTime() - depAbs.getTime()) / 60000;
    if (diffMins < 0 && arrDateStr === takeoffDate && autoPushDate) {
      arrAbs = new Date(arrAbs.getTime() + 24 * 60 * 60000);
      diffMins = (arrAbs.getTime() - depAbs.getTime()) / 60000;
      arrDateStr = formatInTimeZone(arrAbs, arrTz, 'yyyy-MM-dd');
    }

    return {
      ...leg,
      date: takeoffDate,
      arrDate: arrDateStr,
      duration: Math.max(1, Math.round(Math.abs(diffMins)))
    };
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
      const storedZones = userCustomZones || [];
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

  const handleAddNewPax = (newPax, newId) => {
    const updatedPassengers = [...passengersList, newPax];
    updateData('userPassengers', updatedPassengers);
  };

  const handleUpdateLeg = (index, field, value) => {
    let newLegs = [...legs];
    let leg = { ...newLegs[index] };
    const oldTakeoffDate = leg.date;
    leg[field] = value;
    
    if (field === 'date') {
       const defPilot = getDefaultPilotForDate(value);
       if (defPilot && (!leg.pilots || leg.pilots.length === 0)) {
         leg.pilots = [defPilot];
         leg.pilotId = defPilot;
       }
       if (!leg.arrDate || leg.arrDate === oldTakeoffDate || leg.arrDate < value) {
         leg.arrDate = value;
       }
       leg = calculateSingleLegArrival(leg);

    } else if (field === 'takeoffTime') {
       leg = calculateSingleLegArrival(leg);

    } else if (field === 'arrDate') {
       const takeoffDate = leg.date || new Date().toISOString().split('T')[0];
       let validArrDate = value;
       if (!validArrDate || validArrDate < takeoffDate) {
          validArrDate = takeoffDate;
       }
       leg.arrDate = validArrDate;
       leg = calculateSingleLegDuration(leg, false);

    } else if (field === 'landTime') {
       leg = calculateSingleLegDuration(leg, false);

    } else if (field === 'duration') {
       const hours = parseFloat(value) || 0;
       leg.duration = Math.round(hours * 60);
       leg = calculateSingleLegArrival(leg);

    } else if (field === 'departure' || field === 'destination') {
       const est = calculateEstimatedMinutes(leg.departure, leg.destination, aircraftId);
       if (est) {
         leg.duration = est.mins;
         leg.distance = est.nm;
       }
       leg = calculateSingleLegArrival(leg);

       if (field === 'destination' && index < newLegs.length - 1) {
         newLegs[index + 1] = {
           ...newLegs[index + 1],
           departure: value
         };
       }

    } else if (field === 'pilots') {
       const pilotArr = value || [];
       leg.pilots = pilotArr;
       const picId = Object.keys(leg.pilotRoles || {}).find(id => leg.pilotRoles[id] === 'PIC');
       leg.pilotId = picId || pilotArr[0] || '';
    } else if (field === 'pilotRoles') {
       leg.pilotRoles = value || {};
       const picId = Object.keys(leg.pilotRoles).find(id => leg.pilotRoles[id] === 'PIC');
       leg.pilotId = picId || (leg.pilots && leg.pilots[0]) || '';
    } else if (field === 'pilotId') {
       leg.pilotId = value;
       if (value && (!leg.pilots || leg.pilots.length === 0)) {
         leg.pilots = [value];
       }
    } else if (field === 'passengers') {
       leg.passengers = value;
    }
    
    newLegs[index] = leg;
    setLegs(newLegs);
  };

  const handleTogglePilotRole = (index, pId) => {
    let newLegs = [...legs];
    const leg = { ...newLegs[index] };
    const currentRoles = { ...(leg.pilotRoles || {}) };
    const currentRole = currentRoles[pId];

    if (currentRole === 'PIC') {
      // Move current PIC to SIC, and bump any existing SIC to nothing (Crew)
      Object.keys(currentRoles).forEach(id => {
        if (currentRoles[id] === 'SIC') {
          delete currentRoles[id];
        }
      });
      currentRoles[pId] = 'SIC';

    } else if (currentRole === 'SIC') {
      // Move SIC to nothing (Crew)
      delete currentRoles[pId];

    } else {
      // Move Crew to PIC. Move previous PIC to SIC, and bump previous SIC to nothing
      const previousPicId = Object.keys(currentRoles).find(id => currentRoles[id] === 'PIC');
      
      Object.keys(currentRoles).forEach(id => {
        if (currentRoles[id] === 'SIC') {
          delete currentRoles[id];
        }
      });

      if (previousPicId) {
        currentRoles[previousPicId] = 'SIC';
      }
      currentRoles[pId] = 'PIC';
    }

    leg.pilotRoles = currentRoles;
    const picId = Object.keys(currentRoles).find(id => currentRoles[id] === 'PIC');
    leg.pilotId = picId || (leg.pilots && leg.pilots[0]) || '';
    
    newLegs[index] = leg;
    setLegs(newLegs);
  };

  const handleAddPilotToLeg = (index, pId) => {
    if (!pId) return;
    let newLegs = [...legs];
    const leg = { ...newLegs[index] };
    const current = leg.pilots ? [...leg.pilots] : (leg.pilotId ? [leg.pilotId] : []);
    if (current.includes(pId)) return;

    const updatedPilots = [...current, pId];
    const updatedRoles = { ...(leg.pilotRoles || {}) };

    if (!Object.values(updatedRoles).includes('PIC')) {
      updatedRoles[pId] = 'PIC';
    } else {
      updatedRoles[pId] = 'SIC';
    }

    leg.pilots = updatedPilots;
    leg.pilotRoles = updatedRoles;
    const picId = Object.keys(updatedRoles).find(id => updatedRoles[id] === 'PIC');
    leg.pilotId = picId || updatedPilots[0];

    newLegs[index] = leg;
    setLegs(newLegs);
  };

  const handleRemovePilotFromLeg = (index, pId) => {
    let newLegs = [...legs];
    const leg = { ...newLegs[index] };
    const current = leg.pilots ? [...leg.pilots] : (leg.pilotId ? [leg.pilotId] : []);
    const updatedPilots = current.filter(p => String(p) !== String(pId));
    const updatedRoles = { ...(leg.pilotRoles || {}) };
    delete updatedRoles[pId];

    leg.pilots = updatedPilots;
    leg.pilotRoles = updatedRoles;
    const picId = Object.keys(updatedRoles).find(id => updatedRoles[id] === 'PIC');
    leg.pilotId = picId || (updatedPilots.length > 0 ? updatedPilots[0] : '');

    newLegs[index] = leg;
    setLegs(newLegs);
  };

  const handleSort = () => {
    let _legs = [...legs];
    const draggedItemContent = _legs.splice(dragItem.current, 1)[0];
    _legs.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setLegs(_legs);
  };

  const handleAddLeg = () => {
    const lastLeg = legs[legs.length - 1];
    let newTakeoff = '10:00';
    let newDate = lastLeg.date;
    if (lastLeg.landTime) {
      const arrTz = getLocationTimeZone(lastLeg.destination);
      const arrAbs = toDate(`${lastLeg.arrDate || lastLeg.date}T${lastLeg.landTime}:00`, { timeZone: arrTz });
      const nextDepAbs = new Date(arrAbs.getTime() + 15 * 60000);
      if (!isNaN(nextDepAbs.getTime())) {
        newTakeoff = formatInTimeZone(nextDepAbs, arrTz, 'HH:mm');
        newDate = formatInTimeZone(nextDepAbs, arrTz, 'yyyy-MM-dd');
      }
    }
    const defaultPilot = getDefaultPilotForDate(newDate) || (lastLeg.pilots && lastLeg.pilots[0]) || lastLeg.pilotId || '';
    const defaultPax = getDefaultPassengersForDate(newDate);
    const pilotsArr = defaultPilot ? [defaultPilot] : (lastLeg.pilots || []);
    const newLeg = calculateSingleLegArrival({ 
      departure: lastLeg.destination || null, 
      destination: null, 
      takeoffTime: newTakeoff, 
      landTime: '', 
      duration: 60, 
      distance: null, 
      passengers: defaultPax.length > 0 ? defaultPax : (lastLeg.passengers || []), 
      pilots: pilotsArr,
      pilotId: pilotsArr[0] || '',
      date: newDate,
      arrDate: newDate
    });
    setLegs([...legs, newLeg]);
  };

  const handleRemoveLeg = (index) => {
    let newLegs = legs.filter((_, i) => i !== index);
    if (newLegs.length > 0) {
       newLegs = recalculateLegTimes(newLegs);
    } else {
       newLegs = [{ departure: null, destination: null, takeoffTime: '08:00', landTime: '09:00', duration: 60, passengers: [], pilotId: getDefaultPilotForDate(date), date: date }];
    }
    setLegs(newLegs);
  };

  const usageAccumulatorRef = useRef({});

  const accumulateUsage = (locationId) => {
    if (!locationId) return;
    usageAccumulatorRef.current[locationId] = (usageAccumulatorRef.current[locationId] || 0) + 1;
  };

  const allFlights = userFlights || [];

  const handleAircraftChange = (newAcId) => {
    if (newAcId === aircraftId) return;

    if (isFlightSigned) {
      if (!isAdmin) {
        alert("The aircraft cannot be changed on a signed flight.");
        return;
      }

      const confirmed = window.confirm(
        `This flight has a signed flight log for aircraft ${aircraftId || 'assigned'}.\n\n` +
        `Changing the aircraft to ${newAcId || 'none'} will:\n` +
        `• Un-sign the flight log\n` +
        `• Unlock the log\n` +
        `• Revert committed meter numbers from ${aircraftId}\n` +
        `• Reopen the flight for review and signature\n\n` +
        `Do you want to proceed?`
      );

      if (!confirmed) {
        return;
      }

      // 1. Revert committed meter hours from old aircraft
      try {
        const storedAircraft = [...(userAircraft || [])];
        const oldAcIndex = storedAircraft.findIndex(a => a.id === aircraftId);
        if (oldAcIndex >= 0 && flightLog?.aircraftTotals) {
          const ac = { ...storedAircraft[oldAcIndex] };
          const totals = flightLog.aircraftTotals;
          if (totals.flightBefore !== undefined) ac.totalHours = parseFloat(totals.flightBefore).toFixed(1);
          if (totals.landingsBefore !== undefined) ac.landings = parseInt(totals.landingsBefore);
          if (totals.hobbsBefore !== undefined) ac.hobbs = parseFloat(totals.hobbsBefore).toFixed(1);
          if (totals.engine1Before !== undefined) {
            ac.engine1Hours = parseFloat(totals.engine1Before).toFixed(1);
            ac.engineHours = ac.engine1Hours;
          }
          if (totals.cycles1Before !== undefined) {
            ac.engine1Cycles = parseInt(totals.cycles1Before);
            ac.engineCycles = ac.engine1Cycles;
          }
          if (totals.dualEngine && totals.engine2Before !== undefined) {
            ac.engine2Hours = parseFloat(totals.engine2Before).toFixed(1);
            ac.engine2Cycles = parseInt(totals.cycles2Before || 0);
          }
          if (!ac.auditLog) ac.auditLog = [];
          ac.auditLog.push(
            `Flight log unsigned & meters reverted due to aircraft change to ${newAcId || 'unassigned'} by Admin (${currentUser?.name || 'Admin'}) on ${new Date().toLocaleString()}`
          );
          storedAircraft[oldAcIndex] = ac;
          updateData('userAircraft', storedAircraft);
        }
      } catch (e) {
        console.error("Failed to revert old aircraft hours:", e);
      }

      // 2. Un-sign flightLog and reset lock & totals
      const updatedAudit = [
        ...(flightLog.auditLog || []),
        `Flight log unsigned and ${aircraftId} hours reverted due to aircraft change to ${newAcId || 'none'} by Admin (${currentUser?.name || 'Admin'}) on ${new Date().toLocaleString()}`
      ];
      const nextFlightLog = {
        ...flightLog,
        signature: null,
        isLocked: false,
        aircraftTotals: null,
        auditLog: updatedAudit
      };
      setFlightLog(nextFlightLog);
      setStatus('confirmed');
      persistFlightLogToFlight(nextFlightLog);

      // Prompt admin that flight is open and needs to be signed
      setTimeout(() => {
        alert(`Aircraft changed to ${newAcId}.\n\nThe flight is now OPEN and needs to be signed once complete. Committed meter hours on ${aircraftId} have been reverted.`);
      }, 100);
    }

    setAircraftId(newAcId);
    let newLegs = [...legs];
    let changed = false;
    for (let i = 0; i < newLegs.length; i++) {
      const est = calculateEstimatedMinutes(newLegs[i].departure, newLegs[i].destination, newAcId);
      if (est) {
        newLegs[i].duration = est.mins;
        newLegs[i].distance = est.nm;
        const depTz = getLocationTimeZone(newLegs[i].departure);
        const arrTz = getLocationTimeZone(newLegs[i].destination);
        const depAbs = toDate(`${newLegs[i].date || new Date().toISOString().split('T')[0]}T${newLegs[i].takeoffTime}:00`, { timeZone: depTz });
        const arrAbs = new Date(depAbs.getTime() + est.mins * 60000);
        newLegs[i].landTime = formatInTimeZone(arrAbs, arrTz, 'HH:mm');
        newLegs[i].arrDate = formatInTimeZone(arrAbs, arrTz, 'yyyy-MM-dd');
        changed = true;
      }
    }
    if (changed) setLegs(recalculateLegTimes(newLegs));
  };

  const performSave = async (overrideFlightLog = null, overrideStatus = null, shouldClose = false, extraUpdates = null) => {
    try {
      legs.forEach(leg => {
        if (leg.departure && leg.departure.id) accumulateUsage(leg.departure.id);
        if (leg.destination && leg.destination.id) accumulateUsage(leg.destination.id);
      });

      const firstLeg = legs[0] || {};
      const passengers = firstLeg.passengers || [];

      // Process pending receipt deletions before saving
      for (const exp of expenses) {
        if (exp._pendingDeletes?.length > 0) {
          for (const storagePath of exp._pendingDeletes) {
            try {
              await FileStorageService.deleteReceipt(storagePath);
            } catch (err) {
              console.error("Failed to delete receipt", err);
              alert(err.message || 'Failed to delete receipt from cloud storage. The file may still exist.');
            }
          }
        }
      }

      // Process global pending deletes (from removed expenses)
      if (getExpensesPendingDeletesRef.current) {
        const globalPendingDeletes = getExpensesPendingDeletesRef.current();
        while (globalPendingDeletes.length > 0) {
          const storagePath = globalPendingDeletes.shift();
          try {
            await FileStorageService.deleteReceipt(storagePath);
          } catch (err) {
            console.error("Failed to delete receipt", err);
            alert(err.message || 'Failed to delete receipt from cloud storage. The file may still exist.');
          }
        }
      }

      const savedExpenses = expenses.map(exp => ({
        ...exp,
        _dirty: false,
        _saved: true,
        _pendingDeletes: []
      }));
      setExpenses(savedExpenses);

      const finalLog = overrideFlightLog || flightLog;
      const finalStatus = overrideStatus || status;

      const rawDateStr = legs[0]?.date || date || new Date().toISOString().split('T')[0];
      let safeIsoDate;
      try {
        safeIsoDate = new Date(rawDateStr.includes('T') ? rawDateStr : `${rawDateStr}T00:00:00`).toISOString();
      } catch {
        safeIsoDate = new Date().toISOString();
      }

      const resolvedId = flight?.id || Date.now();
      const resolvedFlightNumber = flightNumber ? String(flightNumber).replace(/^FLT-/i, '') : (flightsCount != null ? String(flightsCount + 1) : '1');

      const flightPayload = {
        id: resolvedId,
        flightNumber: resolvedFlightNumber,
        title: title || '',
        accountId: accountId || '',
        date: safeIsoDate,
        aircraftId: aircraftId || '',
        comments: comments || '',
        opsNotes: opsNotes || '',
        status: finalStatus || 'confirmed',
        tag: tag || '',
        legs: (legs || []).map(l => ({
          ...l,
          pilotId: l.pilotId || firstLeg.pilotId || '',
          pilots: (l.pilots && l.pilots.length > 0) ? l.pilots : (l.pilotId ? [l.pilotId] : (firstLeg.pilotId ? [firstLeg.pilotId] : [])),
          passengers: l.passengers || []
        })),
        passengers: passengers || [],
        pilotId: firstLeg.pilotId || '',
        flightLog: finalLog || {},
        expenses: savedExpenses || [],
        uploads: uploads || []
      };

      // Merge accumulated location usage into Firestore
      const pendingUsage = { ...(locationUsage || {}) };
      for (const [locId, count] of Object.entries(usageAccumulatorRef.current)) {
        pendingUsage[locId] = (pendingUsage[locId] || 0) + count;
      }
      usageAccumulatorRef.current = {};

      const allExtraUpdates = { locationUsage: pendingUsage, ...extraUpdates };

      if (onSave) {
        onSave(flightPayload, shouldClose, allExtraUpdates);
      }

      setIsSaved(false);
      setTimeout(() => {
        setIsSaved(true);
      }, 50);
    } catch (err) {
      console.error("performSave error:", err);
      alert("Failed to save flight: " + err.message);
    }
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    // Check route legs
    const invalidLegIndex = legs.findIndex(l => !l.departure || !l.destination);
    if (invalidLegIndex !== -1) {
      alert(`Please select both an Origin (Departure) and Destination for Leg ${invalidLegIndex + 1} before saving.`);
      setActiveView('Plan');
      return;
    }

    const rawDateStr = legs[0]?.date || date || new Date().toISOString().split('T')[0];
    let safeIsoDate;
    try {
      safeIsoDate = new Date(rawDateStr.includes('T') ? rawDateStr : `${rawDateStr}T00:00:00`).toISOString();
    } catch {
      safeIsoDate = new Date().toISOString();
    }

    const flightData = {
      id: flight ? flight.id : undefined,
      flightNumber,
      title,
      accountId,
      date: safeIsoDate,
      aircraftId,
      comments,
      opsNotes,
      status,
      tag,
      legs,
      passengers: (legs[0] || {}).passengers || [],
      pilotId: (legs[0] || {}).pilotId || '',
      flightLog,
      expenses,
      uploads
    };

    try {
      const { pilotConflicts, aircraftConflicts } = detectConflicts(flightData, allFlights);

      if (pilotConflicts.length > 0 || aircraftConflicts.length > 0) {
        setConflictModal({ open: true, pilotConflicts, aircraftConflicts });
        return;
      }
    } catch (conflictErr) {
      console.warn("Conflict detection bypassed:", conflictErr);
    }

    performSave(null, null, true);
  };

  const hasUnsavedChanges = () => {
    // For new flights (no existing flight record), nothing is "unsaved"
    // since the user hasn't input anything yet
    if (!flight || !flight.id) return false;

    if (expenses.some(e => e._dirty)) return true;

    const origFlight = flight || {};
    if (title !== (origFlight.title || '')) return true;
    if (comments !== (origFlight.comments || '')) return true;
    if (opsNotes !== (origFlight.opsNotes || '')) return true;
    if (tag !== (origFlight.tag || '')) return true;
    if (accountId !== (origFlight.accountId || '')) return true;
    if (aircraftId !== (origFlight.aircraftId || '')) return true;

    const origDate = origFlight.date ? origFlight.date.split('T')[0] : '';
    if (date !== origDate) return true;

    const origFlightNumber = origFlight.flightNumber != null
      ? String(origFlight.flightNumber).replace(/^FLT-/i, '')
      : '';
    if (flightNumber !== origFlightNumber) return true;

    const origStatus = normalizeStatus(origFlight.status || 'on hold');
    if (status !== origStatus) return true;

    const origLegs = origFlight.legs || [];
    if (JSON.stringify(legs) !== JSON.stringify(origLegs)) return true;

    return false;
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }
    onClose();
  };

  const handleAcceptRemoteChanges = () => {
    if (!pendingRemoteChanges) return;
    const { updatedFlight } = pendingRemoteChanges;
    if (updatedFlight.expenses) setExpenses(updatedFlight.expenses);
    if (updatedFlight.uploads) setUploads(updatedFlight.uploads);
    if (updatedFlight.flightLog) setFlightLog(updatedFlight.flightLog);
    if (updatedFlight.status) setStatus(normalizeStatus(updatedFlight.status));
    setPendingRemoteChanges(null);
  };

  const handleDismissRemoteChanges = () => {
    setPendingRemoteChanges(null);
  };

  
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
      const storedZones = userCustomZones || [];
      const cz = [...mockCustomZones, ...storedZones].find(c => c.id === locVal.id);
      if (!cz) return { display: locVal.id, city: '' };
      return { display: cz.title, city: cz.address || 'Custom LZ', name: cz.title };
    }
  };

  return (
    <>
    <div 
        onClick={handleClose}
        style={{
          position: 'fixed', top: '5vh', left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 1000, padding: '10px'
        }}
      >
      <div 
          onClick={(e) => e.stopPropagation()}
          style={{ width: '95vw', maxWidth: '1400px', height: '90vh', maxHeight: '90vh', backgroundColor: '#f4f5f7', borderRadius: '8px', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
        >
        
        {/* HEADER */}
        <div className="flight-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '6px 12px', borderBottom: '2px solid var(--border-color)', flexShrink: 0, position: 'relative', width: '100%', boxSizing: 'border-box', minWidth: 0 }}>
          <div className="flight-card-header-inner" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: '1px', flexShrink: 0 }}>
               <button type="button" onClick={() => onNavigate && onNavigate('prev')} style={{ background: 'none', border: 'none', cursor: hasPrev ? 'pointer' : 'default', padding: '2px', display: 'flex', alignItems: 'center' }} disabled={!hasPrev}>
                 <ChevronLeft size={20} color={hasPrev ? "var(--primary-color)" : "#cbd5e0"}/>
               </button>
               <button type="button" onClick={() => onNavigate && onNavigate('next')} style={{ background: 'none', border: 'none', cursor: hasNext ? 'pointer' : 'default', padding: '2px', display: 'flex', alignItems: 'center' }} disabled={!hasNext}>
                 <ChevronRight size={20} color={hasNext ? "var(--primary-color)" : "#cbd5e0"}/>
               </button>
            </div>
            {!isMobile && (
            <>
            <div className="header-divider" style={{ width: '1px', height: '22px', backgroundColor: 'var(--border-color)', flexShrink: 0, margin: '0 2px' }}></div>
            
            {/* VIEW TOGGLE */}
            <div className="view-toggle-container" style={{ display: 'flex', backgroundColor: '#e2e8f0', borderRadius: '6px', padding: '2px', flexShrink: 0 }}>
               <button 
                 type="button"
                 onClick={() => setActiveView('Plan')}
                 style={{ 
                   border: 'none', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer',
                   backgroundColor: activeView === 'Plan' ? 'white' : 'transparent',
                   color: activeView === 'Plan' ? 'var(--primary-color)' : 'var(--text-muted)',
                   boxShadow: activeView === 'Plan' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                   whiteSpace: 'nowrap'
                 }}
               >
                 Flight Plan
               </button>
               <button 
                 type="button"
                 onClick={() => setActiveView('Log')}
                 style={{ 
                   border: 'none', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer',
                   backgroundColor: activeView === 'Log' ? 'white' : 'transparent',
                   color: activeView === 'Log' ? 'var(--primary-color)' : 'var(--text-muted)',
                   boxShadow: activeView === 'Log' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                   whiteSpace: 'nowrap'
                 }}
               >
                 Flight Log
               </button>
               <button 
                 type="button"
                 onClick={() => setActiveView('Expenses')}
                 style={{ 
                   border: 'none', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer',
                   backgroundColor: activeView === 'Expenses' ? 'white' : 'transparent',
                   color: activeView === 'Expenses' ? 'var(--primary-color)' : 'var(--text-muted)',
                   boxShadow: activeView === 'Expenses' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                   whiteSpace: 'nowrap'
                 }}
               >
                  Expenses
                </button>
             </div>
            <div className="header-divider" style={{ width: '1px', height: '22px', backgroundColor: 'var(--border-color)', flexShrink: 0, margin: '0 2px' }}></div>
            <div className="trip-number-field" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>MSN # <strong style={{ color: 'var(--text-color)' }}>{flightNumber || 'NEW'}</strong></div>
            <div className="header-divider" style={{ width: '1px', height: '22px', backgroundColor: 'var(--border-color)', flexShrink: 0, margin: '0 2px' }}></div>
            <div className="title-field" style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minWidth: '80px', overflow: 'hidden' }}>
               <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>TITLE</span>
               <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ border: 'none', fontWeight: 'bold', fontSize: '0.85rem', outline: 'none', color: 'var(--text-color)', width: '100%', minWidth: 0 }} placeholder="Mission Title..." />
            </div>
            <div className="header-divider" style={{ width: '1px', height: '22px', backgroundColor: 'var(--border-color)', flexShrink: 0, margin: '0 2px' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 1, minWidth: 0, maxWidth: '120px' }}>
               <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>ACCOUNT</span>
               {isMobile ? (
                 <MobileDropdownMenu
                   value={accountId}
                   onChange={val => setAccountId(val)}
                   options={[{ value: '', label: 'Select Account...' }, ...accountsList.map(a => ({ value: a.id, label: a.name }))]}
                   placeholder="Select Account..."
                   style={{ border: 'none', backgroundColor: 'transparent', fontWeight: '500', fontSize: '0.8rem' }}
                 />
               ) : (
                 <select value={accountId} onChange={e => setAccountId(e.target.value)} style={{ border: 'none', fontWeight: '500', outline: 'none', fontSize: '0.8rem', backgroundColor: 'transparent', cursor: 'pointer', width: '100%', textOverflow: 'ellipsis' }}>
                   <option value="">Select Account...</option>
                   {accountsList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                 </select>
               )}
            </div>
            <div className="header-divider" style={{ width: '1px', height: '22px', backgroundColor: 'var(--border-color)', flexShrink: 0, margin: '0 2px' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 1, minWidth: 0, maxWidth: '120px' }}>
               <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>AIRCRAFT</span>
               {isMobile ? (
                  <MobileDropdownMenu
                    value={aircraftId}
                    onChange={handleAircraftChange}
                    disabled={isFlightSigned && !isAdmin}
                    options={[{ value: '', label: 'Select Aircraft...' }, ...aircraftList.map(a => ({ value: a.id, label: `${a.id} (${a.model})` }))]}
                    placeholder="Select Aircraft..."
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent',
                      fontWeight: '500',
                      fontSize: '0.8rem',
                      cursor: isFlightSigned && !isAdmin ? 'not-allowed' : 'pointer',
                      opacity: isFlightSigned && !isAdmin ? 0.7 : 1
                    }}
                  />
                ) : (
                  <select 
                    value={aircraftId} 
                    onChange={e => handleAircraftChange(e.target.value)}
                    disabled={isFlightSigned && !isAdmin}
                    title={isFlightSigned && !isAdmin ? "Aircraft cannot be changed on a signed flight." : undefined}
                    style={{ 
                      border: 'none', 
                      fontWeight: '500', 
                      outline: 'none', 
                      fontSize: '0.8rem', 
                      backgroundColor: 'transparent', 
                      cursor: isFlightSigned && !isAdmin ? 'not-allowed' : 'pointer', 
                      opacity: isFlightSigned && !isAdmin ? 0.7 : 1,
                      width: '100%', 
                      textOverflow: 'ellipsis' 
                    }}
                  >
                    <option value="">Select Aircraft...</option>
                    {aircraftList.map(a => <option key={a.id} value={a.id}>{a.id} ({a.model})</option>)}
                  </select>
                )}
            </div>
            
            <div className="status-tags-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
               <div className="status-field" style={{ display: 'flex', alignItems: 'center' }}>
                 {isMobile ? (
                   <MobileDropdownMenu
                     value={normalizeStatus(status)}
                     onChange={val => setStatus(normalizeStatus(val))}
                     options={[
                       { value: 'on hold', label: 'On Hold' },
                       { value: 'confirmed', label: 'Confirmed' },
                       { value: 'completed', label: 'Completed' },
                       { value: 'maintenance', label: 'Maintenance' },
                       { value: 'canceled', label: 'Canceled' },
                     ]}
                     placeholder="Status"
                     style={{
                       border: 'none', fontWeight: 'bold', fontSize: '0.85rem', backgroundColor: 'transparent',
                       color: normalizeStatus(status) === 'on hold' ? '#d69e2e' : normalizeStatus(status) === 'confirmed' ? '#38a169' : normalizeStatus(status) === 'completed' ? '#3182ce' : normalizeStatus(status) === 'maintenance' ? '#805ad5' : normalizeStatus(status) === 'canceled' ? '#e53e3e' : '#718096',
                     }}
                   />
                 ) : (
                   <select 
                     value={normalizeStatus(status)} 
                     onChange={e => setStatus(normalizeStatus(e.target.value))} 
                     style={{ 
                       border: 'none', fontWeight: 'bold', outline: 'none', 
                       fontSize: '0.82rem', backgroundColor: 'transparent', cursor: 'pointer',
                       color: normalizeStatus(status) === 'on hold' ? '#d69e2e' : 
                              normalizeStatus(status) === 'confirmed' ? '#38a169' : 
                              normalizeStatus(status) === 'completed' ? '#3182ce' : 
                              normalizeStatus(status) === 'maintenance' ? '#805ad5' : 
                              normalizeStatus(status) === 'canceled' ? '#e53e3e' : '#718096'
                     }}
                   >
                     <option value="on hold">On Hold</option>
                     <option value="confirmed">Confirmed</option>
                     <option value="completed">Completed</option>
                     <option value="maintenance">Maintenance</option>
                     <option value="canceled">Canceled</option>
                   </select>
                 )}
               </div>
               <div className="tag-field" style={{ 
                  backgroundColor: tag === 'Emergency' ? '#ed8936' : tag === 'Maintenance' ? '#e53e3e' : 'var(--primary-color)', 
                  color: 'white', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 
               }}>
              <BookOpen size={11}/> 
              {isMobile ? (
                <MobileDropdownMenu
                  value={tag}
                  onChange={val => setTag(val)}
                  options={[
                    { value: '', label: 'TAGS' },
                    { value: 'Emergency', label: 'Emergency' },
                    { value: 'Maintenance', label: 'Maintenance' },
                  ]}
                  placeholder="TAGS"
                  style={{ background: 'transparent', color: 'white', border: 'none', fontWeight: 'bold', minWidth: '40px', fontSize: '0.7rem' }}
                />
              ) : (
                <select value={tag} onChange={e => setTag(e.target.value)} style={{ background: 'transparent', color: 'white', border: 'none', outline: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.7rem' }}>
                  <option value="" style={{color: 'black'}}>TAGS</option>
                  <option value="Emergency" style={{color: 'black'}}>Emergency</option>
                  <option value="Maintenance" style={{color: 'black'}}>Maintenance</option>
                 </select>
              )}
             </div>
             </div>
            </>
            )}
          </div>
          <div className="close-btn-container" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, marginLeft: '8px' }}>
            {isMobile && (
              <button
                type="button"
                onClick={() => setHeaderCollapsed(!headerCollapsed)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
              >
                <ChevronDown
                  size={18}
                  style={{
                    color: 'var(--primary-color)',
                    transform: headerCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                    transition: 'transform 0.2s ease'
                  }}
                />
              </button>
            )}
            <button type="button" onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}><X size={20} color="var(--text-muted)"/></button>
          </div>
        </div>

        {isMobile && headerCollapsed && (
          <div
            onClick={() => setHeaderCollapsed(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 15px', backgroundColor: '#f7fafc', borderBottom: '1px solid var(--border-color)',
              flexShrink: 0, cursor: 'pointer'
            }}
          >
            <span style={{
              fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-color)',
              backgroundColor: 'var(--primary-light)', padding: '3px 8px', borderRadius: '4px'
            }}>
              MSN #{flightNumber || 'NEW'}
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title || 'Untitled Flight'}
            </span>
            <span style={{
              fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: '12px',
              backgroundColor: status === 'confirmed' ? '#c6f6d5' : status === 'on hold' ? '#fefcbf' : '#fed7d7',
              color: status === 'confirmed' ? '#276749' : status === 'on hold' ? '#975a16' : '#9b2c2c',
              textTransform: 'capitalize'
            }}>
              {status || 'On Hold'}
            </span>
          </div>
        )}

        {isMobile && !headerCollapsed && (
          <>
            {/* Row 1: Mission + Title */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 15px', backgroundColor: '#f7fafc', borderBottom: '1px solid var(--border-color)',
              flexShrink: 0
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-color)', whiteSpace: 'nowrap' }}>
                MSN #{flightNumber || 'NEW'}
              </span>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Enter Mission Title..."
                style={{
                  flex: 1, border: 'none', background: 'transparent', outline: 'none',
                  fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', minWidth: 0
                }}
              />
            </div>
            {/* Row 2: Account + Aircraft */}
            <div style={{
              display: 'flex', gap: '10px', padding: '8px 15px',
              backgroundColor: 'white', borderBottom: '1px solid var(--border-color)', flexShrink: 0
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Account</span>
                <MobileDropdownMenu
                  value={accountId}
                  onChange={val => setAccountId(val)}
                  options={[{ value: '', label: 'Select Account...' }, ...accountsList.map(a => ({ value: a.id, label: a.name }))]}
                  placeholder="Select Account..."
                  style={{ border: 'none', fontWeight: '500', fontSize: '0.85rem', backgroundColor: 'transparent', color: accountId ? 'var(--text-main)' : 'var(--text-muted)' }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Aircraft</span>
                <MobileDropdownMenu
                  value={aircraftId}
                  onChange={handleAircraftChange}
                  disabled={isFlightSigned && !isAdmin}
                  options={[{ value: '', label: 'Select Aircraft...' }, ...aircraftList.map(a => ({ value: a.id, label: `${a.id} (${a.model})` }))]}
                  placeholder="Select Aircraft..."
                  style={{
                    border: 'none',
                    fontWeight: '500',
                    fontSize: '0.85rem',
                    backgroundColor: 'transparent',
                    color: aircraftId ? 'var(--text-main)' : 'var(--text-muted)',
                    cursor: isFlightSigned && !isAdmin ? 'not-allowed' : 'pointer',
                    opacity: isFlightSigned && !isAdmin ? 0.7 : 1
                  }}
                />
              </div>
            </div>
            {/* Row 3: Status + Tag */}
            <div style={{
              display: 'flex', gap: '10px', alignItems: 'center', padding: '8px 15px',
              backgroundColor: 'white', borderBottom: '1px solid var(--border-color)', flexShrink: 0
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Status</span>
                <MobileDropdownMenu
                  value={normalizeStatus(status)}
                  onChange={val => setStatus(normalizeStatus(val))}
                  options={[
                    { value: 'on hold', label: 'On Hold' },
                    { value: 'confirmed', label: 'Confirmed' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'maintenance', label: 'Maintenance' },
                    { value: 'canceled', label: 'Canceled' },
                  ]}
                  placeholder="Status"
                  style={{
                    border: 'none', fontWeight: 'bold', fontSize: '0.85rem', backgroundColor: 'transparent',
                    color: normalizeStatus(status) === 'on hold' ? '#d69e2e' : normalizeStatus(status) === 'confirmed' ? '#38a169' : normalizeStatus(status) === 'completed' ? '#3182ce' : normalizeStatus(status) === 'maintenance' ? '#805ad5' : normalizeStatus(status) === 'canceled' ? '#e53e3e' : '#718096',
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Tag</span>
                <div style={{
                  backgroundColor: tag === 'Emergency' ? '#ed8936' : tag === 'Maintenance' ? '#e53e3e' : 'var(--primary-color)',
                  color: 'white', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '5px'
                }}>
                  <BookOpen size={12}/>
                  <MobileDropdownMenu
                    value={tag}
                    onChange={val => setTag(val)}
                    options={[
                      { value: '', label: 'TAGS' },
                      { value: 'Emergency', label: 'Emergency' },
                      { value: 'Maintenance', label: 'Maintenance' },
                    ]}
                    placeholder="TAGS"
                    style={{ background: 'transparent', color: 'white', border: 'none', fontWeight: 'bold', minWidth: '50px' }}
                  />
                </div>
              </div>
            </div>
            {/* Row 4: View toggle */}
            <div style={{
              display: 'flex', gap: '4px', padding: '8px 15px',
              backgroundColor: 'white', borderBottom: '1px solid var(--border-color)', flexShrink: 0
            }}>
              <button
                type="button"
                onClick={() => setActiveView('Plan')}
                style={{
                  flex: 1, border: 'none', padding: '8px 0', fontSize: '0.8rem', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer',
                  backgroundColor: activeView === 'Plan' ? 'var(--primary-color)' : '#e2e8f0',
                  color: activeView === 'Plan' ? 'white' : 'var(--text-muted)'
                }}
              >
                Flight Plan
              </button>
              <button
                type="button"
                onClick={() => setActiveView('Log')}
                style={{
                  flex: 1, border: 'none', padding: '8px 0', fontSize: '0.8rem', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer',
                  backgroundColor: activeView === 'Log' ? 'var(--primary-color)' : '#e2e8f0',
                  color: activeView === 'Log' ? 'white' : 'var(--text-muted)'
                }}
              >
                Flight Log
              </button>
              <button
                type="button"
                onClick={() => setActiveView('Expenses')}
                style={{
                  flex: 1, border: 'none', padding: '8px 0', fontSize: '0.8rem', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer',
                  backgroundColor: activeView === 'Expenses' ? 'var(--primary-color)' : '#e2e8f0',
                  color: activeView === 'Expenses' ? 'white' : 'var(--text-muted)'
                }}
              >
                Expenses
              </button>
            </div>
          </>
        )}

        {/* CONTENT AREA */}
        {pendingRemoteChanges && (
          <div style={{
            backgroundColor: '#ebf8ff', borderBottom: '2px solid #3182ce',
            padding: '10px 15px', flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 700, color: '#2b6cb0', fontSize: '0.85rem', flexShrink: 0 }}>⚠️ Changes by another user:</span>
                <span style={{ color: '#2c5282', fontSize: '0.8rem' }}>
                  {pendingRemoteChanges.changes.join(', ')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={handleAcceptRemoteChanges}
                  style={{
                    backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '4px',
                    padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  See Latest
                </button>
                <button
                  type="button"
                  onClick={handleDismissRemoteChanges}
                  style={{
                    backgroundColor: 'white', color: '#3182ce', border: '1px solid #3182ce', borderRadius: '4px',
                    padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Keep Mine
                </button>
              </div>
            </div>
          </div>
        )}

        {activeView === 'Plan' ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '0', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '0' }}>
            {legs.map((leg, index) => {
              const depLoc = getLocationDetails(leg.departure);
              const arrLoc = getLocationDetails(leg.destination);
              
              const depTz = getLocationTimeZone(leg.departure);
              const arrTz = getLocationTimeZone(leg.destination);
              const depTzLabel = getTzAbbreviation(depTz, leg.date, leg.takeoffTime);
              const arrTzLabel = getTzAbbreviation(arrTz, leg.arrDate || leg.date, leg.landTime);
              
              return (
                <React.Fragment key={index}>
                  <div 
                    className="flight-leg-row"
                    draggable={!isFlightSigned && draggableLegIndex === index}
                    onDragStart={() => !isFlightSigned && (dragItem.current = index)}
                    onDragEnter={() => !isFlightSigned && (dragOverItem.current = index)}
                    onDragEnd={() => { if (!isFlightSigned) handleSort(); setDraggableLegIndex(null); }}
                    onDragOver={(e) => e.preventDefault()}
                    style={{ 
                      display: 'flex', backgroundColor: 'white',                       borderRadius: index === 0 ? '8px 8px 0 0' : index === legs.length - 1 ? '0 0 8px 8px' : '0', 
                      border: '1px solid var(--border-color)', borderBottom: 'none', overflow: 'visible',
                      position: 'relative', zIndex: 1000 - index
                    }}
                  >
                    {/* Leg Number */}
                    <div className="leg-number-col" style={{ width: '40px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0', backgroundColor: '#fafbfc' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{index + 1}</div>
                      <div 
                        style={{ cursor: isFlightSigned ? 'not-allowed' : 'grab', marginTop: 'auto', paddingBottom: '4px', opacity: isFlightSigned ? 0.35 : 1 }} 
                        onMouseEnter={() => !isFlightSigned && setDraggableLegIndex(index)} 
                        onMouseLeave={() => setDraggableLegIndex(null)}
                        title={isFlightSigned ? "Signed flight leg order is locked" : "Drag to reorder leg"}
                      >
                        <GripVertical size={14} color="var(--text-muted)"/>
                      </div>
                    </div>

                    {/* Departure */}
                    <div className="leg-departure-col" style={{ flex: '1', padding: '4px 8px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input 
                            type="date" 
                            value={leg.date} 
                            disabled={isFlightSigned} 
                            onChange={e => handleUpdateLeg(index, 'date', e.target.value)} 
                            style={{ fontSize: '0.75rem', color: 'var(--text-muted)', border: 'none', background: 'transparent', outline: 'none', cursor: isFlightSigned ? 'not-allowed' : 'pointer', opacity: isFlightSigned ? 0.7 : 1, padding: 0 }} 
                            title={isFlightSigned ? "Signed flight dates cannot be changed" : undefined}
                          />
                          {index > 0 && legs[0].date && leg.date && leg.date !== legs[0].date && (
                            <span style={{ fontSize: '0.65rem', backgroundColor: '#e9d8fd', color: '#6b46c1', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                              Multi-day leg
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                           {isMobile ? (
                             <MobileScrollPicker
                               value={leg.takeoffTime || ''}
                               items={TIME_ITEMS}
                               onChange={(val) => handleUpdateLeg(index, 'takeoffTime', val)}
                               color="#48bb78"
                               style={{ fontSize: '1rem', fontWeight: 'bold' }}
                             />
                           ) : (
                             <input type="time" value={leg.takeoffTime} onChange={e => handleUpdateLeg(index, 'takeoffTime', e.target.value)} style={{ fontSize: '1rem', fontWeight: 'bold', color: '#48bb78', border: 'none', outline: 'none', cursor: 'pointer' }} />
                           )}
                           <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>[{depTzLabel}]</span>
                        </div>
                      </div>
                      <LocationSelect value={leg.departure} onChange={(val) => handleUpdateLeg(index, 'departure', val)} placeholder="Type origin..." />
                      {depLoc.display && (
                         <div style={{ marginTop: '2px' }}>
                           <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{depLoc.display}</div>
                           <div style={{ fontSize: '0.75rem' }}>{depLoc.name}</div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{depLoc.city}</span>
                              <span style={{ fontWeight: 'bold' }}>{leg.passengers.length} PAX</span>
                           </div>
                         </div>
                      )}
                    </div>

                    {/* Flight Path */}
                    {(() => {
                      const isLastLeg = index === legs.length - 1;
                      let layoverMin = null;
                      if (!isLastLeg && leg.landTime && legs[index + 1]?.takeoffTime) {
                        const currLand = toDate(`${leg.arrDate || leg.date}T${leg.landTime}:00`, { timeZone: arrTz });
                        const nextDepTz = getLocationTimeZone(legs[index + 1].departure);
                        const nextTakeoff = toDate(`${legs[index + 1].date}T${legs[index + 1].takeoffTime}:00`, { timeZone: nextDepTz });
                        layoverMin = (nextTakeoff.getTime() - currLand.getTime()) / 60000;
                        if (layoverMin < 0) layoverMin += 24 * 60;
                      }
                      return (
                        <div className="flight-path-col" style={{ width: '125px', minWidth: '110px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px 4px', boxSizing: 'border-box' }}>
                          <div style={{ backgroundColor: '#f7f8fa', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%', boxSizing: 'border-box' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>{leg.distance != null ? leg.distance : (leg.departure?.id && leg.destination?.id && leg.departure.id === leg.destination.id ? 0 : '?')} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>NM</span></div>
                            <div style={{ width: '60%', borderTop: '1px solid var(--border-color)' }}></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}>
                              {isMobile ? (
                                <MobileScrollPicker
                                  value={leg.duration ? parseFloat((leg.duration / 60).toFixed(1)).toFixed(1) : '0.0'}
                                  items={DURATION_ITEMS}
                                  onChange={(val) => handleUpdateLeg(index, 'duration', val)}
                                  color="#dd6b20"
                                  style={{ fontSize: '1.2rem' }}
                                />
                              ) : (
                                <DurationPicker
                                  value={leg.duration ? parseFloat((leg.duration / 60).toFixed(1)).toFixed(1) : '0.0'}
                                  onChange={(val) => handleUpdateLeg(index, 'duration', val)}
                                  color="#dd6b20"
                                  style={{ fontSize: '1.2rem' }}
                                />
                              )}
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#dd6b20' }}>HR</span>
                            </div>
                            {layoverMin !== null && (
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Clock size={10} /> {formatTime(layoverMin)} layover
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Arrival */}
                    <div className="leg-arrival-col" style={{ flex: '1', padding: '4px 8px', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input 
                            type="date" 
                            value={leg.arrDate || leg.date} 
                            min={leg.date}
                            disabled={isFlightSigned}
                            onChange={e => handleUpdateLeg(index, 'arrDate', e.target.value)} 
                            style={{ fontSize: '0.75rem', color: 'var(--text-muted)', border: 'none', background: 'transparent', outline: 'none', cursor: isFlightSigned ? 'not-allowed' : 'pointer', opacity: isFlightSigned ? 0.7 : 1, padding: 0 }} 
                            title={isFlightSigned ? "Signed flight dates cannot be changed" : undefined}
                          />
                          {leg.arrDate && leg.date && leg.arrDate > leg.date && (
                            <span style={{ fontSize: '0.65rem', backgroundColor: '#feebc8', color: '#c05621', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                              +1d overnight
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                           {isMobile ? (
                             <MobileScrollPicker
                               value={leg.landTime || ''}
                               items={TIME_ITEMS}
                               onChange={(val) => handleUpdateLeg(index, 'landTime', val)}
                               color="var(--text-color)"
                               style={{ fontSize: '1rem', fontWeight: 'bold' }}
                             />
                           ) : (
                             <input type="time" value={leg.landTime} onChange={e => handleUpdateLeg(index, 'landTime', e.target.value)} style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-color)', border: 'none', outline: 'none', cursor: 'pointer' }} />
                           )}
                           <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>[{arrTzLabel}]</span>
                        </div>
                      </div>
                      <LocationSelect value={leg.destination} onChange={(val) => handleUpdateLeg(index, 'destination', val)} placeholder="Type destination..." />
                      {arrLoc.display && (
                         <div style={{ marginTop: '2px' }}>
                           <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{arrLoc.display}</div>
                           <div style={{ fontSize: '0.75rem' }}>{arrLoc.name}</div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{arrLoc.city}</span>
                           </div>
                         </div>
                      )}
                    </div>

                    {/* Crew & Pax (Right Sidebar) */}
                    <div style={{ width: '220px', padding: '4px 8px', borderLeft: '1px solid var(--border-color)', backgroundColor: '#fafbfc', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {/* Pilot / Crew */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {(leg.pilots || (leg.pilotId ? [leg.pilotId] : [])).length > 1 ? 'Pilots' : 'Pilot'} / Crew ({(leg.pilots || (leg.pilotId ? [leg.pilotId] : [])).length})
                          </label>
                          {isMobile ? (
                            <MobileDropdownMenu
                              value=""
                              onChange={val => {
                                if (!val) return;
                                handleAddPilotToLeg(index, val);
                              }}
                              options={[{ value: '', label: 'Add Pilot...' }, ...pilotsList.map(p => ({ value: p.id, label: p.name }))]}
                              placeholder="Add Pilot..."
                              style={{ fontSize: '0.75rem' }}
                            />
                          ) : (
                            <PilotSelect
                              pilots={leg.pilots || (leg.pilotId ? [leg.pilotId] : [])}
                              pilotsList={pilotsList}
                              onAdd={(pilotId) => handleAddPilotToLeg(index, pilotId)}
                              onRemove={(pilotId) => handleRemovePilotFromLeg(index, pilotId)}
                              onToggleRole={(pilotId) => handleTogglePilotRole(index, pilotId)}
                            />
                          )}
                          {(leg.pilots || (leg.pilotId ? [leg.pilotId] : [])).length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '2px' }}>
                              {(leg.pilots || (leg.pilotId ? [leg.pilotId] : [])).map(pId => {
                                const pilot = pilotsList.find(p => p.id === pId || p.name === pId);
                                const role = (leg.pilotRoles || {})[pId];
                                const isPIC = role === 'PIC';
                                const isSIC = role === 'SIC';

                                const badgeBg = isPIC ? '#fefcbf' : isSIC ? '#ebf8ff' : '#f1f5f9';
                                const badgeBorder = isPIC ? '1px solid #d69e2e' : isSIC ? '1px solid #3182ce' : '1px solid #cbd5e1';
                                const badgeTextColor = isPIC ? '#744210' : isSIC ? '#2b6cb0' : '#475569';
                                const roleText = isPIC ? ' [PIC]' : isSIC ? ' [SIC]' : '';

                                return (
                                  <div 
                                    key={pId} 
                                    style={{ 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      backgroundColor: badgeBg, 
                                      border: badgeBorder,
                                      color: badgeTextColor, 
                                      borderRadius: '3px', 
                                      fontSize: '0.62rem',
                                      lineHeight: '1.2',
                                      overflow: 'hidden',
                                      userSelect: 'none',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                    }}
                                  >
                                    <span 
                                      onClick={() => handleTogglePilotRole(index, pId)}
                                      title="Click to toggle role (PIC -> SIC -> Crew)"
                                      style={{ 
                                        padding: '2px 5px', 
                                        cursor: 'pointer', 
                                        fontWeight: 'bold',
                                        display: 'inline-flex',
                                        alignItems: 'center'
                                      }}
                                    >
                                      {pilot ? pilot.name : pId}{roleText}
                                    </span>
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleRemovePilotFromLeg(index, pId);
                                      }}
                                      title="Remove pilot from leg"
                                      style={{
                                        padding: '2px 4px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderLeft: '1px solid rgba(0,0,0,0.12)',
                                        backgroundColor: 'rgba(0,0,0,0.05)',
                                        color: badgeTextColor
                                      }}
                                    >
                                      <X size={9} strokeWidth={2.5} />
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        {/* Passengers */}
                        <PassengerSelect
                          passengers={leg.passengers}
                          passengersList={passengersList}
                          onAdd={(paxId) => {
                            const current = leg.passengers || [];
                            if (!current.includes(paxId)) {
                              handleUpdateLeg(index, 'passengers', [...current, paxId]);
                            }
                          }}
                          onRemove={(paxId) => {
                            handleUpdateLeg(index, 'passengers', leg.passengers.filter(p => p !== paxId));
                          }}
                          onAddNew={(newPax, newId) => {
                            handleAddNewPax(newPax, newId);
                            const current = leg.passengers || [];
                            handleUpdateLeg(index, 'passengers', [...current, newId]);
                          }}
                        />
                       {!isFlightSigned && legs.length > 1 && (
                         <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                           <button onClick={() => handleRemoveLeg(index)} style={{ background: 'none', border: 'none', color: 'red', fontSize: '0.75rem', cursor: 'pointer', padding: '0', width: 'fit-content' }}>Remove Leg</button>
                         </div>
                       )}
                    </div>
                  </div>
                  

                </React.Fragment>
              );
            })}
            
            {!isFlightSigned && (
              <div style={{ marginTop: '15px' }}>
                <button type="button" onClick={handleAddLeg} style={{ backgroundColor: 'white', border: '1px dashed var(--primary-color)', color: 'var(--primary-color)', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                   <Plus size={16}/> ADD LEG
                </button>
              </div>
            )}
          </div>

          {/* BOTTOM TABS */}
          <div style={{ backgroundColor: 'white', marginTop: 'auto', display: 'flex', borderTop: '1px solid var(--border-color)', height: '140px', flexShrink: 0 }}>
             <div style={{ width: '200px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                {['Crew Notes', 'Operations Notes'].map(tab => (
                   <div 
                     key={tab} 
                     onClick={() => setActiveTab(tab)}
                     style={{ padding: '15px 20px', cursor: 'pointer', fontWeight: activeTab === tab ? 'bold' : 'normal', backgroundColor: activeTab === tab ? '#f4f5f7' : 'transparent', borderBottom: '1px solid var(--border-color)' }}
                   >
                     {tab}
                   </div>
                ))}
             </div>
             <div style={{ flex: 1, padding: '10px', backgroundColor: '#f4f5f7' }}>
                {activeTab === 'Crew Notes' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                     <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Crew Notes</label>
                     <textarea 
                       value={comments} 
                       onChange={e => setComments(e.target.value)}
                       placeholder="Add notes for the crew..." 
                       style={{ flex: 1, width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', resize: 'none', backgroundColor: 'white', fontSize: '0.8rem' }}
                     />
                  </div>
                )}
                {activeTab === 'Operations Notes' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                     <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Operations Notes</label>
                     <textarea 
                       value={opsNotes} 
                       onChange={e => setOpsNotes(e.target.value)}
                       placeholder="Add internal operations notes..." 
                       style={{ flex: 1, width: '100%', padding: '15px', borderRadius: '4px', border: '1px solid var(--border-color)', resize: 'none', backgroundColor: 'white' }}
                     />
                  </div>
                )}
                {(activeTab !== 'Crew Notes' && activeTab !== 'Operations Notes') && (
                  <div style={{ color: 'var(--text-muted)' }}>No {activeTab.toLowerCase()} to display.</div>
                )}
             </div>
          </div>

        </div>
        ) : activeView === 'Log' ? (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
             <FlightLogTab 
                legs={legs} 
                flightLog={flightLog} 
                setFlightLog={setFlightLog}
                persistFlightLog={persistFlightLogToFlight}
                onSign={handleSignFlight}
                onClearSignature={handleClearSignature}
                onToggleLock={handleToggleLock}
                aircraftId={aircraftId}
                aircraftList={aircraftList}
                pilotsList={pilotsList}
             />
           </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
             <ExpensesTab expenses={expenses} setExpenses={setExpenses} legs={legs} aircraftId={aircraftId} vendorsList={vendorsList} flightDate={date} flight={flight} onGetPendingDeletes={(fn) => { getExpensesPendingDeletesRef.current = fn; }} />
          </div>
        )}

        {/* FLIGHT UPLOADS PANEL */}
        {showUploads && (
          <div style={{ borderTop: '1px solid var(--border-color)', padding: '12px 15px', backgroundColor: '#f8fafc', maxHeight: '250px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Paperclip size={14} /> Flight Documents
              </h4>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Upload size={12} /> {uploading ? 'Uploading...' : 'Upload Files'}
                </button>
                <button onClick={() => setShowUploads(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                  <X size={14} color="var(--text-muted)" />
                </button>
              </div>
            </div>
            {uploads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No documents uploaded yet. Click "Upload Files" to add documents.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {uploads.map((file, i) => (
                  <div key={file.id || i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    {getFileIcon(file)}
                    <span style={{ flex: 1, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{file.type || ''}</span>
                    {isViewable(file) && (
                      <button onClick={() => handleViewUpload(file)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }} title="View">
                        <Eye size={13} color="#38a169" />
                      </button>
                    )}
                    <button onClick={() => handleDownloadUpload(file)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }} title="Download file">
                      <Download size={13} color="var(--primary-color)" />
                    </button>
                    <button onClick={() => handleDeleteUpload(file)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }} title="Delete">
                      <Trash2 size={13} color="#e53e3e" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '6px', width: '100%', padding: '8px 15px', borderTop: '1px solid var(--border-color)', backgroundColor: 'white', alignItems: 'center', flexShrink: 0, overflowX: 'auto' }}>
           <button
             onClick={() => {
               if (!flight) return;
               if (isFlightSigned && !isAdmin) {
                 alert('This flight has a signed flight log and can only be deleted by an administrator.');
                 return;
               }
               setDeleteConfirmOpen(true);
             }}
             disabled={!flight || (isFlightSigned && !isAdmin)}
             className="btn btn-outline"
             title={(isFlightSigned && !isAdmin) ? 'Signed flights can only be deleted by an administrator' : 'Delete Flight'}
             style={{
               flex: 1,
               color: (isFlightSigned && !isAdmin) ? 'var(--text-muted)' : '#e53e3e',
               borderColor: (isFlightSigned && !isAdmin) ? 'var(--border-color)' : '#e53e3e',
               opacity: (!flight || (isFlightSigned && !isAdmin)) ? 0.45 : 1,
               cursor: (isFlightSigned && !isAdmin) ? 'not-allowed' : 'pointer',
               display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
               padding: '5px 6px', fontSize: '0.7rem', textAlign: 'center', lineHeight: '1', whiteSpace: 'nowrap'
             }}
           >
              <Trash2 size={13} /> Delete
           </button>
            <button onClick={() => onDuplicate && onDuplicate({
                ...flight,
                title: title || '',
                accountId,
                legs,
                aircraftId,
                comments,
                opsNotes,
                status: 'confirmed',
                tag,
                flightLog: {},
                expenses: [],
                uploads: [],
                documents: [],
                files: [],
                receipts: [],
                receiptFiles: []
              })} className="btn btn-outline" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '5px 6px', fontSize: '0.7rem', textAlign: 'center', lineHeight: '1', whiteSpace: 'nowrap' }}>
              <BookOpen size={13} /> Duplicate
           </button>
<button className="btn btn-outline" onClick={() => setShowUploads(!showUploads)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '5px 6px', fontSize: '0.7rem', textAlign: 'center', lineHeight: '1', whiteSpace: 'nowrap' }}>
                <Paperclip size={13} /> Uploads {uploads.length > 0 && <span style={{ fontSize: '0.65rem', color: 'var(--primary-color)' }}>({uploads.length})</span>}
             </button>
            <SaveButton onClick={handleSubmit} triggerSave={isSaved} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '5px 6px', fontSize: '0.7rem', textAlign: 'center', lineHeight: '1', whiteSpace: 'nowrap', margin: 0 }}>
               <span style={{ fontSize: '0.8rem', lineHeight: '12px' }}>&#10003;</span> Save Flight
            </SaveButton>
         </div>

      </div>
    </div>

    {deleteConfirmOpen && (
      <div
        onClick={() => setDeleteConfirmOpen(false)}
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
            width: '100%', maxWidth: '320px', padding: '0', borderRadius: '12px',
            backgroundColor: 'var(--bg-color)', boxShadow: '0 15px 40px rgba(0,0,0,0.35)', overflow: 'hidden'
          }}
        >
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%', margin: '0 auto 12px',
              backgroundColor: '#fed7d7', color: '#e53e3e', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Trash2 size={22} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: 'var(--text-main)' }}>Delete Flight?</h3>
            <p style={{ margin: '0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Are you sure you want to delete this flight?</p>
          </div>
          <div style={{ display: 'flex', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(false)}
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
              onClick={() => {
                if (isFlightSigned && !isAdmin) {
                  alert('This flight has a signed flight log and can only be deleted by an administrator.');
                  return;
                }
                setDeleteConfirmOpen(false);
                if (flight) onDelete(flight.id);
              }}
              style={{
                flex: 1, padding: '14px', border: 'none', background: 'transparent',
                fontSize: '0.9rem', fontWeight: 700, color: '#e53e3e', cursor: 'pointer'
              }}
            >
              Delete Flight
            </button>
          </div>
        </div>
      </div>
    )}

    {conflictModal.open && (
      <ConflictWarningModal
        pilotConflicts={conflictModal.pilotConflicts}
        aircraftConflicts={conflictModal.aircraftConflicts}
        pilotNames={Object.fromEntries(pilotsList.map(p => [String(p.id), p.name]))}
        onProceed={() => { setConflictModal({ open: false, pilotConflicts: [], aircraftConflicts: [] }); performSave(); }}
        onCancel={() => setConflictModal({ open: false, pilotConflicts: [], aircraftConflicts: [] })}
      />
    )}

    {/* FILE VIEWER MODAL */}
    {viewerFile && (
      <div
        onClick={() => setViewerFile(null)}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column',
          zIndex: 3000, padding: '10px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', marginBottom: '10px' }}>
          <span style={{ color: 'white', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{viewerFile.name}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a href={viewerFile.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: 'white', textDecoration: 'none', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.15)', fontSize: '0.75rem' }}>
              Open in Tab
            </a>
            <button onClick={(e) => { e.stopPropagation(); setViewerFile(null); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}>
              <X size={18} />
            </button>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {(viewerFile.type?.startsWith('image/') || ['png','jpg','jpeg','gif','webp','svg','heic','heif'].includes((viewerFile.name || '').split('.').pop()?.toLowerCase())) ? (
            <img src={viewerFile.url} alt={viewerFile.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }} />
          ) : viewerFile.type === 'application/pdf' || (viewerFile.name || '').split('.').pop()?.toLowerCase() === 'pdf' ? (
            <iframe src={viewerFile.url} title={viewerFile.name} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '4px' }} />
          ) : viewerFile.type?.startsWith('video/') || ['mp4','webm','mov'].includes((viewerFile.name || '').split('.').pop()?.toLowerCase()) ? (
            <video src={viewerFile.url} controls style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '4px' }} />
          ) : viewerFile.type?.startsWith('audio/') || ['mp3','wav'].includes((viewerFile.name || '').split('.').pop()?.toLowerCase()) ? (
            <div style={{ padding: '40px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
              <audio src={viewerFile.url} controls />
              <p style={{ color: 'white', marginTop: '12px', fontSize: '0.85rem', textAlign: 'center' }}>{viewerFile.name}</p>
            </div>
          ) : ['json','geojson','txt','csv','html','xml'].includes((viewerFile.name || '').split('.').pop()?.toLowerCase()) ? (
            <iframe src={viewerFile.url} title={viewerFile.name} style={{ width: '100%', height: '100%', border: 'none', backgroundColor: 'white', borderRadius: '4px' }} />
          ) : (
            <div style={{ textAlign: 'center', color: 'white', padding: '40px' }}>
              <File size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p style={{ fontSize: '0.9rem' }}>Preview not available for this file type.</p>
              <a href={viewerFile.url} target="_blank" rel="noopener noreferrer" style={{ color: '#63b3ed', textDecoration: 'underline', fontSize: '0.85rem' }}>Open in new tab to download</a>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
};

export default EventModal;
