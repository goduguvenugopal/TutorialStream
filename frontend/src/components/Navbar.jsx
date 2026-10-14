import React from 'react';
import { Play, Wifi, WifiOff, Settings } from 'lucide-react';

export default function Navbar({ isConnected, serverUrl, latency, onOpenSettings }) {
  // Format host for display (e.g., 192.168.1.15)
  const displayHost = serverUrl ? serverUrl.replace(/^https?:\/\//, '') : 'Set Server';

  return (
    <header className="navbar glass-nav">
      <div className="nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <div className="nav-logo-icon">
          <Play size={18} fill="currentColor" />
        </div>
        <div className="brand-text-wrap">
          <span className="brand-title">TutorialStream</span>
          <span className="brand-badge hide-mobile">PRO</span>
        </div>
      </div>

      <div className="nav-actions">
        <button
          className={`server-pill ${isConnected ? 'pill-connected' : 'pill-disconnected'}`}
          onClick={onOpenSettings}
          title="Click to configure laptop IP address"
        >
          <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
          {isConnected ? (
            <Wifi size={13} style={{ color: 'var(--success)' }} />
          ) : (
            <WifiOff size={13} style={{ color: 'var(--error)' }} />
          )}

          {/* Shown on desktop/tablet */}
          <span className="server-host-text hide-mobile">{displayHost}</span>

          {/* Status text on small mobile */}
          <span className="server-status-mobile show-mobile-only">
            {isConnected ? (latency ? `${latency}ms` : 'Online') : 'Offline'}
          </span>
        </button>

        <button
          className="settings-icon-btn"
          onClick={onOpenSettings}
          title="Server Settings"
          aria-label="Server Settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}
