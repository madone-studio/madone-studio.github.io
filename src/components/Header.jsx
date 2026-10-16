import React, { useState, useEffect, useRef } from 'react';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    const handleClickOutside = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <header
      ref={headerRef}
      className={`header ${isScrolled ? 'scrolled' : ''}`}
      id="header"
    >
      <nav className="nav">
        <a href="#home" className="nav-logo" onClick={handleLinkClick} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="logo-icon">M</div>
          <span className="logo-text">MADONE Studio</span>
        </a>

        <ul className={`nav-menu ${isOpen ? 'active' : ''}`} id="nav-menu">
          <li>
            <a href="#home" className="nav-link" onClick={handleLinkClick}>
              Home
            </a>
          </li>
          <li>
            <a href="#games" className="nav-link" onClick={handleLinkClick}>
              Games
            </a>
          </li>
          <li>
            <a href="#artwork" className="nav-link" onClick={handleLinkClick}>
              Artwork
            </a>
          </li>
          <li>
            <a href="#studio" className="nav-link" onClick={handleLinkClick}>
              Studio
            </a>
          </li>
          <li>
            <a href="#contact" className="nav-link" onClick={handleLinkClick}>
              Contact
            </a>
          </li>
        </ul>

        <button
          type="button"
          className="nav-toggle"
          id="nav-toggle"
          aria-expanded={isOpen}
          aria-controls="nav-menu"
          aria-label="Toggle navigation menu"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <i className={`fas ${isOpen ? 'fa-times' : 'fa-bars'}`} />
        </button>
      </nav>
    </header>
  );
}
