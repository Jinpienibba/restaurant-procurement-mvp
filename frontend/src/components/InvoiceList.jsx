import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

function formatMoney(value) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function invoiceRow(inv) {
  const id = inv.id ?? inv.invoice_id;
  const date = inv.invoice_date ?? inv.invoiceDate;
  const number = inv.invoice_number ?? inv.invoiceNumber;
  const total = inv.total_cost ?? inv.totalCost;
  const supplier =
    inv.supplier_name ??
    inv.supplierName ??
    inv.supplier?.name ??
    '—';

  return { id, date, number, total, supplier };
}

const InvoiceList = forwardRef(function InvoiceList({ title = 'Invoices' }, ref) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await api('/api/invoices', { token });
      const list = Array.isArray(data) ? data : data?.invoices ?? data?.results ?? [];
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e.message || 'Failed to load invoices');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleDelete = useCallback(async (invoiceId, supplierName, e) => {
    e.stopPropagation();
    
    const confirmed = window.confirm(
      `Are you sure you want to delete this invoice from ${supplierName}? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    setDeleting(invoiceId);
    try {
      await api(`/api/invoices/${invoiceId}`, { 
        token, 
        method: 'DELETE' 
      });
      // Remove from list
      setItems(prev => prev.filter(inv => inv.id !== invoiceId));
    } catch (e) {
      setError(e.message || 'Failed to delete invoice');
    } finally {
      setDeleting(null);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useImperativeHandle(ref, () => ({ load }), [load]);

  const rows = useMemo(() => items.map(invoiceRow), [items]);

  return (
    <section className="card invoice-list-card">
      <div className="section-head">
        <h3 style={{ margin: 0 }}>{title}</h3>
        <button type="button" className="secondary" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {loading ? (
        <p style={{ margin: '0.75rem 0 0', color: '#64748b' }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ margin: '0.75rem 0 0', color: '#64748b' }}>No invoices yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Invoice #</th>
                <th className="num">Total</th>
                <th style={{ textAlign: 'center', width: '60px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id || `${row.number}-${row.date}`}
                  onClick={() => row.id && navigate(`/invoices/${row.id}`)}
                  style={{ cursor: row.id ? 'pointer' : 'default' }}
                  title={row.id ? 'View invoice details' : undefined}
                >
                  <td className="mono">{String(row.id || '—').slice(0, 8)}…</td>
                  <td>{row.supplier}</td>
                  <td>{formatDate(row.date)}</td>
                  <td className="mono">{row.number || '—'}</td>
                  <td className="num">{formatMoney(row.total)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(row.id, row.supplier, e)}
                      disabled={deleting === row.id}
                      style={{
                        padding: '0.35rem 0.6rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#fff',
                        background: '#ef4444',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: deleting === row.id ? 'not-allowed' : 'pointer',
                        opacity: deleting === row.id ? 0.6 : 1,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (deleting !== row.id) {
                          e.target.style.background = '#dc2626';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#ef4444';
                      }}
                      title="Delete invoice"
                    >
                      {deleting === row.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
});

export default InvoiceList;
