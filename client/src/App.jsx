import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import MagicLinkLogin from './pages/MagicLinkLogin';
import Gallery from './pages/Gallery';
import Studio from './pages/Studio';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <span className="footer-text">
          ◆ Constructivist AI Art Studio — {new Date().getFullYear()}
        </span>
        <span className="footer-text">
          Inspired by the Russian Avant-Garde
        </span>
      </div>
    </footer>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <main className="page-content">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ForgotPassword />} />
            <Route path="/auth/magic-link/:token" element={<MagicLinkLogin />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route
              path="/studio"
              element={
                <ProtectedRoute>
                  <Studio />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly={true}>
                  <Admin />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        <Footer />
      </Router>
    </AuthProvider>
  );
}

export default App;
