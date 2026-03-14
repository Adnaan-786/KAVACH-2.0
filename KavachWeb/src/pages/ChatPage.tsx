import { useState, useEffect, useRef } from 'react';
import { ChatService, ChatMessage } from '../services/ChatService';
import { ContactManager } from '../services/ContactManager';
import { NetworkManager } from '../services/NetworkManager';

interface Props {
  peerId: string;
  onBack: () => void;
}

export function ChatPage({ peerId, onBack }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(ChatService.getMessages(peerId));
  const [input, setInput] = useState('');
  const [isOnline, setIsOnline] = useState(NetworkManager.getPeers().has(peerId));
  const scrollRef = useRef<HTMLDivElement>(null);

  const contactName = ContactManager.getContactName(peerId) || `Peer ${peerId.slice(0, 8)}`;

  useEffect(() => {
    const onUpdate = (pid: string, msgs: ChatMessage[]) => {
      if (pid === peerId) setMessages(msgs);
    };
    const onPeer = () => setIsOnline(NetworkManager.getPeers().has(peerId));

    ChatService.onHistoryUpdated(onUpdate);
    NetworkManager.onPeerDiscovered(onPeer);
    NetworkManager.onPeerLost(onPeer);

    return () => {
      ChatService.offHistoryUpdated(onUpdate);
      NetworkManager.offPeerDiscovered(onPeer);
      NetworkManager.offPeerLost(onPeer);
    };
  }, [peerId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    ChatService.sendMessage(peerId, text);
    setInput('');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="main-content">
      {/* Chat Header */}
      <div className="chat-header">
        <button className="btn btn-ghost btn-icon" onClick={onBack} style={{ fontSize: 18 }}>←</button>
        <div className="peer-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
          {contactName.slice(0, 2).toUpperCase()}
        </div>
        <div className="peer-info">
          <div className="peer-name">{contactName}</div>
          <div className="text-xs" style={{ color: isOnline ? 'var(--accent-green)' : 'var(--text-muted)' }}>
            {isOnline ? '● Online' : '○ Offline'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🔒</div>
            <div style={{ fontWeight: 600 }}>End-to-End Encrypted</div>
            <div className="text-sm">Messages are encrypted using your mesh identity keys.</div>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`message-bubble ${msg.isMe ? 'message-sent' : 'message-received'}`}>
            <div>{msg.text}</div>
            <div className="message-time">
              {formatTime(msg.timestamp)}
              {msg.isMe && (
                <span style={{ marginLeft: 6, fontSize: 9 }}>
                  {msg.status === 'Delivered' ? '✓✓' : msg.status === 'Sending' ? '⏳' : msg.status === 'Stored' ? '📦' : '→'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="chat-input-bar">
        <input
          className="input"
          placeholder="Type a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          autoFocus
        />
        <button className="btn btn-primary" onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
