import { useState, useEffect } from 'react';
import { CloudOff } from 'lucide-react';
import { getPendingQueueLength } from '../services/dataStore';

export default function SyncStatusIndicator() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const check = () => {
      setOffline(getPendingQueueLength() > 0);
    };
    const onStatus = (e) => setOffline(!e.detail.online);
    check();
    window.addEventListener('sync-status', onStatus);
    window.addEventListener('storage', check);
    const timer = setInterval(check, 5000);
    return () => {
      window.removeEventListener('sync-status', onStatus);
      window.removeEventListener('storage', check);
      clearInterval(timer);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className="has-tooltip"
      data-tooltip="Connection to cloud sync is blocked. Changes are saved on this device and will sync automatically when the connection is restored."
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '0.75rem', color: '#b45309', backgroundColor: '#fef3c7',
        padding: '4px 10px', borderRadius: '999px', whiteSpace: 'nowrap',
        fontWeight: 600,
      }}
    >
      <CloudOff size={14} />
      Not syncing
    </div>
  );
}
