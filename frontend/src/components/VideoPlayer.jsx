import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  Play,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Gauge,
  ListVideo,
} from 'lucide-react';
import { getStreamUrl, saveVideoProgress } from '../utils/api';

const PLAYBACK_SPEEDS = [0.75, 1.0, 1.25, 1.5, 2.0];

export default function VideoPlayer({
  video,
  serverUrl,
  playlist = [],
  initialSeek = 0,
  onClose,
  onSelectVideo,
}) {
  const videoRef = useRef(null);
  const activeItemRef = useRef(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [autoNext, setAutoNext] = useState(true);

  const streamUrl = video ? getStreamUrl(serverUrl, video.relativePath) : '';

  // Find index in playlist
  const currentIndex = playlist.findIndex((v) => v.id === video?.id);
  const prevVideo = currentIndex > 0 ? playlist[currentIndex - 1] : null;
  const nextVideo = currentIndex !== -1 && currentIndex < playlist.length - 1 ? playlist[currentIndex + 1] : null;

  // Auto-scroll active item in playlist
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [video?.id]);

  // Set initial seek position and speed when video changes
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    el.playbackRate = playbackRate;

    const handleLoadedMetadata = () => {
      if (initialSeek > 0 && initialSeek < el.duration) {
        el.currentTime = initialSeek;
      }
      el.play().catch(() => setIsPlaying(false));
    };

    el.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      el.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [video?.id, initialSeek]);

  // Periodic progress tracker
  useEffect(() => {
    const interval = setInterval(() => {
      const el = videoRef.current;
      if (el && !el.paused && el.duration > 0) {
        saveVideoProgress(video.id, el.currentTime, el.duration, video);
      }
    }, 4000);

    return () => {
      clearInterval(interval);
      const el = videoRef.current;
      if (el && el.duration > 0) {
        saveVideoProgress(video.id, el.currentTime, el.duration, video);
      }
    };
  }, [video]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') {
        seekBy(10);
      } else if (e.key === 'ArrowLeft') {
        seekBy(-10);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play();
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const seekBy = (sec) => {
    const el = videoRef.current;
    if (el) {
      el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + sec));
    }
  };

  const handleSpeedChange = (rate) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleEnded = () => {
    if (autoNext && nextVideo) {
      onSelectVideo(nextVideo);
    }
  };

  if (!video) return null;

  return (
    <div className="player-overlay">
      {/* Top Bar */}
      <div className="player-header">
        <div className="player-title-info">
          <span className="player-category">
            {video.category} {video.subfolder ? `• ${video.subfolder}` : ''}
          </span>
          <h2 className="player-main-title" title={video.title}>
            {video.title}
          </h2>
        </div>

        <button className="btn-close-player" onClick={onClose} title="Close Player">
          <X size={18} />
        </button>
      </div>

      <div className="player-layout">
        {/* Main Video Section */}
        <div className="player-screen-col">
          <div className="video-wrapper">
            <video
              ref={videoRef}
              key={streamUrl}
              src={streamUrl}
              className="video-element"
              controls
              playsInline
              autoPlay
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={handleEnded}
            />
          </div>

          {/* Quick Controls Bar */}
          <div className="player-controls-strip">
            {/* Speed Selector */}
            <div className="speed-selector">
              <span className="speed-label hide-mobile">Speed:</span>
              <div className="speed-pills-row">
                {PLAYBACK_SPEEDS.map((rate) => (
                  <button
                    key={rate}
                    className={`speed-btn ${playbackRate === rate ? 'active' : ''}`}
                    onClick={() => handleSpeedChange(rate)}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Jump Buttons & Next/Prev */}
            <div className="nav-video-btns">
              <button
                className="nav-video-btn"
                onClick={() => seekBy(-10)}
                title="Rewind 10s"
              >
                <RotateCcw size={13} />
                <span>10s</span>
              </button>
              <button
                className="nav-video-btn"
                onClick={() => seekBy(10)}
                title="Forward 10s"
              >
                <RotateCw size={13} />
                <span>10s</span>
              </button>

              <button
                className="nav-video-btn"
                disabled={!prevVideo}
                onClick={() => prevVideo && onSelectVideo(prevVideo)}
                title="Previous Lesson"
              >
                <SkipBack size={14} />
                <span className="hide-mobile">Prev</span>
              </button>

              <button
                className="nav-video-btn btn-next-highlight"
                disabled={!nextVideo}
                onClick={() => nextVideo && onSelectVideo(nextVideo)}
                title="Next Lesson"
              >
                <span>Next</span>
                <SkipForward size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Playlist Drawer */}
        <div className="player-playlist-col">
          <div className="playlist-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ListVideo size={16} /> Course Playlist
            </span>
            <span className="playlist-count">
              {currentIndex + 1} / {playlist.length}
            </span>
          </div>

          <div className="playlist-items">
            {playlist.map((item, idx) => {
              const isCurrent = item.id === video.id;
              return (
                <div
                  key={item.id}
                  ref={isCurrent ? activeItemRef : null}
                  className={`playlist-item ${isCurrent ? 'active' : ''}`}
                  onClick={() => onSelectVideo(item)}
                >
                  <span className="playlist-item-num">
                    {isCurrent ? <Play size={11} fill="currentColor" /> : `${idx + 1}`}
                  </span>
                  <span className="playlist-item-title" title={item.title}>
                    {item.title}
                  </span>
                  <span className="playlist-item-size hide-mobile">
                    {item.sizeFormatted}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
