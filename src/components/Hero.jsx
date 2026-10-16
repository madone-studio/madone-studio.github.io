import React from 'react';

export default function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero-bg">
        <div className="hero-overlay" />
      </div>

      {/* Floating Elements */}
      <div className="floating-element" style={{ top: '20%', left: '10%' }} />
      <div
        className="floating-element"
        style={{ top: '30%', right: '15%', animationDelay: '1s' }}
      />
      <div
        className="floating-element"
        style={{ bottom: '25%', left: '20%', animationDelay: '2s' }}
      />

      <div className="hero-content">
        <h1 className="hero-title">
          <span className="hero-title-main">MADONE Studio</span>
          <span className="hero-title-sub gradient-text">
            We Build Games That Inspire
          </span>
        </h1>

        <p className="hero-description">
          Creating breakthrough gaming experiences through innovative
          gameplay, stunning visuals, and compelling narratives that
          captivate players worldwide.
        </p>

        <div className="hero-buttons">
          <a href="#games" className="btn btn-primary">
            <i className="fas fa-gamepad" />
            <span>See Our Games</span>
          </a>
          <a href="#contact" className="btn btn-secondary">
            <i className="fas fa-envelope" />
            <span>Contact Us</span>
          </a>
        </div>
      </div>

      <div className="scroll-indicator" aria-hidden="true">
        <i className="fas fa-chevron-down" />
      </div>
    </section>
  );
}
