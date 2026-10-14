import React, { useState } from 'react';
import { Server, X, CheckCircle2, AlertTriangle, RefreshCw, Smartphone, Laptop, Globe } from 'lucide-react';
import { normalizeServerUrl } from '../utils/api';

export default function ConnectionModal({
  isOpen,
  onClose,
  currentUrl,
  onSaveAndConnect,
  isTesting,
  testResult,
  serverData,
}) {
  const [inputUrl, setInputUrl] = useState(currentUrl || '');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      onSaveAndConnect(inputUrl.trim());
    }
  };

  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Server size={22} style={{ color: 'var(--accent-primary)' }} />
            Connect to Laptop Server
          </h2>
          <button className="btn-close-player" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="input-group">
            <label className="input-label" htmlFor="server-ip-input">
              Laptop IP Address & Port
            </label>
            <p className="input-desc">
              Make sure your phone and laptop are on the same Wi-Fi or Mobile Hotspot. Enter the IP shown in your laptop's backend terminal.
            </p>
            <div className="ip-input-row">
              <input
                id="server-ip-input"
                type="text"
                className="ip-input"
                placeholder="e.g. 192.168.43.120:5000 or 10.233.196.66:5000"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className="btn-test-conn"
                disabled={isTesting || !inputUrl.trim()}
              >
                {isTesting ? (
                  <>
                    <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    Testing...
                  </>
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          </div>

          {/* Test Status Feedback */}
          {testResult && (
            <div className={`conn-status-box ${testResult.success ? 'success' : 'error'}`}>
              {testResult.success ? (
                <>
                  <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Connected successfully!</strong> Latency: {testResult.latency}ms
                    {serverData?.tutorialsPath && (
                      <div style={{ fontSize: '0.725rem', opacity: 0.9, marginTop: '2px' }}>
                        Streaming folder: {serverData.tutorialsPath}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Connection Failed:</strong> {testResult.error}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Suggested Local IPs from server if connected */}
          {serverData?.localIps?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Detected Laptop Network Interfaces:
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {serverData.localIps.map((ip) => (
                  <button
                    key={ip.address}
                    type="button"
                    onClick={() => {
                      const val = `http://${ip.address}:5000`;
                      setInputUrl(val);
                      onSaveAndConnect(val);
                    }}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#cbd5e1',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      cursor: 'pointer',
                    }}
                  >
                    {ip.interface}: {ip.address}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Helpful Mobile & Vercel Tips */}
          <div className="info-tip-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
              <Smartphone size={15} style={{ color: '#a5b4fc' }} />
              <strong>Mobile Hotspot / Wi-Fi Guide:</strong>
            </div>
            <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
              <li>Connect your laptop and phone to the same Wi-Fi network (or turn on your phone's hotspot and connect your laptop to it).</li>
              <li>Run <code>npm run dev</code> in the backend folder on your laptop.</li>
              {isHttps ? (
                <li style={{ color: '#fca5a5', marginTop: '4px' }}>
                  <strong>Vercel Note:</strong> Browsers block HTTPS sites from connecting to insecure <code>http://192.168.x.x</code>. To stream directly on your phone, open <code>http://&lt;your-laptop-ip&gt;:5000</code> in your phone browser, OR run <code>npx localtunnel --port 5000</code> to get an https URL!
                </li>
              ) : (
                <li>Direct HTTP access has no browser restrictions.</li>
              )}
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
}
