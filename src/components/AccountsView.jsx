import React, { useState, useRef } from 'react';
import { useData } from '../contexts/DataProvider';
import { Plus, X, Pencil, Trash2, Building, GripVertical } from 'lucide-react';

import { mockAccounts } from '../data';
import { getAccountColor } from '../services/gridColors';

const AccountsView = () => {
  const { data, updateData } = useData();
  const { userAccounts = [], globalContacts = [] } = data;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [name, setName] = useState('');
  const [contactIds, setContactIds] = useState([]);
  const [, setSaved] = useState(false);
  // Drag and drop refs
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // Ensure accounts have contactIds array initialized
  const accounts = userAccounts.map(a => ({ ...a, contactIds: a.contactIds || [] }));

  const handleSave = (e) => {
    e.preventDefault();
    if (!name) return;

    let updatedAccounts;
    if (editingAccount) {
      updatedAccounts = accounts.map(a => 
        a.id === editingAccount.id ? { ...a, name, contactIds } : a
      );
    } else {
      const newAccount = {
        id: `acc-${Date.now()}`,
        name,
        contactIds
      };
      updatedAccounts = [...accounts, newAccount];
    }

    updateData('userAccounts', updatedAccounts);
    setSaved(prev => !prev);
    closeModal();
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      const updatedAccounts = accounts.filter(a => a.id !== id);
      updateData('userAccounts', updatedAccounts);
    }
  };

  const openModal = (account = null) => {
    if (account) {
      setEditingAccount(account);
      setName(account.name);
      setContactIds(account.contactIds || []);
    } else {
      setEditingAccount(null);
      setName('');
      setContactIds([]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
    setName('');
    setContactIds([]);
  };

  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const _accounts = [...accounts];
    const draggedItemContent = _accounts.splice(dragItem.current, 1)[0];
    _accounts.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    updateData('userAccounts', _accounts);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building size={24} />
            Company Accounts & Departments
          </h2>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)' }}>
            Manage internal departments or external accounts used for billing and organization. Drag to reorder.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={16} /> Add Account
        </button>
      </div>

      <div className="card" style={{ flex: 1, overflow: 'auto', padding: 0 }}>
        <table className="data-table">
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>Account Name</th>
              <th>Contacts</th>
              <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account, index) => (
              <tr 
                key={account.id}
                draggable
                onDragStart={() => (dragItem.current = index)}
                onDragEnter={() => (dragOverItem.current = index)}
                onDragEnd={handleSort}
                onDragOver={(e) => e.preventDefault()}
                style={{ cursor: 'move' }}
              >
                <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <GripVertical size={16} />
                </td>
                <td style={{ fontWeight: 'bold' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0,
                        backgroundColor: getAccountColor(account, accounts),
                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                      }}
                      title={`Color key: ${getAccountColor(account, accounts)}`}
                    ></div>
                    <span>{account.name}</span>
                  </div>
                </td>
                <td>
                  {account.contactIds && account.contactIds.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {account.contactIds.map((cid, i) => {
                        const c = globalContacts.find(gc => gc.id === cid);
                        if (!c) return null;
                        return (
                          <div key={i} style={{ fontSize: '0.85rem' }}>
                            <strong>{c.name || 'Unnamed'}</strong> {c.role ? `(${c.role})` : ''}
                            {c.phone && <span> &bull; {c.phone}</span>}
                            {c.email && <span> &bull; {c.email}</span>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No contacts</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--primary-color)' }}
                    onClick={(e) => { e.stopPropagation(); openModal(account); }}
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#e53e3e', marginLeft: '8px' }}
                    onClick={(e) => { e.stopPropagation(); handleDelete(account.id); }}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No accounts found. Click "Add Account" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100, padding: '20px'
        }}>
          <div className="card" style={{ width: '500px', maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', padding: '25px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: 'var(--primary-color)' }}>
                {editingAccount ? 'Edit Account' : 'New Account'}
              </h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ marginBottom: '20px', flexShrink: 0 }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>Account / Department Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  placeholder="e.g. Flight Operations"
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                />
              </div>
              
              <div style={{ marginBottom: '10px', flexShrink: 0 }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>Linked Contacts</label>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select contacts from your Global Contacts list.</p>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, paddingRight: '5px', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px' }}>
                {globalContacts.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '10px 0', textAlign: 'center' }}>
                    No global contacts available. Go to the Global Contacts tab to add some.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {globalContacts.map(c => (
                      <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        <input 
                          type="checkbox" 
                          checked={contactIds.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) setContactIds([...contactIds, c.id]);
                            else setContactIds(contactIds.filter(id => id !== c.id));
                          }}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{c.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {c.role} {c.email && `• ${c.email}`}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
                <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!name}>Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsView;
