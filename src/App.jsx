// ponytail: native hash routing via hashchange; zero external router dependencies.
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Games from './components/Games';
import Studio from './components/Studio';
import Contact from './components/Contact';
import Artwork from './components/Artwork';
import Footer from './components/Footer';

export default function App() {
  const [isArtwork, setIsArtwork] = useState(() => {
    return typeof window !== 'undefined' && window.location.hash === '#artwork';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const art = window.location.hash === '#artwork';
      setIsArtwork(art);
      if (art) {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!isArtwork && window.location.hash) {
      document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isArtwork]);

  return (
    <>
      <Header />
      <main>
        {isArtwork ? (
          <Artwork />
        ) : (
          <>
            <Hero />
            <Games />
            <Studio />
            <Contact />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
