import React from 'react';
import { Play, Clock, Sparkles } from 'lucide-react';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function ContinueWatching({ progressMap, onSelectVideo }) {
  const items = Object.entries(progressMap)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 4);

  if (items.length === 0) return null;

  return (
    <div className="continue-section">
      <div className="section-header">
        <h3 className="section-title">
          <Sparkles size={18} style={{ color: '#f59e0b' }} />
          Continue Learning
        </h3>
      </div>

      <div className="continue-grid">
        {items.map((item) => {
          const video = item.video;
          if (!video) return null;

          return (
            <div
              key={item.id}
              className="continue-card glass"
              onClick={() => onSelectVideo(video, item.currentTime)}
            >
              <div className="continue-thumb">
                <Play size={22} style={{ color: '#fff', opacity: 0.9 }} fill="currentColor" />
                <div
                  className="continue-progress-bar"
                  style={{ width: `${Math.min(100, item.percent || 0)}%` }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={video.title}
                >
                  {video.title}
                </span>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.725rem',
                    color: 'var(--text-dim)',
                  }}
                >
                  <span style={{ color: '#a5b4fc', fontWeight: 500 }}>{video.category}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Clock size={11} /> {formatTime(item.currentTime)} / {formatTime(item.duration)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
