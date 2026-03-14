import { useState } from 'react';
import { ZoneTokenService } from '../services/ZoneTokenService';

interface Props {
  onNavigate: (page: string) => void;
}

export function JoinPage({ onNavigate }: Props) {
  const [tokenInput, setTokenInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleJoin = () => {
    const token = tokenInput.trim();
    if (!token) { setStatus('error'); setMessage('Please paste a Zone Token'); return; }

    try {
      const config = ZoneTokenService.verifyAndApplyToken(token);
      setStatus('success');
      setMessage(`Joined Zone: ${config.zoneId}\nMax Hops: ${config.maxHops} | RSSI: ${config.rssiThreshold} dBm`);
      setTimeout(() => onNavigate('home'), 2000);
    } catch (e: unknown) {
      setStatus('error');
      setMessage((e as Error).message);
    }
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Join Zone</h1>
          <div className="page-subtitle">Paste a Zone Token to join a secure mesh zone</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('home')}>← Back</button>
      </div>

      <div className="page-scroll">
        <div className="card" style={{ maxWidth: 500 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Zone Token</div>
          <textarea
            className="input"
            rows={4}
            placeholder="Paste the Base64 Zone Token here..."
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            style={{ resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 12 }}
          />
          <button className="btn btn-success w-full mt-4" onClick={handleJoin}>
            🔗 JOIN ZONE
          </button>
        </div>

        {status !== 'idle' && (
          <div
            className="card mt-4"
            style={{
              maxWidth: 500,
              borderColor: status === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
              whiteSpace: 'pre-line',
            }}
          >
            <div style={{ fontWeight: 700, color: status === 'success' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {status === 'success' ? '✓ Zone Joined!' : '✕ Error'}
            </div>
            <div className="text-sm mt-4" style={{ color: 'var(--text-secondary)' }}>{message}</div>
          </div>
        )}
      </div>
    </div>
  );
}
