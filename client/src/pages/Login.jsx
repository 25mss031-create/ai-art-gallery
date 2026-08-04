import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GeometricBackground from '../components/GeometricBackground';

export default function Login() {
  const { login, requestMagicLink } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLink, setMagicLink] = useState('');
  const [showMagicLink, setShowMagicLink] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/studio');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await requestMagicLink(email);
      if (data && data.magicLink) {
        setMagicLink(data.magicLink);
        setMagicLinkSent(true);
      } else {
        setError(data.message || 'If the email exists, a magic link has been sent.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <GeometricBackground />
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)', position: 'relative', zIndex: 2 }}>
        <div className="form-card animate-in" id="login-form-card">
          <h2>Sign <span className="text-red">In</span></h2>

          {error && <div className="alert alert-error" id="login-error">{error}</div>}
          {magicLinkSent && (
            <div className="alert alert-success" id="magic-link-success">
              <div style={{ marginBottom: 'var(--space-sm)' }}>
                Magic link ready! Click below to sign in instantly (demo mode — no email is sent).
              </div>
              <Link to={magicLink} className="btn btn-gold" style={{ width: '100%' }} id="magic-link-now">
                Open Magic Link
              </Link>
            </div>
          )}

          {!showMagicLink ? (
            <>
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label" htmlFor="login-email">Email</label>
                  <input
                    type="email"
                    id="login-email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="login-password">Password</label>
                  <input
                    type="password"
                    id="login-password"
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading} id="login-submit">
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>

              <div className="form-divider">or</div>

              <button
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={() => setShowMagicLink(true)}
                id="show-magic-link"
              >
                Sign In With Magic Link
              </button>
            </>
          ) : (
            <>
              <form onSubmit={handleMagicLink}>
                <div className="form-group">
                  <label className="form-label" htmlFor="magic-email">Email Address</label>
                  <input
                    type="email"
                    id="magic-email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <button type="submit" className="btn btn-gold" style={{ width: '100%' }} disabled={loading} id="magic-link-submit">
                  {loading ? 'Sending...' : 'Send Magic Link'}
                </button>
              </form>

              <div className="form-divider">or</div>

              <button
                className="btn btn-ghost"
                style={{ width: '100%' }}
                onClick={() => { setShowMagicLink(false); setMagicLinkSent(false); }}
                id="show-password-login"
              >
                Sign In With Password
              </button>
            </>
          )}

          <div className="form-footer">
            <Link to="/forgot-password">Forgot password?</Link>
            <br />
            <span>Don't have an account? </span>
            <Link to="/register">Sign Up</Link>
          </div>
        </div>
      </div>
    </>
  );
}
