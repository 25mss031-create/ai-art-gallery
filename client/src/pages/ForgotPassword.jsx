import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GeometricBackground from '../components/GeometricBackground';

export default function ForgotPassword() {
  const { token: urlToken } = useParams();
  const { requestPasswordReset, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(urlToken ? 'reset' : 'email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(urlToken || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const data = await requestPasswordReset(email);
      if (data && data.resetToken) {
        setToken(data.resetToken);
        setStep('reset');
      } else {
        setMessage(data.message || 'Check your inbox for a reset link.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setMessage('Password reset successfully. Redirecting to sign in...');
      setTimeout(() => navigate('/login'), 1500);
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
        <div className="form-card animate-in" id="forgot-password-card">
          {step === 'email' ? (
            <>
              <h2>Forgot <span className="text-red">Password</span></h2>
              <p className="form-subtitle">Enter your account email to reset your password.</p>

              {error && <div className="alert alert-error" id="forgot-error">{error}</div>}
              {message && <div className="alert alert-success" id="forgot-message">{message}</div>}

              <form onSubmit={handleEmailSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="forgot-email">Email</label>
                  <input
                    type="email"
                    id="forgot-email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading} id="forgot-submit">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="form-footer">
                <span>Remembered it? </span>
                <Link to="/login">Sign In</Link>
              </div>
            </>
          ) : (
            <>
              <h2>Set New <span className="text-red">Password</span></h2>
              <p className="form-subtitle">Choose a new password for your account.</p>

              {error && <div className="alert alert-error" id="reset-error">{error}</div>}
              {message && <div className="alert alert-success" id="reset-success">{message}</div>}

              <form onSubmit={handleResetSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="reset-password">New Password</label>
                  <input
                    type="password"
                    id="reset-password"
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reset-confirm">Confirm New Password</label>
                  <input
                    type="password"
                    id="reset-confirm"
                    className="form-input"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat new password"
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading} id="reset-submit">
                  {loading ? 'Saving...' : 'Set New Password'}
                </button>
              </form>

              <div className="form-footer">
                <Link to="/login">Back to Sign In</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
