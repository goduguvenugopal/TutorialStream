import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { scanTutorials } from './scanner.js';
import { getLocalIpAddresses } from './getLocalIp.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const TUTORIALS_PATH = process.env.TUTORIALS_PATH || 'E:\\Tutorials';

// Cache scanned library
let cachedLibrary = null;
let lastScanTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

// Enable CORS for all origins, allow streaming range headers
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Range', 'Content-Type', 'Authorization', 'Origin', 'Accept', 'Bypass-Tunnel-Reminder'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type'],
  })
);

app.use(express.json());

// MIME types lookup
const MIME_TYPES = {
  '.mp4': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
};

/**
 * Health check endpoint: used by frontend to verify IP & measure ping
 */
app.get('/api/health', (req, res) => {
  const localIps = getLocalIpAddresses();
  res.json({
    status: 'ok',
    message: 'Tutorial Streamer Server is active',
    serverTime: new Date().toISOString(),
    tutorialsPath: TUTORIALS_PATH,
    localIps,
  });
});

/**
 * Get video library
 */
app.get('/api/videos', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const now = Date.now();

    if (!cachedLibrary || forceRefresh || now - lastScanTime > CACHE_TTL_MS) {
      cachedLibrary = await scanTutorials(TUTORIALS_PATH);
      lastScanTime = now;
    }

    res.json(cachedLibrary);
  } catch (error) {
    console.error('Failed to scan tutorials:', error);
    res.status(500).json({ error: 'Failed to scan tutorials directory', details: error.message });
  }
});

/**
 * Video streaming endpoint with HTTP 206 Partial Content
 */
app.all('/api/stream', (req, res) => {
  const requestedPath = req.query.path;

  if (!requestedPath) {
    return res.status(400).json({ error: 'Missing path query parameter' });
  }

  // Prevent path traversal attacks
  const safeRelPath = path.normalize(requestedPath).replace(/^(\.\.[\/\\])+/, '');
  const absoluteVideoPath = path.resolve(TUTORIALS_PATH, safeRelPath);

  // Ensure target file is strictly inside TUTORIALS_PATH
  if (!absoluteVideoPath.toLowerCase().startsWith(path.resolve(TUTORIALS_PATH).toLowerCase())) {
    return res.status(403).json({ error: 'Access denied: Invalid file path' });
  }

  if (!fs.existsSync(absoluteVideoPath)) {
    return res.status(404).json({ error: 'Video file not found' });
  }

  let stats;
  try {
    stats = fs.statSync(absoluteVideoPath);
  } catch (err) {
    return res.status(500).json({ error: 'Error reading video stats' });
  }

  const fileSize = stats.size;
  const ext = path.extname(absoluteVideoPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'video/mp4';

  // Handle HEAD requests (players check size and support for ranges)
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
    // Parse Range header e.g. "bytes=32324-" or "bytes=0-1048576"
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    // Validate range bounds
    if (isNaN(start) || start >= fileSize || (parts[1] && end >= fileSize) || start > end) {
      res.writeHead(416, {
        'Content-Range': `bytes */${fileSize}`,
      });
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

    fileStream.on('error', (streamErr) => {
      console.error('Stream error:', streamErr);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });
  } else {
    // No range provided; stream entire file
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });

    fs.createReadStream(absoluteVideoPath).pipe(res);
  }
});

// Serve static frontend build if dist folder exists
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    }
  });
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  const localIps = getLocalIpAddresses();

  console.log('\n======================================================');
  console.log('       TUTORIAL VIDEO STREAMER - BACKEND SERVER        ');
  console.log('======================================================');
  console.log(`Tutorials Directory: ${TUTORIALS_PATH}`);
  console.log(`Port:                ${PORT}\n`);
  console.log(`Laptop Localhost:    http://localhost:${PORT}`);

  if (localIps.length > 0) {
    console.log('\nMobile/Network IP Addresses (Use on your phone):');
    localIps.forEach((item) => {
      console.log(` -> http://${item.address}:${PORT}  (${item.interface})`);
    });
  } else {
    console.log('\nNo network adapters detected with an active IPv4 address.');
  }

  console.log('\nTip: Connect phone to laptop Wi-Fi or Mobile Hotspot.');
  console.log('======================================================\n');
});
