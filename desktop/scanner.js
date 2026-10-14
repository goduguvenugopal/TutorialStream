import fs from 'fs';
import path from 'path';

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.webm', '.avi', '.mov', '.m4v']);

export function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Clean up filename for a friendlier display title
 */
function cleanTitle(filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  // Replace underscores or multiple hyphens with spaces
  return base.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Recursively scans directory for video files
 */
export async function scanTutorials(baseDir) {
  if (!fs.existsSync(baseDir)) {
    console.warn(`Tutorials directory not found: ${baseDir}`);
    return { categories: [], videos: [], totalSize: 0, totalCount: 0 };
  }

  const videos = [];
  const categorySet = new Set();
  let totalBytes = 0;

  function walk(currentDir, currentRelPath = '', topCategory = '') {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      console.error(`Error reading directory ${currentDir}:`, err.message);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = currentRelPath ? `${currentRelPath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        const category = topCategory || entry.name;
        if (!topCategory) {
          categorySet.add(entry.name);
        }
        walk(fullPath, relPath, category);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VIDEO_EXTENSIONS.has(ext)) {
          let stats;
          try {
            stats = fs.statSync(fullPath);
          } catch (e) {
            stats = { size: 0, mtime: new Date() };
          }

          totalBytes += stats.size;
          const assignedCategory = topCategory || 'Uncategorized';
          categorySet.add(assignedCategory);

          // Get subfolder path if any
          const parsedRel = path.parse(relPath);
          const subfolder = parsedRel.dir.replace(topCategory, '').replace(/^\/|\\/, '') || null;

          videos.push({
            id: Buffer.from(relPath).toString('base64url'),
            title: cleanTitle(entry.name),
            filename: entry.name,
            category: assignedCategory,
            subfolder: subfolder,
            relativePath: relPath.replace(/\\/g, '/'),
            extension: ext,
            size: stats.size,
            sizeFormatted: formatBytes(stats.size),
            modifiedAt: stats.mtime.toISOString(),
          });
        }
      }
    }
  }

  walk(baseDir);

  // Sort videos naturally: by category, then subfolder, then filename
  videos.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if ((a.subfolder || '') !== (b.subfolder || '')) {
      return (a.subfolder || '').localeCompare(b.subfolder || '');
    }
    return a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' });
  });

  const categories = Array.from(categorySet).sort();

  return {
    categories,
    videos,
    totalCount: videos.length,
    totalSize: formatBytes(totalBytes),
    totalSizeBytes: totalBytes,
    scannedAt: new Date().toISOString()
  };
}
