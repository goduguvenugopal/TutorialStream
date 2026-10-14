# 🎬 Tutorial Video Streamer

Stream your local tutorial videos stored on your laptop (`E:\Tutorials`) directly to your mobile phone or any other device over Wi-Fi or Mobile Hotspot!

---

## 🚀 Quick Start (Easiest Way)

### 1. Start the Server on your Laptop
Double-click `start-streamer.bat` or run:
```bash
npm start
```

Your terminal will print your Laptop's Wi-Fi / Hotspot IP address, for example:
```
Mobile/Network IP Addresses (Use on your phone):
 -> http://10.233.196.66:5000  (Wi-Fi)
```

### 2. Open on Your Mobile Phone
Make sure your phone and laptop are connected to the **same Wi-Fi** (or connect your laptop to your **phone's mobile hotspot**).

Then open your phone browser (Chrome/Safari) and go to:
```
http://<your-laptop-ip>:5000
```
*(Example: `http://10.233.196.66:5000`)*

That's it! All 66+ tutorials from `Node.js` and `React.js` will appear on your phone, ready to play.

---

## 🌐 Deploying Frontend to Vercel

If you want the web app hosted on Vercel:

1. Push this repository to GitHub.
2. In Vercel, create a new project and select the **`frontend`** directory as the Root Directory.
3. Framework Preset: **Vite**.
4. Click **Deploy**.

### 💡 Connecting Vercel (HTTPS) to your Laptop:
Because Vercel runs on `https://`, modern mobile browsers restrict fetching insecure `http://` local IP addresses (Mixed Content). You have two super easy options:

- **Option A (Direct - Recommended & Free)**: You don't even need Vercel! The Express backend already serves the built React web app directly. Just open `http://<laptop-ip>:5000` on your phone browser.
- **Option B (Tunnel for Vercel)**: Run a free HTTPS tunnel on your laptop:
  ```bash
  npx localtunnel --port 5000
  ```
  Copy the `https://...localtunnel.me` address and paste it into the Server IP modal in your Vercel website!

---

## ✨ Features

- **Smooth Video Streaming**: Uses HTTP 206 Partial Content (Range requests) so seeking, scrub forward/rewind, and instant playback work without lag.
- **Auto Network IP Detection**: Detects all active Wi-Fi and hotspot interfaces on your laptop automatically.
- **Playback Speeds**: 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x for fast tutorial learning.
- **Smart Progress Tracking**: Automatically saves your watch position in `localStorage` and provides a "Continue Learning" row to resume.
- **Course Playlist Sidebar**: Switch between lessons inside folders with one tap.
- **Auto-Play Next**: Automatically plays the next lesson when the current one finishes.
- **Fast Search & Filter**: Search by title, category, or subfolder.

---

## ⚙️ Configuration

If you ever change your tutorials folder location, edit `backend/.env`:
```env
PORT=5000
TUTORIALS_PATH=E:\Tutorials
```
