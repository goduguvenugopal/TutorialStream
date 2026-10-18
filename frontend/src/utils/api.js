const SERVER_URL_KEY = 'tutorial_streamer_server_url';
const PROGRESS_KEY = 'tutorial_streamer_progress';

/**
 * Normalizes input server URL to a valid http(s) URL
 */
export function normalizeServerUrl(inputUrl) {
  if (!inputUrl) return '';
  let url = inputUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    // If domain looks like a tunnel (trycloudflare, loca.lt, ngrok, etc.) or page is HTTPS and not an IP
    const isRawIp = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(url) || /^localhost(:\d+)?$/i.test(url);
    if (!isRawIp || (typeof window !== 'undefined' && window.location.protocol === 'https:')) {
      url = `https://${url}`;
    } else {
      url = `http://${url}`;
    }
  }
  return url.replace(/\/+$/, '');
}

/**
 * Get initial default server URL based on current browser environment
 */
export function getDefaultServerUrl() {
  if (typeof window !== 'undefined') {
    // 1. Check URL query param (e.g. ?ip=10.233.196.66 or ?server=https://...)
    const searchParams = new URLSearchParams(window.location.search);
    const queryIp = searchParams.get('ip') || searchParams.get('server');
    if (queryIp) {
      const fullUrl = queryIp.includes(':') || queryIp.includes('.') ? queryIp : `${queryIp}:5000`;
      const normalized = normalizeServerUrl(fullUrl);
      saveServerUrl(normalized);
      return normalized;
    }

    // 2. Check localStorage
    const stored = localStorage.getItem(SERVER_URL_KEY);
    if (stored) return stored;

    const hostname = window.location.hostname;

    // 3. If running directly served by backend on port 5000
    if (window.location.port === '5000') {
      return window.location.origin;
    }

    // 4. If accessed via phone on mobile hotspot / Wi-Fi (e.g. http://10.233.196.66:5173)
    // The hostname IS the laptop's IP address! Auto-route backend to port 5000 (HTTP only if not Vercel)
    if (hostname && !hostname.includes('vercel.app')) {
      return `http://${hostname}:5000`;
    }
  }

  return '';
}

/**
 * Save server URL to localStorage
 */
export function saveServerUrl(url) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SERVER_URL_KEY, url);
  }
}

/**
 * Test connectivity and measure round-trip latency to the backend
 */
export async function testConnection(serverUrl) {
  const normalized = normalizeServerUrl(serverUrl);
  if (!normalized) {
    throw new Error('Please enter a server IP or URL.');
  }

  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${normalized}/api/health`, {
      method: 'GET',
      headers: {
        'Bypass-Tunnel-Reminder': 'true',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const latency = Math.round(performance.now() - startTime);

    return {
      success: true,
      latency,
      data,
      normalizedUrl: normalized,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    let msg = err.message;
    if (err.name === 'AbortError') {
      msg = 'Connection timed out (no response within 8s). Check that the server or tunnel is running.';
    } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      if (isHttps && normalized.startsWith('http://')) {
        msg = 'Mixed Content Error: Vercel is HTTPS and cannot connect to http://. Please use an HTTPS tunnel URL (e.g. Cloudflare Tunnel or LocalTunnel).';
      } else {
        msg = 'Failed to reach server. Make sure the server or HTTPS tunnel is running on your laptop.';
      }
    }
    throw new Error(msg);
  }
}

/**
 * Fetch video library
 */
export async function fetchLibrary(serverUrl, refresh = false) {
  const normalized = normalizeServerUrl(serverUrl);
  const url = `${normalized}/api/videos${refresh ? '?refresh=true' : ''}`;
  const res = await fetch(url, {
    headers: {
      'Bypass-Tunnel-Reminder': 'true',
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to load videos (HTTP ${res.status})`);
  }
  return await res.json();
}

/**
 * Build stream URL for a given relative path
 */
export function getStreamUrl(serverUrl, relativePath) {
  const normalized = normalizeServerUrl(serverUrl);
  return `${normalized}/api/stream?path=${encodeURIComponent(relativePath)}`;
}

/**
 * Progress Tracking in localStorage
 */
export function getSavedProgress() {
  try {
    const data = localStorage.getItem(PROGRESS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}

export function saveVideoProgress(videoId, currentTime, duration, videoData) {
  try {
    const store = getSavedProgress();
    // Only save if duration is meaningful and not finished (e.g. within 98%)
    const percent = duration > 0 ? (currentTime / duration) * 100 : 0;
    if (percent > 98) {
      // Completed, remove from continue watching
      delete store[videoId];
    } else if (currentTime > 5) {
      store[videoId] = {
        currentTime,
        duration,
        percent: Math.round(percent),
        updatedAt: Date.now(),
        video: videoData,
      };
    }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed to save progress', e);
  }
}
