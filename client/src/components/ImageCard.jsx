import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';

export default function ImageCard({ image, onDelete, showActions = false }) {
  const [showModal, setShowModal] = useState(false);
  const cardRef = useRef(null);
  const [transformStyle, setTransformStyle] = useState('');
  const { isAdmin } = useAuth();

  const imageUrl = image.image_url;

  // 3D Tilt calculation on mouse move
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -12; // deg
    const rotateY = ((x - centerX) / centerX) * 12; // deg

    setTransformStyle(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`);
  };

  const handleMouseLeave = () => {
    setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  };

  return (
    <>
      <div
        ref={cardRef}
        className="card"
        id={`image-card-${image.id}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: transformStyle,
          transition: transformStyle.includes('rotateX(0deg)') ? 'transform 0.5s ease-out' : 'transform 0.1s ease-out',
        }}
      >
        <div className="card-image-wrapper" onClick={() => setShowModal(true)}>
          <img
            src={imageUrl}
            alt={image.title}
            className="card-image"
            loading="lazy"
          />
          <div className="card-hover-overlay">
            <span>🔴 View Art</span>
          </div>
        </div>

        <div className="card-body" onClick={() => setShowModal(true)}>
          <div className="card-title">{image.title}</div>
          <div className="card-meta">
            {isAdmin && image.username ? (
              <span className="admin-creator-tag">🛡️ @{image.username}</span>
            ) : (
              <span></span>
            )}
            <span className="card-badge">{image.style}</span>
          </div>
          <div className="card-prompt" title={image.prompt}>
            "{image.prompt}"
          </div>
        </div>

        {showActions && (
          <div className="card-actions" style={{ padding: '0 var(--space-lg) var(--space-md)' }}>
            {onDelete && (
              <button
                className="btn btn-danger btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(image.id);
                }}
                id={`delete-image-${image.id}`}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Animated Lightbox Modal */}
      {showModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)} id="modal-close">
              ✕
            </button>
            <img src={imageUrl} alt={image.title} className="modal-image" />
            <div className="modal-info">
              <h3 className="gradient-text">{image.title}</h3>
              <div className="card-meta" style={{ marginTop: '0.5rem' }}>
                {isAdmin && image.username ? (
                  <span className="admin-creator-tag">🛡️ Created by @{image.username} (User ID #{image.user_id})</span>
                ) : null}
                <span className="card-badge">{image.style}</span>
              </div>
              <p className="card-prompt" style={{ whiteSpace: 'normal', marginTop: '0.8rem', fontSize: '0.9rem' }}>
                Prompt: "{image.prompt}"
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
