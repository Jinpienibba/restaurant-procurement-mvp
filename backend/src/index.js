console.log('Server starting...');

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db/index.js';
import authRoutes from './routes/auth.js';
import invoiceRoutes from './routes/invoices.js';
import supplierRoutes from './routes/suppliers.js';
import analyticsRoutes from './routes/analytics.js';
import authMiddleware from './middleware/auth.js';

dotenv.config();

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
  console.log('\n=== INCOMING REQUEST ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Origin:', req.get('origin'));
  console.log('Headers:', {
    'content-type': req.get('content-type'),
    'authorization': req.get('authorization') ? '[PRESENT]' : '[ABSENT]',
    'user-agent': req.get('user-agent')
  });
  console.log('Body:', req.body);
  console.log('========================\n');
  next();
});

// CORS: allow all origins. We can't use credentials:true together with
// Access-Control-Allow-Origin: "*", so we reflect the request origin and
// keep credentials disabled (the frontend uses Bearer tokens, not cookies).
app.use(cors({
  origin: true, // reflect request origin -> effectively allow all
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Make sure preflight requests succeed for every route
app.options('*', cors({
  origin: true,
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    console.log('\n=== OUTGOING RESPONSE ===');
    console.log('Status:', res.statusCode);
    console.log('CORS Headers:', {
      'access-control-allow-origin': res.get('access-control-allow-origin'),
      'access-control-allow-credentials': res.get('access-control-allow-credentials'),
      'access-control-allow-methods': res.get('access-control-allow-methods'),
      'access-control-allow-headers': res.get('access-control-allow-headers')
    });
    console.log('Response body:', data);
    console.log('==========================\n');
    return originalJson.call(this, data);
  };
  next();
});

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes (no auth required)
app.use('/api/auth', authRoutes);

// Protected routes (auth required)
app.use('/api/invoices', authMiddleware, invoiceRoutes);
app.use('/api/suppliers', authMiddleware, supplierRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);

// Browser-friendly landing page for non-API GET routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (req.method !== 'GET') return next();

  res.status(200).type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Backend running</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 40px; line-height: 1.5; }
      code { background: #f3f4f6; padding: 2px 6px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <h2>Backend is running</h2>
    <p>You’re hitting the backend server. It serves JSON APIs under <code>/api</code>.</p>
    <ul>
      <li><a href="/api/health">/api/health</a></li>
      <li><code>POST /api/auth/signup</code></li>
      <li><code>POST /api/auth/login</code></li>
    </ul>
  </body>
</html>`);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Full error:', err);
  console.error('Error message:', err.message);
  console.error('Error stack:', err.stack);
  res.status(500).json({ 
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
