import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ImageCard from '../components/ImageCard';
import GeometricBackground from '../components/GeometricBackground';

const API_URL = 'http://localhost:3001/api';

export default function Dashboard() {
  const { user, token } = useAuth();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyImages();
  }, []);

  async function fetchMyImages() {
    try {
      const res = await fetch(`${API_URL}/images/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setImages(data.images);
    } catch (err) {
      console.error('Failed to load images:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(imageId) {
    if (!confirm('Are you sure you want to delete this piece?')) return;

    try {
      const res = await fetch(`${API_URL}/images/${imageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setImages(imgs => imgs.filter(i => i.id !== imageId));
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  }

  const styleCount = images.reduce((acc, img) => {
    acc[img.style] = (acc[img.style] || 0) + 1;
    return acc;
  }, {});

  const mostUsedStyle = Object.entries(styleCount).sort((a, b) => b[1] - a[1])[0];

  return (
    <>
      <GeometricBackground />
      <div className="page-content" style={{ position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ paddingTop: 'var(--space-2xl)', paddingBottom: 'var(--space-2xl)' }}>
          <div className="section-header animate-in">
            <h2>Your <span className="text-red">Collection</span></h2>
            <div className="section-divider"></div>
            <p>@{user?.username}'s personal gallery</p>
          </div>

          {/* Stats */}
          <div className="stats-row animate-in animate-in-delay-1">
            <div className="stat-card">
              <div className="stat-value">{images.length}</div>
              <div className="stat-label">Total Works</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{Object.keys(styleCount).length}</div>
              <div className="stat-label">Styles Used</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>
                {mostUsedStyle ? mostUsedStyle[0] : '—'}
              </div>
              <div className="stat-label">Favorite Style</div>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-4xl)' }}>
              <div className="spinner"></div>
            </div>
          ) : images.length === 0 ? (
            <div className="empty-state animate-in">
              <div className="icon">🎨</div>
              <h3>No Art Yet</h3>
              <p>Your collection is empty. Head to the Studio to create your first masterpiece.</p>
              <Link to="/studio" className="btn btn-primary" id="dashboard-to-studio">
                Go to Studio
              </Link>
            </div>
          ) : (
            <div className="image-grid animate-in animate-in-delay-2">
              {images.map((image) => (
                <ImageCard
                  key={image.id}
                  image={image}
                  showActions={true}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
