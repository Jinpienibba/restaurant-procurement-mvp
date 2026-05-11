import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

const UNITS = ['lb', 'case', 'gallon', 'unit', 'oz'];

function emptyItem() {
  return { itemName: '', quantity: '', unit: 'unit', unitPrice: '', category: '' };
}

export default function InvoiceUploadForm({ onSuccess }) {
  const { token } = useAuth();

  // Suppliers
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [suppliersError, setSuppliersError] = useState('');

  // Form fields
  const [supplierId, setSupplierId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [lineItems, setLineItems] = useState([emptyItem()]);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch suppliers on mount
  const loadSuppliers = useCallback(async () => {
    if (!token) return;
    setSuppliersLoading(true);
    setSuppliersError('');
    try {
      const data = await api('/api/suppliers', { token });
      const list = Array.isArray(data) ? data : data?.suppliers ?? data?.results ?? [];
      setSuppliers(list);
      if (list.length > 0) setSupplierId(String(list[0].id));
    } catch (e) {
      setSuppliersError(e.message || 'Failed to load suppliers');
    } finally {
      setSuppliersLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // Line item helpers
  const updateItem = (index, field, value) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addItem = () => setLineItems((prev) => [...prev, emptyItem()]);

  const removeItem = (index) =>
    setLineItems((prev) => prev.filter((_, i) => i !== index));

  const calcTotal = (qty, price) => {
    const q = parseFloat(qty);
    const p = parseFloat(price);
    if (Number.isNaN(q) || Number.isNaN(p)) return '';
    return (q * p).toFixed(2);
  };

  // Reset form
  const resetForm = () => {
    setSupplierId(suppliers.length > 0 ? String(suppliers[0].id) : '');
    setInvoiceDate('');
    setInvoiceNumber('');
    setLineItems([emptyItem()]);
    setError('');
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate supplier
    if (!supplierId) {
      setError('Please select a supplier.');
      return;
    }

    // Validate invoice date
    if (!invoiceDate) {
      setError('Invoice date is required.');
      return;
    }

    // Validate line items exist
    if (lineItems.length === 0) {
      setError('Add at least one line item.');
      return;
    }

    // Validate each line item
    const errors = [];
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      const itemNum = i + 1;

      // Item name required
      if (!item.itemName || !item.itemName.trim()) {
        errors.push(`Line item ${itemNum}: Item name is required.`);
      }

      // Quantity required and > 0
      const qty = parseFloat(item.quantity);
      if (!item.quantity || Number.isNaN(qty) || qty <= 0) {
        errors.push(`Line item ${itemNum}: Quantity must be greater than 0.`);
      }

      // Unit required
      if (!item.unit) {
        errors.push(`Line item ${itemNum}: Unit is required.`);
      }

      // Unit price required and > 0
      const price = parseFloat(item.unitPrice);
      if (!item.unitPrice || Number.isNaN(price) || price <= 0) {
        errors.push(`Line item ${itemNum}: Unit price must be greater than 0.`);
      }
    }

    if (errors.length > 0) {
      setError(errors.join(' '));
      return;
    }

    const payload = {
      supplierId,
      invoiceDate,
      invoiceNumber: invoiceNumber.trim() || null,
      lineItems: lineItems.map((item) => ({
        itemName: item.itemName.trim(),
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        unitPrice: parseFloat(item.unitPrice),
        totalPrice: parseFloat(calcTotal(item.quantity, item.unitPrice)) || 0,
        category: item.category.trim() || null,
      })),
    };

    setSubmitting(true);
    try {
      await api('/api/invoices', {
        method: 'POST',
        token,
        body: payload,
      });
      setSuccess('Invoice submitted successfully!');
      resetForm();
      if (onSuccess) onSuccess();
    } catch (e) {
      setError(e.message || 'Failed to submit invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card">
      <div className="section-head" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0 }}>New Invoice</h3>
      </div>

      {suppliersError && <p className="error">{suppliersError}</p>}
      {error && <p className="error">{error}</p>}
      {success && (
        <p style={{ color: '#15803d', fontSize: '0.9rem', marginBottom: '1rem' }}>
          {success}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Supplier */}
        <div className="form-group">
          <label htmlFor="inv-supplier">Supplier *</label>
          {suppliersLoading ? (
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Loading suppliers…</p>
          ) : suppliers.length === 0 ? (
            <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.9rem' }}>
              No suppliers found. Add a supplier first.
            </p>
          ) : (
            <select
              id="inv-supplier"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
              style={{
                padding: '0.5rem 0.65rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                font: 'inherit',
                background: '#fff',
              }}
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Invoice date + number */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0 1rem',
          }}
        >
          <div className="form-group">
            <label htmlFor="inv-date">Invoice Date *</label>
            <input
              id="inv-date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="inv-number">Invoice Number</label>
            <input
              id="inv-number"
              type="text"
              placeholder="e.g. INV-001"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>
        </div>

        {/* Line items */}
        <div style={{ marginBottom: '1rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
            }}
          >
            <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Line Items *</label>
            <button
              type="button"
              className="secondary"
              onClick={addItem}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
            >
              + Add Item
            </button>
          </div>

          <div className="table-wrap" style={{ marginTop: 0 }}>
            <table className="data-table" style={{ minWidth: '680px' }}>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Unit Price ($)</th>
                  <th className="num">Total ($)</th>
                  <th style={{ width: '2.5rem' }}></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => {
                  const total = calcTotal(item.quantity, item.unitPrice);
                  return (
                    <tr key={idx}>
                      <td>
                        <input
                          type="text"
                          placeholder="e.g. Chicken breast"
                          value={item.itemName}
                          onChange={(e) => updateItem(idx, 'itemName', e.target.value)}
                          style={{ width: '100%', minWidth: '130px' }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          style={{ width: '70px' }}
                        />
                      </td>
                      <td>
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                          style={{
                            padding: '0.5rem 0.4rem',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            font: 'inherit',
                            background: '#fff',
                          }}
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                          style={{ width: '90px' }}
                        />
                      </td>
                      <td className="num" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {total !== '' ? `$${total}` : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          disabled={lineItems.length === 1}
                          title="Remove row"
                          style={{
                            background: 'transparent',
                            color: lineItems.length === 1 ? '#94a3b8' : '#b91c1c',
                            padding: '0.25rem 0.5rem',
                            fontSize: '1rem',
                            fontWeight: 700,
                            lineHeight: 1,
                          }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button
            type="submit"
            disabled={submitting || suppliersLoading || suppliers.length === 0}
          >
            {submitting ? 'Submitting…' : 'Submit Invoice'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={resetForm}
            disabled={submitting}
          >
            Reset
          </button>
        </div>
      </form>
    </section>
  );
}
