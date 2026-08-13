import React, { useState, useEffect, useMemo } from 'react';
import { Search, Building, User, Mail, Phone, ChevronRight, ChevronDown } from 'lucide-react';
import { mockAccounts } from '../data';
import { getAccountColor } from '../services/gridColors';

const MobileAccounts = ({ mode = 'all' }) => {
  const [contacts, setContacts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const loadData = () => {
    try {
      const storedContacts = JSON.parse(localStorage.getItem('globalContacts') || '[]');
      setContacts(storedContacts);

      const storedAccounts = JSON.parse(localStorage.getItem('userAccounts'));
      if (storedAccounts && storedAccounts.length > 0) {
        setAccounts(storedAccounts.map(a => ({ ...a, contactIds: a.contactIds || [] })));
      } else {
        setAccounts(mockAccounts.map(a => ({ ...a, contactIds: [] })));
      }
    } catch {
      setContacts([]);
      setAccounts(mockAccounts.map(a => ({ ...a, contactIds: [] })));
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const combinedList = useMemo(() => {
    const list = [];
    if (mode === 'accounts' || mode === 'all') {
      accounts.forEach(a => {
        list.push({ ...a, type: 'account', sortName: a.name });
      });
    }
    if (mode === 'contacts' || mode === 'all') {
      contacts.forEach(c => {
        list.push({ ...c, type: 'contact', sortName: c.name });
      });
    }
    
    list.sort((a, b) => a.sortName.localeCompare(b.sortName));
    return list;
  }, [accounts, contacts, mode]);

  const filteredList = combinedList.filter(item => 
    item.sortName.toLowerCase().includes(search.toLowerCase()) || 
    (item.role && item.role.toLowerCase().includes(search.toLowerCase())) ||
    (item.email && item.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-color)' }}>
      <div style={{ padding: '15px', backgroundColor: 'white', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder={mode === 'accounts' ? "Search company accounts..." : mode === 'contacts' ? "Search contacts..." : "Search accounts & contacts..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '16px' }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredList.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredList.map((item) => {
              const isExpanded = expandedId === item.id;
              const isAccount = item.type === 'account';
              return (
                <div key={item.id} style={{ backgroundColor: 'white', borderBottom: '1px solid var(--border-color)' }}>
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    style={{ padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '40px', height: '40px', borderRadius: '50%', 
                        backgroundColor: isAccount ? 'var(--primary-light)' : '#ebf8ff', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isAccount ? 'var(--primary-color)' : '#2b6cb0'
                      }}>
                        {isAccount ? <Building size={20} /> : <User size={20} />}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>
                          {isAccount && (
                            <span
                              style={{
                                width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, display: 'inline-block',
                                backgroundColor: getAccountColor(item, accounts)
                              }}
                            />
                          )}
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {isAccount ? 'Company Account' : (item.role || 'Contact')}
                        </div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronDown size={20} color="var(--text-muted)" /> : <ChevronRight size={20} color="var(--text-muted)" />}
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '0 15px 15px 67px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {isAccount ? (
                        <>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Linked Contacts:</div>
                          {item.contactIds && item.contactIds.length > 0 ? (
                            item.contactIds.map(cId => {
                              const contact = contacts.find(c => c.id === cId);
                              if (!contact) return null;
                              return (
                                <div key={cId} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                  <User size={14} color="var(--text-muted)" /> {contact.name}
                                </div>
                              );
                            })
                          ) : (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No contacts linked.</div>
                          )}
                        </>
                      ) : (
                        <>
                          {item.phone && (
                            <a href={`tel:${item.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--primary-color)', textDecoration: 'none' }}>
                              <Phone size={14} /> {item.phone}
                            </a>
                          )}
                          {item.email && (
                            <a href={`mailto:${item.email}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--primary-color)', textDecoration: 'none' }}>
                              <Mail size={14} /> {item.email}
                            </a>
                          )}
                          {item.groups && item.groups.length > 0 && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                              {item.groups.map(g => (
                                <span key={g} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#edf2f7', color: '#4a5568' }}>{g}</span>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>No accounts or contacts found.</div>
        )}
      </div>
    </div>
  );
};

export default MobileAccounts;
