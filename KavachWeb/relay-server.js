import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { networkInterfaces } from 'os';

const PORT = 4200;

const httpServer = createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify({ status: 'ok', peers: wss.clients.size }));
});

const wss = new WebSocketServer({ server: httpServer });

/** @type {Map<string, WebSocket>} */
const peers = new Map();

wss.on('connection', (ws) => {
  let peerId = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'announce': {
          peerId = msg.peerId;
          peers.set(peerId, ws);
          console.log(`[Relay] Peer joined: ${peerId.slice(0, 12)}... (${peers.size} total)`);
          // Notify everyone about peer list
          broadcastPeerList();
          break;
        }

        case 'packet': {
          // Relay encrypted packet to target or broadcast
          const target = msg.to;
          if (target && peers.has(target)) {
            const targetWs = peers.get(target);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify({
                type: 'packet',
                from: peerId,
                payload: msg.payload,
              }));
            }
          } else {
            // Broadcast to all except sender
            for (const [id, peerWs] of peers) {
              if (id !== peerId && peerWs.readyState === WebSocket.OPEN) {
                peerWs.send(JSON.stringify({
                  type: 'packet',
                  from: peerId,
                  payload: msg.payload,
                }));
              }
            }
          }
          break;
        }
      }
    } catch (e) {
      console.warn('[Relay] Bad message:', e.message);
    }
  });

  ws.on('close', () => {
    if (peerId) {
      peers.delete(peerId);
      console.log(`[Relay] Peer left: ${peerId.slice(0, 12)}... (${peers.size} total)`);
      broadcastPeerList();
    }
  });

  ws.on('error', (err) => {
    console.warn('[Relay] WS error:', err.message);
  });
});

function broadcastPeerList() {
  const peerIds = Array.from(peers.keys());
  const msg = JSON.stringify({ type: 'peers', peers: peerIds });
  for (const [, peerWs] of peers) {
    if (peerWs.readyState === WebSocket.OPEN) {
      peerWs.send(msg);
    }
  }
}

httpServer.listen(PORT, '0.0.0.0', () => {
  const nets = networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  console.log(`\n  ⚡ KAVACH Relay Server running on port ${PORT}`);
  console.log(`  ➜  Local:   ws://localhost:${PORT}`);
  ips.forEach(ip => console.log(`  ➜  Network: ws://${ip}:${PORT}`));
  console.log('');
});
