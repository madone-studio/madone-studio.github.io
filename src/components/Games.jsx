import React, { useState, useRef } from 'react';
import { GAMES } from '../data/games';
import GameCard from './GameCard';
import GameModal from './GameModal';

export default function Games() {
  const [activeGame, setActiveGame] = useState(null);
  const triggerRef = useRef(null);

  const handleOpenDetails = (game, element) => {
    triggerRef.current = element;
    setActiveGame(game);
  };

  const handleCloseDetails = () => {
    setActiveGame(null);
  };

  return (
    <section className="games" id="games">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">
            Our <span className="gradient-text">Games</span>
          </h2>
          <p className="section-description">
            Discover our portfolio of innovative games that push the boundaries
            of interactive entertainment.
          </p>
        </div>

        <div className="games-grid">
          {GAMES.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onOpenDetails={handleOpenDetails}
            />
          ))}
        </div>
      </div>

      {activeGame && (
        <GameModal
          game={activeGame}
          onClose={handleCloseDetails}
          triggerRef={triggerRef}
        />
      )}
    </section>
  );
}
