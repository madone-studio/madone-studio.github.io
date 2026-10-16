import React, { useState } from 'react';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [error, setError] = useState('');
  const [mailtoUrl, setMailtoUrl] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMailtoUrl('');
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const name = formData.name.trim();
    const email = formData.email.trim();
    const subject = formData.subject.trim();
    const message = formData.message.trim();

    if (!name) {
      setError('Please provide your name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!message) {
      setError('Please enter your message.');
      return;
    }

    // Bounded and sanitized encoding
    const boundedSubject = subject.slice(0, 200) || 'Inquiry for MADONE Studio';
    const boundedBody = `Name: ${name.slice(0, 100)}\nEmail: ${email.slice(0, 150)}\n\nMessage:\n${message.slice(0, 2000)}`;

    const encodedSubject = encodeURIComponent(boundedSubject);
    const encodedBody = encodeURIComponent(boundedBody);
    const mailto = `mailto:madonestudio69@gmail.com?subject=${encodedSubject}&body=${encodedBody}`;

    setMailtoUrl(mailto);

    // Open email client safely
    window.location.href = mailto;
  };

  return (
    <section className="contact" id="contact">
      <div className="container">
        <div className="contact-content">
          {/* Contact Info */}
          <div className="contact-info">
            <h2 className="contact-title">
              Let's Create <span className="gradient-text">Magic</span> Together
            </h2>
            <p className="contact-description">
              Have an exciting project in mind? Want to join our team? Or just
              want to say hello? We'd love to hear from you.
            </p>

            {/* Contact Methods */}
            <div className="contact-methods">
              <div className="contact-method">
                <div className="contact-icon">
                  <i className="fas fa-envelope" />
                </div>
                <div className="contact-details">
                  <h4>Email</h4>
                  <p>madonestudio69@gmail.com</p>
                </div>
              </div>

              <div className="contact-method">
                <div className="contact-icon">
                  <i className="fab fa-telegram" />
                </div>
                <div className="contact-details">
                  <h4>Telegram</h4>
                  <p>@madstudiogame</p>
                </div>
              </div>

              <div className="contact-method">
                <div className="contact-icon">
                  <i className="fas fa-map-marker-alt" />
                </div>
                <div className="contact-details">
                  <h4>Location</h4>
                  <p>Ha Noi City, Vietnam</p>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="social-links">
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
            </div>
          </div>

          {/* Contact Form */}
          <div className="contact-form-container">
            <h3 className="form-title">Send us a message</h3>
            <form className="contact-form" id="contact-form" onSubmit={handleSubmit} noValidate>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    maxLength={150}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  placeholder="What's this about?"
                  value={formData.subject}
                  onChange={handleChange}
                  maxLength={200}
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  placeholder="Tell us about your project or idea..."
                  value={formData.message}
                  onChange={handleChange}
                  required
                  maxLength={2000}
                />
              </div>

              {error && (
                <div
                  className="contact-error"
                  role="alert"
                  style={{
                    color: '#ef4444',
                    marginBottom: '1rem',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                  }}
                >
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-full">
                <i className="fas fa-paper-plane" />
                <span>Send Message</span>
              </button>

              {mailtoUrl && (
                <div className="contact-notice" role="status">
                  <p>
                    <strong>Email draft prepared!</strong> Your email client will open to send this message to{' '}
                    <code>madonestudio69@gmail.com</code>. No message was automatically sent by the browser.
                  </p>
                  <p style={{ marginTop: '0.5rem' }}>
                    If your email client didn't open automatically,{' '}
                    <a href={mailtoUrl}>click here to open in your email app</a>.
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
