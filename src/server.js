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
  : true;

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// ============================================================
// Body parsing with size limit
// ============================================================
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

// ============================================================
// Simple rate limiter for auth endpoints (in-memory, per-IP)
// ============================================================
const authAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 20;

function authRateLimiter(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const record = authAttempts.get(ip) || { count: 0, firstAt: now };

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
// Static files
// ============================================================
// Serve PWA manifest with correct content type
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.join(__dirname, '../public/manifest.json'));
});

// Serve service worker at root scope (required for PWA)
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, '../public/sw.js'));
});

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

// SPA fallback
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

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: 'Ocorreu um erro inesperado. Tente novamente.'
  });
});

// ============================================================
// Start Server (async — initializes database first)
// ============================================================
async function startServer() {
  try {
    // Initialize PostgreSQL database
    await initDatabase();

    // Seed therapist account (safe — skips if already exists)
    await seedTherapist();

    // Clean up rate limiter periodically
    setInterval(() => {
      const now = Date.now();
      for (const [ip, record] of authAttempts.entries()) {
        if (now - record.firstAt > RATE_LIMIT_WINDOW) {
          authAttempts.delete(ip);
        }
      }
    }, RATE_LIMIT_WINDOW);

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
