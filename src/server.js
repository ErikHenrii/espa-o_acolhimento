require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase, getPool } = require('./config/database');
const { seedTherapist } = require('./config/seed');

const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const therapistRoutes = require('./routes/therapistRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Initialize PostgreSQL database
initDatabase();

// Seed therapist account after pool is ready
setTimeout(async () => {
  try {
    await getPool().query('SELECT 1');
    await seedTherapist();
  } catch (err) {
    console.error('Seed failed (will retry):', err.message);
    // Retry after 5 seconds
    setTimeout(async () => {
      try {
        await seedTherapist();
      } catch (e) {
        console.error('Seed retry failed:', e.message);
      }
    }, 5000);
  }
}, 3000);

// Serve static files from 'public' folder with no-cache for HTML and JS
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

// API Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await getPool().query('SELECT 1');
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      database: 'PostgreSQL',
      service: 'Espaço de Acolhimento - Jaqueline Camila Backend'
    });
  } catch (err) {
    res.status(500).json({
      status: 'DOWN',
      error: 'Database not connected',
      message: err.message
    });
  }
});

// Mount API routes
app.use('/api/auth', authRoutes);
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

// Start Server
const startServer = () => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Banco de dados: PostgreSQL`);
  });
};

startServer();

module.exports = app;
