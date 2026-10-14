import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import ConnectionModal from './components/ConnectionModal';
import CategoryPills from './components/CategoryPills';
import ContinueWatching from './components/ContinueWatching';
import VideoGrid from './components/VideoGrid';
import VideoPlayer from './components/VideoPlayer';
import {
  getDefaultServerUrl,
  saveServerUrl,
  testConnection,
  fetchLibrary,
  getSavedProgress,
  normalizeServerUrl,
} from './utils/api';
import { Search, RefreshCw, HardDrive, Video, PlayCircle, AlertCircle } from 'lucide-react';

export default function App() {
  const [serverUrl, setServerUrl] = useState(getDefaultServerUrl());
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(null);
  const [serverData, setServerData] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [library, setLibrary] = useState({ categories: [], videos: [], totalCount: 0, totalSize: '0 Bytes' });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [activeVideo, setActiveVideo] = useState(null);
  const [initialSeek, setInitialSeek] = useState(0);
  const [progressMap, setProgressMap] = useState({});

  // Load progress map from localStorage
  useEffect(() => {
    setProgressMap(getSavedProgress());
  }, [activeVideo]);

  // Attempt initial connection on mount
  useEffect(() => {
    if (serverUrl) {
      handleConnect(serverUrl, false);
    } else {
      // Prompt user to enter laptop IP
      setIsModalOpen(true);
    }
  }, []);

  const handleConnect = async (urlToTest, openModalOnError = true) => {
    setIsTesting(true);
    setTestResult(null);
    setErrorMsg('');

    try {
      const result = await testConnection(urlToTest);
      setServerUrl(result.normalizedUrl);
      saveServerUrl(result.normalizedUrl);
      setIsConnected(true);
      setLatency(result.latency);
      setServerData(result.data);
      setTestResult({ success: true, latency: result.latency });

      // Automatically fetch library
      loadLibrary(result.normalizedUrl);

      // Auto close modal on success after brief pause
      setTimeout(() => {
        setIsModalOpen(false);
      }, 700);
    } catch (err) {
      setIsConnected(false);
      setLatency(null);
      setTestResult({ success: false, error: err.message });
      if (openModalOnError) {
        setIsModalOpen(true);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const loadLibrary = async (url = serverUrl, forceRefresh = false) => {
    if (!url) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchLibrary(url, forceRefresh);
      setLibrary(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Category video counts
  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const v of library.videos || []) {
      counts[v.category] = (counts[v.category] || 0) + 1;
    }
    return counts;
  }, [library.videos]);

  // Filtered videos based on category and search query
  const filteredVideos = useMemo(() => {
    let list = library.videos || [];

    if (selectedCategory !== 'ALL') {
      list = list.filter((v) => v.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter((v) => {
        return (
          v.title.toLowerCase().includes(query) ||
          v.filename.toLowerCase().includes(query) ||
          (v.subfolder && v.subfolder.toLowerCase().includes(query)) ||
          v.category.toLowerCase().includes(query)
        );
      });
    }

    return list;
  }, [library.videos, selectedCategory, searchQuery]);

  const handleOpenVideo = (video, seekTime = 0) => {
    setActiveVideo(video);
    setInitialSeek(seekTime);
  };

  return (
    <div className="app-container">
      <Navbar
        isConnected={isConnected}
        serverUrl={serverUrl}
        latency={latency}
        onOpenSettings={() => setIsModalOpen(true)}
      />

      <main className="main-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-title-row">
            <h1 className="hero-title">
              <PlayCircle size={32} style={{ color: 'var(--accent-primary)' }} />
              Tutorial Library
            </h1>

            <div className="hero-stats">
              <div className="stat-item">
                <Video size={16} />
                <span>
                  <strong className="stat-highlight">{library.totalCount}</strong> Videos
                </span>
              </div>
              <div className="stat-item">
                <HardDrive size={16} />
                <span>
                  <strong className="stat-highlight">{library.totalSize}</strong> Total
                </span>
              </div>
            </div>
          </div>

          {/* Search & Actions Bar */}
          <div className="controls-bar">
            <div className="search-input-wrap">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search lectures, lessons, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button
              className={`btn-refresh ${isLoading ? 'spinning' : ''}`}
              onClick={() => loadLibrary(serverUrl, true)}
              title="Rescan E:\Tutorials on laptop"
              disabled={isLoading || !isConnected}
            >
              <RefreshCw size={15} />
              <span>{isLoading ? 'Scanning...' : 'Rescan'}</span>
            </button>
          </div>

          {/* Category Chips */}
          <CategoryPills
            categories={library.categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            totalCount={library.totalCount}
            categoryCounts={categoryCounts}
          />
        </section>

        {/* Continue Watching Row */}
        <ContinueWatching
          progressMap={progressMap}
          onSelectVideo={(video, time) => handleOpenVideo(video, time)}
        />

        {/* Error Notification if backend unreachable */}
        {!isConnected && (
          <div
            className="conn-status-box error"
            style={{ marginBottom: '1.5rem', cursor: 'pointer' }}
            onClick={() => setIsModalOpen(true)}
          >
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>Not connected to laptop server.</strong> Click here to enter your laptop's IP address and start streaming.
            </div>
          </div>
        )}

        {/* Video Grid */}
        <VideoGrid
          videos={filteredVideos}
          activeVideoId={activeVideo?.id}
          onSelectVideo={(video) => handleOpenVideo(video, 0)}
        />
      </main>

      {/* Video Player Modal */}
      {activeVideo && (
        <VideoPlayer
          video={activeVideo}
          serverUrl={serverUrl}
          playlist={filteredVideos}
          initialSeek={initialSeek}
          onClose={() => setActiveVideo(null)}
          onSelectVideo={(next) => handleOpenVideo(next, 0)}
        />
      )}

      {/* Server Connection Modal */}
      <ConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUrl={serverUrl}
        onSaveAndConnect={(url) => handleConnect(url, true)}
        isTesting={isTesting}
        testResult={testResult}
        serverData={serverData}
      />
    </div>
  );
}
