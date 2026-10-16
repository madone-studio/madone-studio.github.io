// ponytail: native <video> & <dialog> grouped character gallery with two-layer CSS crossfade; zero runtime dependencies or animation libraries.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import artworksData from '../data/artworks.json';
import './artwork.css';

// ponytail: one fixed preview per character, idle > walk > run; keep first-clip fallback for rigs without these states.
function getPreviewItem(items) {
  return ['idle', 'walk', 'run'].map((name) => items.find((item) => item.animation?.toLowerCase() === name)).find(Boolean) || items[0];
}

// ponytail: two-layer video crossfade holding outgoing frame until incoming is decoded; instant under reduced motion.
function VideoCrossfade({
  clip,
  loop = false,
  isPlaying = true,
  className = 'artwork-video',
  controls = false,
  onEnded,
  onError,
  ariaLabel
}) {
  const [slot0, setSlot0] = useState(() => ({
    clip,
    status: 'active',
    loop
  }));
  const [slot1, setSlot1] = useState(() => ({
    clip: null,
    status: 'idle',
    loop: false
  }));

  const activeSlotRef = useRef(0);
  const transitionIdRef = useRef(0);
  const timerRef = useRef(null);
  const prevClipIdRef = useRef(clip?.id);
  const stagedRef = useRef(null);
  const playingRef = useRef(isPlaying);
  playingRef.current = isPlaying;

  const video0Ref = useRef(null);
  const video1Ref = useRef(null);

  // Synchronize playback state across active / incoming videos
  useEffect(() => {
    for (const video of [video0Ref.current, video1Ref.current]) {
      if (!video) continue;
      if (isPlaying && video.querySelector('source')) video.play().catch(() => {});
      else video.pause();
    }
  }, [isPlaying]);

  // Handle clip changes with ready-gated crossfade
  useEffect(() => {
    if (!clip) return;

    if (clip.id === prevClipIdRef.current) {
      if (activeSlotRef.current === 0) {
        setSlot0((s) => ({ ...s, loop }));
        if (video0Ref.current) video0Ref.current.loop = loop;
      } else {
        setSlot1((s) => ({ ...s, loop }));
        if (video1Ref.current) video1Ref.current.loop = loop;
      }
      return;
    }

    prevClipIdRef.current = clip.id;
    transitionIdRef.current += 1;
    const tid = transitionIdRef.current;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const currentSlot = activeSlotRef.current;
    const nextSlot = 1 - currentSlot;
    const currentVideo = currentSlot === 0 ? video0Ref.current : video1Ref.current;

    // Stage new clip in the incoming slot at opacity 0 (idle)
    if (nextSlot === 0) {
      setSlot0({ clip, status: 'idle', loop });
      setSlot1((s) => ({ ...s, status: 'active' }));
    } else {
      setSlot1({ clip, status: 'idle', loop });
      setSlot0((s) => ({ ...s, status: 'active' }));
    }

    let decoded = false;
    const triggerFade = () => {
      if (decoded || transitionIdRef.current !== tid) return;
      decoded = true;
      const incomingVideo = nextSlot === 0 ? video0Ref.current : video1Ref.current;
      incomingVideo?.pause(); // Keep short clips from ending before their first frame has faded in.

      // Start CSS transition between incoming and outgoing slots
      if (nextSlot === 0) {
        setSlot0({ clip, status: 'incoming', loop });
        setSlot1((s) => ({ ...s, status: 'outgoing' }));
      } else {
        setSlot1({ clip, status: 'incoming', loop });
        setSlot0((s) => ({ ...s, status: 'outgoing' }));
      }

      const fadeDuration =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          ? 0
          : 220;

      const finish = () => {
        if (transitionIdRef.current !== tid) return;
        clearTimeout(timerRef.current);
        activeSlotRef.current = nextSlot;
        stagedRef.current = null;
        if (playingRef.current) incomingVideo?.play().catch(() => {});
        if (nextSlot === 0) {
          setSlot0({ clip, status: 'active', loop });
          setSlot1({ clip: null, status: 'idle', loop: false });
        } else {
          setSlot1({ clip, status: 'active', loop });
          setSlot0({ clip: null, status: 'idle', loop: false });
        }
        if (currentVideo) {
          currentVideo.pause();
          currentVideo.currentTime = 0;
        }
      };
      stagedRef.current.finish = finish;
      // transitionend follows actual painted opacity, unlike a timer started before the next paint.
      timerRef.current = setTimeout(finish, fadeDuration ? fadeDuration + 1000 : 0);
    };

    stagedRef.current = { clip, nextSlot, tid, triggerFade };

    return () => {
      clearTimeout(timerRef.current);
      stagedRef.current = null;
    };
  }, [clip?.id]);

  // Load only after React has committed the new <source> elements.
  useEffect(() => {
    const stage = stagedRef.current;
    if (!stage) return;
    const video = stage.nextSlot === 0 ? video0Ref.current : video1Ref.current;
    let frame;
    const ready = () => {
      if (transitionIdRef.current !== stage.tid || video.readyState < 2 ||
          ![stage.clip.webm, stage.clip.src].includes(new URL(video.currentSrc || '/', window.location.href).pathname)) return;
      if (video.requestVideoFrameCallback && playingRef.current) {
        frame = video.requestVideoFrameCallback(stage.triggerFade);
      } else stage.triggerFade();
    };
    video.addEventListener('loadeddata', ready);
    video.load();
    if (playingRef.current) video.play().catch(() => {});
    return () => {
      video.removeEventListener('loadeddata', ready);
      if (frame !== undefined) video.cancelVideoFrameCallback?.(frame);
    };
  }, [slot0.clip?.id, slot1.clip?.id]);

  useEffect(() => {
    const update = (s) => s.clip?.id === clip.id ? { ...s, loop } : s;
    setSlot0(update);
    setSlot1(update);
  }, [loop]);

  useEffect(() => () => {
    transitionIdRef.current += 1;
    clearTimeout(timerRef.current);
  }, []);

  const renderSlot = (slot, ref, slotIndex) => {
    if (!slot.clip) {
      return (
        <video
          key={'slot-' + slotIndex}
          ref={ref}
          className={className}
          data-idle="true"
          data-active="false"
          data-incoming="false"
          data-outgoing="false"
          muted
          playsInline
          aria-hidden="true"
        />
      );
    }

    const isActive = slot.status === 'active';
    const isIncoming = slot.status === 'incoming';
    const isOutgoing = slot.status === 'outgoing';
    const isIdle = slot.status === 'idle';

    return (
      <video
        key={'slot-' + slotIndex}
        ref={ref}
        className={className}
        data-active={isActive ? 'true' : 'false'}
        data-incoming={isIncoming ? 'true' : 'false'}
        data-outgoing={isOutgoing ? 'true' : 'false'}
        data-idle={isIdle ? 'true' : 'false'}
        muted
        playsInline
        autoPlay={isActive && isPlaying}
        controls={controls && (isActive || isIncoming)}
        loop={slot.loop}
        poster={slot.clip.poster}
        aria-label={ariaLabel}
        onTransitionEnd={(event) => {
          if (event.propertyName === 'opacity' && slot.status === 'incoming') stagedRef.current?.finish?.();
        }}
        onEnded={() => {
          if (slot.status === 'active' && onEnded) {
            onEnded();
          }
        }}
        onError={() => {
          if (slot.clip && slot.status !== 'outgoing' && onError) {
            onError();
          }
        }}
      >
        {slot.clip.webm && <source src={slot.clip.webm} type="video/webm" />}
        <source src={slot.clip.src} type="video/mp4" />
      </video>
    );
  };

  return (
    <>
      {renderSlot(slot0, video0Ref, 0)}
      {renderSlot(slot1, video1Ref, 1)}
    </>
  );
}

export default function Artwork() {
  const [activeGroup, setActiveGroup] = useState(null);
  const [selectedAnimId, setSelectedAnimId] = useState('auto');
  const [dialogAutoIndex, setDialogAutoIndex] = useState(0);
  const [dialogError, setDialogError] = useState(false);

  const [errorCharacters, setErrorCharacters] = useState(() => new Set());
  const [visibleCharacters, setVisibleCharacters] = useState(() => new Set());
  const [isDocVisible, setIsDocVisible] = useState(() =>
    typeof document !== 'undefined' ? !document.hidden : true
  );

  const triggerRef = useRef(null);
  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);
  const cardRefs = useRef(new Map());

  // Group artworks strictly by character (10, 17, 1 animations; total 28)
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

  // Document visibility listener to pause resource usage in background tabs
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibility = () => {
      setIsDocVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // IntersectionObserver for visibility-aware playback and resource savings
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
          } else {
            setVisibleCharacters((prev) => {
              if (!prev.has(charId)) return prev;
              const next = new Set(prev);
              next.delete(charId);
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
  }, [characterGroups]);

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
    setDialogAutoIndex(0);
    setDialogError(false);
  };

  const handleCloseModal = () => {
    const dialog = dialogRef.current;
    if (dialog && dialog.open) {
      dialog.close();
    }
    setActiveGroup(null);
    setSelectedAnimId('auto');
    setDialogError(false);
    triggerRef.current?.focus();
  };

  const handleCardError = (charId) => {
    setErrorCharacters((prev) => new Set(prev).add(charId));
  };

  const handleRetryCard = (charId) => {
    setErrorCharacters((prev) => {
      const next = new Set(prev);
      next.delete(charId);
      return next;
    });
  };

  // Dialog active clip resolution
  const currentDialogAnim = useMemo(() => {
    if (!activeGroup) return null;
    if (selectedAnimId !== 'auto') {
      return activeGroup.items.find((item) => item.id === selectedAnimId) || activeGroup.items[0];
    }
    return activeGroup.items[dialogAutoIndex] || activeGroup.items[0];
  }, [activeGroup, selectedAnimId, dialogAutoIndex]);

  const handleDialogVideoEnded = () => {
    if (!activeGroup) return;
    if (selectedAnimId !== 'auto') return;
    if (activeGroup.items.length <= 1) return;
    setDialogAutoIndex((prev) => (prev + 1) % activeGroup.items.length);
  };

  const handleSelectAnimation = (e) => {
    const val = e.target.value;
    setSelectedAnimId(val);
    setDialogError(false);
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

        {/* Artwork Grid: Exactly 3 Character Cards */}
        <div className="artwork-grid" aria-live="polite">
          {characterGroups.map((group) => {
            const hasError = errorCharacters.has(group.character);
            const isVisible = visibleCharacters.has(group.character);
            const currentItem = getPreviewItem(group.items);

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
                          handleRetryCard(group.character);
                        }}
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <>
                      <VideoCrossfade
                        clip={currentItem}
                        loop
                        isPlaying={isDocVisible && isVisible && !hasError}
                        className="artwork-video"
                        controls={false}
                        onError={() => handleCardError(group.character)}
                        ariaLabel={group.characterName}
                      />
                      <div className="artwork-card-overlay">
                        <button
                          type="button"
                          className="artwork-open-btn"
                          aria-label={`Click to see more ${group.characterName} animations`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(group, e.currentTarget);
                          }}
                        >
                          <i className="fas fa-expand" aria-hidden="true" />
                          <span>Click to see more</span>
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
              {activeGroup.items.length > 1 && (
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
              )}

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
                {dialogError ? (
                  <div className="artwork-error-state" role="alert">
                    <p>Failed to load animation</p>
                    <button
                      type="button"
                      className="artwork-btn-retry artwork-dialog-btn-retry"
                      onClick={() => setDialogError(false)}
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <VideoCrossfade
                    clip={currentDialogAnim}
                    loop={selectedAnimId !== 'auto' || activeGroup.items.length === 1}
                    isPlaying={isDocVisible && Boolean(activeGroup) && !dialogError}
                    className="artwork-dialog-video"
                    controls={true}
                    onEnded={handleDialogVideoEnded}
                    onError={() => setDialogError(true)}
                    ariaLabel={currentDialogAnim.title}
                  />
                )}
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
