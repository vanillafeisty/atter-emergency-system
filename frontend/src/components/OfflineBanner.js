import React, { useEffect, useState } from 'react';
import useOnlineStatus from '../hooks/useOnlineStatus';
import { getQueuedEmergencies } from '../utils/offlineDB';

export default function OfflineBanner() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [queueCount, setQueueCount] = useState(0);
  const [showSyncMsg, setShowSyncMsg] = useState(false);

  useEffect(() => {
    getQueuedEmergencies().then((q) => setQueueCount(q.length)).catch(() => {});
  }, [isOnline]);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowSyncMsg(true);
      setTimeout(() => setShowSyncMsg(false), 4000);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showSyncMsg) return null;

  return (
    <div style={{
      position: 'fixed', top: 64, left: 0, right: 0, zIndex: 999,
      padding: '10px 20px',
      background: isOnline ? 'rgba(52,211,153,0.95)' : 'rgba(255,149,0,0.95)',
      backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    }}>
      <span style={{ fontSize: 16 }}>{isOnline ? '✅' : '📡'}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#0a0f1e', fontFamily: 'var(--font-mono)' }}>
        {isOnline
          ? showSyncMsg
            ? `BACK ONLINE — Syncing ${queueCount} queued request${queueCount !== 1 ? 's' : ''}...`
            : 'CONNECTED'
          : `OFFLINE MODE — ${queueCount > 0 ? `${queueCount} emergency queued, ` : ''}will sync when connected`}
      </span>
      {!isOnline && (
        <span style={{ fontSize: 12, color: '#0a0f1e', opacity: 0.7 }}>
          Maps and last known data available
        </span>
      )}
    </div>
  );
}
