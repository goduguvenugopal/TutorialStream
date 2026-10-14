import { app, Tray, Menu, nativeImage, shell, clipboard, Notification } from 'electron';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { scanTutorials } from './scanner.js';
import { getLocalIpAddresses } from './getLocalIp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Port and tutorials path
const PORT = process.env.PORT || 5000;
const TUTORIALS_PATH = process.env.TUTORIALS_PATH || 'E:\\Tutorials';

let tray = null;
let serverInstance = null;
let cachedLibrary = null;

// MIME types lookup
const MIME_TYPES = {
  '.mp4': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
};

// Start the Express streaming server
function startServer() {
  const serverApp = express();

  serverApp.use(
    cors({
      origin: '*',
      methods: ['GET', 'HEAD', 'OPTIONS'],
      allowedHeaders: ['Range', 'Content-Type', 'Authorization', 'Origin', 'Accept'],
      exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type'],
    })
  );

  serverApp.use(express.json());

  serverApp.get('/api/health', (req, res) => {
    const localIps = getLocalIpAddresses();
    res.json({
      status: 'ok',
      message: 'TutorialStream Desktop Server is running',
      serverTime: new Date().toISOString(),
      tutorialsPath: TUTORIALS_PATH,
      localIps,
    });
  });

  serverApp.get('/api/videos', async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === 'true';
      if (!cachedLibrary || forceRefresh) {
        cachedLibrary = await scanTutorials(TUTORIALS_PATH);
      }
      res.json(cachedLibrary);
    } catch (err) {
      res.status(500).json({ error: 'Failed to scan tutorials', details: err.message });
    }
  });

  serverApp.all('/api/stream', (req, res) => {
    const requestedPath = req.query.path;
    if (!requestedPath) {
      return res.status(400).json({ error: 'Missing path query parameter' });
    }

    const safeRelPath = path.normalize(requestedPath).replace(/^(\.\.[\/\\])+/, '');
    const absoluteVideoPath = path.resolve(TUTORIALS_PATH, safeRelPath);

    if (!absoluteVideoPath.toLowerCase().startsWith(path.resolve(TUTORIALS_PATH).toLowerCase())) {
      return res.status(403).json({ error: 'Access denied: Invalid file path' });
    }

    if (!fs.existsSync(absoluteVideoPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    let stats;
    try {
      stats = fs.statSync(absoluteVideoPath);
    } catch (e) {
      return res.status(500).json({ error: 'Error reading video stats' });
    }

    const fileSize = stats.size;
    const ext = path.extname(absoluteVideoPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'video/mp4';

    if (req.method === 'HEAD') {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      });
      return res.end();
    }

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start) || start >= fileSize || (parts[1] && end >= fileSize) || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
        return res.end();
      }

      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(absoluteVideoPath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });

      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(absoluteVideoPath).pipe(res);
    }
  });

  // Serve static frontend build
  const frontendDistPath = path.join(__dirname, 'dist-client');
  if (fs.existsSync(frontendDistPath)) {
    serverApp.use(express.static(frontendDistPath));
    serverApp.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(frontendDistPath, 'index.html'));
      }
    });
  }

  serverInstance = serverApp.listen(PORT, '0.0.0.0', () => {
    console.log(`TutorialStream desktop server listening on port ${PORT}`);
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    // Start local Express server
    startServer();

    // Detect primary local IP
    const localIps = getLocalIpAddresses();
    const primaryIp = localIps.length > 0 ? localIps[0].address : 'localhost';
    const mobileUrl = `http://${primaryIp}:${PORT}`;

    // Setup Tray Icon
    const iconPath = path.join(__dirname, 'assets/icon.ico');
    let trayIcon;
    try {
      trayIcon = nativeImage.createFromPath(iconPath);
    } catch (e) {
      trayIcon = nativeImage.createEmpty();
    }

    tray = new Tray(trayIcon);
    tray.setToolTip(`TutorialStream Server: Online\n${mobileUrl}`);

    const updateContextMenu = () => {
      const isStartOnBoot = app.getLoginItemSettings().openAtLogin;

      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'TutorialStream Server',
          enabled: false,
        },
        {
          label: `🟢 Status: Online (Port ${PORT})`,
          enabled: false,
        },
        { type: 'separator' },
        {
          label: `📱 Mobile URL: ${mobileUrl}`,
          click: () => {
            clipboard.writeText(mobileUrl);
            if (Notification.isSupported()) {
              new Notification({
                title: 'URL Copied!',
                body: `Copied ${mobileUrl} to clipboard.`,
              }).show();
            }
          },
        },
        {
          label: '📋 Copy Mobile URL',
          click: () => {
            clipboard.writeText(mobileUrl);
            if (Notification.isSupported()) {
              new Notification({
                title: 'URL Copied!',
                body: `Paste this in your phone: ${mobileUrl}`,
              }).show();
            }
          },
        },
        {
          label: '🌐 Open Web Player (Laptop)',
          click: () => {
            shell.openExternal(`http://localhost:${PORT}`);
          },
        },
        { type: 'separator' },
        {
          label: '🚀 Start with Windows (Auto-Boot)',
          type: 'checkbox',
          checked: isStartOnBoot,
          click: (menuItem) => {
            app.setLoginItemSettings({
              openAtLogin: menuItem.checked,
              path: process.execPath,
            });
            updateContextMenu();
          },
        },
        {
          label: '🔄 Rescan Videos Folder',
          click: async () => {
            cachedLibrary = await scanTutorials(TUTORIALS_PATH);
            if (Notification.isSupported()) {
              new Notification({
                title: 'Library Updated',
                body: `Found ${cachedLibrary.totalCount} videos (${cachedLibrary.totalSize}) in E:\\Tutorials`,
              }).show();
            }
          },
        },
        { type: 'separator' },
        {
          label: '❌ Exit TutorialStream',
          click: () => {
            if (serverInstance) {
              serverInstance.close();
            }
            app.quit();
          },
        },
      ]);

      tray.setContextMenu(contextMenu);
    };

    updateContextMenu();

    // Show initial notification
    if (Notification.isSupported()) {
      new Notification({
        title: 'TutorialStream Started!',
        body: `Running in the background. Mobile URL: ${mobileUrl}`,
      }).show();
    }

    // Double click tray icon opens the web player
    tray.on('double-click', () => {
      shell.openExternal(`http://localhost:${PORT}`);
    });
  });
}

// Keep running in background when all windows closed
app.on('window-all-closed', (e) => {
  e.preventDefault();
});
