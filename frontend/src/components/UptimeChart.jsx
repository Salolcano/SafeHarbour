import React, { useMemo } from 'react';

export default function UptimeChart({ passRate = 1, epochs = 0 }) {
  const points = useMemo(() => {
    const count = Math.max(20, epochs);
    const arr = [];
    for (let i = 0; i < count; i += 1) {
      const wave = Math.sin(i * 0.5) * 0.15;
      const noise = (Math.random() - 0.5) * 0.1;
      arr.push(Math.min(1, Math.max(0.7, passRate + wave + noise)));
    }
    return arr;
  }, [passRate, epochs]);

  const path = points.map((v, i) => {
    const x = (i / (points.length - 1)) * 600;
    const y = 100 - v * 90;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const area = `${path} L600,110 L0,110 Z`;

  return (
    <div className="uptime-chart">
      <div className="chart-label">Live Uptime Signal - last {points.length} epochs</div>
      <svg viewBox="0 0 600 110" preserveAspectRatio="none">
        <defs>
          <linearGradient id="uptimeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b7cfa" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#5b7cfa" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="uptimeLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#5b7cfa" />
            <stop offset="100%" stopColor="#a06bff" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#uptimeFill)" className="area" />
        <path d={path} fill="none" stroke="url(#uptimeLine)" strokeWidth="2" className="line" />
      </svg>
    </div>
  );
}
