import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AdminAuthService } from '../services/AdminAuthService';
import { ZoneTokenService } from '../services/ZoneTokenService';
import { getConfig, MeshConfig } from '../config/meshConfig';

export function AdminPage() {
  const [isSetup, setIsSetup] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const [rssiThreshold, setRssiThreshold] = useState(-70);
  const [maxHops, setMaxHops] = useState(7);
  const [messageTTLHours, setMessageTTLHours] = useState(12);
  const [tokenExpiryHours, setTokenExpiryHours] = useState(24);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  useEffect(() => {
    const cfg = getConfig();
    setRssiThreshold(cfg.rssiThreshold);
    setMaxHops(cfg.maxHops);
    setMessageTTLHours(Math.max(1, Math.floor(cfg.messageTTL / 3600000)));
    setIsSetup(AdminAuthService.isAdminSetupComplete());
    setIsAuth(AdminAuthService.isAdminMode());

    const onAuth = (a: boolean) => setIsAuth(a);
    AdminAuthService.addStateListener(onAuth);
    return () => AdminAuthService.removeStateListener(onAuth);
  }, []);

  const handleSubmit = async () => {
    setError('');
    try {
      if (!isSetup) {
        await AdminAuthService.setupAdmin(pin);
        setIsSetup(true);
      } else {
        const ok = await AdminAuthService.login(pin);
        if (!ok) setError('Incorrect PIN');
      }
      setPin('');
    } catch (e: unknown) { setError((e as Error).message); }
  };

  const handleGenerate = async () => {
    try {
      const config: MeshConfig = { rssiThreshold, maxHops, messageTTL: messageTTLHours * 3600000 };
      const bytes = await ZoneTokenService.generateZoneToken(config, tokenExpiryHours);
      setGeneratedToken(ZoneTokenService.tokenToBase64(bytes));
    } catch (e: unknown) { setError((e as Error).message); }
  };

  const getDistanceLabel = (rssi: number) => {
    if (rssi > -50) return '~2m (Immediate)';
    if (rssi > -65) return '~10m (Room)';
    if (rssi > -80) return '~30m (Building)';
    return '>50m (Edge)';
  };

  if (!isAuth) {
    return (
      <div className="main-content">
        <div className="auth-screen">
          <div className="auth-card">
            <h2>{isSetup ? 'Admin Login' : 'Setup Admin'}</h2>
            <p>{isSetup ? 'Enter your 6-digit PIN' : 'Create a 6-digit PIN to setup Admin Mode'}</p>
            <input
              className="input input-pin"
              type="password"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="● ● ● ● ● ●"
              autoFocus
            />
            {error && <div style={{ color: 'var(--accent-red)', margin: '12px 0', fontSize: 13 }}>{error}</div>}
            <button className="btn btn-primary btn-lg w-full mt-4" onClick={handleSubmit}>
              {isSetup ? 'LOGIN' : 'SETUP ADMIN'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Zone Configuration</h1>
          <div className="page-subtitle">Define software-defined boundary parameters</div>
        </div>
        <button className="btn btn-danger btn-sm" onClick={() => AdminAuthService.logout()}>
          🔒 LOCK
        </button>
      </div>

      <div className="page-scroll">
        {/* RSSI */}
        <div className="card mb-4">
          <div style={{ fontWeight: 700, marginBottom: 4 }}>RSSI Threshold: {rssiThreshold} dBm</div>
          <div className="text-sm text-muted" style={{ marginBottom: 12 }}>
            Max distance between nodes: {getDistanceLabel(rssiThreshold)}
          </div>
          <div className="segment-group">
            {[-50, -60, -70, -80, -90].map(v => (
              <button key={v} className={`segment-btn ${rssiThreshold === v ? 'active' : ''}`} onClick={() => setRssiThreshold(v)}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Max Hops */}
        <div className="card mb-4">
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Max Hops: {maxHops}</div>
          <div className="text-sm text-muted" style={{ marginBottom: 12 }}>
            How many jumps a message can make across the mesh
          </div>
          <div className="segment-group">
            {[1, 3, 5, 7, 10].map(v => (
              <button key={v} className={`segment-btn ${maxHops === v ? 'active' : ''}`} onClick={() => setMaxHops(v)}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Token Expiry */}
        <div className="card mb-4">
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Token Expiry</div>
          <div className="text-sm text-muted" style={{ marginBottom: 12 }}>
            How long before devices must scan a new token
          </div>
          <div className="segment-group">
            {[1, 8, 24, 0].map(h => (
              <button key={h} className={`segment-btn ${tokenExpiryHours === h ? 'active' : ''}`} onClick={() => setTokenExpiryHours(h)}>
                {h === 0 ? 'Indef.' : `${h}h`}
              </button>
            ))}
          </div>
        </div>

        {/* Generate */}
        <div className="text-center mt-6">
          <button className="btn btn-primary btn-lg" onClick={handleGenerate}>
            ⚡ GENERATE ZONE TOKEN
          </button>

          {generatedToken && (
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div className="qr-container">
                <QRCodeSVG value={generatedToken} size={250} bgColor="#ffffff" fgColor="#0f172a" />
              </div>
              <div className="text-sm text-muted">Scan to Join Zone</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(generatedToken)}>
                📋 Copy Token
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
