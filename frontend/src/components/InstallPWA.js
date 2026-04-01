import React, { useState } from 'react';
import usePWAInstall from '../hooks/usePWAInstall';

export default function InstallPWA() {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || isInstalled || dismissed) return null;

  const handleInstall = async () => {
    setInstalling(true);
    await install();
    setInstalling(false);
  };

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, width: 'min(92vw, 420px)',
      background: 'var(--navy-card)', border: '1px solid var(--teal)',
      borderRadius: 16, padding: '18px 22px',
      boxShadow: '0 0 40px rgba(0,229,204,0.2)',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{ fontSize: 36 }}>📲</div>
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
          Install ATTER App
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Install for offline access, faster loading, and push notifications for emergencies
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={handleInstall} disabled={installing} style={{
          padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
          background: 'var(--teal)', color: 'var(--navy)', whiteSpace: 'nowrap',
          opacity: installing ? 0.7 : 1,
        }}>
          {installing ? 'Installing...' : 'Install'}
        </button>
        <button onClick={() => setDismissed(true)} style={{
          padding: '6px', borderRadius: 8, fontSize: 12,
          background: 'transparent', color: 'var(--text-muted)',
          border: '1px solid var(--border)',
        }}>
          Not now
        </button>
      </div>
    </div>
  );
}
