import React from 'react';
import { Play, Folder, HardDrive, Video, Calendar } from 'lucide-react';

export default function VideoGrid({ videos = [], activeVideoId, onSelectVideo }) {
  if (videos.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <Video size={30} />
        </div>
        <h3 className="empty-title">No tutorial videos found</h3>
        <p className="empty-subtitle">
          Try clearing your search query or switching to a different category.
        </p>
      </div>
    );
  }

  return (
    <div className="videos-grid">
      {videos.map((vid, index) => {
        const isActive = activeVideoId === vid.id;

        return (
          <div
            key={vid.id || index}
            className={`video-card glass ${isActive ? 'active-playing' : ''}`}
            onClick={() => onSelectVideo(vid)}
          >
            <div className="video-thumb-wrap">
              <div className="thumb-bg-pattern" />

              <span className="thumb-tag">{vid.category}</span>
              {vid.sizeFormatted && (
                <span className="thumb-size-tag">{vid.sizeFormatted}</span>
              )}

              <div className="play-hover-btn">
                <Play size={24} fill="currentColor" style={{ marginLeft: '3px' }} />
              </div>
            </div>

            <div className="video-card-body">
              <h4 className="video-title" title={vid.title}>
                {vid.title}
              </h4>

              {vid.subfolder && (
                <div className="video-subfolder">
                  <Folder size={12} />
                  <span>{vid.subfolder}</span>
                </div>
              )}

              <div className="video-meta-row">
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <HardDrive size={11} /> {vid.extension.toUpperCase().replace('.', '')}
                </span>
                {vid.modifiedAt && (
                  <span>{new Date(vid.modifiedAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
