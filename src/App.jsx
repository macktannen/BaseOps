import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Users, Settings, MapPin, Helicopter, Building, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import Logo from './components/Logo';
import packageJson from '../package.json';
import './index.css';
import './mobile.css';
import { can as permCan } from './services/permissionService';
import CalendarView from './components/CalendarView';
import LocationsView from './components/LocationsView';
import AircraftList from './components/AircraftList';
import CrewView from './components/CrewView';
import { initDataSync } from './services/dataSyncService';
import SyncStatusIndicator from './components/SyncStatusIndicator';
const APP_VERSION = `v${packageJson.version}`;
import AccountsContactsView from './components/AccountsContactsView';
import ExpensesPage from './components/ExpensesPage';
import SettingsView from './components/SettingsView';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/useAuth';
import { DollarSign } from 'lucide-react';
import useIsMobile from './hooks/useIsMobile';
import MobileLayout from './components/MobileLayout';

function DashboardLayout({ activeTab, setActiveTab }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('baseops_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('baseops_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const cleanup = initDataSync(() => {
      // Force UI re-render on sync when storage updates
      window.dispatchEvent(new Event('storage'));
    });
    return cleanup;
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', gap: '10px', padding: isSidebarCollapsed ? '16px 8px' : '16px 20px' }}>
          {isSidebarCollapsed ? (
            <Logo size={28} light={true} iconOnly={true} />
          ) : (
            <>
              <Logo size={28} light={true} />
              <span className="sidebar-version" style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500, padding: '2px 5px', background: 'rgba(255,255,255,0.12)', borderRadius: '4px', letterSpacing: '0.5px' }}>{APP_VERSION}</span>
            </>
          )}
        </div>
        <ul className="nav-menu" style={{ flex: 1 }}>
          <li 
            className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
            title={isSidebarCollapsed ? 'Calendar' : undefined}
          >
            <CalendarIcon size={20} />
            <span className="nav-item-text">Calendar</span>
          </li>
          <li 
            className={`nav-item ${activeTab === 'crew' ? 'active' : ''}`}
            onClick={() => setActiveTab('crew')}
            title={isSidebarCollapsed ? 'Crew & Passengers' : undefined}
          >
            <Users size={20} />
            <span className="nav-item-text">Crew & Passengers</span>
          </li>
          <li 
            className={`nav-item ${activeTab === 'airports' ? 'active' : ''}`}
            onClick={() => setActiveTab('airports')}
            title={isSidebarCollapsed ? 'Airports & LZs' : undefined}
          >
            <MapPin size={20} />
            <span className="nav-item-text">Airports & LZs</span>
          </li>
          <li 
            className={`nav-item ${activeTab === 'aircraft' ? 'active' : ''}`}
            onClick={() => setActiveTab('aircraft')}
            title={isSidebarCollapsed ? 'Fleet' : undefined}
          >
            <Helicopter size={20} />
            <span className="nav-item-text">Fleet</span>
          </li>
          {permCan(currentUser, 'manageAccounts') && (
            <li 
              className={`nav-item ${activeTab === 'accounts' ? 'active' : ''}`}
              onClick={() => setActiveTab('accounts')}
              title={isSidebarCollapsed ? 'Accounts & Contacts' : undefined}
            >
              <Building size={20} />
              <span className="nav-item-text">Accounts & Contacts</span>
            </li>
          )}
          {permCan(currentUser, 'viewExpensesOverview') && (
            <li 
              className={`nav-item ${activeTab === 'expenses' ? 'active' : ''}`}
              onClick={() => setActiveTab('expenses')}
              title={isSidebarCollapsed ? 'Expenses' : undefined}
            >
              <DollarSign size={20} />
              <span className="nav-item-text">Expenses</span>
            </li>
          )}
          <li 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            title={isSidebarCollapsed ? 'Settings' : undefined}
          >
            <Settings size={20} />
            <span className="nav-item-text">Settings</span>
          </li>
        </ul>

        {/* Sidebar Footer with Collapse / Expand caret */}
        <div className="sidebar-footer" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', padding: isSidebarCollapsed ? '10px 0' : '10px 14px', display: 'flex', justifyContent: isSidebarCollapsed ? 'center' : 'flex-end', alignItems: 'center' }}>
          <button 
            onClick={toggleSidebar}
            className="sidebar-bottom-toggle"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ 
              background: 'rgba(255, 255, 255, 0.08)', 
              border: 'none', 
              color: 'rgba(255, 255, 255, 0.8)', 
              padding: '6px 8px', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              transition: 'background 0.2s, color 0.2s'
            }}
          >
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="topbar">
          <h2>
            {activeTab === 'calendar' && 'Flight Schedule'}
            {activeTab === 'crew' && 'Crew & Passenger Management'}
            {activeTab === 'airports' && 'Airports & Landing Zones'}
            {activeTab === 'aircraft' && 'Aircraft Fleet Management'}
            {activeTab === 'accounts' && 'Accounts & Contacts'}
            {activeTab === 'expenses' && 'Expenses Overview'}
            {activeTab === 'settings' && 'Settings'}
          </h2>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <SyncStatusIndicator />
              <span
                onClick={() => setActiveTab('settings')}
                style={{ fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
              >{currentUser?.name || 'User'}</span>
              <div
                onClick={() => setActiveTab('settings')}
                style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <button 
                onClick={handleLogout}
                className="has-tooltip"
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                data-tooltip="Log Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="content-area">
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'crew' && <CrewView />}
          {activeTab === 'airports' && <LocationsView />}
          {activeTab === 'aircraft' && <AircraftList />}
          {activeTab === 'accounts' && <AccountsContactsView />}
          {activeTab === 'expenses' && <ExpensesPage />}
          {activeTab === 'settings' && <SettingsView />}
        </div>
      </div>
    </div>
  );
}

function App() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTabState] = useState(() => {
    return sessionStorage.getItem('baseops_active_tab') || 'calendar';
  });

  const setActiveTab = (tab) => {
    sessionStorage.setItem('baseops_active_tab', tab);
    setActiveTabState(tab);
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/*" element={
        <ProtectedRoute>
          {isMobile ? (
            <MobileLayout activeTab={activeTab} setActiveTab={setActiveTab} />
          ) : (
            <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab} />
          )}
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;
