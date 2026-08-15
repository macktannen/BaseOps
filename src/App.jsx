import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Users, Settings, MapPin, Helicopter, Building, LogOut } from 'lucide-react';
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
      <div className="sidebar">
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
          <Logo size={28} light={true} />
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500, padding: '2px 6px', background: 'rgba(255,255,255,0.12)', borderRadius: '4px', letterSpacing: '0.5px' }}>{APP_VERSION}</span>
        </div>
        <ul className="nav-menu">
          <li 
            className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            <CalendarIcon size={20} />
            Calendar
          </li>
          <li 
            className={`nav-item ${activeTab === 'crew' ? 'active' : ''}`}
            onClick={() => setActiveTab('crew')}
          >
            <Users size={20} />
            Crew & Passengers
          </li>
          <li 
            className={`nav-item ${activeTab === 'airports' ? 'active' : ''}`}
            onClick={() => setActiveTab('airports')}
          >
            <MapPin size={20} />
            Airports & LZs
          </li>
          <li 
            className={`nav-item ${activeTab === 'aircraft' ? 'active' : ''}`}
            onClick={() => setActiveTab('aircraft')}
          >
            <Helicopter size={20} />
            Fleet
          </li>
          {permCan(currentUser, 'manageAccounts') && (
            <li 
              className={`nav-item ${activeTab === 'accounts' ? 'active' : ''}`}
              onClick={() => setActiveTab('accounts')}
            >
              <Building size={20} />
              Accounts & Contacts
            </li>
          )}
          {permCan(currentUser, 'viewExpensesOverview') && (
            <li 
              className={`nav-item ${activeTab === 'expenses' ? 'active' : ''}`}
              onClick={() => setActiveTab('expenses')}
            >
              <DollarSign size={20} />
              Expenses
            </li>
          )}
          <li 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} />
            Settings
          </li>
        </ul>
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
