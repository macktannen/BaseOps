import React, { useState, useRef } from 'react';
import { useData } from '../contexts/DataProvider';
import SaveButton from './SaveButton';
import { Plus, X, Pencil, Trash2, Users, GripVertical, Search } from 'lucide-react';

const ContactsView = () => {
  const { data, updateData } = useData();
  const { globalContacts = [] } = data;

  const contacts = globalContacts.map(c => ({
    ...c,
    groups: c.groups || (c.group ? [c.group] : [])
  }));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saved, setSaved] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [groups, setGroups] = useState([]);
  const [newGroupInput, setNewGroupInput] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Drag and drop refs
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const handleSave = (e) => {
    e.preventDefault();
    if (!name) return;

    let updatedContacts;
    if (editingContact) {
      updatedContacts = contacts.map(c => 
        c.id === editingContact.id ? { ...c, name, role, groups, phone, email } : c
      );
    } else {
      const newContact = {
        id: `contact-${Date.now()}`,
        name,
        role,
        groups,
        phone,
        email
      };
      updatedContacts = [...contacts, newContact];
    }

    updateData('globalContacts', updatedContacts);
    closeModal();
    setSaved(prev => !prev);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      const updatedContacts = contacts.filter(c => c.id !== id);
      updateData('globalContacts', updatedContacts);
    }
  };

  const openModal = (contact = null) => {
    if (contact) {
      setEditingContact(contact);
      setName(contact.name || '');
      setRole(contact.role || '');
      setGroups(contact.groups || (contact.group ? [contact.group] : []));
      setPhone(contact.phone || '');
      setEmail(contact.email || '');
    } else {
      setEditingContact(null);
      setName('');
      setRole('');
      setGroups([]);
      setPhone('');
      setEmail('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
    setName('');
    setRole('');
    setGroups([]);
    setNewGroupInput('');
    setPhone('');
    setEmail('');
  };

  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null || searchQuery) return;
    const _contacts = [...contacts];
    const draggedItemContent = _contacts.splice(dragItem.current, 1)[0];
    _contacts.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    updateData('globalContacts', _contacts);
  };

  const filteredContacts = contacts.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const cGroups = c.groups || (c.group ? [c.group] : []);
    return (c.name?.toLowerCase().includes(q) || 
            c.role?.toLowerCase().includes(q) || 
            cGroups.some(g => g.toLowerCase().includes(q)) || 
            c.phone?.toLowerCase().includes(q) || 
            c.email?.toLowerCase().includes(q));
  });

  const existingGroups = Array.from(new Set(contacts.flatMap(c => c.groups || (c.group ? [c.group] : []))));

  const groupedContacts = filteredContacts.reduce((acc, contact) => {
    const contactGroups = contact.groups && contact.groups.length > 0 ? contact.groups : (contact.group ? [contact.group] : ['Ungrouped']);
    contactGroups.forEach(groupName => {
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(contact);
    });
    return acc;
  }, {});

  // Sort groups alphabetically, but keep 'Ungrouped' at the bottom
  const sortedGroupNames = Object.keys(groupedContacts).sort((a, b) => {
    if (a === 'Ungrouped') return 1;
    if (b === 'Ungrouped') return -1;
    return a.localeCompare(b);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={24} />
            Global Contacts
          </h2>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)' }}>
            Manage independent contacts not associated with specific accounts. Drag to reorder.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input 
              type="text" 
              placeholder="Search contacts..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '8px 10px 8px 32px', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none' }}
            />
          </div>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <Plus size={16} /> Add Contact
          </button>
        </div>
      </div>

      <div className="card" style={{ flex: 1, overflow: 'auto', padding: 0 }}>
        <table className="data-table">
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>Name</th>
              <th>Group</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Email</th>
              <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedGroupNames.map(groupName => (
              <React.Fragment key={groupName}>
                <tr style={{ backgroundColor: '#f4f5f7' }}>
                  <td colSpan="7" style={{ fontWeight: 'bold', padding: '10px 15px', color: 'var(--primary-color)' }}>
                    {groupName}
                  </td>
                </tr>
                {groupedContacts[groupName].map((contact) => {
                  const originalIndex = contacts.findIndex(c => c.id === contact.id);
                  return (
                    <tr 
                      key={contact.id}
                      draggable={!searchQuery}
                      onDragStart={() => (dragItem.current = originalIndex)}
                      onDragEnter={() => (dragOverItem.current = originalIndex)}
                      onDragEnd={handleSort}
                      onDragOver={(e) => e.preventDefault()}
                      style={{ cursor: searchQuery ? 'default' : 'move' }}
                    >
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        {!searchQuery && <GripVertical size={16} />}
                      </td>
                      <td style={{ fontWeight: 'bold' }}>{contact.name}</td>
                      <td>
                        {contact.groups && contact.groups.length > 0 ? (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {contact.groups.map(g => (
                              <span key={g} style={{ backgroundColor: 'var(--primary-light)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{g}</span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>
                        )}
                      </td>
                      <td>{contact.role}</td>
                      <td>{contact.phone}</td>
                      <td>{contact.email}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--primary-color)' }}
                          onClick={(e) => { e.stopPropagation(); openModal(contact); }}
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#e53e3e', marginLeft: '8px' }}
                          onClick={(e) => { e.stopPropagation(); handleDelete(contact.id); }}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
            {filteredContacts.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  {searchQuery ? 'No contacts match your search.' : 'No contacts found. Click "Add Contact" to create one.'}
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
          <div className="card" style={{ width: '500px', maxWidth: '100%', backgroundColor: '#fff', padding: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: 'var(--primary-color)' }}>
                {editingContact ? 'Edit Contact' : 'New Contact'}
              </h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>Full Name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    placeholder="e.g. John Doe"
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>Groups</label>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {groups.map(g => (
                      <div key={g} style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: 'var(--primary-light)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--primary-color)' }}>
                        <span>{g}</span>
                        <X size={12} style={{ cursor: 'pointer' }} onClick={() => setGroups(groups.filter(grp => grp !== g))} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <input 
                      type="text" 
                      value={newGroupInput} 
                      onChange={(e) => setNewGroupInput(e.target.value)} 
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newGroupInput.trim() && !groups.includes(newGroupInput.trim())) {
                            setGroups([...groups, newGroupInput.trim()]);
                            setNewGroupInput('');
                          }
                        }
                      }}
                      placeholder="Add to group (press Enter)"
                      list="groups-list"
                      style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-outline"
                      style={{ padding: '8px 12px' }}
                      onClick={() => {
                        if (newGroupInput.trim() && !groups.includes(newGroupInput.trim())) {
                          setGroups([...groups, newGroupInput.trim()]);
                          setNewGroupInput('');
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <datalist id="groups-list">
                    {existingGroups.map(g => <option key={g} value={g} />)}
                  </datalist>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>Role</label>
                <input 
                  type="text" 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)} 
                  placeholder="e.g. Inspector"
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>Phone</label>
                  <input 
                    type="text" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="(555) 555-5555"
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>Email</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="email@example.com"
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '15px', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                <SaveButton onClick={handleSave} triggerSave={saved} disabled={!name}>Save Contact</SaveButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsView;
