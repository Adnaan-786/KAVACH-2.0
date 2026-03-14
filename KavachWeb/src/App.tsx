import { useState, useEffect } from 'react';
import { KeyManager } from './services/KeyManager';
import { NetworkManager } from './services/NetworkManager';
import { ContactManager } from './services/ContactManager';
import { ChatService } from './services/ChatService';
import { AdminAuthService } from './services/AdminAuthService';
import { loadConfig } from './config/meshConfig';

import { HomePage } from './pages/HomePage';
import { ChatPage } from './pages/ChatPage';
import { ContactsPage } from './pages/ContactsPage';
import { AdminPage } from './pages/AdminPage';
import { JoinPage } from './pages/JoinPage';

import './index.css';

type Page = 'home' | 'chat' | 'contacts' | 'admin' | 'join';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [pageData, setPageData] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Initialize all services
    KeyManager.init();
    loadConfig();
    ContactManager.init();
    AdminAuthService.init();
    ChatService.init();

    // Connect to relay
    NetworkManager.connect();

    setReady(true);

    return () => {
      NetworkManager.disconnect();
    };
  }, []);

  const navigate = (page: string, data?: Record<string, string>) => {
    setCurrentPage(page as Page);
    if (data) setPageData(data);
  };

  if (!ready) return null;

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <HomePage onNavigate={navigate} />;
      case 'chat': return <ChatPage peerId={pageData.peerId || ''} onBack={() => setCurrentPage('home')} />;
      case 'contacts': return <ContactsPage onNavigate={navigate} />;
      case 'admin': return <AdminPage />;
      case 'join': return <JoinPage onNavigate={navigate} />;
      default: return <HomePage onNavigate={navigate} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <nav className="sidebar">
        <div className="sidebar-logo">K</div>
        <div className="sidebar-divider" />

        <button
          id="nav-home"
          className={`sidebar-btn ${currentPage === 'home' ? 'active' : ''}`}
          onClick={() => setCurrentPage('home')}
          title="Home"
        >
          🏠
        </button>

        <button
          id="nav-contacts"
          className={`sidebar-btn ${currentPage === 'contacts' ? 'active' : ''}`}
          onClick={() => setCurrentPage('contacts')}
          title="Contacts"
        >
          👥
        </button>

        <button
          id="nav-admin"
          className={`sidebar-btn ${currentPage === 'admin' ? 'active' : ''}`}
          onClick={() => setCurrentPage('admin')}
          title="Admin"
        >
          ⚙️
        </button>

        <div className="sidebar-spacer" />

        <button
          className="sidebar-btn"
          title="Join Zone"
          onClick={() => setCurrentPage('join')}
          style={{ color: currentPage === 'join' ? 'var(--accent-green)' : undefined }}
        >
          🔗
        </button>
      </nav>

      {/* Main Content */}
      {renderPage()}
    </div>
  );
}
