import React from 'react';

export default function GameCard({ game, onOpenDetails }) {
  const cardId = game.id;

  return (
    <div
      className="game-card"
      tabIndex={0}
      aria-labelledby={`${cardId}-title`}
      aria-describedby={`${cardId}-desc`}
    >
      <div className="game-image">
        <img
          src={game.image}
          alt={game.alt}
          loading="lazy"
        />
        <div className="game-overlay" />
      </div>
      <div className="game-info">
        <h3 className="game-title" id={`${cardId}-title`}>
          {game.title}
        </h3>
        <p className="game-description" id={`${cardId}-desc`}>
          {game.desc}
        </p>
        <div className="game-buttons">
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
              className="btn btn-small btn-primary btn-unavailable"
              aria-disabled="true"
            >
              <i className="fas fa-lock" />
              <span>Unavailable</span>
            </span>
          )}
          <button
            type="button"
            className="btn btn-small btn-outline"
            onClick={(e) => onOpenDetails(game, e.currentTarget)}
          >
            <i className="fas fa-info" />
            <span>Details</span>
          </button>
        </div>
      </div>
    </div>
  );
}
