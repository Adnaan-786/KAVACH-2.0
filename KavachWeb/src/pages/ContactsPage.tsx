import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { KeyManager } from '../services/KeyManager';
import { ContactManager, Contact } from '../services/ContactManager';
import { NetworkManager } from '../services/NetworkManager';

interface Props {
  onNavigate: (page: string, data?: Record<string, string>) => void;
}

export function ContactsPage({ onNavigate }: Props) {
  const [contacts, setContacts] = useState<Contact[]>(ContactManager.getContacts());
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMyQR, setShowMyQR] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMeshId, setNewMeshId] = useState('');
  const [error, setError] = useState('');
  const [peers, setPeers] = useState<string[]>(Array.from(NetworkManager.getPeers().keys()));

  const myId = KeyManager.getPeerId();

  useEffect(() => {
    const onC = (c: Contact[]) => setContacts(c);
    const onP = () => setPeers(Array.from(NetworkManager.getPeers().keys()));
    ContactManager.onChange(onC);
    NetworkManager.onPeerDiscovered(onP);
    NetworkManager.onPeerLost(onP);
    return () => {
      ContactManager.offChange(onC);
      NetworkManager.offPeerDiscovered(onP);
      NetworkManager.offPeerLost(onP);
    };
  }, []);

  const handleAdd = () => {
    setError('');
    const name = newName.trim();
    const id = newMeshId.trim();
    if (!name) { setError('Name is required'); return; }
    if (id.length < 32) { setError('Invalid Mesh ID'); return; }
    if (id === myId) { setError("You can't add yourself"); return; }
    try {
      ContactManager.addContact(name, id);
      setNewName('');
      setNewMeshId('');
      setShowAddForm(false);
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(myId);
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Contacts</h1>
          <div className="page-subtitle">Share your Mesh ID to connect permanently</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setShowMyQR(!showMyQR); setShowAddForm(false); }}>
            {showMyQR ? 'Hide QR' : 'My QR'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowAddForm(!showAddForm); setShowMyQR(false); }}>
            + Add
          </button>
        </div>
      </div>

      <div className="page-scroll">
        {/* My QR Code */}
        {showMyQR && (
          <div className="card mb-4 text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Your Mesh Identity</div>
            <div className="qr-container">
              <QRCodeSVG value={myId} size={200} bgColor="#ffffff" fgColor="#0f172a" />
            </div>
            <div className="mono text-xs" style={{ color: 'var(--text-muted)', wordBreak: 'break-all', maxWidth: 320 }}>
              {myId}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleCopyId}>
              📋 Copy ID
            </button>
          </div>
        )}

        {/* Add Contact Form */}
        {showAddForm && (
          <div className="card mb-4 flex flex-col gap-3">
            <div style={{ fontWeight: 700 }}>Add New Contact</div>
            <input
              className="input"
              placeholder="Contact Name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <input
              className="input mono"
              placeholder="Paste Mesh ID (hex public key)"
              value={newMeshId}
              onChange={e => setNewMeshId(e.target.value)}
              style={{ fontSize: 12 }}
            />
            {error && <div style={{ color: 'var(--accent-red)', fontSize: 13 }}>{error}</div>}
            <button className="btn btn-primary" onClick={handleAdd}>Add Contact</button>
          </div>
        )}

        {/* Contact List */}
        {contacts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {contacts.map(c => {
              const isOnline = peers.includes(c.meshId);
              return (
                <div key={c.meshId} className="peer-card" onClick={() => onNavigate('chat', { peerId: c.meshId })}>
                  <div className="peer-avatar" style={{ background: isOnline ? 'var(--gradient-green)' : 'var(--gradient-blue)' }}>
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="peer-info">
                    <div className="peer-name">{c.name}</div>
                    <div className="peer-id">{c.meshId.slice(0, 24)}...</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="peer-status" style={{ color: isOnline ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                      {isOnline ? '● Online' : '○ Offline'}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={e => { e.stopPropagation(); ContactManager.removeContact(c.meshId); }}
                      style={{ color: 'var(--accent-red)', fontSize: 12, padding: '4px 8px' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div style={{ fontWeight: 600 }}>No Contacts</div>
            <div className="text-sm">
              Add contacts by sharing your Mesh ID QR code<br/>
              or paste their Mesh ID to connect.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
