import React, { useState, useEffect, useCallback } from 'react';


import { Search, Plus, Trash2, Helicopter, Wrench } from 'lucide-react';
import SaveButton from './SaveButton';
import { mockAircrafts } from '../data';
import { authService } from '../services/authService';
import { can as permCan } from '../services/permissionService';

const AircraftList = () => {
  const currentUser = authService.getCurrentUser();
  const isAdmin = permCan(currentUser, 'all') || false;
  const canEditMeters = permCan(currentUser, 'editMeters');
  const canEditMaintenance = permCan(currentUser, 'editMaintenance');
  const canEditProfile = permCan(currentUser, 'editAircraftProfile');
  const canAddDeleteAircraft = isAdmin;
  const canEditOps = permCan(currentUser, 'editOperationalData');

  const [aircraft, setAircraft] = useState([]);
  const [flights, setFlights] = useState([]);
  const [saved, setSaved] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const selectedAircraftId = selectedAircraft?.id;
  const loadData = useCallback(() => {
    let storedAircraft = [];
    try {
      storedAircraft = JSON.parse(localStorage.getItem('userAircraft'));
      if (!storedAircraft) {
        // First load: seed with mock aircraft
        storedAircraft = [...mockAircrafts].map(a => ({
          ...a,
          baseLocation: 'KVPZ',
          totalHours: a.totalHours || 1250,
          engine1Hours: a.engine1Hours || a.engineHours || a.totalHours || 1250,
          engine2Hours: a.engine2Hours || 0,
          engine1Cycles: a.engine1Cycles || a.engineCycles || 450,
          engine2Cycles: a.engine2Cycles || 0,
          dualEngine: a.dualEngine || false,
          maxCruiseSpeed: 120,
          lastInspection: '2025-10-01',
          nextInspection: '2026-10-01',
          notes: ''
        }));
        localStorage.setItem('userAircraft', JSON.stringify(storedAircraft));
      }
    } catch (e) {
      console.error(e);
      storedAircraft = [];
    }

    // Sort by tail number
    storedAircraft.sort((a, b) => a.id.localeCompare(b.id));
    setAircraft(storedAircraft);

    if (selectedAircraftId) {
      const updatedSel = storedAircraft.find(a => a.id === selectedAircraftId);
      if (updatedSel) {
        setSelectedAircraft(updatedSel);
        setEditForm(prev => prev ? { ...updatedSel, originalId: updatedSel.id } : null);
      }
    }
    
    try {
      setFlights(JSON.parse(localStorage.getItem('userFlights') || '[]'));
    } catch {}
  }, [selectedAircraftId]);

  useEffect(() => {
    loadData();
    const handleStorage = () => loadData();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadData]);

  const filteredAircraft = aircraft.filter(a => 
    a.id.toLowerCase().includes(search.toLowerCase()) || 
    (a.model && a.model.toLowerCase().includes(search.toLowerCase()))
  );

  const getTodayAircraftStatus = (ac) => {
    if (!ac) return { status: 'Available', flightText: null, hasFlight: false };
    
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    const todayFlights = (flights || []).filter(f => {
      if (f.aircraftId !== ac.id) return false;
      const fDate = f.date ? f.date.split('T')[0] : '';
      if (!f.legs || f.legs.length === 0) {
        return fDate === todayStr;
      }
      return f.legs.some(l => {
        const lDate = l.date || fDate;
        return lDate === todayStr;
      });
    });

    if (todayFlights.length > 0) {
      const isMaintenance = todayFlights.some(f => f.tag === 'Maintenance');
      const flightInfo = todayFlights.map(f => `#${f.flightNumber}: ${f.title}`).join(', ');
      
      if (isMaintenance) {
         return {
           status: 'Maintenance',
           hasFlight: true,
           flightText: flightInfo
         };
      }
      return {
        status: 'Scheduled',
        hasFlight: true,
        flightText: flightInfo
      };
    }

    const baseStatus = ac.status === 'Maintenance' || ac.status === 'Reserved' ? ac.status : 'Available';

    return {
      status: baseStatus,
      hasFlight: false,
      flightText: null
    };
  };

  const handleSelect = (ac) => {
    setSelectedAircraft(ac);
    setEditForm({ ...ac, originalId: ac.id });
  };

  const handleAddNew = () => {
    const newId = `N${Math.floor(1000 + Math.random() * 9000)}X`;
    const newAircraft = {
      id: newId,
      model: 'Unknown Model',
      status: 'Available',
      baseLocation: '',
      totalHours: 0,
      maxCruiseSpeed: 120,
      lastInspection: '',
      nextInspection: '',
      notes: '',
      isNew: true
    };
    setSelectedAircraft(newAircraft);
    setEditForm(newAircraft);
  };

  const handleDelete = () => {
    if (!editForm) return;
    if (!window.confirm(`Are you sure you want to delete ${editForm.id}?`)) return;
    try {
      const storedAircraft = JSON.parse(localStorage.getItem('userAircraft') || '[]');
      const updatedAircraft = storedAircraft.filter(a => a.id !== editForm.originalId && a.id !== editForm.id);
      localStorage.setItem('userAircraft', JSON.stringify(updatedAircraft));
      loadData();
      setSelectedAircraft(null);
      setEditForm(null);
    } catch {
      alert('Failed to delete aircraft.');
    }
  };

  const handleSave = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editForm) return;

    try {
      const storedAircraft = JSON.parse(localStorage.getItem('userAircraft') || '[]');
      
      const acToSave = { ...editForm };
      const originalId = acToSave.originalId || acToSave.id;
      delete acToSave.isNew;
      delete acToSave.originalId;

      const existingIndex = storedAircraft.findIndex(a => a.id === originalId);
      const oldAc = existingIndex >= 0 ? storedAircraft[existingIndex] : {};
      
      const metrics = [
         { key: 'totalHours', label: 'Aircraft Hours' },
         { key: 'landings', label: 'Aircraft Landings' },
         { key: 'engine1Hours', label: 'Engine 1 Hours' },
         { key: 'engine2Hours', label: 'Engine 2 Hours' },
         { key: 'engine1Cycles', label: 'Engine 1 Cycles' },
         { key: 'engine2Cycles', label: 'Engine 2 Cycles' },
         { key: 'dualEngine', label: 'Twin Engine Aircraft' },
         { key: 'hobbs', label: 'Hobbs' },
         { key: 'status', label: 'Status' },
         { key: 'baseLocation', label: 'Base Location' }
      ];

      const changes = [];
      metrics.forEach(m => {
         let oldVal = oldAc[m.key];
         if (oldVal === undefined || oldVal === null) oldVal = (m.key === 'status' || m.key === 'baseLocation') ? '' : 0;
         let newVal = acToSave[m.key];
         if (newVal === undefined || newVal === null) newVal = (m.key === 'status' || m.key === 'baseLocation') ? '' : 0;
         
         if (String(oldVal) !== String(newVal)) {
            changes.push(`${m.label} from '${oldVal}' to '${newVal}'`);
         }
      });
      
      if (changes.length > 0 && !editForm.isNew) {
         if (!acToSave.auditLog) acToSave.auditLog = [];
         acToSave.auditLog.push(`Admin (${currentUser?.name || 'Unknown'}) updated: ${changes.join(', ')} on ${new Date().toLocaleString()}`);
      } else if (editForm.isNew) {
         if (!acToSave.auditLog) acToSave.auditLog = [];
         acToSave.auditLog.push(`Aircraft created by Admin (${currentUser?.name || 'Unknown'}) on ${new Date().toLocaleString()}`);
      }

      if (existingIndex >= 0) {
        storedAircraft[existingIndex] = acToSave;
      } else {
        storedAircraft.push(acToSave);
      }

      localStorage.setItem('userAircraft', JSON.stringify(storedAircraft));
      
      loadData();
      setSelectedAircraft(acToSave);
      setEditForm({ ...acToSave, originalId: acToSave.id });
      setSaved(prev => !prev);
    } catch {
      console.error('Failed to save aircraft.');
    }
  };

  return (
    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 120px)' }}>
      {/* LEFT COLUMN: LIST */}
      <div className="card" style={{ width: '350px', display: 'flex', flexDirection: 'column', padding: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Helicopter size={18} /> Aircraft
          </h3>
          {canAddDeleteAircraft && (
            <button onClick={handleAddNew} className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={14} /> Add Aircraft
            </button>
          )}
        </div>
        
        <div style={{ position: 'relative', marginBottom: '15px' }}>
          <input 
            type="text" 
            placeholder="Search by Tail Number or Model..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 8px 8px 30px', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}
          />
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '10px' }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredAircraft.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px', fontSize: '0.875rem' }}>
              No aircraft found.
            </div>
          ) : (
            filteredAircraft.map(ac => {
              const statusObj = getTodayAircraftStatus(ac);
              return (
                <div 
                  key={ac.id}
                  onClick={() => handleSelect(ac)}
                  style={{
                    padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    backgroundColor: selectedAircraft?.id === ac.id ? 'var(--primary-light)' : 'white',
                    borderLeft: selectedAircraft?.id === ac.id ? '4px solid var(--primary-color)' : '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <strong style={{ fontSize: '0.875rem' }}>{ac.id}</strong>
                    <span style={{ 
                      fontSize: '0.65rem', 
                      padding: '2px 6px', 
                      borderRadius: '10px',
                      backgroundColor: statusObj.status === 'Available' ? '#c6f6d5' : statusObj.status === 'Maintenance' ? '#fed7d7' : statusObj.status === 'Scheduled' ? '#e2e8f0' : '#feebc8',
                      color: statusObj.status === 'Available' ? '#22543d' : statusObj.status === 'Maintenance' ? '#822727' : statusObj.status === 'Scheduled' ? '#4a5568' : '#7b341e'
                    }}>
                      {statusObj.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-color)', marginTop: '2px', display: 'flex', gap: '10px' }}>
                    <span>{ac.model}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{ac.totalHours} hrs</span>
                    <span style={{ color: 'var(--text-muted)' }}>{ac.maxCruiseSpeed} kts</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: EDITOR */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
        {!selectedAircraft ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <Helicopter size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
            <h3>Select an Aircraft</h3>
            <p style={{ fontSize: '0.875rem' }}>Click on an aircraft from the left to view or edit its details.</p>
          </div>
        ) : (
          <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '15px', marginBottom: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, color: 'var(--primary-color)' }}>
                  <input 
                    type="text" 
                    value={editForm.id} 
                    onChange={(e) => setEditForm({...editForm, id: e.target.value.toUpperCase()})}
                    disabled={!canEditProfile}
                    style={{ fontSize: '1.5rem', fontWeight: 'bold', border: 'none', borderBottom: '2px dashed var(--border-color)', width: '150px', outline: 'none', backgroundColor: 'transparent', color: 'inherit', cursor: canEditProfile ? 'text' : 'not-allowed' }}
                    placeholder="TAIL NUMBER"
                    required
                  />
                </h2>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Make & Model</label>
                <input 
                  type="text" 
                  value={editForm.model || ''} 
                  onChange={(e) => setEditForm({...editForm, model: e.target.value})}
                  placeholder="e.g. Bell 407, Airbus H125"
                  required
                  disabled={!canEditProfile}
                  style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditProfile ? 'white' : '#f7fafc', cursor: canEditProfile ? 'text' : 'not-allowed' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Today's Schedule Status</label>
                {(() => {
                  const statusObj = getTodayAircraftStatus(selectedAircraft);
                  const isMaintenance = statusObj.status === 'Maintenance';
                  const isScheduled = statusObj.status === 'Scheduled';
                  const isAvailable = statusObj.status === 'Available';
                  return (
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: isAvailable ? '#f0fff4' : isMaintenance ? '#fff5f5' : isScheduled ? '#ebf8ff' : '#f7fafc',
                      fontSize: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      height: '38px',
                      justifyContent: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontWeight: 'bold',
                          color: isAvailable ? '#276749' : isMaintenance ? '#9b2c2c' : isScheduled ? '#2b6cb0' : '#4a5568'
                        }}>
                          {statusObj.status}
                        </span>
                        {statusObj.hasFlight && (
                          <span style={{ fontSize: '0.75rem', backgroundColor: '#edf2f7', color: 'var(--primary-color)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Flight Scheduled
                          </span>
                        )}
                      </div>
                      {statusObj.hasFlight ? (
                        <div style={{ fontSize: '0.78rem', color: 'var(--primary-color)', marginTop: '2px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Helicopter size={12} /> {statusObj.flightText}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          No scheduled flights today
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {/* Operational Info */}
              <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '15px', padding: '15px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-color)' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Helicopter size={16} /> Operational Data
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Base Location</label>
                  <input 
                    type="text" 
                    value={editForm.baseLocation || ''} 
                    onChange={(e) => setEditForm({...editForm, baseLocation: e.target.value})}
                    placeholder="e.g. KVPZ"
                    disabled={!canEditOps}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditOps ? 'white' : '#f7fafc', cursor: canEditOps ? 'text' : 'not-allowed' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Max Cruise Speed (Knots)</label>
                  <input 
                    type="number" 
                    value={editForm.maxCruiseSpeed || 120} 
                    onChange={(e) => setEditForm({...editForm, maxCruiseSpeed: parseInt(e.target.value) || 120})}
                    disabled={!canEditOps}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditOps ? 'white' : '#f7fafc', cursor: canEditOps ? 'text' : 'not-allowed' }}
                  />
                </div>
              </div>

              {/* Logbook Totals */}
              <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '15px', padding: '15px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Helicopter size={16} /> Logbook Totals
                  </label>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', backgroundColor: 'white', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    <input 
                      type="checkbox" 
                      checked={editForm.dualEngine || false} 
                      onChange={(e) => setEditForm({...editForm, dualEngine: e.target.checked})} 
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Twin Engine</span>
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Aircraft Hours</label>
                    <input type="number" step="0.1" value={editForm.totalHours || 0} onChange={(e) => setEditForm({...editForm, totalHours: parseFloat(e.target.value) || 0})} disabled={!canEditMeters} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditMeters ? 'white' : '#f7fafc', cursor: canEditMeters ? 'text' : 'not-allowed' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Aircraft Landings</label>
                    <input type="number" value={editForm.landings || 0} onChange={(e) => setEditForm({...editForm, landings: parseInt(e.target.value) || 0})} disabled={!canEditMeters} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditMeters ? 'white' : '#f7fafc', cursor: canEditMeters ? 'text' : 'not-allowed' }} />
                  </div>

                  {/* Engine 1 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Engine 1 Hours</label>
                    <input type="number" step="0.1" value={editForm.engine1Hours !== undefined ? editForm.engine1Hours : (editForm.engineHours || editForm.totalHours || 0)} onChange={(e) => setEditForm({...editForm, engine1Hours: parseFloat(e.target.value) || 0, engineHours: parseFloat(e.target.value) || 0})} disabled={!canEditMeters} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditMeters ? 'white' : '#f7fafc', cursor: canEditMeters ? 'text' : 'not-allowed' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Engine 1 Cycles</label>
                    <input type="number" value={editForm.engine1Cycles !== undefined ? editForm.engine1Cycles : (editForm.engineCycles || 0)} onChange={(e) => setEditForm({...editForm, engine1Cycles: parseInt(e.target.value) || 0, engineCycles: parseInt(e.target.value) || 0})} disabled={!canEditMeters} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditMeters ? 'white' : '#f7fafc', cursor: canEditMeters ? 'text' : 'not-allowed' }} />
                  </div>

                  {/* Engine 2 (Conditional) */}
                  {editForm.dualEngine && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Engine 2 Hours</label>
                        <input type="number" step="0.1" value={editForm.engine2Hours || 0} onChange={(e) => setEditForm({...editForm, engine2Hours: parseFloat(e.target.value) || 0})} disabled={!canEditMeters} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditMeters ? 'white' : '#f7fafc', cursor: canEditMeters ? 'text' : 'not-allowed' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Engine 2 Cycles</label>
                        <input type="number" value={editForm.engine2Cycles || 0} onChange={(e) => setEditForm({...editForm, engine2Cycles: parseInt(e.target.value) || 0})} disabled={!canEditMeters} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditMeters ? 'white' : '#f7fafc', cursor: canEditMeters ? 'text' : 'not-allowed' }} />
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', gridColumn: editForm.dualEngine ? 'span 2' : 'span 1' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Hobbs Meter</label>
                    <input type="number" step="0.1" value={editForm.hobbs || 0} onChange={(e) => setEditForm({...editForm, hobbs: parseFloat(e.target.value) || 0})} disabled={!canEditMeters} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditMeters ? 'white' : '#f7fafc', cursor: canEditMeters ? 'text' : 'not-allowed' }} />
                  </div>
                </div>
              </div>
              
              {/* Maintenance Tracking */}
              <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '15px', padding: '15px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wrench size={16} /> Maintenance Tracking
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Last Inspection Date</label>
                    <input 
                      type="date" 
                      value={editForm.lastInspection || ''} 
                      onChange={(e) => setEditForm({...editForm, lastInspection: e.target.value})}
                      disabled={!canEditMaintenance}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditMaintenance ? 'white' : '#f7fafc', cursor: canEditMaintenance ? 'text' : 'not-allowed' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Next Inspection Due</label>
                    <input 
                      type="date" 
                      value={editForm.nextInspection || ''} 
                      onChange={(e) => setEditForm({...editForm, nextInspection: e.target.value})}
                      disabled={!canEditMaintenance}
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditMaintenance ? 'white' : '#f7fafc', cursor: canEditMaintenance ? 'text' : 'not-allowed' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--accent-color)' }}>Maintenance Notes & Squawks</label>
              <textarea 
                value={editForm.notes || ''} 
                onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                placeholder="e.g. Avionics update required on next inspection..."
                disabled={!canEditMaintenance}
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', minHeight: '100px', resize: 'vertical', fontSize: '0.875rem', backgroundColor: canEditMaintenance ? 'white' : '#f7fafc', cursor: canEditMaintenance ? 'text' : 'not-allowed' }}
              />
            </div>

            {editForm.auditLog && editForm.auditLog.length > 0 && (
              <div style={{ marginTop: '10px', padding: '15px', backgroundColor: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.875rem', color: '#c53030' }}>Logbook Audit Trail</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.75rem', color: '#742a2a' }}>
                  {editForm.auditLog.map((log, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{log}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                {!editForm.isNew && canAddDeleteAircraft && (
                  <button type="button" className="btn btn-outline" style={{ color: 'red', borderColor: 'red', display: 'flex', alignItems: 'center', gap: '5px' }} onClick={handleDelete}>
                    <Trash2 size={16} /> Delete Aircraft
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {JSON.stringify(editForm) !== JSON.stringify(selectedAircraft) && (
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={() => setEditForm({ ...selectedAircraft })}
                  >
                    Discard Changes
                  </button>
                )}
                <SaveButton onClick={handleSave} triggerSave={saved} disabled={!editForm.id}>Save Aircraft</SaveButton>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AircraftList;
