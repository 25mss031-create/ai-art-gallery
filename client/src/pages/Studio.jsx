import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import GeometricBackground from '../components/GeometricBackground';

const API_URL = '/api';

const STYLES = [
  { key: 'constructivist', label: 'Constructivist', desc: 'Bold reds & blacks, geometric shapes' },
  { key: 'suprematist', label: 'Suprematist', desc: 'Pure geometric forms, minimal color' },
  { key: 'propaganda', label: 'Propaganda', desc: 'Red & gold, poster-style energy' },
  { key: 'industrial', label: 'Industrial', desc: 'Steel blues & grays, mechanical feel' },
];

export default function Studio() {
  const { token } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('constructivist');
  const [title, setTitle] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleGenerate(e) {
    e.preventDefault();
    if (!prompt.trim()) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/images/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt, style, title: title || undefined }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setGeneratedImage(data.image);
      setSuccess('Art generated and saved to your collection!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const imageUrl = generatedImage ? generatedImage.image_url : null;

  return (
    <>
      <GeometricBackground />
      <div className="page-content" style={{ position: 'relative', zIndex: 2 }}>
        <div className="container" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-2xl)' }}>
          <div className="section-header animate-in">
            <h2>Art <span className="text-red">Studio</span></h2>
            <div className="section-divider"></div>
            <p>Describe your vision — watch the algorithmic engine compose Constructivist vector art</p>
          </div>

          <div className="studio-layout">
            {/* Controls Panel */}
            <div className="studio-panel animate-in animate-in-delay-1" id="studio-controls">
              <h3>Create <span className="text-red">Art</span></h3>

              {error && <div className="alert alert-error">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              <form onSubmit={handleGenerate}>
                <div className="form-group">
                  <label className="form-label" htmlFor="studio-prompt">Prompt</label>
                  <textarea
                    id="studio-prompt"
                    className="form-textarea"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., 'industrial power station with diagonal red beams and geometric circles'"
                    rows={4}
                    maxLength={500}
                    required
                  />
                  <div className="text-muted text-mono" style={{ fontSize: '0.75rem', marginTop: '4px', textAlign: 'right' }}>
                    {prompt.length}/500
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="studio-title">Title (optional)</label>
                  <input
                    type="text"
                    id="studio-title"
                    className="form-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Auto-generated if left empty"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Aesthetic Style</label>
                  <div className="style-grid" id="style-selector">
                    {STYLES.map((s) => (
                      <div
                        key={s.key}
                        className={`style-option ${style === s.key ? 'selected' : ''}`}
                        onClick={() => setStyle(s.key)}
                        id={`style-${s.key}`}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{s.label}</div>
                        <div style={{ fontSize: '0.72rem', opacity: 0.8, textTransform: 'none', letterSpacing: 0 }}>{s.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                  disabled={loading || !prompt.trim()}
                  id="generate-btn"
                >
                  {loading ? '⚙️ Composing Art...' : '🔴 Generate Art'}
                </button>
              </form>
            </div>

            {/* Preview Panel */}
            <div className="studio-panel animate-in animate-in-delay-2" id="studio-preview">
              <h3>Art Preview</h3>

              <div className="preview-area">
                {loading && (
                  <div className="loading-overlay">
                    <div className="constructivist-loader">
                      <div className="loader-shapes">
                        <div className="loader-square" />
                        <div className="loader-triangle" />
                      </div>
                      <div className="loading-text">Composing Geometric Vectors...</div>
                    </div>
                  </div>
                )}

                {imageUrl ? (
                  <img src={imageUrl} alt={generatedImage.title} className="preview-image" />
                ) : (
                  <div className="preview-placeholder">
                    <div className="icon">◆</div>
                    <div>Your generated artwork will appear here</div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                      Enter a prompt and click Generate
                    </div>
                  </div>
                )}
              </div>

              {generatedImage && (
                <div style={{ marginTop: 'var(--space-lg)' }}>
                  <div className="card-title">{generatedImage.title}</div>
                  <div className="card-meta" style={{ marginTop: 'var(--space-xs)' }}>
                    <span className="card-badge">{generatedImage.style}</span>
                  </div>
                  <div className="card-prompt" style={{ whiteSpace: 'normal', marginTop: 'var(--space-sm)' }}>
                    "{generatedImage.prompt}"
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
