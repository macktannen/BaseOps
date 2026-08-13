import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import { authService } from '../services/authService';
import { ROLES, ROLE_LABELS, ROLE_COLORS, getUserRoles } from '../services/permissionService';
import useIsMobile from '../hooks/useIsMobile';
import { Menu } from 'lucide-react';

const RoleBadge = ({ role }) => {
  const colors = ROLE_COLORS[role] || { bg: '#e2e8f0', text: '#4a5568' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '0.72rem',
      fontWeight: 600,
      backgroundColor: colors.bg,
      color: colors.text,
      marginRight: '4px',
      marginBottom: '2px',
    }}>
      {ROLE_LABELS[role] || role}
    </span>
  );
};

const RoleCheckboxGroup = ({ value = [], onChange, disabled = false }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
    {ROLES.map(role => (
      <label key={role} style={{
        display: 'flex', alignItems: 'center', gap: '6px', cursor: disabled ? 'not-allowed' : 'pointer',
        padding: '5px 10px', borderRadius: '6px', border: `1px solid ${value.includes(role) ? ROLE_COLORS[role].text : 'var(--border-color)'}`,
        backgroundColor: value.includes(role) ? ROLE_COLORS[role].bg : 'white',
        opacity: disabled ? 0.6 : 1, fontSize: '0.82rem', fontWeight: 500,
        color: value.includes(role) ? ROLE_COLORS[role].text : 'var(--text-color)',
      }}>
        <input
          type="checkbox"
          disabled={disabled}
          checked={value.includes(role)}
          onChange={e => {
            if (e.target.checked) onChange([...value, role]);
            else onChange(value.filter(r => r !== role));
          }}
          style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
        />
        {ROLE_LABELS[role]}
      </label>
    ))}
  </div>
);

const SettingsView = () => {
  const { currentUser, isAdmin, updateProfile } = useAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('account');
  const [menuOpen, setMenuOpen] = useState(false);
  const [users, setUsers] = useState([]);

  const [name, setName] = useState(currentUser?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notifications, setNotifications] = useState(currentUser?.notifications ?? true);
  const [viewOwnFlightsOnly, setViewOwnFlightsOnly] = useState(currentUser?.viewOwnFlightsOnly ?? false);

  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRoles, setNewUserRoles] = useState(['view_only']);
  const [createUserMsg, setCreateUserMsg] = useState('');

  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserRoles, setEditUserRoles] = useState([]);
  const [editUserMsg, setEditUserMsg] = useState('');

  useEffect(() => {
    if (isAdmin && activeTab === 'users') {
      authService.getUsers().then(setUsers);
    }
  }, [isAdmin, activeTab]);

  const refreshUsers = async () => {
    setUsers(await authService.getUsers());
  };

  const handleDeleteUser = async (id) => {
    if (id === currentUser.id) { alert('You cannot delete yourself.'); return; }
    if (window.confirm('Are you sure you want to delete this user?')) {
      await authService.deleteUser(id);
      refreshUsers();
    }
  };

  const startEditUser = (user) => {
    const uRoles = Array.isArray(user.roles) ? user.roles : [user.role || 'view_only'];
    setEditingUserId(user.id);
    setEditUserName(user.name);
    setEditUserEmail(user.email);
    setEditUserPassword(user.password || '');
    setEditUserRoles(uRoles);
    setEditUserMsg('');
  };

  const cancelEditUser = () => {
    setEditingUserId(null);
    setEditUserName('');
    setEditUserEmail('');
    setEditUserPassword('');
    setEditUserRoles([]);
    setEditUserMsg('');
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (editUserRoles.length === 0) {
      setEditUserMsg({ type: 'error', text: 'Please assign at least one role.' });
      return;
    }
    try {
      await authService.updateProfile(editingUserId, {
        name: editUserName,
        email: editUserEmail,
        password: editUserPassword,
        roles: editUserRoles,
        role: editUserRoles[0],
      });
      setUsers(await authService.getUsers());
      cancelEditUser();
    } catch (err) {
      setEditUserMsg({ type: 'error', text: err.message });
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (newUserRoles.length === 0) {
      setCreateUserMsg({ type: 'error', text: 'Please assign at least one role.' });
      return;
    }
    try {
      await authService.adminCreateUser(newUserName, newUserEmail, newUserPassword, newUserRoles);
      refreshUsers();
      setShowCreateUser(false);
      setNewUserName(''); setNewUserEmail(''); setNewUserPassword(''); setNewUserRoles(['view_only']); setCreateUserMsg('');
    } catch (err) {
      setCreateUserMsg({ type: 'error', text: err.message });
    }
  };

  const handleRolesChange = async (userId, newRoles) => {
    if (userId === currentUser.id && !newRoles.includes('admin')) {
      alert('You cannot remove your own admin privileges.');
      return;
    }
    if (newRoles.length === 0) { alert('A user must have at least one role.'); return; }
    await authService.updateUserRoles(userId, newRoles);
    refreshUsers();
  };

  const handleUpdateProfile = async () => {
    try {
      await updateProfile({ name, notifications, viewOwnFlightsOnly });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setPasswordMsg({ type: 'error', text: 'New passwords do not match' }); return; }
    try {
      await authService.updatePassword(currentUser.id, currentPassword, newPassword);
      setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => setPasswordMsg(''), 3000);
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message });
    }
  };

  const handleResetAirportHistory = () => {
    if (window.confirm('Are you sure you want to clear your airport search history?')) {
      localStorage.removeItem('locationUsage');
      alert('Airport search history cleared!');
    }
  };

  const currentUserRoles = getUserRoles(currentUser);
  const isViewOnly = currentUserRoles.length === 1 && currentUserRoles[0] === 'view_only';

  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '');
  const [aiMsg, setAiMsg] = useState('');
  const [testingKey, setTestingKey] = useState(false);

  const handleSaveGeminiKey = (e) => {
    e.preventDefault();
    const cleanKey = geminiKey.trim();
    localStorage.setItem('gemini_api_key', cleanKey);
    setAiMsg({ type: 'success', text: 'Gemini API Key saved to browser storage!' });
  };

  const handleTestGeminiKey = async () => {
    const keyToTest = geminiKey.trim() || import.meta.env.VITE_GEMINI_API_KEY;
    if (!keyToTest) {
      setAiMsg({ type: 'error', text: 'Please enter an API key first.' });
      return;
    }
    setTestingKey(true);
    setAiMsg('');
    try {
      const candidateEndpoints = [
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
      ];
      let res = null;
      let lastErrText = '';
      for (const ep of candidateEndpoints) {
        const testRes = await fetch(`${ep}?key=${keyToTest}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping' }] }] })
        });
        if (testRes.status === 404 || testRes.status === 429) {
          const errBody = await testRes.clone().text().catch(() => '');
          if (testRes.status === 404 || errBody.includes('limit: 0')) {
            lastErrText = errBody || `Model unavailable at ${ep}`;
            continue;
          }
        }
        res = testRes;
        break;
      }

      if (res && res.ok) {
        setAiMsg({ type: 'success', text: '✅ API Key Connection Verified Successfully!' });
      } else if (res) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error?.message || 'Invalid or revoked API key';
        setAiMsg({ type: 'error', text: `❌ API Key Error (${res.status}): ${msg}. Please generate a new key at aistudio.google.com.` });
      } else {
        setAiMsg({ type: 'error', text: `❌ API Key Error: Please check your key from aistudio.google.com (${lastErrText || 'All models unavailable'})` });
      }
    } catch(err) {
      setAiMsg({ type: 'error', text: `❌ Connection failed: ${err.message}` });
    } finally {
      setTestingKey(false);
    }
  };

  const tabStyle = (tab) => ({
    padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)',
    fontWeight: activeTab === tab ? 600 : 400,
    backgroundColor: activeTab === tab ? '#f4f5f7' : 'transparent',
    color: activeTab === tab ? 'var(--primary-color)' : 'var(--text-color)',
    fontSize: '0.875rem',
    transition: 'background-color 0.15s'
  });

  const TAB_LABELS = {
    account: 'My Account',
    ai: 'AI & Integrations',
    users: 'System Users'
  };

  const visibleTabs = ['account', ...(isAdmin ? ['ai', 'users'] : [])];

  const handleTabSelect = (tab) => {
    setActiveTab(tab);
    setMenuOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: isMobile ? '10px' : '20px', gap: isMobile ? '10px' : '20px' }}>
      {/* Mobile Hamburger Header */}
      {isMobile && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
              padding: '10px 14px', backgroundColor: 'white', borderRadius: '8px',
              border: '1px solid var(--border-color)', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-color)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Menu size={18} />
            {TAB_LABELS[activeTab]}
            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{menuOpen ? '▲' : '▼'}</span>
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
              backgroundColor: 'white', borderRadius: '0 0 8px 8px',
              border: '1px solid var(--border-color)', borderTop: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden'
            }}>
              {visibleTabs.map(tab => (
                <div
                  key={tab}
                  onClick={() => handleTabSelect(tab)}
                  style={{
                    ...tabStyle(tab),
                    borderBottom: tab === visibleTabs[visibleTabs.length - 1] ? 'none' : undefined
                  }}
                >
                  {TAB_LABELS[tab]}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, gap: isMobile ? 0 : '20px', minHeight: 0 }}>
        {/* Desktop Sidebar */}
        {!isMobile && (
          <div style={{ width: '220px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden', height: 'fit-content', flexShrink: 0 }}>
            {visibleTabs.map(tab => (
              <div key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(tab)}>
                {TAB_LABELS[tab]}
              </div>
            ))}
          </div>
        )}

        {/* Main Content */}
        <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '8px', border: '1px solid var(--border-color)', padding: isMobile ? '16px' : '30px', overflowY: 'auto', minHeight: 0 }}>

        {/* AI & INTEGRATIONS */}
        {activeTab === 'ai' && (
          <div style={{ maxWidth: '650px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '1.1rem' }}>AI Integrations & API Keys</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Configure your AI key to enable <strong>AI PDF Invoice & Receipt Reading</strong> across the application.
            </p>

            {aiMsg && (
              <div style={{ padding: '10px 14px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.85rem', fontWeight: 500, backgroundColor: aiMsg.type === 'success' ? '#c6f6d5' : '#fed7d7', color: aiMsg.type === 'success' ? '#2f855a' : '#c53030' }}>
                {aiMsg.text}
              </div>
            )}

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Google Gemini AI (Vision Engine)</h4>
                {geminiKey ? (
                  <span style={{ fontSize: '0.72rem', backgroundColor: '#c6f6d5', color: '#22543d', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                    Key Saved
                  </span>
                ) : (
                  <span style={{ fontSize: '0.72rem', backgroundColor: '#feebc8', color: '#744210', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                    Not Configured
                  </span>
                )}
              </div>

              <p style={{ fontSize: '0.82rem', color: '#4a5568', lineHeight: '1.4', marginBottom: '16px' }}>
                Google AI Studio provides <strong>1,500 free invoice scans per day</strong> at $0 cost. Get a free API key instantly at <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: '#8b5cf6', fontWeight: 'bold' }}>aistudio.google.com</a>.
              </p>

              <form onSubmit={handleSaveGeminiKey}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={e => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="form-control"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-primary">
                    Save Key
                  </button>
                  <button
                    type="button"
                    onClick={handleTestGeminiKey}
                    disabled={testingKey}
                    className="btn btn-outline"
                  >
                    {testingKey ? 'Testing Connection...' : 'Test Connection'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MY ACCOUNT */}
        {activeTab === 'account' && (
          <div style={{ maxWidth: '600px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '1.1rem' }}>My Profile</h3>

            {profileMsg && (
              <div style={{ padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.85rem', backgroundColor: profileMsg.type === 'success' ? '#c6f6d5' : '#fed7d7', color: profileMsg.type === 'success' ? '#2f855a' : '#c53030' }}>
                {profileMsg.text}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Name</label>
                <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Email</label>
                <input type="email" className="form-control" value={currentUser?.email || ''} disabled />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>My Roles</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '8px 10px', backgroundColor: '#f7fafc', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  {currentUserRoles.map(r => <RoleBadge key={r} role={r} />)}
                </div>
              </div>

              {/* View Only toggle: all flights vs own flights */}
              {(isViewOnly || currentUserRoles.includes('view_only')) && (
                <div style={{ padding: '12px', backgroundColor: '#f7fafc', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={viewOwnFlightsOnly}
                      onChange={e => setViewOwnFlightsOnly(e.target.checked)}
                      style={{ width: '16px', height: '16px', marginTop: '2px' }}
                    />
                    <div>
                      <span style={{ fontWeight: 'bold', display: 'block' }}>Show My Flights Only</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        When checked, you will only see flights where you are listed as a passenger or crew member. Uncheck to view all scheduled flights.
                      </span>
                    </div>
                  </label>
                </div>
              )}

              <div style={{ marginTop: '5px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={notifications} onChange={e => setNotifications(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                  <span style={{ fontWeight: 'bold' }}>Enable Notifications</span>
                </label>
                <p style={{ margin: '5px 0 0 26px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Receive email and push notifications about flight updates.</p>
              </div>

              <button className="btn btn-primary" style={{ width: 'fit-content' }} onClick={handleUpdateProfile}>Save Profile</button>
            </div>

            <h3 style={{ marginTop: '32px', marginBottom: '8px', fontSize: '1.1rem' }}>Change Password</h3>

            {passwordMsg && (
              <div style={{ padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.85rem', backgroundColor: passwordMsg.type === 'success' ? '#c6f6d5' : '#fed7d7', color: passwordMsg.type === 'success' ? '#2f855a' : '#c53030' }}>
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Current Password</label>
                <input type="password" required className="form-control" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>New Password</label>
                <input type="password" required className="form-control" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Confirm New Password</label>
                <input type="password" required className="form-control" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={6} />
              </div>
              <button type="submit" className="btn btn-outline" style={{ width: 'fit-content' }}>Update Password</button>
            </form>

            <h3 style={{ marginTop: '32px', marginBottom: '8px', fontSize: '1.1rem' }}>Data Management</h3>
            <div style={{ marginTop: '20px' }}>
              <p style={{ margin: '0 0 10px 0', color: 'var(--text-muted)' }}>Clear your locally cached airport search history to remove phantom or old locations from the dropdown.</p>
              <button className="btn btn-outline" style={{ color: '#e53e3e', borderColor: '#e53e3e' }} onClick={handleResetAirportHistory}>
                Reset Airport History
              </button>
            </div>
          </div>
        )}

        {/* SYSTEM USERS — Admin only */}
        {activeTab === 'users' && isAdmin && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>System Users</h3>
              <button className="btn btn-primary" onClick={() => setShowCreateUser(!showCreateUser)}>
                {showCreateUser ? 'Cancel' : '+ Create User'}
              </button>
            </div>

            {showCreateUser && (
              <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '0.95rem' }}>Create New User</h4>
                {createUserMsg && (
                  <div style={{ padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.85rem', backgroundColor: createUserMsg.type === 'error' ? '#fed7d7' : '#c6f6d5', color: createUserMsg.type === 'error' ? '#c53030' : '#2f855a' }}>
                    {createUserMsg.text}
                  </div>
                )}
                <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Name</label>
                      <input type="text" required className="form-control" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Email</label>
                      <input type="email" required className="form-control" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Password</label>
                      <input type="text" required className="form-control" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} minLength={6} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '5px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Roles <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(select all that apply)</span></label>
                    <RoleCheckboxGroup value={newUserRoles} onChange={setNewUserRoles} />
                  </div>
                  <div>
                    <button type="submit" className="btn btn-primary">Create User</button>
                  </div>
                </form>
              </div>
            )}

            <table className="table" style={{ marginTop: '20px', width: '100%' }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Password</th>
                  <th style={{ minWidth: '320px' }}>Roles</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const uRoles = Array.isArray(u.roles) ? u.roles : [u.role || 'view_only'];
                  const isEditing = editingUserId === u.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        {isEditing ? (
                          <input type="text" className="form-control" value={editUserName} onChange={e => setEditUserName(e.target.value)} />
                        ) : (
                          <strong>{u.name}</strong>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input type="email" className="form-control" value={editUserEmail} onChange={e => setEditUserEmail(e.target.value)} />
                        ) : (
                          u.email
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input type="text" className="form-control" value={editUserPassword} onChange={e => setEditUserPassword(e.target.value)} minLength={6} />
                        ) : (
                          <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{u.password}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <RoleCheckboxGroup value={editUserRoles} onChange={setEditUserRoles} />
                        ) : u.id === currentUser.id ? (
                          <div>{uRoles.map(r => <RoleBadge key={r} role={r} />)}</div>
                        ) : (
                          <RoleCheckboxGroup
                            value={uRoles}
                            onChange={(newRoles) => handleRolesChange(u.id, newRoles)}
                          />
                        )}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={handleEditUser}>
                              Save
                            </button>
                            <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={cancelEditUser}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              className="btn btn-outline"
                              style={{ color: '#3182ce', borderColor: '#3182ce', padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => startEditUser(u)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-outline"
                              style={{ color: '#e53e3e', borderColor: '#e53e3e', padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => handleDeleteUser(u.id)}
                              disabled={u.id === currentUser.id}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}


      </div>
      </div>
    </div>
  );
};

export default SettingsView;
