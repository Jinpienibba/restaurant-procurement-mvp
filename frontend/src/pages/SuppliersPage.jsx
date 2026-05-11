import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

function normalizeSupplier(row) {
  return {
    id: row.id,
    name: row.name ?? '—',
    contact: row.contact_info ?? row.contactInfo ?? row.contact ?? '—',
  };
}

export default function SuppliersPage() {
  const { token } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [name, setName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setListError('');
    try {
      const data = await api('/api/suppliers', { token });
      const list = Array.isArray(data) ? data : data?.suppliers ?? data?.results ?? [];
      setSuppliers(Array.isArray(list) ? list.map(normalizeSupplier) : []);
    } catch (e) {
      setListError(e.message || 'Failed to load suppliers');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api('/api/suppliers', {
        method: 'POST',
        token,
        body: {
          name: name.trim(),
          contact_info: contactInfo.trim() || undefined,
        },
      });
      setName('');
      setContactInfo('');
      await load();
    } catch (e) {
      setError(
        e.message ||
          'Could not create supplier. If the API has no POST handler yet, add it on the server.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Suppliers</h2>
        <p style={{ marginTop: 0, color: '#64748b', fontSize: '0.95rem' }}>
          Add suppliers and keep them in sync with your procurement records.
        </p>

        {error ? <p className="error">{error}</p> : null}

        <form onSubmit={handleAdd} className="two-col-form">
          <div className="form-group">
            <label htmlFor="supplier-name">Name</label>
            <input
              id="supplier-name"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              required
              placeholder="e.g. Sysco"
            />
          </div>
          <div className="form-group">
            <label htmlFor="supplier-contact">Contact (optional)</label>
            <input
              id="supplier-contact"
              value={contactInfo}
              onChange={(ev) => setContactInfo(ev.target.value)}
              placeholder="Phone or email"
            />
          </div>
          <div className="form-actions">
            <button type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Saving…' : 'Add supplier'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="section-head">
          <h3 style={{ margin: 0 }}>Your suppliers</h3>
          <button type="button" className="secondary" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        {listError ? <p className="error">{listError}</p> : null}

        {loading ? (
          <p style={{ margin: '0.75rem 0 0', color: '#64748b' }}>Loading…</p>
        ) : suppliers.length === 0 ? (
          <p style={{ margin: '0.75rem 0 0', color: '#64748b' }}>No suppliers yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id || s.name}>
                    <td>{s.name}</td>
                    <td>{s.contact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
