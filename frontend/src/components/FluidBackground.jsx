import React from 'react';

export default function FluidBackground() {
  return (
    <div className="fluid-bg" aria-hidden>
      <svg className="waves" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5b7cfa" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#a06bff" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="g2" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path className="wave wave-1" fill="url(#g1)"
          d="M0,500 C240,400 480,600 720,500 C960,400 1200,600 1440,500 L1440,900 L0,900 Z" />
        <path className="wave wave-2" fill="url(#g2)"
          d="M0,600 C300,500 600,700 900,600 C1200,500 1440,650 1440,650 L1440,900 L0,900 Z" />
        <path className="wave wave-3" fill="url(#g1)"
          d="M0,700 C360,620 720,780 1080,700 C1260,660 1440,720 1440,720 L1440,900 L0,900 Z" />
      </svg>
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
    </div>
  );
}
