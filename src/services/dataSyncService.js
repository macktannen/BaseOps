// Cross-tab and cross-port data synchronization utility using BroadcastChannel and Storage events

const CHANNEL_NAME = 'heli_scheduler_data_sync';
let channel = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
  } catch (e) {
    console.warn('BroadcastChannel not available:', e);
  }
}

// Override setItem to broadcast changes
const originalSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = (key, value) => {
  originalSetItem(key, value);
  notifyKeyChange(key, value);
};

function notifyKeyChange(key, value) {
  if (channel) {
    try {
      channel.postMessage({ type: 'STORAGE_CHANGE', key, value, timestamp: Date.now() });
    } catch (e) {
      console.warn('Failed to broadcast storage change:', e);
    }
  }
}

export function initDataSync(onStorageUpdate) {
  if (typeof window === 'undefined') return () => {};

  const handleMessage = (event) => {
    if (event.data && event.data.type === 'STORAGE_CHANGE') {
      const { key, value } = event.data;
      if (localStorage.getItem(key) !== value) {
        originalSetItem(key, value);
        if (onStorageUpdate) onStorageUpdate(key, value);
      }
    }
  };

  const handleStorageEvent = (event) => {
    if (event.key && event.newValue !== null) {
      if (onStorageUpdate) onStorageUpdate(event.key, event.newValue);
    }
  };

  if (channel) {
    channel.addEventListener('message', handleMessage);
  }
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    if (channel) channel.removeEventListener('message', handleMessage);
    window.removeEventListener('storage', handleStorageEvent);
  };
}
