import { useState, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Users, Settings, MapPin, Helicopter, Building, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import Logo from './components/Logo';
import packageJson from '../package.json';
import './index.css';
import './App.css';
import './mobile.css';
import { can as permCan } from './services/permissionService';
const APP_VERSION = `v${packageJson.version}`;
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const CalendarView = lazy(() => import('./components/CalendarView'));
const LocationsView = lazy(() => import('./components/LocationsView'));
const AircraftList = lazy(() => import('./components/AircraftList'));
const CrewView = lazy(() => import('./components/CrewView'));
const AccountsContactsView = lazy(() => import('./components/AccountsContactsView'));
const ExpensesPage = lazy(() => import('./components/ExpensesPage'));
const SettingsView = lazy(() => import('./components/SettingsView'));
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/useAuth';
import { DollarSign } from 'lucide-react';
import useIsMobile from './hooks/useIsMobile';
const MobileLayout = lazy(() => import('./components/MobileLayout'));

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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div 
          className="sidebar-header" 
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isSidebarCollapsed ? '16px 8px' : '24px 20px', cursor: 'pointer', userSelect: 'none' }}
        >
          {isSidebarCollapsed ? (
            <Logo size={28} light={true} iconOnly={true} />
          ) : (
            <Logo size={38} light={true} />
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

        {/* Sidebar Footer with Smooth Sliding Caret */}
        <div className="sidebar-footer">
          <span className="sidebar-version" style={{ 
            position: 'absolute', 
            left: '20px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            fontSize: '0.7rem', 
            color: 'rgba(255,255,255,0.4)', 
            fontWeight: 500, 
            letterSpacing: '0.5px'
          }}>
            {APP_VERSION}
          </span>
          <button 
            onClick={toggleSidebar}
            className="sidebar-bottom-toggle"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
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
          {activeTab === 'calendar' && (
            <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading...</div>}>
              <CalendarView />
            </Suspense>
          )}
          {activeTab === 'crew' && (
            <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading...</div>}>
              <CrewView />
            </Suspense>
          )}
          {activeTab === 'airports' && (
            <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading...</div>}>
              <LocationsView />
            </Suspense>
          )}
          {activeTab === 'aircraft' && (
            <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading...</div>}>
              <AircraftList />
            </Suspense>
          )}
          {activeTab === 'accounts' && (
            <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading...</div>}>
              <AccountsContactsView />
            </Suspense>
          )}
          {activeTab === 'expenses' && (
            <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading...</div>}>
              <ExpensesPage />
            </Suspense>
          )}
          {activeTab === 'settings' && (
            <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading...</div>}>
              <SettingsView />
            </Suspense>
          )}
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
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>}>
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
    </Suspense>
  );
}

export default App;
