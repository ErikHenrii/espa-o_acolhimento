const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL;

const isProduction = process.env.NODE_ENV === 'production';
const isRender = connectionString && connectionString.includes('render.com');

const poolConfig = {
  connectionString: connectionString || 'postgresql://postgres:postgres@localhost:5432/espaco_acolhimento'
};

if (isProduction || isRender) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

/**
 * Execute a single query with parameters
 * @param {string} text 
 * @param {Array} params 
 */
const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production') {
    console.log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
  }
  return res;
};

/**
 * Initialize database schema from database/schema.sql
 */
const initDatabase = async () => {
  try {
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(sql);
      console.log('Database schema initialized successfully.');
    } else {
      console.warn(`Schema file not found at ${schemaPath}`);
    }
  } catch (error) {
    console.error('Error initializing database schema:', error.message);
    throw error;
  }
};

module.exports = {
  pool,
  query,
  initDatabase
};
