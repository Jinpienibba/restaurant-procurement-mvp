import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="card">
      <h1 style={{ marginTop: 0 }}>Restaurant supplier procurement</h1>
      <p>Frontend dev server proxies <code>/api</code> to the backend on port 5000.</p>
      <p>
        <Link to="/signup">Sign up</Link>
        {' · '}
        <Link to="/login">Log in</Link>
      </p>
      <p>
        <Link to="/dashboard">Dashboard</Link> (requires login)
      </p>
    </div>
  );
}
