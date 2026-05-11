import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

function formatMoney(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '$0.00';
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

// ─── Total Savings Card ───────────────────────────────────────────────────────
function TotalSavingsCard({ totalSavings, loading, error }) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        border: 'none',
        borderRadius: '12px',
        padding: '3rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        boxShadow: '0 10px 30px rgba(16, 185, 129, 0.25)',
        color: '#fff',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          fontSize: '0.85rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          opacity: 0.9,
        }}
      >
        💰 Total Potential Annual Savings
      </span>
      <span
        style={{
          fontSize: '3.5rem',
          fontWeight: 900,
          lineHeight: 1.1,
        }}
      >
        {loading ? '—' : error ? '—' : formatMoney(totalSavings ?? 0)}
      </span>
      <span style={{ fontSize: '0.95rem', opacity: 0.85 }}>
        By implementing all recommendations
      </span>
    </div>
  );
}

// ─── Recommendations Table ────────────────────────────────────────────────────
function RecommendationsTable({ recommendations, loading, error }) {
  if (loading) {
    return (
      <p style={{ margin: '2rem 0', color: '#64748b', textAlign: 'center' }}>
        Loading recommendations…
      </p>
    );
  }

  if (error) {
    return (
      <p style={{ margin: '2rem 0', color: '#b91c1c', textAlign: 'center' }}>
        {error}
      </p>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <p style={{ margin: '2rem 0', color: '#64748b', textAlign: 'center' }}>
        No recommendations yet. Upload invoices from multiple suppliers to see potential savings.
      </p>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Current Supplier → Recommended</th>
            <th className="num">Save per unit</th>
            <th className="num">Monthly savings</th>
            <th className="num">Annual savings</th>
          </tr>
        </thead>
        <tbody>
          {recommendations.map((rec, idx) => (
            <tr key={idx}>
              <td style={{ fontWeight: 600 }}>{rec.itemName}</td>
              <td>
                <span style={{ color: '#b91c1c', fontWeight: 500 }}>
                  {rec.currentSupplier}
                </span>
                {' → '}
                <span style={{ color: '#16a34a', fontWeight: 600 }}>
                  {rec.cheapestSupplier}
                </span>
              </td>
              <td className="num" style={{ fontWeight: 700, color: '#10b981' }}>
                {formatMoney(rec.savingsPerUnit)}
              </td>
              <td className="num" style={{ color: '#059669', fontWeight: 600 }}>
                {formatMoney(rec.estimatedMonthlySavings)}
              </td>
              <td className="num" style={{ fontWeight: 700, color: '#10b981', fontSize: '1.05rem' }}>
                {formatMoney(rec.totalAnnualSavings)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SavingsRecommendationsPage() {
  const { token } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await api('/api/analytics/savings-recommendations', { token });
      // Recommendations are already sorted by annual savings (biggest first) from backend
      setRecommendations(data.recommendations ?? []);
      setTotalSavings(data.totalPotentialSavings ?? 0);
    } catch (e) {
      setError(e.message || 'Failed to load recommendations');
      setRecommendations([]);
      setTotalSavings(0);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page-stack">
      <div className="card">
        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Savings Recommendations</h2>
        <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.95rem' }}>
          Review all potential savings opportunities by switching to cheaper suppliers. 
          Click "Accept" to implement a recommendation.
        </p>

        {/* Total Savings Card */}
        <div style={{ marginBottom: '2rem' }}>
          <TotalSavingsCard
            totalSavings={totalSavings}
            loading={loading}
            error={error}
          />
        </div>

        {/* Recommendations Table */}
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#374151' }}>
            All Recommendations
            {!loading && recommendations.length > 0 && (
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 400, marginLeft: '0.5rem' }}>
                ({recommendations.length} item{recommendations.length !== 1 ? 's' : ''})
              </span>
            )}
          </h3>
          <RecommendationsTable
            recommendations={recommendations}
            loading={loading}
            error={error}
          />
        </div>

        {/* Info section */}
        {!loading && recommendations.length > 0 && (
          <div
            style={{
              marginTop: '2rem',
              padding: '1rem',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: '#166534',
            }}
          >
            <strong>💡 Tip:</strong> Start with the highest annual savings recommendations. 
            Even implementing just the top 3-5 can result in significant cost reductions.
          </div>
        )}
      </div>
    </div>
  );
}
