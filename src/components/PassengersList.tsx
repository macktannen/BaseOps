import { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataProvider';
import { Search, Plus, Trash2, Users, Briefcase, HeartPulse } from 'lucide-react';
import SaveButton from './SaveButton';

import ConfirmDialog from './ConfirmDialog';
import AlertDialog from './AlertDialog';

const PassengersList = () => {
  const { data, updateData, updateDataBatch } = useData();
  const { userPassengers = [], crewSchedules = {} } = data;

  const [search, setSearch] = useState('');
  const [selectedPassenger, setSelectedPassenger] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });
  const [alertDialog, setAlertDialog] = useState({ open: false, title: '', message: '' });

  useEffect(() => {
    if (userPassengers.length === 0) {
      const seed = [{
        id: 'PAX-0001',
        name: 'Jane VIP',
        weight: 155,
        email: 'jane.vip@company.com',
        phone: '(555) 987-6543',
        company: 'Acme Corp',
        title: 'CEO',
        isCrew: false,
        emergencyContact: 'John Doe - 555-123-9999',
        medicalNotes: 'No allergies.',
        notes: 'Prefers window seat.'
      }];
      updateData('userPassengers', seed);
    }
  }, [userPassengers.length, updateData]);

  const passengers = useMemo(() => {
    const list = [...userPassengers];
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [userPassengers]);

  useEffect(() => {
    if (selectedPassenger?.id) {
      const updatedSel = passengers.find(p => p.id === selectedPassenger.id);
      if (updatedSel) {
        setSelectedPassenger(updatedSel);
      }
    }
  }, [passengers, selectedPassenger?.id]);

  const filteredPassengers = passengers
    .filter(p => !p.isCrew)
    .filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      (p.company && p.company.toLowerCase().includes(search.toLowerCase()))
    );

  const handleSelect = (pax) => {
    setSelectedPassenger(pax);
    setEditForm({ ...pax, originalId: pax.id });
  };

  const handleAddNew = () => {
    const newPassenger = {
      id: 'New Passenger',
      name: 'New Passenger',
      weight: 180,
      email: '',
      phone: '',
      company: '',
      title: '',
      emergencyContact: '',
      medicalNotes: '',
      notes: '',
      isCrew: false,
      isNew: true
    };
    setSelectedPassenger(newPassenger);
    setEditForm(newPassenger);
  };

  const handleDelete = () => {
    if (!editForm) return;
    setConfirmDialog({
      open: true,
      title: 'Delete Passenger',
      message: `Are you sure you want to delete ${editForm.name}?`,
      onConfirm: () => {
        try {
          const updatedPassengers = userPassengers.filter(p => p.id !== editForm.originalId && p.id !== editForm.id);

          const targetId = editForm.originalId || editForm.id;
          const newSchedules = { ...crewSchedules };
          let changed = false;
          Object.keys(newSchedules).forEach(k => {
            if (k.startsWith(`${targetId}_`) || k.startsWith(`${editForm.name}_`)) {
              delete newSchedules[k];
              changed = true;
            }
          });

          if (changed) {
            updateDataBatch({ userPassengers: updatedPassengers, crewSchedules: newSchedules });
          } else {
            updateData('userPassengers', updatedPassengers);
          }

          setSelectedPassenger(null);
          setEditForm(null);
        } catch {
          setAlertDialog({ open: true, title: 'Delete Failed', message: 'Failed to delete passenger.' });
        }
        setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!editForm) return;

    try {
      const storedPassengers = [...userPassengers];
      
      const paxToSave = { ...editForm };
      const originalId = paxToSave.originalId || paxToSave.id;
      delete paxToSave.isNew;
      delete paxToSave.originalId;

      const existingIndex = storedPassengers.findIndex(p => p.id === originalId);

      if (existingIndex >= 0) {
        storedPassengers[existingIndex] = paxToSave;
      } else {
        storedPassengers.push(paxToSave);
      }

      updateData('userPassengers', storedPassengers);
      
      setSelectedPassenger(paxToSave);
      setEditForm({ ...paxToSave, originalId: paxToSave.id });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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
            <Users size={18} /> Passengers
          </h3>
          <button onClick={handleAddNew} className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Plus size={14} /> Add Pax
          </button>
        </div>
        
        <div style={{ position: 'relative', marginBottom: '15px' }}>
          <input 
            type="text" 
            placeholder="Search by Name, ID, or Company..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 8px 8px 30px', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}
          />
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '10px' }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredPassengers.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px', fontSize: '0.875rem' }}>
              No passengers found.
            </div>
          ) : (
            filteredPassengers.map(pax => (
              <div 
                key={pax.id}
                onClick={() => handleSelect(pax)}
                style={{
                  padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  backgroundColor: selectedPassenger?.id === pax.id ? 'var(--primary-light)' : 'white',
                  borderLeft: selectedPassenger?.id === pax.id ? '4px solid var(--primary-color)' : '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <strong style={{ fontSize: '0.875rem' }}>{pax.name}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {pax.weight} lbs
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-color)', marginTop: '2px', display: 'flex', gap: '10px' }}>
                  <span style={{ color: 'var(--primary-color)' }}>{pax.id}</span>
                  <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pax.company || 'No Company'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: EDITOR */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
        {!selectedPassenger ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <Users size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
            <h3>Select a Passenger</h3>
            <p style={{ fontSize: '0.875rem' }}>Click on a passenger from the left to view or edit their details.</p>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '800px' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '0px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.4rem' }}>
                  {editForm.name || 'New Passenger'}
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
                <label style={{ fontSize: '0.8rem', fontWeight: 500 }}>Weight (lbs)</label>
                <input 
                  type="number" 
                  value={editForm.weight || 0} 
                  onChange={(e) => setEditForm({...editForm, weight: parseInt(e.target.value) || 0})}
                  required
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              {/* Contact Info */}
              <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-color)' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={16} /> Contact Information
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Email Address</label>
                  <input 
                    type="email" 
                    value={editForm.email || ''} 
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Phone Number</label>
                  <input 
                    type="tel" 
                    value={editForm.phone || ''} 
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                  />
                </div>
                {/* Crew status */}
                <label style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={editForm.isCrew || false}
                    onChange={(e) => setEditForm({ ...editForm, isCrew: e.target.checked })}
                    style={{ marginRight: '6px' }}
                  />
                  Crew Member
                </label>
              </div>
              
              {/* Organization Info */}
              <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={16} /> Organization
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Company / Department</label>
                  <input 
                    type="text" 
                    value={editForm.company || ''} 
                    onChange={(e) => setEditForm({...editForm, company: e.target.value})}
                    style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Job Title / Role</label>
                  <input 
                    type="text" 
                    value={editForm.title || ''} 
                    onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              {/* Safety & Medical */}
              <div style={{ flex: '1 1 100%', display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HeartPulse size={16} /> Safety & Emergency
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Emergency Contact Name & Phone</label>
                    <input 
                      type="text" 
                      value={editForm.emergencyContact || ''} 
                      onChange={(e) => setEditForm({...editForm, emergencyContact: e.target.value})}
                      placeholder="e.g. Jane Doe (555) 123-4567"
                      style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Medical Notes / Allergies</label>
                    <input 
                      type="text" 
                      value={editForm.medicalNotes || ''} 
                      onChange={(e) => setEditForm({...editForm, medicalNotes: e.target.value})}
                      placeholder="e.g. EpiPen required, Motion sickness..."
                      style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--accent-color)' }}>General Notes</label>
              <textarea 
                value={editForm.notes || ''} 
                onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                placeholder="e.g. Prefers window seat, needs headset extension..."
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', minHeight: '60px', resize: 'vertical', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                {!editForm.isNew && (
                  <button type="button" className="btn btn-outline" style={{ color: 'red', borderColor: 'red', display: 'flex', alignItems: 'center', gap: '5px' }} onClick={handleDelete}>
                    <Trash2 size={16} /> Delete Passenger
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {JSON.stringify(editForm) !== JSON.stringify(selectedPassenger) && (
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={() => setEditForm({ ...selectedPassenger })}
                  >
                    Discard Changes
                  </button>
                )}
                <SaveButton type="submit" triggerSave={saved}>
                  Save Passenger
                </SaveButton>
              </div>
            </div>
          </form>
        )}
      </div>
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
    </div>
  );
};

export default PassengersList;
