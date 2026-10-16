// ponytail: native <video> & <dialog> grouped by character with IntersectionObserver; no WebGL runtime contexts or external router/modal libraries.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import artworksData from '../data/artworks.json';
import './artwork.css';

export default function Artwork() {
  const [isGloballyPaused, setIsGloballyPaused] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  const [activeGroup, setActiveGroup] = useState(null);
  const [selectedAnimId, setSelectedAnimId] = useState('auto');
  const [dialogAutoIndex, setDialogAutoIndex] = useState(0);

  const [cardIndices, setCardIndices] = useState(() => ({
    char1: 0,
    char2: 0,
    char3: 0
  }));
  const [errorCharacters, setErrorCharacters] = useState(() => new Set());
  const [visibleCharacters, setVisibleCharacters] = useState(() => new Set());

  const triggerRef = useRef(null);
  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);
  const cardRefs = useRef(new Map());
  const cardVideoRefs = useRef(new Map());
  const dialogVideoRef = useRef(null);

  // Group artworks strictly by character (10, 17, 1 animations)
  const characterGroups = useMemo(() => {
    const map = new Map();
    for (const item of artworksData) {
      if (!map.has(item.character)) {
        map.set(item.character, {
          character: item.character,
          characterName: item.characterName,
          items: []
        });
      }
      map.get(item.character).items.push(item);
    }
    return Array.from(map.values());
  }, []);

  // System prefers-reduced-motion preference listener
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

  // IntersectionObserver for visibility-aware playback and lazy loading
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setVisibleCharacters(new Set(characterGroups.map((g) => g.character)));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const charId = entry.target.dataset.character;
          if (!charId) continue;
          if (entry.isIntersecting) {
            setVisibleCharacters((prev) => {
              if (prev.has(charId)) return prev;
              const next = new Set(prev);
              next.add(charId);
              return next;
            });
            const video = cardVideoRefs.current.get(charId);
            if (video && !isGloballyPaused) {
              video.play().catch(() => {});
            }
          } else {
            setVisibleCharacters((prev) => {
              if (!prev.has(charId)) return prev;
              const next = new Set(prev);
              next.delete(charId);
              return next;
            });
            const video = cardVideoRefs.current.get(charId);
            if (video) {
              video.pause();
            }
          }
        }
      },
      { rootMargin: '100px 0px', threshold: 0.1 }
    );

    cardRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [characterGroups, isGloballyPaused]);

  // Sync global pause state across active card videos; avoid restarting offscreen videos
  useEffect(() => {
    cardVideoRefs.current.forEach((video, charId) => {
      if (!video) return;
      if (isGloballyPaused) {
        video.pause();
      } else {
        if (visibleCharacters.has(charId)) {
          video.play().catch(() => {});
        }
      }
    });
  }, [isGloballyPaused, visibleCharacters]);

  // Advance card clip on ended modulo group length; single clip loops
  const handleCardClipEnded = (character, totalClips) => {
    if (totalClips <= 1) {
      const video = cardVideoRefs.current.get(character);
      if (video) {
        video.currentTime = 0;
        if (!isGloballyPaused && visibleCharacters.has(character)) {
          video.play().catch(() => {});
        }
      }
      return;
    }
    setCardIndices((prev) => ({
      ...prev,
      [character]: ((prev[character] || 0) + 1) % totalClips
    }));
  };

  // When a card advances clip, reload its video and resume if visible
  useEffect(() => {
    characterGroups.forEach((group) => {
      const video = cardVideoRefs.current.get(group.character);
      const item = group.items[cardIndices[group.character] || 0];
      if (video && ![item.webm, item.src].includes(new URL(video.currentSrc || '/', window.location.href).pathname)) {
        video.load();
        if (visibleCharacters.has(group.character) && !isGloballyPaused) {
          video.play().catch(() => {});
        }
      }
    });
  }, [cardIndices]);

  // Dialog open/close lifecycle
  useEffect(() => {
    const dialog = dialogRef.current;
    if (activeGroup && dialog) {
      if (!dialog.open) {
        dialog.showModal();
        closeBtnRef.current?.focus();
      }
    }
  }, [activeGroup]);

  const handleOpenModal = (group, element) => {
    triggerRef.current = element;
    setActiveGroup(group);
    setSelectedAnimId('auto');
    setDialogAutoIndex(cardIndices[group.character] || 0);
  };

  const handleCloseModal = () => {
    const dialog = dialogRef.current;
    if (dialog && dialog.open) {
      dialog.close();
    }
    setActiveGroup(null);
    setSelectedAnimId('auto');
    triggerRef.current?.focus();
  };

  const handleVideoError = (charId) => {
    setErrorCharacters((prev) => new Set(prev).add(charId));
  };

  const handleRetryVideo = (charId) => {
    setErrorCharacters((prev) => {
      const next = new Set(prev);
      next.delete(charId);
      return next;
    });
    const video = cardVideoRefs.current.get(charId);
    if (video) {
      video.load();
      if (!isGloballyPaused && visibleCharacters.has(charId)) {
        video.play().catch(() => {});
      }
    }
  };

  // Dialog active clip resolution
  const currentDialogAnim = useMemo(() => {
    if (!activeGroup) return null;
    if (selectedAnimId !== 'auto') {
      return activeGroup.items.find((item) => item.id === selectedAnimId) || activeGroup.items[0];
    }
    return activeGroup.items[dialogAutoIndex] || activeGroup.items[0];
  }, [activeGroup, selectedAnimId, dialogAutoIndex]);

  // When dialog clip changes, load and play the video (stable focus: does NOT refocus close button)
  useEffect(() => {
    if (dialogVideoRef.current && currentDialogAnim) {
      dialogVideoRef.current.load();
      dialogVideoRef.current.play().catch(() => {});
    }
  }, [currentDialogAnim?.id]);

  const handleDialogVideoEnded = () => {
    if (!activeGroup) return;
    if (selectedAnimId !== 'auto') {
      // Explicitly selected animation loops
      if (dialogVideoRef.current) {
        dialogVideoRef.current.currentTime = 0;
        dialogVideoRef.current.play().catch(() => {});
      }
      return;
    }
    // Auto mode: advance modulo group length; single clip loops
    if (activeGroup.items.length <= 1) {
      if (dialogVideoRef.current) {
        dialogVideoRef.current.currentTime = 0;
        dialogVideoRef.current.play().catch(() => {});
      }
      return;
    }
    setDialogAutoIndex((prev) => (prev + 1) % activeGroup.items.length);
  };

  const handleSelectAnimation = (e) => {
    const val = e.target.value;
    setSelectedAnimId(val);
    if (val === 'auto') {
      setDialogAutoIndex(0);
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

        {/* Toolbar: Global Play/Pause Previews Toggle */}
        <div className="artwork-toolbar" role="toolbar" aria-label="Artwork controls">
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

        {/* Artwork Grid: Exactly 3 Character Cards */}
        <div className="artwork-grid" aria-live="polite">
          {characterGroups.map((group) => {
            const hasError = errorCharacters.has(group.character);
            const isVisible = visibleCharacters.has(group.character);
            const currentItem = group.items[cardIndices[group.character] || 0] || group.items[0];

            return (
              <article
                key={group.character}
                className="artwork-card"
                id={`card-${group.character}`}
                data-character={group.character}
                data-id={group.character}
                ref={(el) => {
                  if (el) cardRefs.current.set(group.character, el);
                  else cardRefs.current.delete(group.character);
                }}
              >
                <div
                  className="artwork-thumbnail-box"
                  onClick={(e) => {
                    if (e.target.closest('.artwork-btn-retry')) return;
                    const btn = e.currentTarget.querySelector('.artwork-open-btn');
                    handleOpenModal(group, btn || e.currentTarget);
                  }}
                >
                  {hasError ? (
                    <div className="artwork-error-state" role="alert">
                      <p>Preview failed to load</p>
                      <button
                        type="button"
                        className="artwork-btn-retry"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetryVideo(group.character);
                        }}
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <>
                      {isVisible ? (
                        <video
                          ref={(el) => {
                            if (el) cardVideoRefs.current.set(group.character, el);
                            else cardVideoRefs.current.delete(group.character);
                          }}
                          muted
                          autoPlay={!isGloballyPaused}
                          playsInline
                          loop={group.items.length === 1}
                          poster={currentItem.poster}
                          className="artwork-video"
                          onEnded={() => handleCardClipEnded(group.character, group.items.length)}
                          onError={() => handleVideoError(group.character)}
                        >
                          {currentItem.webm && <source src={currentItem.webm} type="video/webm" />}
                          <source src={currentItem.src} type="video/mp4" />
                        </video>
                      ) : (
                        <img
                          src={currentItem.poster}
                          alt={group.characterName}
                          className="artwork-video"
                          loading="lazy"
                        />
                      )}
                      <div className="artwork-card-overlay">
                        <button
                          type="button"
                          className="artwork-open-btn"
                          aria-label={`Enlarge ${group.characterName} animations`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(group, e.currentTarget);
                          }}
                        >
                          <i className="fas fa-expand" aria-hidden="true" />
                          <span>Enlarge</span>
                        </button>
                      </div>
                    </>
                  )}
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
        aria-label="Character animations viewer"
        onCancel={(e) => {
          e.preventDefault();
          handleCloseModal();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleCloseModal();
        }}
      >
        {activeGroup && currentDialogAnim && (
          <div className="artwork-dialog-content">
            <div className="artwork-dialog-header">
              <div className="artwork-dialog-select-group">
                <label htmlFor="artwork-animation" className="artwork-dialog-label">
                  Animation
                </label>
                <select
                  id="artwork-animation"
                  className="artwork-dialog-select"
                  value={selectedAnimId}
                  onChange={handleSelectAnimation}
                  aria-label="Select animation"
                >
                  <option value="auto">Auto — all animations</option>
                  {activeGroup.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </div>

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
                  ref={dialogVideoRef}
                  controls
                  autoPlay
                  playsInline
                  loop={selectedAnimId !== 'auto' || activeGroup.items.length === 1}
                  poster={currentDialogAnim.poster}
                  className="artwork-dialog-video"
                  onEnded={handleDialogVideoEnded}
                >
                  {currentDialogAnim.webm && (
                    <source src={currentDialogAnim.webm} type="video/webm" />
                  )}
                  <source src={currentDialogAnim.src} type="video/mp4" />
                </video>
              </div>
            </div>

            <div className="artwork-dialog-footer">
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
