import React, { useEffect, useRef } from 'react';

export default function GameModal({ game, onClose, triggerRef }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    closeButtonRef.current?.focus();
    return () => {
      dialog.close();
      triggerRef?.current?.focus();
    };
  }, [triggerRef]);

  if (!game) return null;

  return (
    <dialog
      ref={dialogRef}
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-desc"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h3 id="modal-title" className="game-title" style={{ margin: 0 }}>
            {game.title}
          </h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close dialog"
            ref={closeButtonRef}
          >
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="modal-body">
          <img
            src={game.image}
            alt={game.alt}
            className="modal-image"
            loading="lazy"
          />
          <p id="modal-desc" className="game-description" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            {game.desc}
          </p>
        </div>

        <div className="modal-footer">
          {game.playable ? (
            <a
              href={game.playUrl}
              className="btn btn-small btn-primary"
            >
              <i className="fas fa-play" />
              <span>Play Now</span>
            </a>
          ) : (
            <span
              className="btn btn-small btn-secondary btn-unavailable"
              aria-disabled="true"
            >
              Demo Unavailable
            </span>
          )}
          <button
            type="button"
            className="btn btn-small btn-outline"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
