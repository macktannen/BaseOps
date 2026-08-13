import React, { useState } from 'react';
import AccountsView from './AccountsView';
import ContactsView from './ContactsView';

const AccountsContactsView = () => {
  const [activeTab, setActiveTab] = useState('accounts');

  return (
    <div style={{ display: 'flex', height: '100%', gap: '20px', padding: '20px' }}>
      {/* Sidebar for Accounts & Contacts Tabs */}
      <div className="card" style={{ width: '250px', flexShrink: 0, alignSelf: 'flex-start', padding: 0, overflow: 'hidden' }}>
        <div 
          onClick={() => setActiveTab('accounts')}
          style={{ padding: '15px 20px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontWeight: activeTab === 'accounts' ? 'bold' : 'normal', backgroundColor: activeTab === 'accounts' ? '#f4f5f7' : 'transparent', color: activeTab === 'accounts' ? 'var(--primary-color)' : 'var(--text-color)' }}
        >
          Company Accounts
        </div>
        <div 
          onClick={() => setActiveTab('contacts')}
          style={{ padding: '15px 20px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontWeight: activeTab === 'contacts' ? 'bold' : 'normal', backgroundColor: activeTab === 'contacts' ? '#f4f5f7' : 'transparent', color: activeTab === 'contacts' ? 'var(--primary-color)' : 'var(--text-color)' }}
        >
          Global Contacts
        </div>
      </div>

      {/* Main Content Area */}
      <div className="card" style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'accounts' && <AccountsView />}
        {activeTab === 'contacts' && <ContactsView />}
      </div>
    </div>
  );
};

export default AccountsContactsView;
