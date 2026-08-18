import React from 'react';
import { Search, User, Plus, Trash2, Users as UsersIcon, Helicopter } from 'lucide-react';
import SaveButton from './SaveButton';
import { mockPilots } from '../data';
import { useData } from '../contexts/DataProvider';

const PilotsList = () => {
  const { userPilots, crewSchedules, userFlights, updateData, updateDataBatch } = useData();

  const pilots = React.useMemo(() => {
    let storedPilots = userPilots || [];
    if (storedPilots.length === 0) {
      storedPilots = [...mockPilots].map(p => ({
        ...p,
        email: `${p.name.split(' ')[0].toLowerCase()}@example.com`,
        phone: '(555) 123-4567',
        medicalExpiration: '2027-01-01',
        certifications: 'CPL, IR',
        notes: ''
      }));
    }
    const cloned = [...storedPilots];
    cloned.sort((a, b) => a.name.localeCompare(b.name));
    return cloned;
  }, [userPilots]);

  const schedules = crewSchedules || {};
  const flights = userFlights || [];

  useEffect(() => {
    if (userPilots && userPilots.length === 0) {
      const mockData = [...mockPilots].map(p => ({
        ...p,
        email: `${p.name.split(' ')[0].toLowerCase()}@example.com`,
        phone: '(555) 123-4567',
        medicalExpiration: '2027-01-01',
        certifications: 'CPL, IR',
        notes: ''
      }));
      updateData('userPilots', mockData);
    }
  }, [userPilots, updateData]);

  const getTodayPilotStatus = (pilot) => {
    if (!pilot) return { dutyStatus: 'Off Duty', flightText: null, fullLabel: 'Off Duty' };
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    // 1. Check schedule grid for today
    const keyById = `${pilot.id}_${todayStr}`;
    const keyByName = `${pilot.name}_${todayStr}`;
    const dutyStatus = schedules[keyById] || schedules[keyByName] || 'Off Duty';

    // 2. Check scheduled flights for today where pilot is assigned
    const todayFlights = (flights || []).filter(f => {
      if (!f.legs || f.legs.length === 0) {
        const fDate = f.date ? f.date.split('T')[0] : '';
        return fDate === todayStr && String(f.pilotId) === String(pilot.id);
      }
      return f.legs.some(l => {
        const lDate = l.date || (f.date ? f.date.split('T')[0] : '');
        return lDate === todayStr && String(l.pilotId) === String(pilot.id);
      });
    });

    if (todayFlights.length > 0) {
      const flightInfo = todayFlights.map(f => `#${f.flightNumber}: ${f.title}`).join(', ');
      return {
        dutyStatus,
        hasFlight: true,
        flightText: flightInfo,
        fullLabel: `${dutyStatus} - Scheduled: ${flightInfo}`
      };
    }

    return {
      dutyStatus,
      hasFlight: false,
      flightText: null,
      fullLabel: dutyStatus
    };
  };

  const getSignedFlightHours = (pilot) => {
    if (!pilot) return 0;
    let signedHours = 0;

    (flights || []).forEach(flight => {
      // Any signed flight log (signed by pilot OR admin) triggers hours logging
      const flightLog = flight.flightLog;
      if (flightLog && flightLog.signature) {
        // Check if this pilot is assigned to the flight or any of its legs
        const isPilotAssigned = (flight.pilotId && String(flight.pilotId) === String(pilot.id)) ||
          (flight.legs && flight.legs.some(l => String(l.pilotId) === String(pilot.id)));

        if (isPilotAssigned) {
          if (flightLog.legsActuals && Array.isArray(flightLog.legsActuals)) {
            flightLog.legsActuals.forEach(l => {
              signedHours += parseFloat(l.flightHrs || 0);
            });
          }
        }
      }
    });

    return signedHours;
  };

  const getTotalLoggedHours = (pilot) => {
    if (!pilot) return '0.0';
    const baseline = parseFloat(pilot.hoursLogged || 0);
    const signedHours = getSignedFlightHours(pilot);
    return (baseline + signedHours).toFixed(1);
  };

  const getMedicalStatus = (expDateStr) => {
    if (!expDateStr) {
      return { status: 'Not Set', label: 'Medical: Not Set', bg: '#edf2f7', color: '#718096', border: '#cbd5e0' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parts = expDateStr.split('-');
    if (parts.length !== 3) {
      return { status: 'Not Set', label: 'Medical: Not Set', bg: '#edf2f7', color: '#718096', border: '#cbd5e0' };
    }
    const expDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    expDate.setHours(0, 0, 0, 0);

    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'Expired', label: 'Medical Expired', daysLeft: diffDays, bg: '#fed7d7', color: '#9b2c2c', border: '#feb2b2' };
    } else if (diffDays <= 30) {
      return { status: 'Caution', label: `Medical Caution (${diffDays}d left)`, daysLeft: diffDays, bg: '#feebc8', color: '#9c4221', border: '#fbd38d' };
    } else {
      return { status: 'Current', label: 'Medical Current', daysLeft: diffDays, bg: '#c6f6d5', color: '#22543d', border: '#9ae6b4' };
    }
  };

  const filteredPilots = pilots.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (pilot) => {
    setSelectedPilot(pilot);
    setEditForm({ ...pilot, originalId: pilot.id });
  };

  const handleAddNew = () => {
    const newId = `P-${Date.now().toString().slice(-4)}`;
    const newPilot = {
      id: newId,
      name: 'New Pilot',
      status: 'Available',
      hoursLogged: 0,
      email: '',
      phone: '',
      medicalExpiration: '',
      certifications: '',
      notes: '',
      isNew: true
    };
    setSelectedPilot(newPilot);
    setEditForm(newPilot);
  };

  const handleDelete = () => {
    if (!editForm) return;
    if (!window.confirm(`Are you sure you want to delete ${editForm.name}?`)) return;
    try {
      const storedPilots = [...(userPilots || [])];
      const updatedPilots = storedPilots.filter(p => p.id !== editForm.id);

      const schedules = { ...crewSchedules };
      let changed = false;
      Object.keys(schedules).forEach(k => {
        if (k.startsWith(`${editForm.id}_`) || k.startsWith(`${editForm.name}_`)) {
          delete schedules[k];
          changed = true;
        }
      });

      if (changed) {
        updateDataBatch({ userPilots: updatedPilots, crewSchedules: schedules });
      } else {
        updateData('userPilots', updatedPilots);
      }
      setSelectedPilot(null);
      setEditForm(null);
    } catch {
      alert('Failed to delete pilot.');
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!editForm) return;

    try {
      const storedPilots = [...(userPilots || [])];
      
      const pilotToSave = { ...editForm };
      const originalId = pilotToSave.originalId || pilotToSave.id;
      delete pilotToSave.isNew;
      delete pilotToSave.originalId;

      const existingIndex = storedPilots.findIndex(p => p.id === originalId);

      if (existingIndex >= 0) {
        storedPilots[existingIndex] = pilotToSave;
      } else {
        storedPilots.push(pilotToSave);
      }

      updateData('userPilots', storedPilots);
      setSelectedPilot(pilotToSave);
      setEditForm({ ...pilotToSave, originalId: pilotToSave.id });
      setSaved(true);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '20px', height: '100%', minHeight: 0, flex: 1, overflow: 'hidden' }}>
      {/* LEFT COLUMN: LIST */}
      <div className="card" style={{ width: '350px', display: 'flex', flexDirection: 'column', padding: '15px', height: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UsersIcon size={18} /> Pilots
          </h3>
          <button onClick={handleAddNew} className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Plus size={14} /> Add Pilot
          </button>
        </div>
        
        <div style={{ position: 'relative', marginBottom: '15px' }}>
          <input 
            type="text" 
            placeholder="Search by Name or ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 8px 8px 30px', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}
          />
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '10px' }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredPilots.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px', fontSize: '0.875rem' }}>
              No pilots found.
            </div>
          ) : (
            filteredPilots.map(pilot => {
              const statusObj = getTodayPilotStatus(pilot);
              const isDuty = statusObj.dutyStatus === 'On Duty' || statusObj.dutyStatus === 'Training';
              return (
                <div 
                  key={pilot.id}
                  onClick={() => handleSelect(pilot)}
                  style={{
                    padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    backgroundColor: selectedPilot?.id === pilot.id ? 'var(--primary-light)' : 'white',
                    borderLeft: selectedPilot?.id === pilot.id ? '4px solid var(--primary-color)' : '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <strong style={{ fontSize: '0.875rem' }}>{pilot.name}</strong>
                    <span style={{ 
                      fontSize: '0.65rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold',
                      backgroundColor: isDuty ? (statusObj.hasFlight ? '#c6f6d5' : '#feebc8') : '#edf2f7',
                      color: isDuty ? (statusObj.hasFlight ? '#22543d' : '#744210') : '#4a5568'
                    }}>
                      {statusObj.dutyStatus}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-color)', display: 'flex', gap: '10px' }}>
                      <span style={{ color: 'var(--primary-color)' }}>{pilot.id}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{getTotalLoggedHours(pilot)} hrs</span>
                    </div>
                    {(() => {
                      const med = getMedicalStatus(pilot.medicalExpiration);
                      return (
                        <span style={{ 
                          fontSize: '0.62rem', padding: '1px 6px', borderRadius: '8px', fontWeight: 'bold',
                          backgroundColor: med.bg, color: med.color, border: `1px solid ${med.border}`
                        }}>
                          {med.status === 'Current' ? 'Med Current' : med.status === 'Caution' ? `Med Caution (${med.daysLeft}d)` : med.status === 'Expired' ? 'Med Expired' : 'Med Not Set'}
                        </span>
                      );
                    })()}
                  </div>
                  {statusObj.hasFlight && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--primary-color)', marginTop: '4px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Helicopter size={12} style={{ flexShrink: 0 }} />
                      <span>{statusObj.flightText}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: EDITOR */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
        {!selectedPilot ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <User size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
            <h3>Select a Pilot</h3>
            <p style={{ fontSize: '0.875rem' }}>Click on a pilot from the left to view or edit their profile.</p>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '800px' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '0px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.4rem' }}>
                  {editForm.name || 'New Pilot'}
                </h2>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 500 }}>Full Name</label>
                <input 
                  type="text" 
                  value={editForm.name || ''} 
                  onChange={(e) => setEditForm({...editForm, name: e.target.value, id: e.target.value})}
                  placeholder="e.g. John Smith"
                  required
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 500 }}>Today's Schedule Status</label>
                {(() => {
                  const statusObj = getTodayPilotStatus(selectedPilot);
                  const isDuty = statusObj.dutyStatus === 'On Duty' || statusObj.dutyStatus === 'Training';
                  return (
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: isDuty ? (statusObj.hasFlight ? '#f0fff4' : '#fffaf0') : '#f7fafc',
                      fontSize: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontWeight: 'bold',
                          color: isDuty ? (statusObj.hasFlight ? '#276749' : '#975a16') : '#4a5568'
                        }}>
                          {statusObj.dutyStatus}
                        </span>
                        {statusObj.hasFlight && (
                          <span style={{ fontSize: '0.75rem', backgroundColor: '#edf2f7', color: 'var(--primary-color)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Flight Scheduled
                          </span>
                        )}
                      </div>
                      {statusObj.hasFlight ? (
                        <div style={{ fontSize: '0.78rem', color: 'var(--primary-color)', marginTop: '2px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Helicopter size={13} style={{ flexShrink: 0 }} />
                          <span>{statusObj.flightText}</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {isDuty ? 'On Duty - No scheduled flights today' : 'Not scheduled on duty today'}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 500 }}>Total Flight Hours Logged</label>
                {(() => {
                  const signedHrs = getSignedFlightHours(selectedPilot);
                  const totalHrs = (parseFloat(editForm.hoursLogged || 0) + signedHrs).toFixed(1);
                  return (
                    <>
                      <input 
                        type="number" 
                        step="0.1"
                        value={totalHrs} 
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setEditForm({ ...editForm, hoursLogged: Math.max(0, val - signedHrs) });
                        }}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                      />
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {signedHrs > 0 
                          ? `Includes ${signedHrs.toFixed(1)} hrs from signed flight logs + ${(parseFloat(editForm.hoursLogged || 0)).toFixed(1)} baseline hrs.` 
                          : 'Pulls completed flight hours from signed flight logs automatically.'}
                      </div>
                    </>
                  );
                })()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 500 }}>Medical Expiration Date</label>
                  {(() => {
                    const med = getMedicalStatus(editForm.medicalExpiration);
                    return (
                      <span style={{ 
                        fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold',
                        backgroundColor: med.bg, color: med.color, border: `1px solid ${med.border}`
                      }}>
                        {med.label}
                      </span>
                    );
                  })()}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="date" 
                    value={editForm.medicalExpiration || ''} 
                    onChange={(e) => setEditForm({...editForm, medicalExpiration: e.target.value})}
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 500 }}>Email Address</label>
                <input 
                  type="email" 
                  value={editForm.email || ''} 
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 500 }}>Phone Number</label>
                <input 
                  type="tel" 
                  value={editForm.phone || ''} 
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 500 }}>Certifications & Ratings</label>
              <input 
                type="text" 
                value={editForm.certifications || ''} 
                onChange={(e) => setEditForm({...editForm, certifications: e.target.value})}
                placeholder="e.g. CPL, ATP, Instrument, NVG"
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--accent-color)' }}>General Notes</label>
              <textarea 
                value={editForm.notes || ''} 
                onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                placeholder="e.g. Schedule preferences, training requirements..."
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', minHeight: '60px', resize: 'vertical', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                {!editForm.isNew && (
                  <button type="button" className="btn btn-outline" style={{ color: 'red', borderColor: 'red', display: 'flex', alignItems: 'center', gap: '5px' }} onClick={handleDelete}>
                    <Trash2 size={16} /> Delete Pilot
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {JSON.stringify(editForm) !== JSON.stringify(selectedPilot) && (
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={() => setEditForm({ ...selectedPilot })}
                  >
                    Discard Changes
                  </button>
                )}
                <SaveButton type="submit" triggerSave={saved}>
                  Save Pilot
                </SaveButton>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PilotsList;
