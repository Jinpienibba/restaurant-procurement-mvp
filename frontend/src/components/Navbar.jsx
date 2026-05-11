import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();

  const linkClass = ({ isActive }) =>
    ['nav-link', isActive ? 'nav-link-active' : ''].filter(Boolean).join(' ');

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <NavLink className={linkClass} to="/" end>
          Procurement
        </NavLink>
      </div>

      {!isAuthenticated ? (
        <nav className="navbar-actions">
          <NavLink className={linkClass} to="/login">
            Log in
          </NavLink>
          <NavLink className={linkClass} to="/signup">
            Sign up
          </NavLink>
        </nav>
      ) : (
        <nav className="navbar-actions">
          <NavLink className={linkClass} to="/dashboard">
            Dashboard
          </NavLink>
          <NavLink className={linkClass} to="/invoices">
            Invoices
          </NavLink>
          <NavLink className={linkClass} to="/suppliers">
            Suppliers
          </NavLink>
          <NavLink className={linkClass} to="/savings-recommendations">
            Savings
          </NavLink>
          <NavLink className={linkClass} to="/analytics">
            Analytics
          </NavLink>
          <button type="button" className="secondary navbar-logout" onClick={logout}>
            Log out
          </button>
        </nav>
      )}
    </header>
  );
}
