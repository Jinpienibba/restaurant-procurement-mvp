import express from 'express';
import pool from '../db/index.js';

const router = express.Router();

// POST / - Upload invoice with line items
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId } = req.user;

    // Accept both camelCase (frontend form) and snake_case
    const supplierId    = req.body.supplierId    ?? req.body.supplier_id;
    const invoiceDate   = req.body.invoiceDate   ?? req.body.invoice_date   ?? null;
    const invoiceNumber = req.body.invoiceNumber ?? req.body.invoice_number ?? null;
    const lineItems     = req.body.lineItems;

    // Validate required fields
    if (!supplierId) {
      return res.status(400).json({ error: 'Supplier is required' });
    }

    if (!invoiceDate) {
      return res.status(400).json({ error: 'Invoice date is required' });
    }

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({ error: 'At least one line item is required' });
    }

    // Verify supplier belongs to user
    const supplierCheck = await client.query(
      'SELECT id FROM suppliers WHERE id = $1 AND user_id = $2',
      [supplierId, userId]
    );
    if (supplierCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Normalise and validate line items (accept camelCase or snake_case field names)
    const normalised = [];
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      const itemNum = i + 1;

      // Validate item name
      const itemName = item.itemName ?? item.item_name ?? item.description ?? '';
      if (!itemName || !itemName.trim()) {
        return res.status(400).json({ error: `Line item ${itemNum}: Item name is required` });
      }

      // Validate quantity
      const quantity = parseFloat(item.quantity || 0);
      if (Number.isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ error: `Line item ${itemNum}: Quantity must be greater than 0` });
      }

      // Validate unit
      const unit = item.unit ?? null;
      if (!unit) {
        return res.status(400).json({ error: `Line item ${itemNum}: Unit is required` });
      }

      // Validate unit price
      const unitPrice = parseFloat(item.unitPrice ?? item.unit_price ?? 0);
      if (Number.isNaN(unitPrice) || unitPrice <= 0) {
        return res.status(400).json({ error: `Line item ${itemNum}: Unit price must be greater than 0` });
      }

      normalised.push({
        item_name: itemName.trim(),
        quantity,
        unit,
        unit_price: unitPrice,
        category: item.category ?? null,
      });
    }

    // Calculate total cost
    const totalCost = normalised.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0
    );

    await client.query('BEGIN');

    // Insert invoice
    const invoiceResult = await client.query(
      `INSERT INTO invoices (user_id, supplier_id, invoice_date, invoice_number, total_cost)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, supplier_id, invoice_date, invoice_number, total_cost, created_at`,
      [userId, supplierId, invoiceDate, invoiceNumber ? String(invoiceNumber).trim() : null, totalCost]
    );

    const invoice = invoiceResult.rows[0];

    // Insert line items
    for (const item of normalised) {
      await client.query(
        `INSERT INTO line_items (invoice_id, item_name, quantity, unit, unit_price, total_price, category)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          invoice.id,
          item.item_name,
          item.quantity,
          item.unit,
          item.unit_price,
          item.unit_price * item.quantity,
          item.category,
        ]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      invoiceId:      invoice.id,
      totalCost:      invoice.total_cost,
      lineItemsCount: normalised.length,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create invoice error:', err);
    res.status(500).json({ error: 'Failed to create invoice' });
  } finally {
    client.release();
  }
});

// GET / - List all invoices for the authenticated user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.user;
    const result = await pool.query(
      `SELECT i.id,
              i.supplier_id,
              s.name AS supplier_name,
              i.invoice_date,
              i.invoice_number,
              i.total_cost,
              i.created_at
       FROM invoices i
       JOIN suppliers s ON s.id = i.supplier_id AND s.user_id = $1
       WHERE i.user_id = $1
       ORDER BY i.invoice_date DESC NULLS LAST, i.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List invoices error:', err);
    res.status(500).json({ error: 'Failed to load invoices' });
  }
});

// GET /:id - Get single invoice with line items
router.get('/:id', async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;

    const invoiceResult = await pool.query(
      `SELECT i.id,
              i.supplier_id,
              s.name AS supplier_name,
              i.invoice_date,
              i.invoice_number,
              i.total_cost,
              i.created_at
       FROM invoices i
       JOIN suppliers s ON s.id = i.supplier_id AND s.user_id = $1
       WHERE i.id = $2 AND i.user_id = $1`,
      [userId, id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    const itemsResult = await pool.query(
      `SELECT id, item_name, quantity, unit, unit_price, total_price, category
       FROM line_items
       WHERE invoice_id = $1
       ORDER BY id ASC`,
      [id]
    );

    res.json({ ...invoice, lineItems: itemsResult.rows });
  } catch (err) {
    console.error('Get invoice error:', err);
    res.status(500).json({ error: 'Failed to load invoice' });
  }
});

// PUT /line-items/:itemId - Update a single line item
router.put('/line-items/:itemId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId } = req.user;
    const { itemId } = req.params;

    // Verify the line item belongs to an invoice owned by this user
    const check = await client.query(
      `SELECT li.id FROM line_items li
       JOIN invoices i ON i.id = li.invoice_id
       WHERE li.id = $1 AND i.user_id = $2`,
      [itemId, userId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    const item_name  = req.body.itemName   ?? req.body.item_name  ?? null;
    const quantity   = req.body.quantity   != null ? parseFloat(req.body.quantity)   : null;
    const unit       = req.body.unit       ?? null;
    const unit_price = req.body.unitPrice  != null ? parseFloat(req.body.unitPrice)  :
                       req.body.unit_price != null ? parseFloat(req.body.unit_price) : null;
    const category   = req.body.category   ?? null;

    const total_price = (quantity != null && unit_price != null)
      ? quantity * unit_price
      : null;

    const result = await client.query(
      `UPDATE line_items
       SET item_name   = COALESCE($1, item_name),
           quantity    = COALESCE($2, quantity),
           unit        = COALESCE($3, unit),
           unit_price  = COALESCE($4, unit_price),
           total_price = COALESCE($5, total_price),
           category    = COALESCE($6, category)
       WHERE id = $7
       RETURNING id, item_name, quantity, unit, unit_price, total_price, category`,
      [item_name, quantity, unit, unit_price, total_price, category, itemId]
    );

    const updated = result.rows[0];

    // Recalculate invoice total_cost
    await client.query(
      `UPDATE invoices
       SET total_cost = (
         SELECT COALESCE(SUM(total_price), 0) FROM line_items WHERE invoice_id = (
           SELECT invoice_id FROM line_items WHERE id = $1
         )
       )
       WHERE id = (SELECT invoice_id FROM line_items WHERE id = $1)`,
      [itemId]
    );

    res.json(updated);
  } catch (err) {
    console.error('Update line item error:', err);
    res.status(500).json({ error: 'Failed to update line item' });
  } finally {
    client.release();
  }
});

// DELETE /line-items/:itemId - Delete a single line item
router.delete('/line-items/:itemId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId } = req.user;
    const { itemId } = req.params;

    // Verify the line item belongs to an invoice owned by this user
    const check = await client.query(
      `SELECT li.id, li.invoice_id FROM line_items li
       JOIN invoices i ON i.id = li.invoice_id
       WHERE li.id = $1 AND i.user_id = $2`,
      [itemId, userId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    const invoiceId = check.rows[0].invoice_id;

    await client.query('DELETE FROM line_items WHERE id = $1', [itemId]);

    // Recalculate invoice total_cost
    await client.query(
      `UPDATE invoices
       SET total_cost = (SELECT COALESCE(SUM(total_price), 0) FROM line_items WHERE invoice_id = $1)
       WHERE id = $1`,
      [invoiceId]
    );

    // Return updated total
    const inv = await client.query('SELECT total_cost FROM invoices WHERE id = $1', [invoiceId]);
    res.json({ message: 'Line item deleted', totalCost: inv.rows[0]?.total_cost ?? 0 });
  } catch (err) {
    console.error('Delete line item error:', err);
    res.status(500).json({ error: 'Failed to delete line item' });
  } finally {
    client.release();
  }
});

// POST /:invoiceId/line-items - Add a new line item to an existing invoice
router.post('/:invoiceId/line-items', async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId } = req.user;
    const { invoiceId } = req.params;

    // Verify invoice belongs to user
    const check = await client.query(
      'SELECT id FROM invoices WHERE id = $1 AND user_id = $2',
      [invoiceId, userId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const item_name  = req.body.itemName   ?? req.body.item_name  ?? '';
    const quantity   = parseFloat(req.body.quantity   || 0);
    const unit       = req.body.unit       ?? null;
    const unit_price = parseFloat(req.body.unitPrice  ?? req.body.unit_price ?? 0);
    const category   = req.body.category   ?? null;
    const total_price = quantity * unit_price;

    const result = await client.query(
      `INSERT INTO line_items (invoice_id, item_name, quantity, unit, unit_price, total_price, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, item_name, quantity, unit, unit_price, total_price, category`,
      [invoiceId, item_name, quantity, unit, unit_price, total_price, category]
    );

    // Recalculate invoice total_cost
    await client.query(
      `UPDATE invoices
       SET total_cost = (SELECT COALESCE(SUM(total_price), 0) FROM line_items WHERE invoice_id = $1)
       WHERE id = $1`,
      [invoiceId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add line item error:', err);
    res.status(500).json({ error: 'Failed to add line item' });
  } finally {
    client.release();
  }
});

// DELETE /:id - Delete invoice and cascade line items
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId } = req.user;
    const { id } = req.params;

    // Verify invoice belongs to user
    const check = await client.query(
      'SELECT id FROM invoices WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await client.query('BEGIN');

    // Delete line items first (foreign key constraint)
    await client.query('DELETE FROM line_items WHERE invoice_id = $1', [id]);

    // Delete invoice
    await client.query('DELETE FROM invoices WHERE id = $1 AND user_id = $2', [id, userId]);

    await client.query('COMMIT');

    res.json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete invoice error:', err);
    res.status(500).json({ error: 'Failed to delete invoice' });
  } finally {
    client.release();
  }
});

export default router;
