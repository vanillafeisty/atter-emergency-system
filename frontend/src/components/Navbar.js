import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const roleColors = { patient: 'var(--teal)', helper: 'var(--amber)', ambulance: 'var(--red)' };
  const roleLabels = { patient: 'PATIENT', helper: 'HELPER VEHICLE', ambulance: 'AMBULANCE' };

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: 'rgba(10,15,30,0.92)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)', padding: '0 24px', height: 64,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate('/')}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, background: 'var(--red)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: '#fff',
        }}>A+</div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.5px' }}>ATTER</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {user && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: connected ? 'var(--teal)' : 'var(--red)',
                boxShadow: connected ? '0 0 8px var(--teal)' : '0 0 8px var(--red)',
              }} />
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {connected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
            <div style={{
              padding: '4px 12px', borderRadius: 20,
              background: `${roleColors[user.role]}18`,
              border: `1px solid ${roleColors[user.role]}40`,
              color: roleColors[user.role],
              fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700,
            }}>
              {roleLabels[user.role]}
            </div>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{user.name}</span>
            <button onClick={() => { logout(); navigate('/'); }} style={{
              padding: '8px 16px', borderRadius: 8,
              background: 'rgba(255,45,85,0.12)', color: 'var(--red)',
              border: '1px solid rgba(255,45,85,0.3)', fontSize: 13, fontWeight: 600,
              transition: 'all 0.2s',
            }}>Sign Out</button>
          </>
        )}
        {!user && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/login')} style={{
              padding: '8px 20px', borderRadius: 8, background: 'transparent',
              color: 'var(--text)', border: '1px solid var(--border)', fontSize: 14, fontWeight: 500,
            }}>Sign In</button>
            <button onClick={() => navigate('/register')} style={{
              padding: '8px 20px', borderRadius: 8,
              background: 'var(--teal)', color: 'var(--navy)',
              fontSize: 14, fontWeight: 700,
            }}>Register</button>
          </div>
        )}
      </div>
    </nav>
  );
}
