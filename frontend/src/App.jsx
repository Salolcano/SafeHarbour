import React, { useEffect, useState } from 'react';
import {
  CONTRACT_ADDRESS, EXPLORER, connectWallet, isConfigured,
  readContract, waitFinalized, writeContract,
} from './genlayer.js';
import FluidBackground from './components/FluidBackground.jsx';
import HarborBeacon from './components/HarborBeacon.jsx';
import UptimeChart from './components/UptimeChart.jsx';

const short = (x = '') => (x ? `${x.slice(0, 6)}...${x.slice(-4)}` : '-');
const safeJson = (s) => { try { return JSON.parse(s || '{}'); } catch { return {}; } };

export default function App() {
  const [wallet, setWallet] = useState(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState({ type: 'info', text: isConfigured ? 'Ready.' : 'Deploy contract, then set VITE_CONTRACT_ADDRESS.' });
  const [slas, setSlas] = useState({});
  const [selectedSla, setSelectedSla] = useState(null);

  const [form, setForm] = useState({
    agent_address: '',
    service_name: 'Data Pipeline API',
    sla_terms: 'Must maintain 99.5% uptime, respond within 200ms p95, zero unhandled errors, no PII leakage in logs.',
    monitoring_url: 'https://status.aws.amazon.com',
    duration_days: '30',
    bond_amount: '1000',
  });

  async function refresh() {
    if (!isConfigured) return;
    try {
      const all = await readContract('get_all_slas');
      setSlas(all || {});
      const keys = Object.keys(all || {});
      if (keys.length && !selectedSla) setSelectedSla(keys[keys.length - 1]);
    } catch (e) { setNotice({ type: 'error', text: e.message }); }
  }

  useEffect(() => { refresh(); }, []);

  const current = safeJson(slas[selectedSla]);
  const totalEpochs = (current.epochs_passed || 0) + (current.epochs_failed || 0);
  const passRate = totalEpochs ? (current.epochs_passed / totalEpochs) : 1;

  async function tx(label, method, args, value = 0n) {
    if (!wallet) return setNotice({ type: 'error', text: 'Connect wallet first.' });
    setBusy(label);
    try {
      const hash = await writeContract(wallet, method, args, value);
      setNotice({ type: 'info', text: `${label}: ${short(hash)}` });
      await waitFinalized(hash, (s) => setBusy(`${label} - ${s}`));
      setNotice({ type: 'ok', text: `${label} finalized.` });
      await refresh();
    } catch (e) {
      setNotice({ type: 'error', text: e.message });
    } finally { setBusy(''); }
  }

  async function createSla(e) {
    e.preventDefault();
    await tx('Create SLA', 'create_sla', [
      form.agent_address, form.service_name, form.sla_terms,
      form.monitoring_url, Number(form.duration_days), Number(form.bond_amount),
    ]);
  }

  return (
    <div className="shell">
      <FluidBackground />

      <header className="topbar">
        <div className="brand">
          <HarborBeacon status={current.status} />
          <div>
            <div className="brand-name">SafeHarbor</div>
            <div className="brand-tag">Autonomous SLA enforcement on GenLayer</div>
          </div>
        </div>
        <button className="wallet-btn" onClick={async () => {
          try { setWallet(await connectWallet()); } catch (e) { setNotice({ type: 'error', text: e.message }); }
        }}>
          {wallet ? short(wallet.account) : 'Connect Wallet'}
        </button>
      </header>

      <div className={`banner ${notice.type}`}>
        <span className="pulse-dot" />
        {busy || notice.text}
      </div>

      <section className="grid">
        <article className="card glass">
          <h2>Create SLA</h2>
          <form onSubmit={createSla} className="sla-form">
            <label>Agent Address
              <input value={form.agent_address} onChange={(e) => setForm({ ...form, agent_address: e.target.value })} placeholder="0x..." />
            </label>
            <label>Service Name
              <input value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} />
            </label>
            <label>SLA Terms (plain English)
              <textarea rows="4" value={form.sla_terms} onChange={(e) => setForm({ ...form, sla_terms: e.target.value })} />
            </label>
            <label>Monitoring URL
              <input value={form.monitoring_url} onChange={(e) => setForm({ ...form, monitoring_url: e.target.value })} />
            </label>
            <div className="row">
              <label>Duration (days)
                <input value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} />
              </label>
              <label>Bond (GEN)
                <input value={form.bond_amount} onChange={(e) => setForm({ ...form, bond_amount: e.target.value })} />
              </label>
            </div>
            <button type="submit" className="primary">Create SLA</button>
          </form>
        </article>

        <article className="card glass">
          <h2>Active SLAs</h2>
          {Object.keys(slas).length === 0 && <p className="muted">No SLAs yet. Create one to begin.</p>}
          <ul className="sla-list">
            {Object.entries(slas).map(([id, raw]) => {
              const s = safeJson(raw);
              const isActive = selectedSla === id;
              return (
                <li key={id} className={isActive ? 'active' : ''} onClick={() => setSelectedSla(id)}>
                  <div className="sla-row">
                    <span className="sla-id">#{id}</span>
                    <span className="sla-name">{s.service_name}</span>
                    <span className={`chip status-${s.status}`}>{s.status}</span>
                  </div>
                  <div className="sla-meta">
                    Bond: {s.bond_staked || 0} GEN - Epochs: {(s.epochs_passed||0) + (s.epochs_failed||0)}/{s.duration_days}
                  </div>
                </li>
              );
            })}
          </ul>
        </article>

        <article className="card glass wide">
          <h2>Monitoring Panel {current.service_name && `- ${current.service_name}`}</h2>
          {!current.service_name && <p className="muted">Select an SLA.</p>}
          {current.service_name && (
            <>
              <div className="metrics">
                <div className="metric">
                  <div className="metric-label">Pass Rate</div>
                  <div className="metric-value">{(passRate * 100).toFixed(1)}%</div>
                </div>
                <div className="metric">
                  <div className="metric-label">Epochs Passed</div>
                  <div className="metric-value">{current.epochs_passed || 0}</div>
                </div>
                <div className="metric">
                  <div className="metric-label">Epochs Failed</div>
                  <div className="metric-value danger">{current.epochs_failed || 0}</div>
                </div>
                <div className="metric">
                  <div className="metric-label">Bond Staked</div>
                  <div className="metric-value">{current.bond_staked || 0} <span className="unit">GEN</span></div>
                </div>
              </div>
              <UptimeChart passRate={passRate} epochs={totalEpochs} />
              <div className="controls">
                <button onClick={() => tx('Check epoch', 'check_epoch', [Number(selectedSla)])}>
                  Run Epoch Check
                </button>
                <button onClick={() => tx('Stake bond', 'stake_bond', [Number(selectedSla)], BigInt(current.bond_amount || 0))}>
                  Stake Bond
                </button>
                <button className="ghost" onClick={() => tx('Dispute', 'dispute_epoch', [`${selectedSla}:0`, 'Upstream provider outage - not our fault']) }>
                  Dispute Last Epoch
                </button>
              </div>
              <div className="sla-terms">
                <div className="terms-label">SLA Terms</div>
                <p>{current.sla_terms}</p>
              </div>
            </>
          )}
        </article>
      </section>

      <footer>
        <span>{CONTRACT_ADDRESS ? `Contract ${short(CONTRACT_ADDRESS)}` : 'Not configured'}</span>
        {CONTRACT_ADDRESS && <a href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">Explorer</a>}
      </footer>
    </div>
  );
}
