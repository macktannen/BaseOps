import { AlertTriangle } from 'lucide-react';

interface Conflict {
  flightId: string | number;
  flightNumber: string;
  title: string;
  pilotId?: string;
  overlapLeg: string;
  overlapTime: string;
  overlapDate: string;
}

interface ConflictWarningModalProps {
  pilotConflicts: Conflict[];
  aircraftConflicts: Conflict[];
  onProceed: () => void;
  onCancel: () => void;
  pilotNames?: Record<string, string>;
}

const ConflictWarningModal = ({ pilotConflicts, aircraftConflicts, onProceed, onCancel, pilotNames = {} }: ConflictWarningModalProps) => {
  const hasPilot = pilotConflicts.length > 0;
  const hasAircraft = aircraftConflicts.length > 0;

  const getPilotName = (pilotId?: string) => pilotId ? (pilotNames[pilotId] || pilotId) : '';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '10px', padding: '24px', width: '500px', maxWidth: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: '#fef3c7', padding: '8px', borderRadius: '50%' }}>
            <AlertTriangle size={24} color="#d97706" />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#92400e' }}>Scheduling Conflicts Detected</h3>
        </div>

        {hasPilot && (
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c53030', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ backgroundColor: '#fed7d7', padding: '2px 8px', borderRadius: '4px' }}>Pilot Conflict{pilotConflicts.length > 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {pilotConflicts.map((c, i) => (
                <div key={i} style={{ backgroundColor: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '6px', padding: '10px 12px', fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                    {getPilotName(c.pilotId)} is already assigned to Flight #{c.flightNumber}
                  </div>
                  <div style={{ color: '#742a2a', fontSize: '0.78rem' }}>
                    {c.title && <span>"{c.title}" — </span>}
                    {c.overlapDate} {c.overlapTime} ({c.overlapLeg})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasAircraft && (
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c53030', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ backgroundColor: '#fed7d7', padding: '2px 8px', borderRadius: '4px' }}>Aircraft Conflict{aircraftConflicts.length > 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {aircraftConflicts.map((c, i) => (
                <div key={i} style={{ backgroundColor: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '6px', padding: '10px 12px', fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                    Aircraft is already scheduled for Flight #{c.flightNumber}
                  </div>
                  <div style={{ color: '#742a2a', fontSize: '0.78rem' }}>
                    {c.title && <span>"{c.title}" — </span>}
                    {c.overlapDate} {c.overlapTime} ({c.overlapLeg})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', backgroundColor: '#f7fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          Do you want to save this flight anyway, or cancel and resolve the conflicts?
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn btn-outline" onClick={onCancel} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onProceed} style={{ backgroundColor: '#d97706', borderColor: '#d97706' }}>
            Save Anyway
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictWarningModal;
