// ponytail: native <video> & <dialog> with IntersectionObserver; no WebGL runtime contexts or external router/modal libraries.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import artworksData from '../data/artworks.json';
import './artwork.css';

export default function Artwork() {
  const [filter, setFilter] = useState('all');
  const [isGloballyPaused, setIsGloballyPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [activeModalItem, setActiveModalItem] = useState(null);
  const [errorIds, setErrorIds] = useState(() => new Set());
  const [visibleIds, setVisibleIds] = useState(() => new Set());

  const triggerRef = useRef(null);
  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);
  const cardRefs = useRef(new Map());
  const videoRefs = useRef(new Map());

  // Check system prefers-reduced-motion preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setIsGloballyPaused(true);
    }
    const handleChange = (e) => {
      if (e.matches) setIsGloballyPaused(true);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Filter artworks
  const filteredArtworks = useMemo(() => {
    if (filter === 'all') return artworksData;
    return artworksData.filter((item) => item.character === filter);
  }, [filter]);

  // Setup IntersectionObserver for lazy activation and visibility-aware playback
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setVisibleIds(new Set(artworksData.map((a) => a.id)));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.dataset.id;
          if (entry.isIntersecting) {
            setVisibleIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
            const video = videoRefs.current.get(id);
            if (video && !isGloballyPaused) {
              video.play().catch(() => {});
            }
          } else {
            setVisibleIds((prev) => {
              if (!prev.has(id)) return prev;
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }
        }
      },
      { rootMargin: '100px 0px', threshold: 0.1 }
    );

    cardRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [filteredArtworks, isGloballyPaused]);

  // Sync global pause state across active videos
  useEffect(() => {
    videoRefs.current.forEach((video) => {
      if (!video) return;
      if (isGloballyPaused) {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
    });
  }, [isGloballyPaused]);

  // Dialog open/close lifecycle
  useEffect(() => {
    const dialog = dialogRef.current;
    if (activeModalItem && dialog) {
      if (!dialog.open) {
        dialog.showModal();
      }
      closeBtnRef.current?.focus();
    }
  }, [activeModalItem]);

  const handleOpenModal = (item, element) => {
    triggerRef.current = element;
    setActiveModalItem(item);
  };

  const handleCloseModal = () => {
    const dialog = dialogRef.current;
    if (dialog && dialog.open) {
      dialog.close();
    }
    setActiveModalItem(null);
    triggerRef.current?.focus();
  };

  const handleStepModal = (direction) => {
    if (!activeModalItem) return;
    const currentIndex = filteredArtworks.findIndex((it) => it.id === activeModalItem.id);
    if (currentIndex === -1) return;
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = filteredArtworks.length - 1;
    if (nextIndex >= filteredArtworks.length) nextIndex = 0;
    setActiveModalItem(filteredArtworks[nextIndex]);
  };

  const handleVideoError = (id) => {
    setErrorIds((prev) => new Set(prev).add(id));
  };

  const handleRetryVideo = (id) => {
    setErrorIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    const video = videoRefs.current.get(id);
    if (video) {
      video.load();
      if (!isGloballyPaused) video.play().catch(() => {});
    }
  };

  return (
    <section className="artwork-section" id="artwork">
      <div className="container">
        {/* Section Header */}
        <div className="artwork-header">
          <h1 className="section-title">
            Character <span className="gradient-text">Artworks</span>
          </h1>
          <p className="section-description">
            Original Spine character animations and game motion assets rendered directly from source timelines.
          </p>
        </div>

        {/* Toolbar: Filters & Accessibility Toggle */}
        <div className="artwork-toolbar" role="toolbar" aria-label="Artwork controls">
          <div className="artwork-filters" role="group" aria-label="Filter animations by character">
            <button
              type="button"
              className={`artwork-filter-btn ${filter === 'all' ? 'active' : ''}`}
              data-filter="all"
              aria-pressed={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              All (28)
            </button>
            <button
              type="button"
              className={`artwork-filter-btn ${filter === 'char1' ? 'active' : ''}`}
              data-filter="char1"
              aria-pressed={filter === 'char1'}
              onClick={() => setFilter('char1')}
            >
              Character 01 (10)
            </button>
            <button
              type="button"
              className={`artwork-filter-btn ${filter === 'char2' ? 'active' : ''}`}
              data-filter="char2"
              aria-pressed={filter === 'char2'}
              onClick={() => setFilter('char2')}
            >
              Character 02 (17)
            </button>
            <button
              type="button"
              className={`artwork-filter-btn ${filter === 'char3' ? 'active' : ''}`}
              data-filter="char3"
              aria-pressed={filter === 'char3'}
              onClick={() => setFilter('char3')}
            >
              Character 03 (1)
            </button>
          </div>

          <button
            type="button"
            className="artwork-motion-toggle"
            aria-pressed={isGloballyPaused}
            aria-label={isGloballyPaused ? 'Play all preview animations' : 'Pause all preview animations'}
            onClick={() => setIsGloballyPaused((prev) => !prev)}
          >
            <i className={`fas ${isGloballyPaused ? 'fa-play' : 'fa-pause'}`} aria-hidden="true" />
            <span>{isGloballyPaused ? 'Play Previews' : 'Pause Previews'}</span>
          </button>
        </div>

        {/* Artwork Grid */}
        <div className="artwork-grid" aria-live="polite">
          {filteredArtworks.map((item) => {
            const hasError = errorIds.has(item.id);
            const isVisible = visibleIds.has(item.id);

            return (
              <article
                key={item.id}
                className="artwork-card"
                id={`card-${item.id}`}
                data-id={item.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(item.id, el);
                  else cardRefs.current.delete(item.id);
                }}
              >
                <div className="artwork-thumbnail-box">
                  {hasError ? (
                    <div className="artwork-error-state" role="alert">
                      <p>Preview failed to load</p>
                      <div className="artwork-error-actions">
                        <button
                          type="button"
                          className="artwork-btn-retry"
                          onClick={() => handleRetryVideo(item.id)}
                        >
                          Retry
                        </button>
                        <button
                          type="button"
                          className="artwork-btn-retry"
                          onClick={(e) => handleOpenModal(item, e.currentTarget)}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {isVisible ? (
                        <video
                          ref={(el) => {
                            if (el) videoRefs.current.set(item.id, el);
                            else videoRefs.current.delete(item.id);
                          }}
                          muted
                          autoPlay={!isGloballyPaused}
                          loop
                          playsInline
                          preload="metadata"
                          poster={item.poster}
                          className="artwork-video"
                          onError={() => handleVideoError(item.id)}
                        >
                          {item.webm && <source src={item.webm} type="video/webm" />}
                          <source src={item.src} type="video/mp4" />
                        </video>
                      ) : (
                        <img
                          src={item.poster}
                          alt={item.title}
                          className="artwork-video"
                          loading="lazy"
                        />
                      )}
                      <div className="artwork-card-overlay">
                        <button
                          type="button"
                          className="artwork-open-btn"
                          aria-label={`Enlarge animation ${item.title}`}
                          onClick={(e) => handleOpenModal(item, e.currentTarget)}
                        >
                          <i className="fas fa-expand" aria-hidden="true" />
                          <span>Enlarge</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div className="artwork-card-info">
                  <div className="artwork-card-title-row">
                    <h3 className="artwork-card-title">{item.title}</h3>
                    <span className="artwork-card-duration">
                      {Math.round(item.duration * 10) / 10}s
                    </span>
                  </div>

                  <div className="artwork-card-badges">
                    <span className="artwork-badge artwork-badge-anim">{item.animation}</span>
                    <span className="artwork-badge">{item.characterName}</span>
                  </div>

                  <span className="artwork-card-source" title={`Source: ${item.source}`}>
                    Rig: {item.source}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Native <dialog> Modal for Enlarged Playback */}
      <dialog
        ref={dialogRef}
        className="modal-overlay artwork-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="artwork-dialog-title"
        aria-describedby="artwork-dialog-desc"
        onCancel={(e) => {
          e.preventDefault();
          handleCloseModal();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleCloseModal();
        }}
      >
        {activeModalItem && (
          <div className="artwork-dialog-content">
            <div className="artwork-dialog-header">
              <h3 id="artwork-dialog-title" className="artwork-dialog-title">
                {activeModalItem.title}
              </h3>
              <button
                type="button"
                className="artwork-dialog-close"
                ref={closeBtnRef}
                onClick={handleCloseModal}
                aria-label="Close dialog"
              >
                <i className="fas fa-times" aria-hidden="true" />
              </button>
            </div>

            <div className="artwork-dialog-body">
              <div className="artwork-dialog-video-box">
                <video
                  key={activeModalItem.id}
                  controls
                  autoPlay
                  loop
                  playsInline
                  poster={activeModalItem.poster}
                  className="artwork-dialog-video"
                >
                  {activeModalItem.webm && (
                    <source src={activeModalItem.webm} type="video/webm" />
                  )}
                  <source src={activeModalItem.src} type="video/mp4" />
                </video>
              </div>

              <div id="artwork-dialog-desc" className="artwork-dialog-meta">
                <div className="artwork-meta-item">
                  <span className="artwork-meta-label">Character</span>
                  <span className="artwork-meta-value">{activeModalItem.characterName}</span>
                </div>
                <div className="artwork-meta-item">
                  <span className="artwork-meta-label">Animation</span>
                  <span className="artwork-meta-value">{activeModalItem.animation}</span>
                </div>
                <div className="artwork-meta-item">
                  <span className="artwork-meta-label">Source Rig</span>
                  <span className="artwork-meta-value">{activeModalItem.source}</span>
                </div>
                <div className="artwork-meta-item">
                  <span className="artwork-meta-label">Resolution / Duration</span>
                  <span className="artwork-meta-value">
                    {activeModalItem.width}×{activeModalItem.height} ({Math.round(activeModalItem.duration * 10) / 10}s)
                  </span>
                </div>
              </div>
            </div>

            <div className="artwork-dialog-footer">
              <div className="artwork-dialog-nav-btns">
                <button
                  type="button"
                  className="artwork-btn artwork-btn-outline"
                  onClick={() => handleStepModal(-1)}
                  aria-label="Previous animation"
                >
                  <i className="fas fa-chevron-left" aria-hidden="true" /> Prev
                </button>
                <button
                  type="button"
                  className="artwork-btn artwork-btn-outline"
                  onClick={() => handleStepModal(1)}
                  aria-label="Next animation"
                >
                  Next <i className="fas fa-chevron-right" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                className="artwork-btn artwork-btn-outline"
                onClick={handleCloseModal}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
