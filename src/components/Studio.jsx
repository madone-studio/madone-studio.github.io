import React from 'react';
import { TEAM } from '../data/team';

export default function Studio() {
  return (
    <section className="studio" id="studio">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">
            Our <span className="gradient-text">Studio</span>
          </h2>
          <p className="section-description">
            Meet the passionate team behind MADONE Studio's groundbreaking
            games.
          </p>
        </div>

        {/* Studio Mission */}
        <div className="studio-mission">
          <div className="mission-content">
            <div className="mission-image">
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
                alt="MADONE Studio team collaboration"
                loading="lazy"
              />
            </div>
            <div className="mission-text">
              <h3 className="mission-title">We Stay Curious</h3>
              <p className="mission-description">
                At MADONE Studio, curiosity drives everything we do. We believe
                that the best games come from asking "what if?" and daring to
                explore uncharted territories in interactive entertainment.
              </p>
              <p className="mission-description">
                Our diverse team of artists, programmers, designers, and
                storytellers collaborate to create experiences that challenge
                conventions and inspire players to see gaming in new ways.
              </p>
              <div className="studio-stats">
                <div className="stat-item">
                  <div className="stat-number">5+</div>
                  <div className="stat-label">Team Members</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">6</div>
                  <div className="stat-label">Games Released</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">3</div>
                  <div className="stat-label">Years Experience</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="team-section">
          <h3 className="team-title">Meet Our Team</h3>
          <div className="team-grid">
            {TEAM.map((member) => (
              <div className="team-card" key={member.name}>
                <div className="team-image">
                  <img
                    src={member.image}
                    alt={member.name}
                    loading="lazy"
                  />
                  <div className="team-overlay">
                    <div className="team-social">
                      {member.social.map((s) => (
                        <a
                          key={s.name}
                          href={s.url}
                          className="social-link"
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${member.name} on ${s.name}`}
                        >
                          <i className={s.icon} />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="team-info">
                  <h4 className="team-name">{member.name}</h4>
                  <p className="team-role">{member.role}</p>
                  <p className="team-description">{member.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
