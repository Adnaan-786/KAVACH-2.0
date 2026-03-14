import { useState, useEffect, useCallback } from 'react';
import { NetworkManager } from '../services/NetworkManager';
import { KeyManager } from '../services/KeyManager';
import { ContactManager, Contact } from '../services/ContactManager';
import { getConfig } from '../config/meshConfig';

interface Props {
  onNavigate: (page: string, data?: Record<string, string>) => void;
}

export function HomePage({ onNavigate }: Props) {
  const [connected, setConnected] = useState(NetworkManager.isConnected());
  const [peers, setPeers] = useState<string[]>([]);
  const [zoneId, setZoneId] = useState<string | undefined>(getConfig().zoneId);
  const [contacts, setContacts] = useState<Contact[]>(ContactManager.getContacts());

  useEffect(() => {
    const onConn = (c: boolean) => setConnected(c);
    const onPeer = () => setPeers(Array.from(NetworkManager.getPeers().keys()));
    const onLost = () => setPeers(Array.from(NetworkManager.getPeers().keys()));
    const onContacts = (c: Contact[]) => setContacts(c);

    NetworkManager.onConnectionChange(onConn);
    NetworkManager.onPeerDiscovered(onPeer);
    NetworkManager.onPeerLost(onLost);
    ContactManager.onChange(onContacts);

    return () => {
      NetworkManager.offConnectionChange(onConn);
      NetworkManager.offPeerDiscovered(onPeer);
      NetworkManager.offPeerLost(onLost);
      ContactManager.offChange(onContacts);
    };
  }, []);

  const refreshZone = useCallback(() => {
    setZoneId(getConfig().zoneId);
  }, []);

  useEffect(() => {
    refreshZone();
  }, [refreshZone]);

  const myId = KeyManager.getPeerId();

  return (
    <div className="main-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">KAVACH MESH</h1>
          <div className="status-badge" style={{ marginTop: 6 }}>
            <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
            <span style={{ color: 'var(--text-secondary)' }}>
              {connected ? `${peers.length} peer${peers.length !== 1 ? 's' : ''} online` : 'Connecting to relay...'}
            </span>
          </div>
        </div>
      </div>

      {/* Zone Bar */}
      <div className="zone-bar">
        <div>
          <div className="zone-label">Active Zone</div>
          <div className="zone-id">{zoneId || 'Open Mesh (No Zone)'}</div>
        </div>
        {!zoneId && (
          <button className="btn btn-success btn-sm" onClick={() => onNavigate('join')}>
            JOIN ZONE
          </button>
        )}
      </div>

      {/* Connection Info */}
      <div className="connection-info">
        <div className="connection-mode">
          <span style={{ color: connected ? 'var(--accent-green)' : 'var(--accent-red)' }}>●</span>
          {connected ? 'IP Relay' : 'Offline'}
        </div>
        <span className="mono text-xs" style={{ color: 'var(--text-muted)' }}>
          ID: {myId.slice(0, 16)}...
        </span>
      </div>

      {/* Peer List / Contacts */}
      <div className="section-label">
        {contacts.length > 0 ? 'CONTACTS' : 'NEARBY PEERS'}
      </div>

      <div className="peer-list">
        {contacts.length > 0 ? (
          contacts.map(contact => {
            const isOnline = peers.includes(contact.meshId);
            return (
              <div key={contact.meshId} className="peer-card" onClick={() => onNavigate('chat', { peerId: contact.meshId })}>
                <div className="peer-avatar" style={{ background: isOnline ? 'var(--gradient-green)' : 'var(--gradient-blue)' }}>
                  {contact.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="peer-info">
                  <div className="peer-name">{contact.name}</div>
                  <div className="peer-id">{contact.meshId.slice(0, 24)}...</div>
                </div>
                <div className="peer-status" style={{ color: isOnline ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                  {isOnline ? '● Online' : '○ Offline'}
                </div>
              </div>
            );
          })
        ) : peers.length > 0 ? (
          peers.map(peerId => (
            <div key={peerId} className="peer-card" onClick={() => onNavigate('chat', { peerId })}>
              <div className="peer-avatar">
                {peerId.slice(0, 2).toUpperCase()}
              </div>
              <div className="peer-info">
                <div className="peer-name">Peer {peerId.slice(0, 8)}</div>
                <div className="peer-id">{peerId.slice(0, 32)}...</div>
              </div>
              <div className="peer-status">● Online</div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📡</div>
            <div style={{ fontWeight: 600 }}>No Peers Yet</div>
            <div className="text-sm">
              {connected
                ? 'Waiting for others to connect to the relay...'
                : 'Connecting to relay server...'}
            </div>
            <div className="text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
              Add contacts via the Contacts tab, or<br/>
              open this app on another device on the same network.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
