import { KeyManager } from './KeyManager';

export type PeerData = {
  lastSeen: number;
  status: 'connected' | 'disconnected';
};

type PeerDiscoveredListener = (peerId: string) => void;
type PeerLostListener = (peerId: string) => void;
type DataReceivedListener = (peerId: string, data: string) => void;

class NetworkManagerService {
  private ws: WebSocket | null = null;
  private peers = new Map<string, PeerData>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;

  private onPeerDiscoveredListeners: PeerDiscoveredListener[] = [];
  private onPeerLostListeners: PeerLostListener[] = [];
  private onDataReceivedListeners: DataReceivedListener[] = [];
  private onConnectionChangeListeners: ((connected: boolean) => void)[] = [];

  private relayUrl = '';

  connect(relayUrl?: string) {
    // Auto-detect relay URL based on host
    if (relayUrl) {
      this.relayUrl = relayUrl;
    } else {
      const host = window.location.hostname || 'localhost';
      this.relayUrl = `ws://${host}:4200`;
    }

    this.doConnect();
  }

  private doConnect() {
    try {
      this.ws = new WebSocket(this.relayUrl);

      this.ws.onopen = () => {
        this.connected = true;
        this.onConnectionChangeListeners.forEach(l => l(true));
        console.log('[Network] Connected to relay:', this.relayUrl);

        // Announce ourselves
        this.ws?.send(JSON.stringify({
          type: 'announce',
          peerId: KeyManager.getPeerId(),
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          switch (msg.type) {
            case 'peers': {
              const myId = KeyManager.getPeerId();
              const incoming = new Set<string>(msg.peers.filter((p: string) => p !== myId));

              // Detect new peers
              for (const peerId of incoming) {
                if (!this.peers.has(peerId)) {
                  this.peers.set(peerId, { lastSeen: Date.now(), status: 'connected' });
                  this.onPeerDiscoveredListeners.forEach(l => l(peerId));
                }
              }

              // Detect lost peers
              for (const [peerId] of this.peers) {
                if (!incoming.has(peerId)) {
                  this.peers.delete(peerId);
                  this.onPeerLostListeners.forEach(l => l(peerId));
                }
              }
              break;
            }
            case 'packet': {
              this.onDataReceivedListeners.forEach(l => l(msg.from, msg.payload));
              break;
            }
          }
        } catch (e) {
          console.warn('[Network] Bad message', e);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.onConnectionChangeListeners.forEach(l => l(false));
        console.log('[Network] Disconnected. Reconnecting in 3s...');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        // onclose will fire after this
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.doConnect();
    }, 3000);
  }

  disconnect() {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.ws?.close();
    this.ws = null;
    this.connected = false;
    this.peers.clear();
  }

  sendPacket(to: string | null, payload: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'packet', to, payload }));
  }

  isConnected(): boolean { return this.connected; }
  getPeers(): Map<string, PeerData> { return new Map(this.peers); }

  // Listeners
  onPeerDiscovered(l: PeerDiscoveredListener) { this.onPeerDiscoveredListeners.push(l); }
  offPeerDiscovered(l: PeerDiscoveredListener) { this.onPeerDiscoveredListeners = this.onPeerDiscoveredListeners.filter(x => x !== l); }
  onPeerLost(l: PeerLostListener) { this.onPeerLostListeners.push(l); }
  offPeerLost(l: PeerLostListener) { this.onPeerLostListeners = this.onPeerLostListeners.filter(x => x !== l); }
  onDataReceived(l: DataReceivedListener) { this.onDataReceivedListeners.push(l); }
  offDataReceived(l: DataReceivedListener) { this.onDataReceivedListeners = this.onDataReceivedListeners.filter(x => x !== l); }
  onConnectionChange(l: (c: boolean) => void) { this.onConnectionChangeListeners.push(l); }
  offConnectionChange(l: (c: boolean) => void) { this.onConnectionChangeListeners = this.onConnectionChangeListeners.filter(x => x !== l); }
}

export const NetworkManager = new NetworkManagerService();
