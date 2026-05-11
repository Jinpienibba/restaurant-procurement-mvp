import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './AuthPages.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from || '/dashboard';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-brand">Procurement</h1>
        
        {error ? <p className="auth-error">{error}</p> : null}
        
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Your email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
          />
          
          <input
            type="password"
            placeholder="Your password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
          />
          
          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        
        <p className="auth-footer-text">
          Need an account? <Link to="/signup" className="auth-footer-link">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
