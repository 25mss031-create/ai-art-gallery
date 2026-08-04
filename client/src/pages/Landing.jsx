import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GeometricBackground from '../components/GeometricBackground';

export default function Landing() {
  const { user } = useAuth();

  return (
    <>
      <GeometricBackground />

      {/* Hero Section */}
      <section className="hero" id="hero-section">
        <div className="container">
          <div className="hero-content">
            <div className="hero-tag animate-in">
              <span style={{ color: 'var(--red)' }}>✦</span> Russian Avant-Garde AI Engine
            </div>
            
            <h1 className="animate-in animate-in-delay-1">
              Create Bold
              <span className="accent gradient-text">Constructivist Art</span>
            </h1>

            <p className="hero-subtitle animate-in animate-in-delay-2">
              Generate striking geometric compositions inspired by Rodchenko, Malevich, and El Lissitzky. 
              Algorithmic precision meets revolutionary poster design.
            </p>

            <div className="hero-actions animate-in animate-in-delay-3">
              {user ? (
                <>
                  <Link to="/studio" className="btn btn-primary btn-lg" id="hero-studio-btn">
                    🔴 Launch Studio
                  </Link>
                  <Link to="/gallery" className="btn btn-secondary btn-lg" id="hero-gallery-btn">
                    Browse Gallery
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary btn-lg" id="hero-signup-btn">
                    Start Creating Free
                  </Link>
                  <Link to="/gallery" className="btn btn-secondary btn-lg" id="hero-gallery-btn">
                    Explore Gallery
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Interactive animated SVG art overlay */}
        <div className="hero-bg" style={{ opacity: 0.12 }}>
          <svg
            viewBox="0 0 800 800"
            style={{
              position: 'absolute',
              right: '-5%',
              top: '5%',
              width: '65%',
              height: '85%',
              pointerEvents: 'none'
            }}
          >
            {/* Rotating Outer Ring */}
            <circle cx="400" cy="400" r="280" fill="none" stroke="#D62828" strokeWidth="4" strokeDasharray="15 15">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 400 400"
                to="360 400 400"
                dur="40s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Counter-rotating Inner Ring */}
            <circle cx="400" cy="400" r="190" fill="none" stroke="#E9C46A" strokeWidth="3" strokeDasharray="30 10">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="360 400 400"
                to="0 400 400"
                dur="25s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Pulsing Central Red Triangle */}
            <polygon points="400,220 530,480 270,480" fill="#D62828" opacity="0.6">
              <animateTransform
                attributeName="transform"
                type="scale"
                values="1; 1.05; 1"
                dur="6s"
                repeatCount="indefinite"
                transformOrigin="400 400"
              />
            </polygon>

            {/* Sweeping Diagonal Beam */}
            <rect x="100" y="390" width="600" height="20" fill="#E9C46A" transform="rotate(-35 400 400)">
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="-35 400 400; -25 400 400; -35 400 400"
                dur="8s"
                repeatCount="indefinite"
              />
            </rect>

            {/* Floating Geometric Elements */}
            <rect x="250" y="250" width="80" height="80" fill="#1A1A2E" stroke="#D62828" strokeWidth="4" transform="rotate(15 290 290)">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="15 290 290"
                to="375 290 290"
                dur="15s"
                repeatCount="indefinite"
              />
            </rect>
          </svg>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="features-section" id="features-section">
        <div className="container">
          <div className="section-header animate-in">
            <h2>Revolutionary <span className="text-red">Features</span></h2>
            <div className="section-divider"></div>
            <p>Generative art algorithms programmed according to constructivist color theory and diagonal tension.</p>
          </div>

          <div className="features-grid">
            <div className="feature-card animate-in animate-in-delay-1">
              <div className="feature-icon">🔴</div>
              <h4>Procedural SVG Engine</h4>
              <p>Generates crisp vector artwork with layered geometric forms, diagonal beams, and custom typography accents.</p>
            </div>

            <div className="feature-card animate-in animate-in-delay-2">
              <div className="feature-icon">🎨</div>
              <h4>4 Avant-Garde Styles</h4>
              <p>Select between Constructivist, Suprematist, Propaganda, or Industrial palettes and compositions.</p>
            </div>

            <div className="feature-card animate-in animate-in-delay-3">
              <div className="feature-icon">🖼️</div>
              <h4>Interactive Lightbox</h4>
              <p>Click any generated artwork to open high-res modal views with full prompt and author details.</p>
            </div>

            <div className="feature-card animate-in animate-in-delay-4">
              <div className="feature-icon">⚡</div>
              <h4>Instant Local Generation</h4>
              <p>Generates compositions locally on demand — zero cloud delays or external credits required.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
