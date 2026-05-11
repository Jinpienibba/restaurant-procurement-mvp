import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

function formatMoney(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '$0.00';
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function SummaryCard({ label, value, sub }) {
  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '1px rgba(255, 255, 255, 0.2)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        boxShadow: 'none',
        flex: '1 1 160px',
        minWidth: '140px',
      }}
    >
      <span
        style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#E0E0E0',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '1.75rem',
          fontWeight: 800,
          color: '#4DB8C4',
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: '0.78rem', color: '#E0E0E0' }}>{sub}</span>
      )}
    </div>
  );
}

// ─── Potential Savings Card (Eye-catching highlight) ───────────────────────────
function PotentialSavingsCard({ totalSavings, loading, error }) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        border: 'none',
        borderRadius: '12px',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        boxShadow: '0 10px 25px rgba(245, 158, 11, 0.2)',
        color: '#fff',
      }}
    >
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          opacity: 0.9,
        }}
      >
        💰 Total Potential Annual Savings
      </span>
      <span
        style={{
          fontSize: '2.5rem',
          fontWeight: 900,
          lineHeight: 1.1,
        }}
      >
        {loading ? '—' : error ? '—' : formatMoney(totalSavings ?? 0)}
      </span>
      <span style={{ fontSize: '0.85rem', opacity: 0.85 }}>
        By implementing all recommendations
      </span>
    </div>
  );
}

// ─── Quick Action Buttons ─────────────────────────────────────────────────────
function QuickActions() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
      }}
    >
      <Link
        to="/invoices"
        style={{
          padding: '1.25rem 1.5rem',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          textDecoration: 'none',
          color: '#1d4ed8',
          fontWeight: 600,
          textAlign: 'center',
          transition: 'all 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#1d4ed8';
          e.target.style.color = '#fff';
          e.target.style.boxShadow = '0 4px 12px rgba(29, 78, 216, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = '#fff';
          e.target.style.color = '#1d4ed8';
          e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
        }}
      >
        📄 Add Invoice
      </Link>
      <Link
        to="/suppliers"
        style={{
          padding: '1.25rem 1.5rem',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          textDecoration: 'none',
          color: '#1d4ed8',
          fontWeight: 600,
          textAlign: 'center',
          transition: 'all 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#1d4ed8';
          e.target.style.color = '#fff';
          e.target.style.boxShadow = '0 4px 12px rgba(29, 78, 216, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = '#fff';
          e.target.style.color = '#1d4ed8';
          e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
        }}
      >
        🏢 View Suppliers
      </Link>
      <Link
        to="/savings-recommendations"
        style={{
          padding: '1.25rem 1.5rem',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          textDecoration: 'none',
          color: '#1d4ed8',
          fontWeight: 600,
          textAlign: 'center',
          transition: 'all 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#1d4ed8';
          e.target.style.color = '#fff';
          e.target.style.boxShadow = '0 4px 12px rgba(29, 78, 216, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = '#fff';
          e.target.style.color = '#1d4ed8';
          e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
        }}
      >
        💡 View Savings
      </Link>
    </div>
  );
}

export default function Dashboard() {
  const { user, token } = useAuth();

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  const [totalSavings, setTotalSavings] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [recsLoading, setRecsLoading] = useState(true);
  const [recsError, setRecsError] = useState('');

  const loadSummary = useCallback(async () => {
    if (!token) return;
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const data = await api('/api/analytics/dashboard-summary', { token });
      setSummary(data);
    } catch (e) {
      setSummaryError(e.message || 'Failed to load summary');
    } finally {
      setSummaryLoading(false);
    }
  }, [token]);

  const loadSavings = useCallback(async () => {
    if (!token) return;
    setRecsLoading(true);
    setRecsError('');
    try {
      const data = await api('/api/analytics/savings-recommendations', { token });
      setTotalSavings(data.totalPotentialSavings ?? 0);
      setRecommendations(data.recommendations ?? []);
    } catch (e) {
      setRecsError(e.message || 'Failed to load savings');
      setTotalSavings(0);
      setRecommendations([]);
    } finally {
      setRecsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSummary();
    loadSavings();
  }, [loadSummary, loadSavings]);

  const now = new Date();
  const monthName = now.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const topRecommendations = recommendations.slice(0, 5);

  return (
    <div className="gradient-dark" style={{ minHeight: '100vh', padding: '2rem 1.25rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Page Heading */}
        <div className="glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: '2rem' }}>Dashboard</h1>
        </div>

        {/* Stats Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Total Potential Savings */}
          <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#E0E0E0' }}>
              💰 Total Potential Savings
            </span>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#D4AF37', lineHeight: 1.1 }}>
              {summaryLoading ? '—' : formatMoney(totalSavings ?? 0)}
            </span>
          </div>

          {/* Total Spent This Month */}
          <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#E0E0E0' }}>
              💸 Spent This Month
            </span>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1 }}>
              {summaryLoading ? '—' : formatMoney(summary?.totalSpent ?? 0)}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#B0B0B0' }}>{monthName}</span>
          </div>

          {/* Total Invoices */}
          <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#E0E0E0' }}>
              📄 Total Invoices
            </span>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1 }}>
              {summaryLoading ? '—' : (summary?.totalInvoices ?? 0)}
            </span>
          </div>

          {/* Total Suppliers */}
          <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#E0E0E0' }}>
              🏢 Total Suppliers
            </span>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1 }}>
              {summaryLoading ? '—' : (summary?.supplierCount ?? 0)}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 1.5rem', color: '#FFFFFF', fontSize: '1.25rem' }}>Quick Actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <Link
              to="/invoices"
              style={{
                padding: '1rem 1.5rem',
                background: '#4DB8C4',
                border: 'none',
                borderRadius: '8px',
                textDecoration: 'none',
                color: '#1a1a1a',
                fontWeight: 600,
                textAlign: 'center',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#3a9aaa';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#4DB8C4';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              📄 Add Invoice
            </Link>
            <Link
              to="/suppliers"
              style={{
                padding: '1rem 1.5rem',
                background: '#4DB8C4',
                border: 'none',
                borderRadius: '8px',
                textDecoration: 'none',
                color: '#1a1a1a',
                fontWeight: 600,
                textAlign: 'center',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#3a9aaa';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#4DB8C4';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              🏢 View Suppliers
            </Link>
            <Link
              to="/savings-recommendations"
              style={{
                padding: '1rem 1.5rem',
                background: '#4DB8C4',
                border: 'none',
                borderRadius: '8px',
                textDecoration: 'none',
                color: '#1a1a1a',
                fontWeight: 600,
                textAlign: 'center',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#3a9aaa';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#4DB8C4';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              💡 View Savings
            </Link>
          </div>
        </div>

        {/* Top Savings Recommendations */}
        {topRecommendations.length > 0 && (
          <div className="glass" style={{ padding: '2rem' }}>
            <h2 style={{ margin: '0 0 1.5rem', color: '#FFFFFF', fontSize: '1.25rem' }}>Top Savings Recommendations</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.9375rem',
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#FFFFFF', fontWeight: 600 }}>Item</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#FFFFFF', fontWeight: 600 }}>Current Supplier</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#FFFFFF', fontWeight: 600 }}>Recommended Supplier</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#FFFFFF', fontWeight: 600 }}>Potential Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {topRecommendations.map((rec, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <td style={{ padding: '0.75rem', color: '#E0E0E0' }}>{rec.itemName || 'N/A'}</td>
                      <td style={{ padding: '0.75rem', color: '#E0E0E0' }}>{rec.currentSupplier || 'N/A'}</td>
                      <td style={{ padding: '0.75rem', color: '#4DB8C4', fontWeight: 600 }}>{rec.cheapestSupplier || 'N/A'}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#D4AF37', fontWeight: 600 }}>{formatMoney(rec.totalAnnualSavings ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user, token } = useAuth();

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  const [totalSavings, setTotalSavings] = useState(0);
  const [recsLoading, setRecsLoading] = useState(true);
  const [recsError, setRecsError] = useState('');

  const loadSummary = useCallback(async () => {
    if (!token) return;
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const data = await api('/api/analytics/dashboard-summary', { token });
      setSummary(data);
    } catch (e) {
      setSummaryError(e.message || 'Failed to load summary');
    } finally {
      setSummaryLoading(false);
    }
  }, [token]);

  const loadSavings = useCallback(async () => {
    if (!token) return;
    setRecsLoading(true);
    setRecsError('');
    try {
      const data = await api('/api/analytics/savings-recommendations', { token });
      setTotalSavings(data.totalPotentialSavings ?? 0);
    } catch (e) {
      setRecsError(e.message || 'Failed to load savings');
      setTotalSavings(0);
    } finally {
      setRecsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSummary();
    loadSavings();
  }, [loadSummary, loadSavings]);

  const now = new Date();
  const monthName = now.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="page-stack">
      {/* Profile card */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Dashboard</h2>
        {user ? (
          <dl style={{ margin: 0 }}>
            <dt><strong>Email</strong></dt>
            <dd style={{ margin: '0.25rem 0 1rem' }}>{user.email}</dd>
            {user.restaurantName ? (
              <>
                <dt><strong>Restaurant</strong></dt>
                <dd style={{ margin: '0.25rem 0 1rem' }}>{user.restaurantName}</dd>
              </>
            ) : null}
            {user.city || user.state ? (
              <>
                <dt><strong>Location</strong></dt>
                <dd style={{ margin: '0.25rem 0 1rem' }}>
                  {[user.city, user.state].filter(Boolean).join(', ')}
                </dd>
              </>
            ) : null}
          </dl>
        ) : (
          <p>Loading profile…</p>
        )}
      </div>

      {/* Potential Savings Card - Eye-catching highlight */}
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <PotentialSavingsCard
          totalSavings={totalSavings}
          loading={recsLoading}
          error={recsError}
        />
      </div>

      {/* Summary cards */}
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#374151' }}>
          Overview
        </h3>
        {summaryError && (
          <p style={{ color: '#b91c1c', margin: '0 0 0.75rem', fontSize: '0.875rem' }}>
            {summaryError}
          </p>
        )}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <SummaryCard
            label="Total Invoices"
            value={summaryLoading ? '—' : (summary?.totalInvoices ?? 0)}
          />
          <SummaryCard
            label="Spent This Month"
            value={summaryLoading ? '—' : formatMoney(summary?.totalSpent ?? 0)}
            sub={monthName}
          />
          <SummaryCard
            label="Active Suppliers"
            value={summaryLoading ? '—' : (summary?.supplierCount ?? 0)}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#374151' }}>
          Quick Actions
        </h3>
        <QuickActions />
      </div>
    </div>
  );
}
