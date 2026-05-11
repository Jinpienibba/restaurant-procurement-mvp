import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './AuthPages.css';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [city, setCity] = useState('');
  const [state, setStateField] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup({
        email: email.trim(),
        password,
        restaurantName: restaurantName.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Signup failed');
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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
          />
          
          <input
            type="text"
            placeholder="Restaurant name (optional)"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            className="auth-input"
          />
          
          <input
            type="text"
            placeholder="City (optional)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="auth-input"
          />
          
          <input
            type="text"
            placeholder="State (optional)"
            value={state}
            onChange={(e) => setStateField(e.target.value)}
            className="auth-input"
          />
          
          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Creating…' : 'Create Account'}
          </button>
        </form>
        
        <p className="auth-footer-text">
          Already registered? <Link to="/login" className="auth-footer-link">Log in</Link>
        </p>
      </div>
    </div>
  );
}
