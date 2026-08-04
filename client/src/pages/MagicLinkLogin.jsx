import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GeometricBackground from '../components/GeometricBackground';

export default function MagicLinkLogin() {
  const { token } = useParams();
  const { magicLinkLogin } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Verifying magic link...');
  const [error, setError] = useState('');

  useEffect(() => {
    async function verify() {
      try {
        await magicLinkLogin(token);
        setStatus('Login successful! Redirecting to the Studio...');
        setTimeout(() => navigate('/studio'), 1200);
      } catch (err) {
        setError(err.message || 'This magic link is invalid or has expired.');
        setStatus('');
      }
    }
    verify();
  }, [token]);

  return (
    <>
      <GeometricBackground />
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)', position: 'relative', zIndex: 2 }}>
        <div className="form-card animate-in" id="magic-link-card">
          <h2>Magic <span className="text-red">Link</span></h2>

          {status && <div className="alert alert-success" id="magic-link-status">{status}</div>}
          {error && <div className="alert alert-error" id="magic-link-error">{error}</div>}

          <div className="form-footer">
            <Link to="/login">Back to Sign In</Link>
          </div>
        </div>
      </div>
    </>
  );
}
