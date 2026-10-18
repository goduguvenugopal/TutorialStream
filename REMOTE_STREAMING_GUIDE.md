# Remote Video Streaming & Vercel Setup Guide

This guide explains how to stream tutorial videos from your laptop to any mobile phone or device from **anywhere in the world** using your **Vercel-hosted frontend**.

---

## 1. Why Direct IP (`http://192.168.x.x`) Fails on Vercel

When your frontend is deployed on Vercel, two browser and network security barriers block direct connection to a laptop:

```
[Phone Browser on Vercel] (HTTPS)
         │
         ├──❌ BLOCKED by Mixed Content Policy (HTTPS -> HTTP is forbidden)
         └──❌ BLOCKED by Local Network Isolation (Local IP doesn't exist on 4G/5G)
         │
         ▼
[Laptop Local Server] (http://10.x.x.x:5000)
```

1. **Browser Mixed Content Security Policy**:
   - Vercel operates strictly over `https://`.
   - Modern browsers (Chrome, Safari, Firefox) **block** any JavaScript `fetch()` or video `<video src="...">` calls made from an `https://` page to an unencrypted `http://` address.
   - The browser console rejects it with:  
     `Mixed Content: The page at 'https://your-app.vercel.app' was loaded over HTTPS, but requested an insecure resource 'http://10.141.78.66:5000'. This request has been blocked.`

2. **Local Network (LAN / NAT) Limitation**:
   - IP addresses like `192.168.x.x` or `10.x.x.x` are **private local network IPs**.
   - They only exist inside your home Wi-Fi router.
   - If your phone is on **cellular data (4G/5G)**, office Wi-Fi, or anywhere outside your house, it cannot route to your laptop's private IP.

---

## 2. The Solution: Secure HTTPS Tunnel Architecture

We solve both issues by placing a **secure, encrypted public HTTPS tunnel** in front of your laptop's local server (port 5000):

```
┌─────────────────────────────────┐
│     Mobile Phone / Remote PC    │
│  Opens https://yourapp.vercel.app│
└────────────────┬────────────────┘
                 │
                 │ 1. Requests API & Video Stream via HTTPS
                 ▼
┌─────────────────────────────────┐
│      Cloudflare / LocalTunnel   │
│     Secure Encrypted Gateway    │
│ (https://*.trycloudflare.com)   │
└────────────────┬────────────────┘
                 │
                 │ 2. Tunnels traffic through encrypted WebSocket/HTTP2
                 ▼
┌─────────────────────────────────┐
│       Laptop Desktop Server     │
│       Runs at localhost:5000    │
│   Streams videos from E:\ Drive │
└─────────────────────────────────┘
```

### Why this works:
- **Zero Mixed Content**: Both your Vercel frontend and backend communicate over valid SSL (`https://`).
- **Global Remote Access**: Your laptop becomes a private personal streaming cloud. You can stream videos on your phone while traveling, at work, or on mobile data, as long as your laptop is on and connected to the internet.
- **No Router Port-Forwarding**: Tunnels establish an outbound connection, bypassing home router firewalls, NAT, and CGNAT automatically.

---

## 3. What Was Changed & How It Works

### A. Desktop Server (`desktop/main.js`)
1. **Built-in Tunnel Manager**:
   - Integrated `localtunnel` directly into Electron.
   - Added `startTunnel()` and `stopTunnel()` functions that dynamically open and close an encrypted HTTPS tunnel to port 5000.
2. **System Tray Integration**:
   - Added **"🚀 Start Remote HTTPS Tunnel (for Vercel)"** to the Windows tray menu.
   - When clicked, it acquires a secure URL (e.g. `https://xxxx.loca.lt`), **copies it to your clipboard automatically**, and displays a Windows desktop notification.
   - Added **"📋 Copy HTTPS URL"** and **"⏹️ Stop Remote Tunnel"** toggles.
3. **CORS Headers**:
   - Added `Bypass-Tunnel-Reminder` to `allowedHeaders` in Express CORS configuration to allow seamless API calls through tunnel gateways.
4. **Drive Path Support**:
   - Configured `TUTORIALS_PATH` to default to `E:\` so all folders and videos across the drive are indexed.

### B. Frontend (`frontend/src/utils/api.js` & `ConnectionModal.jsx`)
1. **Smart URL Normalization (`normalizeServerUrl`)**:
   - Automatically detects tunnel domains (`trycloudflare.com`, `loca.lt`, `ngrok`, etc.) and ensures they default to `https://`.
   - Prevents accidental `http://` downgrades when running inside an HTTPS context (like Vercel).
2. **Gateway Interstitial Bypass**:
   - Added the header `'Bypass-Tunnel-Reminder': 'true'` to `testConnection()` and `fetchLibrary()`.
   - Prevents tunnel providers from returning HTML warning pages instead of JSON data.
3. **Adaptive Connection Modal**:
   - Detects whether the app is running on HTTPS (Vercel) or HTTP (local).
   - If on Vercel, it updates the input label, description, and placeholder specifically for HTTPS tunnel URLs and displays helpful guidance.

### C. Backend Standalone (`backend/server.js` & `.env`)
- Added `Bypass-Tunnel-Reminder` to CORS `allowedHeaders`.
- Updated `TUTORIALS_PATH=E:\` to scan all folders across the E: drive.

### D. Windows Firewall Auto-Config (`desktop/firewall.js` & `desktop/build/installer.nsh`)
- Created `firewall.js` to automatically verify Windows Firewall rules on startup.
- Created `installer.nsh` so that when the desktop app is installed via the NSIS installer, the firewall rule allowing inbound TCP on port 5000 is automatically registered with elevated administrator privileges.

### E. 1-Click Launchers
- Added `start-remote-tunnel.bat` in the project root for 1-click Cloudflare Tunnel generation.
- Added `npm run tunnel` and `npm run tunnel:lt` to root `package.json`.

---

## 4. How to Use (Step-by-Step)

### Method 1: Using the Desktop App Tray (Recommended for Desktop App)

1. Start the desktop app (`npm run desktop` or run the installed executable).
2. Right-click the **TutorialStream** icon in the Windows System Tray (near the clock).
3. Click **"🚀 Start Remote HTTPS Tunnel (for Vercel)"**.
4. You will see a notification: **"Remote HTTPS Ready! Copied to clipboard"**.
5. On your phone, open your Vercel URL (e.g. `https://your-tutorial-streamer.vercel.app`).
6. Tap the **Server / Connect** button, paste the copied `https://...` URL into the input, and tap **Connect**.
7. All your videos from your laptop will load and stream smoothly!

---

### Method 2: Using 1-Click Cloudflare Tunnel (Fastest Video Streaming)

Cloudflare Quick Tunnels provide zero reminder pages, unlimited bandwidth, and optimal video chunk streaming (HTTP 206 Partial Content):

1. Double-click **`start-remote-tunnel.bat`** in the project root (or run `npm run tunnel` in your terminal).
2. In the console output, find your tunnel URL:
   ```text
   +--------------------------------------------------------------------------------------------+
   |  Your quick Tunnel has been created! Visit it at:                                          |
   |  https://random-words-here.trycloudflare.com                                               |
   +--------------------------------------------------------------------------------------------+
   ```
3. Copy that `https://....trycloudflare.com` URL.
4. On your mobile phone, open your Vercel website.
5. Paste the URL into the server connection input and tap **Connect**.

> **Tip:** You can also pass the URL directly via query parameter in your phone browser:  
> `https://your-app.vercel.app?server=https://your-tunnel-url.trycloudflare.com`

---

## 5. Summary of Useful Commands

| Command | Description |
|---|---|
| `npm run dev` | Runs backend (port 5000) and frontend Vite server concurrently |
| `npm run desktop` | Starts Electron Desktop system tray server |
| `npm run tunnel` | Launches Cloudflare HTTPS tunnel for port 5000 |
| `npm run tunnel:lt` | Launches LocalTunnel HTTPS tunnel for port 5000 |
| `double-click start-remote-tunnel.bat` | One-click launcher for Cloudflare HTTPS tunnel |
| `npm --prefix frontend run build` | Builds production bundle for Vercel deployment |

---

## 6. Tips for Seamless Remote Streaming

1. **Laptop Sleep Settings**:
   - Ensure your laptop doesn't go to sleep when idle. In Windows Settings -> *Power & battery* -> set *Screen and sleep* to **"Never"** (or while plugged in).
2. **Closing the Laptop Lid**:
   - In Windows Control Panel -> *Power Options* -> *Choose what closing the lid does* -> set to **"Do nothing"** so you can keep the laptop closed while streaming.
3. **Rescanning New Videos**:
   - Whenever you add new folders or video files to your drive, right-click the tray icon and click **"🔄 Rescan Videos Folder"**, or tap the refresh icon in the web player.
