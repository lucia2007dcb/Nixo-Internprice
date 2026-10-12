import { useEffect, useState } from 'react';

const pad = (n) => String(n).padStart(2, '0');

const formatUptime = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}h ${pad(m)}m` : `${m}m ${pad(s)}s`;
};

const Meter = ({ pct }) => (
  <div className="meter">
    <i style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
  </div>
);

const Readout = ({ label, value }) => (
  <div className="readout">
    <span>{label}</span>
    <b>{value}</b>
  </div>
);

export default function HudOverlay({ telemetry }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const date = now
    .toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
    .toUpperCase();

  const uptime = telemetry ? formatUptime(telemetry.uptimeSec) : '——';
  const memoryMb = telemetry ? telemetry.memoryMb : null;
  const loadPct = telemetry ? telemetry.loadPct : null;
  const memPct = memoryMb != null ? Math.round((memoryMb / 1024) * 100) : 0;

  return (
    <div className="hud-overlay" aria-hidden="true">
      <div className="corner corner-tl" />
      <div className="corner corner-tr" />
      <div className="corner corner-bl" />
      <div className="corner corner-br" />

      <div className="glass-panel panel-sys">
        <div className="panel-label">CORE SYSTEMS</div>
        <Readout label="UPTIME" value={uptime} />
        <Readout label="MEM" value={memoryMb != null ? `${memoryMb} MB` : '——'} />
        <Meter pct={memPct} />
        <Readout label="LOAD" value={loadPct != null ? `${loadPct}%` : '——'} />
        <Meter pct={loadPct ?? 0} />
        <Readout label="QUERIES" value={telemetry ? telemetry.queriesServed : '——'} />
      </div>

      <div className="glass-panel panel-clock">
        <div className="panel-label">LOCAL TIME</div>
        <div className="clock">{time}</div>
        <Readout label="DATE" value={date} />
        <Readout label="LINK" value="SECURE" />
        <Readout label="CORES" value={telemetry ? telemetry.cpuCores : '——'} />
      </div>

      <div className="ticker">
        <span className="ticker-item">ARC REACTOR :: STABLE</span>
        <span className="ticker-item">
          NEURAL LINK :: {telemetry?.apiKeyConfigured ? 'ACTIVE' : 'OFFLINE'}
        </span>
        <span className="ticker-item">MODEL :: {telemetry ? telemetry.model : '——'}</span>
      </div>
    </div>
  );
}
