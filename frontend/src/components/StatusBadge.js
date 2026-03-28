import React from 'react';
const STATUS_CONFIG = {
  pending:              { label: 'Awaiting Helper',       color: '#FF9500', bg: 'rgba(255,149,0,0.12)' },
  helper_assigned:      { label: 'Helper Assigned',       color: '#00E5CC', bg: 'rgba(0,229,204,0.12)' },
  helper_en_route:      { label: 'Helper En Route',       color: '#00E5CC', bg: 'rgba(0,229,204,0.12)' },
  patient_picked:       { label: 'Patient Picked Up',     color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  rendezvous:           { label: 'Rendezvous Assigned',   color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  ambulance_en_route:   { label: 'Ambulance En Route',    color: '#FF2D55', bg: 'rgba(255,45,85,0.12)' },
  hospital_reached:     { label: 'At Hospital',           color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  completed:            { label: 'Completed',             color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  cancelled:            { label: 'Cancelled',             color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};
export default function StatusBadge({ status, size = 'md' }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#6b7280', bg: 'rgba(107,114,128,0.12)' };
  const fs = size === 'lg' ? 14 : 11;
  return (
    <span style={{
      padding: size === 'lg' ? '6px 14px' : '4px 10px',
      borderRadius: 20, background: cfg.bg,
      color: cfg.color, fontSize: fs,
      fontFamily: 'var(--font-mono)', fontWeight: 700,
      border: `1px solid ${cfg.color}40`,
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{ width:7,height:7,borderRadius:'50%',background:cfg.color,display:'inline-block',
        boxShadow:`0 0 6px ${cfg.color}`, animation:'pulse 2s infinite' }} />
      {cfg.label.toUpperCase()}
    </span>
  );
}
