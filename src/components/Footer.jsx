import React from 'react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          {/* Footer Logo and Description */}
          <div className="footer-main">
            <div className="footer-logo">
              <div className="logo-icon">M</div>
              <span className="logo-text">MADONE Studio</span>
            </div>
            <p className="footer-description">
              Creating breakthrough gaming experiences that inspire and captivate
              players worldwide. We build games that matter.
            </p>
            <div className="footer-social">
              <span
                className="social-link unavailable"
                aria-label="Twitter (Unavailable)"
                title="Twitter (Unavailable)"
              >
                <i className="fab fa-twitter" />
              </span>
              <span
                className="social-link unavailable"
                aria-label="Discord (Unavailable)"
                title="Discord (Unavailable)"
              >
                <i className="fab fa-discord" />
              </span>
              <span
                className="social-link unavailable"
                aria-label="YouTube (Unavailable)"
                title="YouTube (Unavailable)"
              >
                <i className="fab fa-youtube" />
              </span>
              <span
                className="social-link unavailable"
                aria-label="Instagram (Unavailable)"
                title="Instagram (Unavailable)"
              >
                <i className="fab fa-instagram" />
              </span>
              <span
                className="social-link unavailable"
                aria-label="GitHub (Unavailable)"
                title="GitHub (Unavailable)"
              >
                <i className="fab fa-github" />
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-links">
            <h4>Quick Links</h4>
            <ul>
              <li>
                <a href="#home">Home</a>
              </li>
              <li>
                <a href="#games">Games</a>
              </li>
              <li>
                <a href="#artwork">Artwork</a>
              </li>
              <li>
                <a href="#studio">Studio</a>
              </li>
              <li>
                <a href="#contact">Contact</a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="footer-links">
            <h4>Resources</h4>
            <ul>
              <li>
                <span className="footer-link-unavailable" aria-disabled="true">Press Kit (Unavailable)</span>
              </li>
              <li>
                <span className="footer-link-unavailable" aria-disabled="true">Careers (Unavailable)</span>
              </li>
              <li>
                <span className="footer-link-unavailable" aria-disabled="true">Support (Unavailable)</span>
              </li>
              <li>
                <span className="footer-link-unavailable" aria-disabled="true">Privacy Policy (Unavailable)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="footer-bottom">
          <p>
            &copy; 2025 MADONE Studio. All Rights Reserved. | Made with ❤️ for
            gamers worldwide.
          </p>
        </div>
      </div>
    </footer>
  );
}
