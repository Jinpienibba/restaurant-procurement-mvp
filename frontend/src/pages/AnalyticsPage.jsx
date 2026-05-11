import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

const TABS = [
  { id: 'comparison', label: 'Price comparison' },
  { id: 'overspend', label: 'Overspend analysis' },
];

const PERIOD_OPTIONS = [
  { label: 'Last 7 days',  value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 60 days', value: 60 },
  { label: 'Last 90 days', value: 90 },
];

function formatMoney(value) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function formatPercent(value) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toFixed(2) + '%';
}

// ─── Price Comparison Table ───────────────────────────────────────────────────
// Backend returns:
// {
//   calculatedAt, period, days,
//   items: [
//     {
//       item_name, unit,
//       suppliers: [{ supplier_name, avg_price, latest_price, invoice_count, std_dev }, ...],
//       cheapest_supplier, most_expensive_supplier,
//       potential_savings_per_unit, savings_message
//     }, ...
//   ]
// }
function PriceComparisonTable({ data, period }) {
  const rows = data?.items ?? [];

  if (rows.length === 0) {
    return (
      <p style={{ margin: '1rem 0 0', color: '#64748b' }}>
        No price comparison data for the <strong>{period}</strong>. Upload invoices from
        multiple suppliers to see side-by-side pricing.
      </p>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Unit</th>
            <th>Supplier</th>
            <th className="num">Latest price</th>
            <th className="num">Avg price</th>
            <th className="num">Std dev</th>
            <th className="num">Invoices</th>
            <th className="num">Savings potential</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
            const suppliers = Array.isArray(item.suppliers) ? item.suppliers : [];
            const savings = item.potential_savings_per_unit ?? 0;
            const rowSpan = suppliers.length || 1;

            if (suppliers.length === 0) {
              return (
                <tr key={item.item_name}>
                  <td>{item.item_name ?? '—'}</td>
                  <td>{item.unit ?? '—'}</td>
                  <td>—</td>
                  <td className="num">—</td>
                  <td className="num">—</td>
                  <td className="num">—</td>
                  <td className="num">—</td>
                  <td className="num">—</td>
                </tr>
              );
            }

            return suppliers.map((sup, supIdx) => {
              const isCheapest = sup.supplier_name === item.cheapest_supplier;
              return (
                <tr
                  key={`${item.item_name}-${sup.supplier_name}`}
                  style={isCheapest ? { background: '#f0fdf4' } : undefined}
                >
                  {/* Item name + unit only on first supplier row */}
                  {supIdx === 0 && (
                    <>
                      <td rowSpan={rowSpan} style={{ verticalAlign: 'top', fontWeight: 600 }}>
                        {item.item_name ?? '—'}
                      </td>
                      <td rowSpan={rowSpan} style={{ verticalAlign: 'top', color: '#64748b' }}>
                        {item.unit ?? '—'}
                      </td>
                    </>
                  )}
                  <td>
                    {sup.supplier_name}
                    {isCheapest && (
                      <span
                        style={{
                          marginLeft: '0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#16a34a',
                          background: '#dcfce7',
                          padding: '1px 6px',
                          borderRadius: '999px',
                        }}
                      >
                        cheapest
                      </span>
                    )}
                  </td>
                  <td className="num">{formatMoney(sup.latest_price)}</td>
                  <td className="num" style={{ color: '#64748b' }}>
                    {formatMoney(sup.avg_price)}
                  </td>
                  <td className="num" style={{ color: sup.std_dev > 0 ? '#b45309' : '#64748b', fontSize: '0.85rem' }}>
                    {sup.std_dev > 0 ? `±${formatMoney(sup.std_dev)}` : '—'}
                  </td>
                  <td className="num" style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    {sup.invoice_count}
                  </td>
                  {/* Savings only on first supplier row */}
                  {supIdx === 0 && (
                    <td
                      className="num"
                      rowSpan={rowSpan}
                      style={{
                        verticalAlign: 'top',
                        fontWeight: savings > 0 ? 600 : undefined,
                        color: savings > 0 ? '#16a34a' : '#64748b',
                      }}
                    >
                      {item.savings_message
                        ? item.savings_message
                        : savings > 0
                        ? `${formatMoney(savings)} / unit`
                        : '—'}
                    </td>
                  )}
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Overspend Table ──────────────────────────────────────────────────────────
function OverspendTable({ rows }) {
  if (rows.length === 0) {
    return (
      <p style={{ margin: '1rem 0 0', color: '#64748b' }}>
        No overspend detected in the last 90 days. Either you're getting great prices or
        there isn't enough data yet.
      </p>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Supplier</th>
            <th className="num">Price paid</th>
            <th className="num">Market avg</th>
            <th className="num">Overpaid / unit</th>
            <th className="num">% overpaid</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const pct = Number(row.overpay_percent ?? 0);
            const isHighOverpay = pct > 5;
            return (
              <tr key={`${row.item_name}-${row.supplier_name}-${idx}`}>
                <td style={{ fontWeight: 600 }}>{row.item_name ?? '—'}</td>
                <td>{row.supplier_name ?? '—'}</td>
                <td className="num">{formatMoney(row.current_price)}</td>
                <td className="num" style={{ color: '#64748b' }}>
                  {formatMoney(row.market_average)}
                </td>
                <td className="num" style={{ color: '#b45309', fontWeight: 600 }}>
                  +{formatMoney(row.overpay_per_unit)}
                </td>
                <td
                  className="num"
                  style={{
                    fontWeight: 700,
                    color: isHighOverpay ? '#b91c1c' : '#92400e',
                  }}
                >
                  {formatPercent(pct)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState('comparison');
  const [days, setDays] = useState(30);
  const [comparisonData, setComparisonData] = useState(null);
  const [overspends, setOverspends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (selectedDays) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [compData, overspendData] = await Promise.all([
        api(`/api/analytics/price-comparison?days=${selectedDays}`, { token }),
        api('/api/analytics/overspend', { token }),
      ]);
      setComparisonData(compData && typeof compData === 'object' && !Array.isArray(compData)
        ? compData
        : { items: Array.isArray(compData) ? compData : [], period: `last ${selectedDays} days` });
      setOverspends(Array.isArray(overspendData) ? overspendData : []);
    } catch (e) {
      setError(e.message || 'Failed to load analytics');
      setComparisonData(null);
      setOverspends([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load(days);
  }, [load, days]);

  const handleDaysChange = (e) => {
    const newDays = Number(e.target.value);
    setDays(newDays);
  };

  const calculatedAt = comparisonData?.calculatedAt
    ? new Date(comparisonData.calculatedAt).toLocaleString()
    : null;

  const period = comparisonData?.period ?? `last ${days} days`;

  return (
    <div className="page-stack analytics-page">
      <div className="card">
        <div className="section-head">
          <h2 style={{ margin: 0 }}>Analytics</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {tab === 'comparison' && (
              <select
                value={days}
                onChange={handleDaysChange}
                disabled={loading}
                style={{
                  padding: '0.35rem 0.6rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
            <button type="button" className="secondary" onClick={() => load(days)} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>
        <p style={{ margin: '0.5rem 0 0', color: '#64748b', fontSize: '0.95rem' }}>
          Detailed pricing analysis and overspend detection across your suppliers.
        </p>

        {error ? (
          <p className="error" style={{ marginTop: '0.75rem' }}>
            {error}
          </p>
        ) : null}

        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`tab ${tab === t.id ? 'tab-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ margin: '1rem 0 0', color: '#64748b' }}>Loading…</p>
        ) : tab === 'comparison' ? (
          <>
            {!loading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  margin: '0.75rem 0 1rem',
                  padding: '0.5rem 0.75rem',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.85rem',
                  color: '#475569',
                }}
              >
                <span>
                  Showing prices for <strong>{period}</strong>
                  {comparisonData?.items?.length != null && (
                    <> — <strong>{comparisonData.items.length}</strong> item{comparisonData.items.length !== 1 ? 's' : ''} with 2+ suppliers</>
                  )}
                </span>
                {calculatedAt && (
                  <span style={{ color: '#94a3b8' }}>
                    Calculated at {calculatedAt}
                  </span>
                )}
              </div>
            )}
            <PriceComparisonTable data={comparisonData} period={period} />
          </>
        ) : (
          <OverspendTable rows={overspends} />
        )}
      </div>
    </div>
  );
}
