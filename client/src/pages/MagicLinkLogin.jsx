import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GeometricBackground from '../components/GeometricBackground';

export default function MagicLinkLogin() {
  const { token: magicToken } = useParams();
  const { magicLinkLogin, token } = useAuth();
  const navigate = useNavigate();
  const ranRef = useRef(false);
  const [status, setStatus] = useState('Verifying magic link...');
  const [error, setError] = useState('');

  useEffect(() => {
    // Already signed in (session stored) — just go to the Studio.
    // This also makes refreshing the magic-link URL after login safe.
    if (token) {
      navigate('/studio', { replace: true });
      return;
    }

    if (ranRef.current) return;
    ranRef.current = true;

    async function verify() {
      try {
        await magicLinkLogin(magicToken);
        navigate('/studio', { replace: true });
      } catch (err) {
        setError(err.message || 'This magic link is invalid or has expired.');
        setStatus('');
      }
    }
    verify();
  }, [token, magicToken, magicLinkLogin, navigate]);

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
