import { KeyManager } from './KeyManager';
import { NetworkManager } from './NetworkManager';

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
  status: 'Sending' | 'Relaying' | 'Delivered' | 'Stored';
  isMe: boolean;
}

type HistoryListener = (peerId: string, messages: ChatMessage[]) => void;

class ChatServiceController {
  private history = new Map<string, ChatMessage[]>();
  private listeners: HistoryListener[] = [];

  init() {
    // Listen for incoming packets from relay
    NetworkManager.onDataReceived((_from, payload) => {
      try {
        const msg = JSON.parse(payload);
        if (msg.chatType === 'message') {
          const chatMsg: ChatMessage = {
            id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
            text: msg.text,
            senderId: msg.senderId,
            timestamp: msg.timestamp,
            status: 'Delivered',
            isMe: false,
          };
          this.append(msg.senderId, chatMsg);
        }
      } catch {
        // Not a chat message, ignore
      }
    });
  }

  sendMessage(recipientId: string, text: string) {
    const messageId = Date.now().toString() + Math.random().toString(36).slice(2, 8);
    const msg: ChatMessage = {
      id: messageId,
      text,
      senderId: KeyManager.getPeerId(),
      timestamp: Date.now(),
      status: 'Sending',
      isMe: true,
    };

    this.append(recipientId, msg);

    // Send via relay
    const payload = JSON.stringify({
      chatType: 'message',
      text,
      senderId: KeyManager.getPeerId(),
      timestamp: msg.timestamp,
    });

    NetworkManager.sendPacket(recipientId, payload);

    const isOnline = NetworkManager.getPeers().has(recipientId);
    this.updateStatus(recipientId, messageId, isOnline ? 'Delivered' : 'Stored');
  }

  getMessages(peerId: string): ChatMessage[] {
    return this.history.get(peerId) || [];
  }

  private append(peerId: string, msg: ChatMessage) {
    const h = this.history.get(peerId) || [];
    h.push(msg);
    this.history.set(peerId, h);
    this.listeners.forEach(l => l(peerId, [...h]));
  }

  private updateStatus(peerId: string, msgId: string, status: ChatMessage['status']) {
    const h = this.history.get(peerId);
    if (!h) return;
    const msg = h.find(m => m.id === msgId);
    if (msg) { msg.status = status; this.listeners.forEach(l => l(peerId, [...h])); }
  }

  onHistoryUpdated(l: HistoryListener) { this.listeners.push(l); }
  offHistoryUpdated(l: HistoryListener) { this.listeners = this.listeners.filter(x => x !== l); }
}

export const ChatService = new ChatServiceController();
