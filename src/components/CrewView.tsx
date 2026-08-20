import React, { useState } from 'react';
import PilotsList from './PilotsList';
import CrewList from './CrewList';
import PassengersList from './PassengersList';
import CrewSchedule from './CrewSchedule';

const CrewView = () => {
  const [activeSubTab, setActiveSubTab] = useState('schedule');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px', paddingBottom: '10px' }}>
        <button 
          className={`btn ${activeSubTab === 'schedule' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveSubTab('schedule')}
        >
          Schedule Grid
        </button>
        <button 
          className={`btn ${activeSubTab === 'pilots' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveSubTab('pilots')}
        >
          Pilots
        </button>
        <button 
          className={`btn ${activeSubTab === 'crew' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveSubTab('crew')}
        >
          Crew
        </button>
        <button 
          className={`btn ${activeSubTab === 'passengers' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveSubTab('passengers')}
        >
          Passengers
        </button>
      </div>

      <div style={{ flex: '1', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeSubTab === 'schedule' && <CrewSchedule />}
        {activeSubTab === 'pilots' && <PilotsList />}
        {activeSubTab === 'crew' && <CrewList />}
        {activeSubTab === 'passengers' && <PassengersList />}
      </div>
    </div>
  );
};

export default CrewView;
