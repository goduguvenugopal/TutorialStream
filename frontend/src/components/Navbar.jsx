import React, { useState, useEffect } from 'react';
import { Play, Wifi, WifiOff, Settings, Download } from 'lucide-react';

export default function Navbar({ isConnected, serverUrl, latency, onOpenSettings }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Listen for PWA install prompt event
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already in standalone display mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
  };

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
        {/* PWA Install Button when available */}
        {installPrompt && !isInstalled && (
          <button
            className="btn-install-pwa"
            onClick={handleInstallClick}
            title="Install TutorialStream on your device as an App"
          >
            <Download size={13} />
            <span>Install</span>
          </button>
        )}

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
