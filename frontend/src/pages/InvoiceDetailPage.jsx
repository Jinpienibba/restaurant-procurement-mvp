import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

const UNITS = ['lb', 'case', 'gallon', 'unit', 'oz', 'kg', 'liter', 'dozen'];

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

function calcTotal(items) {
  return items.reduce((sum, item) => {
    const tp = parseFloat(item.total_price ?? 0);
    return sum + (Number.isNaN(tp) ? 0 : tp);
  }, 0);
}

function emptyNewItem() {
  return { itemName: '', quantity: '', unit: 'unit', unitPrice: '', category: '' };
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const invoiceId = id;
  const { token } = useAuth();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Add new item state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState(emptyNewItem());
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const load = useCallback(async () => {
    if (!token || !invoiceId) return;
    setLoading(true);
    setError('');
    try {
      const data = await api(`/api/invoices/${invoiceId}`, { token });
      setInvoice(data);
      setLineItems(Array.isArray(data.lineItems) ? data.lineItems : []);
    } catch (e) {
      setError(e.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [token, invoiceId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Edit helpers ──────────────────────────────────────────────────────────
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      itemName:  item.item_name  ?? '',
      quantity:  item.quantity   ?? '',
      unit:      item.unit       ?? 'unit',
      unitPrice: item.unit_price ?? '',
      category:  item.category   ?? '',
    });
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setEditError('');
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveEdit = async (itemId) => {
    setSaving(true);
    setEditError('');
    try {
      const qty   = parseFloat(editForm.quantity)  || 0;
      const price = parseFloat(editForm.unitPrice) || 0;
      const updated = await api(`/api/invoices/line-items/${itemId}`, {
        method: 'PUT',
        token,
        body: {
          itemName:  editForm.itemName,
          quantity:  qty,
          unit:      editForm.unit,
          unitPrice: price,
          category:  editForm.category || null,
        },
      });
      // Update local state instantly
      setLineItems((prev) =>
        prev.map((li) => (li.id === itemId ? updated : li))
      );
      setEditingId(null);
    } catch (e) {
      setEditError(e.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete line item ──────────────────────────────────────────────────────
  const deleteItem = async (itemId) => {
    if (!window.confirm('Delete this line item?')) return;
    try {
      await api(`/api/invoices/line-items/${itemId}`, {
        method: 'DELETE',
        token,
      });
      setLineItems((prev) => prev.filter((li) => li.id !== itemId));
    } catch (e) {
      alert(e.message || 'Failed to delete line item');
    }
  };

  // ── Add new line item ─────────────────────────────────────────────────────
  const handleNewItemChange = (field, value) => {
    setNewItem((prev) => ({ ...prev, [field]: value }));
  };

  const submitNewItem = async (e) => {
    e.preventDefault();
    setAdding(true);
    setAddError('');
    try {
      const qty   = parseFloat(newItem.quantity)  || 0;
      const price = parseFloat(newItem.unitPrice) || 0;
      const created = await api(`/api/invoices/${invoiceId}/line-items`, {
        method: 'POST',
        token,
        body: {
          itemName:  newItem.itemName.trim(),
          quantity:  qty,
          unit:      newItem.unit,
          unitPrice: price,
          category:  newItem.category.trim() || null,
        },
      });
      setLineItems((prev) => [...prev, created]);
      setNewItem(emptyNewItem());
      setShowAddForm(false);
    } catch (e) {
      setAddError(e.message || 'Failed to add line item');
    } finally {
      setAdding(false);
    }
  };

  // ── Derived total (always computed from local state) ──────────────────────
  const total = calcTotal(lineItems);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-stack">
        <p style={{ color: '#64748b' }}>Loading invoice…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <p className="error">{error}</p>
        <button className="secondary" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="page-stack">
      {/* Back button */}
      <div>
        <button
          className="secondary"
          onClick={() => navigate('/dashboard')}
          style={{ fontSize: '0.9rem', padding: '0.4rem 0.85rem' }}
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Invoice header */}
      <section className="card">
        <h2 style={{ margin: '0 0 1rem' }}>Invoice Detail</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '0.75rem 1.5rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Supplier
            </div>
            <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>
              {invoice?.supplier_name ?? '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Invoice Date
            </div>
            <div style={{ marginTop: '0.2rem' }}>{formatDate(invoice?.invoice_date)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Invoice #
            </div>
            <div style={{ marginTop: '0.2rem', fontFamily: 'ui-monospace, monospace', fontSize: '0.9rem' }}>
              {invoice?.invoice_number ?? '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Cost
            </div>
            <div style={{ marginTop: '0.2rem', fontWeight: 700, fontSize: '1.1rem', color: '#1d4ed8' }}>
              {formatMoney(total)}
            </div>
          </div>
        </div>
      </section>

      {/* Line items */}
      <section className="card">
        <div className="section-head" style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Line Items</h3>
          <button
            type="button"
            className="secondary"
            onClick={() => { setShowAddForm((v) => !v); setAddError(''); }}
            style={{ fontSize: '0.875rem', padding: '0.4rem 0.85rem' }}
          >
            {showAddForm ? 'Cancel' : '+ Add Item'}
          </button>
        </div>

        {/* Add new item form */}
        {showAddForm && (
          <form
            onSubmit={submitNewItem}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
            }}
          >
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem' }}>New Line Item</h4>
            {addError && <p className="error">{addError}</p>}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '0.5rem 0.75rem',
                marginBottom: '0.75rem',
              }}
            >
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.78rem' }}>Item Name *</label>
                <input
                  type="text"
                  value={newItem.itemName}
                  onChange={(e) => handleNewItemChange('itemName', e.target.value)}
                  placeholder="e.g. Chicken breast"
                  required
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.78rem' }}>Qty</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={newItem.quantity}
                  onChange={(e) => handleNewItemChange('quantity', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.78rem' }}>Unit</label>
                <select
                  value={newItem.unit}
                  onChange={(e) => handleNewItemChange('unit', e.target.value)}
                  style={{ padding: '0.5rem 0.4rem', border: '1px solid #cbd5e1', borderRadius: '8px', font: 'inherit', background: '#fff' }}
                >
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.78rem' }}>Unit Price ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.unitPrice}
                  onChange={(e) => handleNewItemChange('unitPrice', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.78rem' }}>Category</label>
                <input
                  type="text"
                  value={newItem.category}
                  onChange={(e) => handleNewItemChange('category', e.target.value)}
                  placeholder="optional"
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" disabled={adding} style={{ fontSize: '0.875rem', padding: '0.4rem 0.85rem' }}>
                {adding ? 'Adding…' : 'Add Item'}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => { setShowAddForm(false); setAddError(''); setNewItem(emptyNewItem()); }}
                style={{ fontSize: '0.875rem', padding: '0.4rem 0.85rem' }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {lineItems.length === 0 ? (
          <p style={{ color: '#64748b', margin: '0.5rem 0' }}>No line items yet.</p>
        ) : (
          <div className="table-wrap" style={{ marginTop: 0 }}>
            <table className="data-table" style={{ minWidth: '680px' }}>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th className="num">Unit Price</th>
                  <th className="num">Total Price</th>
                  <th>Category</th>
                  <th style={{ width: '120px' }}></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) =>
                  editingId === item.id ? (
                    // ── Edit row ──────────────────────────────────────────
                    <tr key={item.id} style={{ background: '#eff6ff' }}>
                      <td>
                        <input
                          type="text"
                          value={editForm.itemName}
                          onChange={(e) => handleEditChange('itemName', e.target.value)}
                          style={{ width: '100%', minWidth: '120px' }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={editForm.quantity}
                          onChange={(e) => handleEditChange('quantity', e.target.value)}
                          style={{ width: '70px' }}
                        />
                      </td>
                      <td>
                        <select
                          value={editForm.unit}
                          onChange={(e) => handleEditChange('unit', e.target.value)}
                          style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '8px', font: 'inherit', background: '#fff' }}
                        >
                          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      <td className="num">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editForm.unitPrice}
                          onChange={(e) => handleEditChange('unitPrice', e.target.value)}
                          style={{ width: '90px', textAlign: 'right' }}
                        />
                      </td>
                      <td className="num" style={{ fontWeight: 600 }}>
                        {formatMoney(
                          (parseFloat(editForm.quantity) || 0) *
                          (parseFloat(editForm.unitPrice) || 0)
                        )}
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editForm.category}
                          onChange={(e) => handleEditChange('category', e.target.value)}
                          placeholder="optional"
                          style={{ width: '100%' }}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => saveEdit(item.id)}
                            disabled={saving}
                            style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', background: '#16a34a' }}
                          >
                            {saving ? '…' : 'Save'}
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            onClick={cancelEdit}
                            disabled={saving}
                            style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                        {editError && (
                          <p className="error" style={{ margin: '0.25rem 0 0', fontSize: '0.78rem' }}>
                            {editError}
                          </p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    // ── Read row ──────────────────────────────────────────
                    <tr key={item.id}>
                      <td>{item.item_name || '—'}</td>
                      <td>{item.quantity ?? '—'}</td>
                      <td>{item.unit ?? '—'}</td>
                      <td className="num">{formatMoney(item.unit_price)}</td>
                      <td className="num" style={{ fontWeight: 600 }}>
                        {formatMoney(item.total_price)}
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.875rem' }}>
                        {item.category ?? '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => startEdit(item)}
                            style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteItem(item.id)}
                            style={{
                              fontSize: '0.8rem',
                              padding: '0.3rem 0.6rem',
                              background: '#b91c1c',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, paddingTop: '0.75rem', borderTop: '2px solid #e2e8f0' }}>
                    Total
                  </td>
                  <td className="num" style={{ fontWeight: 700, fontSize: '1rem', color: '#1d4ed8', borderTop: '2px solid #e2e8f0' }}>
                    {formatMoney(total)}
                  </td>
                  <td colSpan={2} style={{ borderTop: '2px solid #e2e8f0' }} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
