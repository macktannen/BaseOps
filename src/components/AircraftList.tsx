import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useData } from '../contexts/DataProvider';


import { Search, Plus, Trash2, Helicopter, Wrench, ChevronDown, ChevronUp, History, BarChart3, ShieldCheck, Calendar, Save, X } from 'lucide-react';
import SaveButton from './SaveButton';
import { authService } from '../services/authService';
import { can as permCan } from '../services/permissionService';

import ConfirmDialog from './ConfirmDialog';
import AlertDialog from './AlertDialog';
import { validateAircraftMeters, type MeterDiscrepancy } from '../services/aircraftUsage';

const AircraftUsageDashboard = lazy(() => import('./AircraftUsageDashboard'));

const AircraftList = () => {
  const currentUser = authService.getCurrentUser();
  const isAdmin = permCan(currentUser, 'all') || false;
  const canEditMeters = permCan(currentUser, 'editMeters');
  const canEditMaintenance = permCan(currentUser, 'editMaintenance');
  const canEditProfile = permCan(currentUser, 'editAircraftProfile');
  const canAddDeleteAircraft = isAdmin;
  const canEditOps = permCan(currentUser, 'editOperationalData');

  const { data, updateData } = useData();
  const { userAircraft = [], userFlights: flights = [] } = data;

  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });
  const [alertDialog, setAlertDialog] = useState({ open: false, title: '', message: '' });
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('fleet');
  const [meterDiscrepancies, setMeterDiscrepancies] = useState<MeterDiscrepancy[]>([]);
  const [showMeterResults, setShowMeterResults] = useState(false);
  const [showBaselineModal, setShowBaselineModal] = useState(false);
  const [baselineForm, setBaselineForm] = useState<Record<string, number | string> | null>(null);

  const aircraft = useMemo(() => {
    const list = [...userAircraft];
    list.sort((a, b) => a.id.localeCompare(b.id));
    return list;
  }, [userAircraft]);

  useEffect(() => {
    if (selectedAircraft?.id) {
      const updatedSel = aircraft.find(a => a.id === selectedAircraft.id);
      if (updatedSel) {
        setSelectedAircraft(updatedSel);
        // Only update edit form if we aren't actively editing to prevent wiping user input.
        // Wait, normally we only setEditForm on select. If it updates in the background, we might want to sync it.
      }
    }
  }, [aircraft, selectedAircraft?.id]);

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

  const handleDeleteAuditEntry = (originalIndex) => {
    const updatedAudit = (editForm?.auditLog || []).filter((_, idx) => idx !== originalIndex);
    const updated = { ...editForm, auditLog: updatedAudit };
    setEditForm(updated);
    try {
      const stored = [...userAircraft];
      const idx = stored.findIndex(a => a.id === updated.id);
      if (idx >= 0) {
        stored[idx] = updated;
        updateData('userAircraft', stored);
      }
    } catch(err) { console.error(err); }
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
    setConfirmDialog({
      open: true,
      title: 'Delete Aircraft',
      message: `Are you sure you want to delete ${editForm.id}?`,
      onConfirm: () => {
        try {
          const updatedAircraft = userAircraft.filter(a => a.id !== editForm.originalId && a.id !== editForm.id);
          updateData('userAircraft', updatedAircraft);
          setSelectedAircraft(null);
          setEditForm(null);
        } catch {
          setAlertDialog({ open: true, title: 'Delete Failed', message: 'Failed to delete aircraft.' });
        }
        setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  const handleSave = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editForm) return;

    try {
      const storedAircraft = [...userAircraft];
      
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

      updateData('userAircraft', storedAircraft);
      
      setSelectedAircraft(acToSave);
      setEditForm({ ...acToSave, originalId: acToSave.id });
      setSaved(prev => !prev);
    } catch {
      console.error('Failed to save aircraft.');
    }
  };

  const handleValidateMeters = () => {
    const discrepancies = validateAircraftMeters(userAircraft, flights);
    setMeterDiscrepancies(discrepancies);
    setShowMeterResults(true);
  };

  const handleFixMeter = (disc: MeterDiscrepancy) => {
    const storedAircraft = [...userAircraft];
    const acIndex = storedAircraft.findIndex(a => a.id === disc.aircraftId);
    if (acIndex < 0) return;

    const ac = { ...storedAircraft[acIndex] };
    const oldVal = ac[disc.field];

    if (disc.field === 'totalHours') {
      ac.totalHours = disc.computed;
      ac.engine1Hours = disc.computed;
      ac.engineHours = disc.computed;
    } else if (disc.field === 'landings') {
      ac.landings = disc.computed;
    }

    if (!ac.auditLog) ac.auditLog = [];
    ac.auditLog.push(`Meters validated by Admin (${currentUser?.name || 'Unknown'}) on ${new Date().toLocaleString()}: ${disc.label} from '${oldVal}' to '${disc.computed}' (corrected from signed flight logs)`);

    storedAircraft[acIndex] = ac;
    updateData('userAircraft', storedAircraft);

    setMeterDiscrepancies(prev => prev.filter(d => !(d.aircraftId === disc.aircraftId && d.field === disc.field)));
  };

  const handleFixAllMeters = () => {
    const storedAircraft = [...userAircraft];
    const now = new Date().toLocaleString();
    const name = currentUser?.name || 'Unknown';

    for (const disc of meterDiscrepancies) {
      const acIndex = storedAircraft.findIndex(a => a.id === disc.aircraftId);
      if (acIndex < 0) continue;

      const ac = { ...storedAircraft[acIndex] };
      const oldVal = ac[disc.field];

      if (disc.field === 'totalHours') {
        ac.totalHours = disc.computed;
        ac.engine1Hours = disc.computed;
        ac.engineHours = disc.computed;
      } else if (disc.field === 'landings') {
        ac.landings = disc.computed;
      }

      if (!ac.auditLog) ac.auditLog = [];
      ac.auditLog.push(`Meters validated by Admin (${name}) on ${now}: ${disc.label} from '${oldVal}' to '${disc.computed}' (corrected from signed flight logs)`);

      storedAircraft[acIndex] = ac;
    }

    updateData('userAircraft', storedAircraft);
    setMeterDiscrepancies([]);
    setShowMeterResults(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 120px)' }}>
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <button
          className={`btn ${activeTab === 'fleet' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('fleet')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Helicopter size={16} /> Fleet
        </button>
        <button
          className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <BarChart3 size={16} /> Usage Dashboard
        </button>
      </div>

      {activeTab === 'fleet' && (
        <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
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
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={handleValidateMeters}
                        style={{
                          fontSize: '0.7rem',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'white',
                          color: 'var(--primary-color)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 500
                        }}
                      >
                        <ShieldCheck size={12} /> Validate Meters
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          const ac = editForm;
                          setBaselineForm({
                            date: new Date().toISOString().split('T')[0],
                            totalHours: ac.totalHours || 0,
                            landings: ac.landings || 0,
                            hobbs: ac.hobbs || 0,
                            engine1Hours: ac.engine1Hours || ac.engineHours || ac.totalHours || 0,
                            engine1Cycles: ac.engine1Cycles || ac.engineCycles || 0,
                            engine2Hours: ac.engine2Hours || 0,
                            engine2Cycles: ac.engine2Cycles || 0,
                          });
                          setShowBaselineModal(true);
                        }}
                        style={{
                          fontSize: '0.7rem',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'white',
                          color: 'var(--primary-color)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 500
                        }}
                      >
                        <Calendar size={12} /> Set Baseline
                      </button>
                    )}
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
              
              {/* Meter Validation Results */}
              {showMeterResults && (
                <div style={{ flex: '1 1 100%', padding: '15px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: meterDiscrepancies.length === 0 ? '#f0fff4' : '#fffbeb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: meterDiscrepancies.length === 0 ? '#276749' : '#975a16', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldCheck size={16} /> Meter Validation Results
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {meterDiscrepancies.length > 0 && (
                        <button
                          type="button"
                          onClick={handleFixAllMeters}
                          style={{
                            fontSize: '0.75rem',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: '#276749',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: 500
                          }}
                        >
                          Fix All ({meterDiscrepancies.length})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowMeterResults(false)}
                        style={{
                          fontSize: '0.75rem',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'white',
                          color: 'var(--text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                  {meterDiscrepancies.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: '#276749' }}>
                      All meters are correct. No discrepancies found.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {meterDiscrepancies.map((disc, i) => (
                        <div key={`${disc.aircraftId}-${disc.field}-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <strong>{disc.tailNumber}</strong>
                            <span style={{ color: 'var(--text-muted)' }}>{disc.label}:</span>
                            <span>Stored: {disc.stored}</span>
                            <span>→</span>
                            <span style={{ color: '#276749', fontWeight: 600 }}>Correct: {disc.computed}</span>
                            <span style={{ color: disc.delta > 0 ? '#c53030' : '#2b6cb0', fontWeight: 500 }}>
                              ({disc.delta > 0 ? '+' : ''}{disc.delta})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleFixMeter(disc)}
                            style={{
                              fontSize: '0.7rem',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: '1px solid #276749',
                              backgroundColor: 'white',
                              color: '#276749',
                              cursor: 'pointer',
                              fontWeight: 500
                            }}
                          >
                            Fix
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

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

            {editForm.auditLog && editForm.auditLog.length > 0 && (() => {
              const indexedAuditLog = editForm.auditLog.map((text, originalIndex) => ({ text, originalIndex }));
              const reversedAuditLog = [...indexedAuditLog].reverse();
              const entriesToDisplay = (isAdmin && auditExpanded) ? reversedAuditLog : [reversedAuditLog[0]];

              return (
                <div style={{ marginTop: '10px', padding: '12px 15px', backgroundColor: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <History size={15} color="#c53030" />
                      <h4 style={{ margin: 0, fontSize: '0.875rem', color: '#c53030' }}>
                        Logbook Audit Trail {isAdmin && `(${editForm.auditLog.length})`}
                      </h4>
                    </div>
                    {isAdmin && editForm.auditLog.length > 1 && (
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
                        {auditExpanded ? <><ChevronUp size={12} /> Collapse</> : <><ChevronDown size={12} /> Expand All ({editForm.auditLog.length})</>}
                      </button>
                    )}
                  </div>
                  
                  {/* List of audit entries: Non-admin only sees latest; Admin sees all if expanded or latest if collapsed */}
                  <ul style={{ margin: '4px 0 0 0', padding: 0, listStyle: 'none', fontSize: '0.75rem', color: '#742a2a', maxHeight: auditExpanded ? '240px' : 'none', overflowY: auditExpanded ? 'auto' : 'visible' }}>
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
                          lineHeight: '1.35'
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
                  {isAdmin && !auditExpanded && editForm.auditLog.length > 1 && (
                    <div 
                      onClick={() => setAuditExpanded(true)}
                      style={{ fontSize: '0.7rem', color: '#c53030', marginTop: '6px', cursor: 'pointer', fontStyle: 'italic', textDecoration: 'underline' }}
                    >
                      + {editForm.auditLog.length - 1} older audit record{editForm.auditLog.length - 1 > 1 ? 's' : ''} (click to expand)
                    </div>
                  )}
                </div>
              );
            })()}

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
        <ConfirmDialog
          isOpen={confirmDialog.open}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog({ open: false, title: '', message: '', onConfirm: null })}
        />
        <AlertDialog
          isOpen={alertDialog.open}
          title={alertDialog.title}
          message={alertDialog.message}
          onClose={() => setAlertDialog({ open: false, title: '', message: '' })}
        />
        {showBaselineModal && baselineForm && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', width: '100%', maxWidth: '480px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={20} /> Set Meter Baseline for {editForm.id}
                </h3>
                <button onClick={() => setShowBaselineModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>
                  <X size={20} />
                </button>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Set the baseline date and meter values. All signed flights after this date will be validated against these baselines.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Baseline Date</label>
                  <input
                    type="date"
                    value={baselineForm.date}
                    onChange={(e) => setBaselineForm({...baselineForm, date: e.target.value})}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Aircraft Hours</label>
                  <input
                    type="number"
                    step="0.1"
                    value={baselineForm.totalHours}
                    onChange={(e) => setBaselineForm({...baselineForm, totalHours: parseFloat(e.target.value) || 0})}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Aircraft Landings</label>
                  <input
                    type="number"
                    value={baselineForm.landings}
                    onChange={(e) => setBaselineForm({...baselineForm, landings: parseInt(e.target.value) || 0})}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Hobbs Meter</label>
                  <input
                    type="number"
                    step="0.1"
                    value={baselineForm.hobbs}
                    onChange={(e) => setBaselineForm({...baselineForm, hobbs: parseFloat(e.target.value) || 0})}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Engine 1 Hours</label>
                  <input
                    type="number"
                    step="0.1"
                    value={baselineForm.engine1Hours}
                    onChange={(e) => setBaselineForm({...baselineForm, engine1Hours: parseFloat(e.target.value) || 0})}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Engine 1 Cycles</label>
                  <input
                    type="number"
                    value={baselineForm.engine1Cycles}
                    onChange={(e) => setBaselineForm({...baselineForm, engine1Cycles: parseInt(e.target.value) || 0})}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Engine 2 Hours</label>
                  <input
                    type="number"
                    step="0.1"
                    value={baselineForm.engine2Hours}
                    onChange={(e) => setBaselineForm({...baselineForm, engine2Hours: parseFloat(e.target.value) || 0})}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Engine 2 Cycles</label>
                  <input
                    type="number"
                    value={baselineForm.engine2Cycles}
                    onChange={(e) => setBaselineForm({...baselineForm, engine2Cycles: parseInt(e.target.value) || 0})}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowBaselineModal(false)}
                  style={{
                    fontSize: '0.875rem',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'white',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const storedAircraft = [...userAircraft];
                    const acIndex = storedAircraft.findIndex(a => a.id === editForm.id);
                    if (acIndex >= 0) {
                      const ac = { ...storedAircraft[acIndex] };
                      const now = new Date().toLocaleString();
                      ac.meterBaseline = {
                        date: baselineForm.date,
                        totalHours: baselineForm.totalHours,
                        landings: baselineForm.landings,
                        hobbs: baselineForm.hobbs,
                        engine1Hours: baselineForm.engine1Hours,
                        engine1Cycles: baselineForm.engine1Cycles,
                        engine2Hours: baselineForm.engine2Hours,
                        engine2Cycles: baselineForm.engine2Cycles,
                      };
                      if (!ac.auditLog) ac.auditLog = [];
                      ac.auditLog.push(`Meter baseline set by Admin (${currentUser?.name || 'Unknown'}) on ${now}: ${JSON.stringify(ac.meterBaseline)}`);
                      storedAircraft[acIndex] = ac;
                      updateData('userAircraft', storedAircraft);
                    }
                    setShowBaselineModal(false);
                    setBaselineForm(null);
                  }}
                  style={{
                    fontSize: '0.875rem',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: 'var(--primary-color)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  <Save size={14} style={{ marginRight: '4px' }} /> Save Baseline
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading dashboard...</div>}>
            <AircraftUsageDashboard />
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default AircraftList;
