require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// ─── Fail fast if critical secrets are missing ─────────────
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Refusing to start. Copy backend/.env.example to backend/.env and fill it in.');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('FATAL: MONGODB_URI is not set. Refusing to start.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1); // behind a reverse proxy in production (correct client IP / protocol)

// ─── CORS: restrict to configured origins ──────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin / non-browser requests (no Origin header) e.g. curl, server-to-server.
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Lightweight request logging ───────────────────────────
// One structured line per request (method, path, status, duration). Kept
// dependency-free; silenced during tests to avoid noisy output.
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
    });
    next();
  });
}

// ─── Health check ──────────────────────────────────────────
// Reports process liveness and DB connectivity so load balancers / uptime
// monitors can probe the service. Returns 503 while the DB is not connected.
app.get(['/health', '/v1/health'], (req, res) => {
  const dbState = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
  const dbConnected = dbState === 1;
  res.status(dbConnected ? 200 : 503).send({
    status: dbConnected ? 'ok' : 'degraded',
    uptime: process.uptime(),
    db: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown',
    timestamp: new Date().toISOString()
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { family: 4 })
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/v1/admin', require('./routes/adminRoutes'));
app.use('/v1/products', require('./routes/productRoutes'));
app.use('/v1/category', require('./routes/categoryRoutes'));
app.use('/v1/customer', require('./routes/customerRoutes'));
app.use('/v1/cloudinary', require('./routes/uploadRoutes'));
app.use('/v1/orders', require('./routes/orderRoutes'));

app.get('/', (req, res) => {
  res.send('Chromora Backend API is running...');
});

// ─── 404 for unknown routes ────────────────────────────────
app.use((req, res) => {
  res.status(404).send({ message: 'Route not found.' });
});

// ─── Centralized error handler ─────────────────────────────
// Catches CORS rejections and any error passed via next(err). Avoids leaking
// stack traces to clients while logging the full error server-side.
app.use((err, req, res, next) => {
  console.error('[error]', err && err.message ? err.message : err);
  if (err && /not allowed by CORS/.test(err.message || '')) {
    return res.status(403).send({ message: 'Origin not allowed.' });
  }
  res.status(500).send({ message: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
