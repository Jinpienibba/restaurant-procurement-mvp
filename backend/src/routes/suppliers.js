import express from 'express';
import pool from '../db/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { userId } = req.user;
    const result = await pool.query(
      `SELECT id, name, contact_info, created_at, updated_at
       FROM suppliers
       WHERE user_id = $1
       ORDER BY name ASC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List suppliers error:', err);
    res.status(500).json({ error: 'Failed to load suppliers' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { userId } = req.user;
    const { name, contact_info: contactInfoSnake, contactInfo } = req.body;
    const contact = contactInfoSnake ?? contactInfo ?? null;

    if (!name || String(name).trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await pool.query(
      `INSERT INTO suppliers (user_id, name, contact_info)
       VALUES ($1, $2, $3)
       RETURNING id, name, contact_info, created_at, updated_at`,
      [userId, String(name).trim(), contact ? String(contact).trim() : null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create supplier error:', err);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

export default router;
