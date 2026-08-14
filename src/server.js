require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./config/database');
const { seedTherapist } = require('./config/seed');

const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const therapistRoutes = require('./routes/therapistRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// CORS Configuration
// ============================================================
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : true; // true = allow all (development default)

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// ============================================================
// Body parsing with size limit (security: prevents oversized payloads)
// ============================================================
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

// ============================================================
// Simple rate limiter for auth endpoints (in-memory, per-IP)
// ============================================================
const authAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 20; // max 20 attempts per window

function authRateLimiter(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const record = authAttempts.get(ip) || { count: 0, firstAt: now };

  // Reset window
  if (now - record.firstAt > RATE_LIMIT_WINDOW) {
    record.count = 0;
    record.firstAt = now;
  }

  record.count++;
  authAttempts.set(ip, record);

  if (record.count > RATE_LIMIT_MAX) {
    return res.status(429).json({
      error: 'Muitas tentativas',
      message: 'Você fez muitas tentativas. Aguarde alguns minutos e tente novamente.'
    });
  }

  next();
}

// ============================================================
// Initialize database (auto-creates tables on startup)
// ============================================================
initDatabase();

// Seed therapist account automatically (safe — skips if already exists)
seedTherapist();

// Clean up rate limiter periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of authAttempts.entries()) {
    if (now - record.firstAt > RATE_LIMIT_WINDOW) {
      authAttempts.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

// ============================================================
// Serve static files from 'public' folder
// ============================================================
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath, {
  etag: false,
  lastModified: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// ============================================================
// API Routes
// ============================================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'Espaço de Acolhimento - Jaqueline Camila Backend'
  });
});

// Auth routes (with rate limiting)
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/therapist', therapistRoutes);

// SPA fallback for non-API routes — serves index.html (landing page)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint da API não encontrado' });
  }
  const indexPath = path.join(publicPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send('Página não encontrada.');
    }
  });
});

// ============================================================
// Global error handler
// ============================================================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: 'Ocorreu um erro inesperado. Tente novamente.'
  });
});

// ============================================================
// Start Server
// ============================================================
const startServer = () => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();

module.exports = app;
