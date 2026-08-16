import React, { useState, useEffect, useCallback } from 'react';
import { mockAircrafts } from '../data';
import { Helicopter, Wrench, Trash2, Save, X, ChevronRight } from 'lucide-react';
import { authService } from '../services/authService';
import { can as permCan } from '../services/permissionService';
import SaveButton from './SaveButton';

const MobileFleet = () => {
  const currentUser = authService.getCurrentUser();
  const isAdmin = permCan(currentUser, 'all') || false;
  const canEditMeters = permCan(currentUser, 'editMeters');
  const canEditMaintenance = permCan(currentUser, 'editMaintenance');
  const canEditProfile = permCan(currentUser, 'editAircraftProfile');
  const canAddDeleteAircraft = isAdmin;
  const canEditOps = permCan(currentUser, 'editOperationalData');

  const [aircraft, setAircraft] = useState([]);
  const [flights, setFlights] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [view, setView] = useState('landing');

  const loadData = useCallback(() => {
    let storedAircraft = [];
    try {
      storedAircraft = JSON.parse(localStorage.getItem('userAircraft'));
      if (!storedAircraft) {
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
      storedAircraft = [];
    }

    storedAircraft.sort((a, b) => a.id.localeCompare(b.id));
    setAircraft(storedAircraft);

    try {
      setFlights(JSON.parse(localStorage.getItem('userFlights') || '[]'));
    } catch {}

    if (view === 'detail' && selectedId) {
      const updatedSel = storedAircraft.find(a => a.id === selectedId);
      if (updatedSel) {
        setEditForm(prev => prev ? { ...updatedSel, originalId: updatedSel.id } : null);
      } else {
        setSelectedId(null);
        setEditForm(null);
        setView('landing');
      }
    }
  }, [selectedId, view]);

  useEffect(() => {
    loadData();
    const handleStorage = () => loadData();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('firestore-sync', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('firestore-sync', handleStorage);
    };
  }, [loadData]);

  const getTodayFlights = (ac) => {
    if (!ac) return [];
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return (flights || []).filter(f => {
      if (f.aircraftId !== ac.id) return false;
      const fDate = f.date ? f.date.split('T')[0] : '';
      if (!f.legs || f.legs.length === 0) return fDate === todayStr;
      return f.legs.some(l => (l.date || fDate) === todayStr);
    });
  };

  const getTodayAircraftStatus = (ac) => {
    if (!ac) return { status: 'Available', flightText: null, hasFlight: false };
    const todayFlights = getTodayFlights(ac);
    if (todayFlights.length > 0) {
      const isMaintenance = todayFlights.some(f => f.tag === 'Maintenance');
      const flightInfo = todayFlights.map(f => `#${f.flightNumber}: ${f.title}`).join(', ');
      if (isMaintenance) return { status: 'Maintenance', hasFlight: true, flightText: flightInfo };
      return { status: 'Scheduled', hasFlight: true, flightText: flightInfo };
    }
    const baseStatus = ac.status === 'Maintenance' || ac.status === 'Reserved' ? ac.status : 'Available';
    return { status: baseStatus, hasFlight: false, flightText: null };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Scheduled': return { bg: '#ebf8ff', text: '#2b6cb0', border: '#bee3f8' };
      case 'Maintenance': return { bg: '#fff5f5', text: '#9b2c2c', border: '#fed7d7' };
      case 'Reserved': return { bg: '#faf5ff', text: '#6b46c1', border: '#e9d8fd' };
      default: return { bg: '#f0fff4', text: '#276749', border: '#c6f6d5' };
    }
  };

  const sortedAircraft = [...aircraft].sort((a, b) => {
    const aCount = getTodayFlights(a).length;
    const bCount = getTodayFlights(b).length;
    if (bCount !== aCount) return bCount - aCount;
    return a.id.localeCompare(b.id);
  });

  const openDetail = (ac) => {
    setSelectedId(ac.id);
    setEditForm({ ...ac, originalId: ac.id });
    setView('detail');
  };

  const handleDelete = () => {
    if (!editForm) return;
    if (!window.confirm(`Are you sure you want to delete ${editForm.id}?`)) return;
    try {
      const storedAircraft = JSON.parse(localStorage.getItem('userAircraft') || '[]');
      const updatedAircraft = storedAircraft.filter(a => a.id !== editForm.originalId && a.id !== editForm.id);
      localStorage.setItem('userAircraft', JSON.stringify(updatedAircraft));
      setSelectedId(null);
      setEditForm(null);
      setView('landing');
      loadData();
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
      
      setSelectedId(acToSave.id);
      setEditForm({ ...acToSave, originalId: acToSave.id });
      setSaved(prev => !prev);
      window.dispatchEvent(new Event('storage'));
    } catch {
      console.error('Failed to save aircraft.');
    }
  };

  const selectedAircraft = aircraft.find(a => a.id === selectedId);

  if (view === 'landing') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-color)' }}>
        <div style={{ padding: '15px', backgroundColor: 'white', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: 'var(--primary-light)', padding: '8px', borderRadius: '50%', color: 'var(--primary-color)' }}>
            <Helicopter size={20} />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Fleet</h2>
          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{aircraft.length} aircraft</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {sortedAircraft.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>No aircraft found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sortedAircraft.map(ac => {
                const statusObj = getTodayAircraftStatus(ac);
                const colors = getStatusColor(statusObj.status);
                const flightCount = getTodayFlights(ac).length;
                return (
                  <div
                    key={ac.id}
                    onClick={() => openDetail(ac)}
                    className="card"
                    style={{ padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: `4px solid ${colors.border}` }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)' }}>{ac.id}</span>
                        {flightCount > 0 && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, backgroundColor: 'var(--primary-color)', color: 'white', padding: '1px 6px', borderRadius: '10px' }}>
                            {flightCount} {flightCount === 1 ? 'flight' : 'flights'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>{ac.model || 'Unknown Model'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', backgroundColor: colors.bg, color: colors.text }}>
                          {statusObj.status}
                        </span>
                        {statusObj.flightText && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {statusObj.flightText}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-color)' }}>
      <div style={{ padding: '12px 15px', backgroundColor: 'white', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={() => setView('landing')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', padding: '4px' }}
        >
          <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div style={{ backgroundColor: 'var(--primary-light)', padding: '6px', borderRadius: '50%', color: 'var(--primary-color)' }}>
          <Helicopter size={16} />
        </div>
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedId || 'Aircraft'}</span>
      </div>

      <div style={{ flex: 1, padding: '15px', overflowY: 'auto' }}>
        {!editForm ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>No aircraft selected.</div>
        ) : (
          <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            <div className="card" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input 
                type="text" 
                value={editForm.id} 
                onChange={(e) => setEditForm({...editForm, id: e.target.value.toUpperCase()})}
                disabled={!canEditProfile}
                style={{ fontSize: '1.25rem', fontWeight: 'bold', border: 'none', borderBottom: '2px dashed var(--border-color)', width: '100%', outline: 'none', backgroundColor: 'transparent', color: 'var(--primary-color)', cursor: canEditProfile ? 'text' : 'not-allowed' }}
                placeholder="TAIL NUMBER"
                required
              />
            </div>

            <div className="card" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
                      padding: '12px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: isAvailable ? '#f0fff4' : isMaintenance ? '#fff5f5' : isScheduled ? '#ebf8ff' : '#f7fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontWeight: 'bold', fontSize: '0.9rem',
                          color: isAvailable ? '#276749' : isMaintenance ? '#9b2c2c' : isScheduled ? '#2b6cb0' : '#4a5568'
                        }}>
                          {statusObj.status}
                        </span>
                        {statusObj.hasFlight && (
                          <span style={{ fontSize: '0.75rem', backgroundColor: '#edf2f7', color: 'var(--primary-color)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Flight Scheduled
                          </span>
                        )}
                      </div>
                      {statusObj.hasFlight ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--primary-color)', marginTop: '2px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Helicopter size={12} /> {statusObj.flightText}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          No scheduled flights today
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="card" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Helicopter size={16} /> Operational Data
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Base Location</label>
                  <input 
                    type="text" 
                    value={editForm.baseLocation || ''} 
                    onChange={(e) => setEditForm({...editForm, baseLocation: e.target.value})}
                    placeholder="e.g. KVPZ"
                    disabled={!canEditOps}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditOps ? 'white' : '#f7fafc' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Max Speed (Kts)</label>
                  <input 
                    type="number" 
                    value={editForm.maxCruiseSpeed || 120} 
                    onChange={(e) => setEditForm({...editForm, maxCruiseSpeed: parseInt(e.target.value) || 120})}
                    disabled={!canEditOps}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditOps ? 'white' : '#f7fafc' }}
                  />
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Helicopter size={16} /> Logbook Totals
                </label>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', backgroundColor: '#f7fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <input 
                    type="checkbox" 
                    checked={editForm.dualEngine || false} 
                    onChange={(e) => setEditForm({...editForm, dualEngine: e.target.checked})} 
                    style={{ cursor: 'pointer', margin: 0 }}
                  />
                  <span>Twin Engine</span>
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Aircraft Hours</label>
                  <input type="number" step="0.1" value={editForm.totalHours || 0} onChange={(e) => setEditForm({...editForm, totalHours: parseFloat(e.target.value) || 0})} disabled={!canEditMeters} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditMeters ? 'white' : '#f7fafc' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Aircraft Landings</label>
                  <input type="number" value={editForm.landings || 0} onChange={(e) => setEditForm({...editForm, landings: parseInt(e.target.value) || 0})} disabled={!canEditMeters} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditMeters ? 'white' : '#f7fafc' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Engine 1 Hours</label>
                  <input type="number" step="0.1" value={editForm.engine1Hours !== undefined ? editForm.engine1Hours : (editForm.engineHours || editForm.totalHours || 0)} onChange={(e) => setEditForm({...editForm, engine1Hours: parseFloat(e.target.value) || 0, engineHours: parseFloat(e.target.value) || 0})} disabled={!canEditMeters} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditMeters ? 'white' : '#f7fafc' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Engine 1 Cycles</label>
                  <input type="number" value={editForm.engine1Cycles !== undefined ? editForm.engine1Cycles : (editForm.engineCycles || 0)} onChange={(e) => setEditForm({...editForm, engine1Cycles: parseInt(e.target.value) || 0, engineCycles: parseInt(e.target.value) || 0})} disabled={!canEditMeters} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditMeters ? 'white' : '#f7fafc' }} />
                </div>

                {editForm.dualEngine && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Engine 2 Hours</label>
                      <input type="number" step="0.1" value={editForm.engine2Hours || 0} onChange={(e) => setEditForm({...editForm, engine2Hours: parseFloat(e.target.value) || 0})} disabled={!canEditMeters} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditMeters ? 'white' : '#f7fafc' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Engine 2 Cycles</label>
                      <input type="number" value={editForm.engine2Cycles || 0} onChange={(e) => setEditForm({...editForm, engine2Cycles: parseInt(e.target.value) || 0})} disabled={!canEditMeters} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditMeters ? 'white' : '#f7fafc' }} />
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', gridColumn: editForm.dualEngine ? 'span 2' : 'span 1' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Hobbs Meter</label>
                  <input type="number" step="0.1" value={editForm.hobbs || 0} onChange={(e) => setEditForm({...editForm, hobbs: parseFloat(e.target.value) || 0})} disabled={!canEditMeters} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditMeters ? 'white' : '#f7fafc' }} />
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditMaintenance ? 'white' : '#f7fafc' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Next Inspection Due</label>
                  <input 
                    type="date" 
                    value={editForm.nextInspection || ''} 
                    onChange={(e) => setEditForm({...editForm, nextInspection: e.target.value})}
                    disabled={!canEditMaintenance}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', backgroundColor: canEditMaintenance ? 'white' : '#f7fafc' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--accent-color)' }}>Maintenance Notes & Squawks</label>
                <textarea 
                  value={editForm.notes || ''} 
                  onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                  placeholder="e.g. Avionics update required on next inspection..."
                  disabled={!canEditMaintenance}
                  style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', minHeight: '100px', resize: 'vertical', fontSize: '0.875rem', backgroundColor: canEditMaintenance ? 'white' : '#f7fafc' }}
                />
              </div>
            </div>

            {editForm.auditLog && editForm.auditLog.length > 0 && (
              <div className="card" style={{ padding: '15px', backgroundColor: '#fff5f5', border: '1px solid #feb2b2' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.875rem', color: '#c53030' }}>Logbook Audit Trail</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.75rem', color: '#742a2a' }}>
                  {editForm.auditLog.map((log, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{log}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'nowrap', alignItems: 'stretch' }}>
              {!editForm.isNew && canAddDeleteAircraft && (
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ flex: 1, color: '#e53e3e', borderColor: '#e53e3e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', fontSize: '0.75rem', textAlign: 'center', lineHeight: '1.2' }} 
                  onClick={handleDelete}
                >
                  <Trash2 size={16} style={{ marginBottom: '4px' }} /> Delete Aircraft
                </button>
              )}
              
              {JSON.stringify(editForm) !== JSON.stringify(selectedAircraft) && (
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', fontSize: '0.75rem', textAlign: 'center', lineHeight: '1.2' }}
                  onClick={() => setEditForm({ ...selectedAircraft, originalId: selectedAircraft.id })}
                >
                  <X size={16} style={{ marginBottom: '4px' }} /> Discard Changes
                </button>
              )}
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                <SaveButton 
                  onClick={handleSave} 
                  triggerSave={saved} 
                  disabled={!editForm.id}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', fontSize: '0.75rem', textAlign: 'center', lineHeight: '1.2' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Save size={16} style={{ marginBottom: '4px' }} /> Save Aircraft
                  </div>
                </SaveButton>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default MobileFleet;
