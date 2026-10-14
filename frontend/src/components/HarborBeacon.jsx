import React from 'react';

export default function HarborBeacon({ status = 'awaiting_bond' }) {
  const color = status === 'breached' ? '#f87171'
    : status === 'completed_full' ? '#4ade80'
    : status === 'completed_partial' ? '#fbbf24'
    : '#5b7cfa';

  return (
    <div className="beacon" aria-hidden>
      <svg viewBox="0 0 64 64" width="48" height="48">
        <defs>
          <radialGradient id="beaconGlow">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="url(#beaconGlow)" className="beacon-halo" />
        <circle cx="32" cy="32" r="14" fill="none" stroke={color} strokeWidth="1.5" className="beacon-ring-1" />
        <circle cx="32" cy="32" r="20" fill="none" stroke={color} strokeWidth="0.8" strokeOpacity="0.5" className="beacon-ring-2" />
        <circle cx="32" cy="32" r="6" fill={color} className="beacon-core" />
        <line x1="32" y1="2" x2="32" y2="14" stroke={color} strokeWidth="1.2" strokeOpacity="0.6" />
        <line x1="32" y1="50" x2="32" y2="62" stroke={color} strokeWidth="1.2" strokeOpacity="0.6" />
        <line x1="2" y1="32" x2="14" y2="32" stroke={color} strokeWidth="1.2" strokeOpacity="0.6" />
        <line x1="50" y1="32" x2="62" y2="32" stroke={color} strokeWidth="1.2" strokeOpacity="0.6" />
      </svg>
    </div>
  );
}
