import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import GeometricBackground from '../components/GeometricBackground';

const API_URL = '/api';

export default function Admin() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, []);

  async function fetchAdminData() {
    setLoading(true);
    setError('');
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();

      if (!statsRes.ok) throw new Error(statsData.error);
      if (!usersRes.ok) throw new Error(usersData.error);

      setStats(statsData.stats);
      setUsers(usersData.users);
    } catch (err) {
      setError(err.message || 'Failed to load admin panel data');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleRole(userId, currentIsAdmin) {
    const actionText = currentIsAdmin ? 'revoke admin access from' : 'grant admin access to';
    if (!confirm(`Are you sure you want to ${actionText} User #${userId}?`)) return;

    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage(data.message);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: data.is_admin } : u));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteUser(userId, username) {
    if (!confirm(`CAUTION: Delete account @${username} (ID #${userId}) and all associated art?`)) return;

    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage(data.message);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      setError(err.message);
    }
  }

  const filteredUsers = users.filter(u => 
    u.id.toString().includes(searchTerm) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <GeometricBackground />
      <div className="page-content" style={{ position: 'relative', zIndex: 2 }}>
        <div className="container-wide" style={{ paddingTop: 'var(--space-2xl)', paddingBottom: 'var(--space-4xl)' }}>
          
          <div className="section-header animate-in">
            <h2>System <span className="text-red">Admin Control</span></h2>
            <div className="section-divider"></div>
            <p>Manage user accounts, monitor system IDs, and control access permissions</p>
          </div>

          {error && <div className="alert alert-error animate-in">{error}</div>}
          {message && <div className="alert alert-success animate-in">{message}</div>}

          {/* Admin Stats Overview */}
          {stats && (
            <div className="stats-row animate-in animate-in-delay-1">
              <div className="stat-card admin-stat-card">
                <div className="stat-value text-red">{stats.total_users}</div>
                <div className="stat-label">Total Registered Users</div>
              </div>
              <div className="stat-card admin-stat-card">
                <div className="stat-value text-gold">{stats.total_admins}</div>
                <div className="stat-label">System Admins</div>
              </div>
              <div className="stat-card admin-stat-card">
                <div className="stat-value text-cream">{stats.total_images}</div>
                <div className="stat-label">Generated Works</div>
              </div>
            </div>
          )}

          {/* Admin Notice */}
          <div className="admin-notice-banner animate-in animate-in-delay-2">
            <div className="notice-icon">🛡️</div>
            <div>
              <h4>Admin Privacy Privilege Active</h4>
              <p>As an administrator, creator usernames and user IDs are visible to you across the Public Gallery and Studio. Regular users will not see creator names.</p>
            </div>
          </div>

          {/* User Management Section */}
          <div className="admin-panel-card animate-in animate-in-delay-3">
            <div className="admin-panel-header">
              <h3>User Directory & Permissions</h3>
              
              <div className="search-box">
                <input
                  type="text"
                  className="form-input search-input"
                  placeholder="Search by ID, Username or Email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  id="admin-search-users"
                />
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-3xl)' }}>
                <div className="spinner"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-2xl)' }}>
                <p>No user accounts match your search.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>Username</th>
                      <th>Email Address</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Artworks</th>
                      <th>Joined Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <span className="user-id-badge">#{u.id}</span>
                        </td>
                        <td>
                          <strong className="text-cream">@{u.username}</strong>
                        </td>
                        <td className="text-mono text-muted">{u.email}</td>
                        <td>
                          {u.is_admin ? (
                            <span className="role-badge admin-badge">🛡️ Admin</span>
                          ) : (
                            <span className="role-badge user-badge">Member</span>
                          )}
                        </td>
                        <td>
                          {u.is_verified ? (
                            <span className="status-indicator verified">Verified</span>
                          ) : (
                            <span className="status-indicator pending">Pending</span>
                          )}
                        </td>
                        <td className="text-mono">{u.image_count} works</td>
                        <td className="text-mono text-muted" style={{ fontSize: '0.8rem' }}>
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="action-button-group">
                            <button
                              className={`btn btn-sm ${u.is_admin ? 'btn-ghost' : 'btn-gold'}`}
                              onClick={() => handleToggleRole(u.id, u.is_admin)}
                              title={u.is_admin ? 'Demote to regular user' : 'Promote to Admin'}
                              id={`toggle-role-${u.id}`}
                            >
                              {u.is_admin ? 'Demote' : 'Make Admin'}
                            </button>

                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              title="Delete user account"
                              id={`delete-user-${u.id}`}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
