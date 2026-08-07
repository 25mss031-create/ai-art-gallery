import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" id="brand-link">
          <div className="navbar-brand-icon">
            <span>К</span>
          </div>
          <span className="navbar-brand-text">Constructivist Studio</span>
        </Link>

        <button
          className="navbar-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
          id="nav-toggle"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <ul className={`navbar-links ${menuOpen ? 'open' : ''}`} id="nav-links">
          <li>
            <Link to="/gallery" className={isActive('/gallery')} id="nav-gallery" onClick={() => setMenuOpen(false)}>
              Gallery
            </Link>
          </li>
          {user && (
            <>
              <li>
                <Link to="/studio" className={isActive('/studio')} id="nav-studio" onClick={() => setMenuOpen(false)}>
                  Studio
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className={isActive('/dashboard')} id="nav-dashboard" onClick={() => setMenuOpen(false)}>
                  Dashboard
                </Link>
              </li>
              {isAdmin && (
                <li>
                  <Link to="/admin" className={`nav-admin-link ${isActive('/admin')}`} id="nav-admin" onClick={() => setMenuOpen(false)}>
                    🛡️ Admin Panel
                  </Link>
                </li>
              )}
            </>
          )}
          <li>
            <div className="navbar-auth">
              {user ? (
                <>
                  <span className={`navbar-user ${isAdmin ? 'navbar-admin-user' : ''}`}>
                    {isAdmin ? '🛡️ Admin ' : '@'}{user.username}
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={logout} id="nav-logout">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-ghost btn-sm" id="nav-login" onClick={() => setMenuOpen(false)}>
                    Login
                  </Link>
                  <Link to="/register" className="btn btn-primary btn-sm" id="nav-register" onClick={() => setMenuOpen(false)}>
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </li>
        </ul>
      </div>
    </nav>
  );
}
