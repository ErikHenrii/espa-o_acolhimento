const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool = null;

/**
 * Initialize PostgreSQL database connection pool
 * Uses DATABASE_URL environment variable (provided by Render)
 */
function initDatabase() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('DATABASE_URL not set! Using fallback for local dev.');
  }

  pool = new Pool({
    connectionString: connectionString || 'postgres://localhost:5432/espaco_acolhimento',
    ssl: connectionString
      ? { rejectUnauthorized: false }
      : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
  });

  // Test connection and create tables
  pool.query('SELECT NOW()')
    .then(() => {
      console.log('PostgreSQL connected successfully.');
      return createTables();
    })
    .then(() => {
      console.log('Database tables ready.');
    })
    .catch((err) => {
      console.error('Database initialization error:', err.message);
    });

  return pool;
}

/**
 * Create tables from schema.sql
 */
async function createTables() {
  const schemaPath = path.join(__dirname, '../../database/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
}

/**
 * Get the connection pool
 */
function getPool() {
  if (!pool) initDatabase();
  return pool;
}

/**
 * Execute a query that returns rows (SELECT)
 * @param {string} sql
 * @param {Array} params - positional parameters [$1, $2, ...]
 * @returns {Array} rows
 */
async function all(sql, params = []) {
  const result = await getPool().query(sql, params);
  return result.rows;
}

/**
 * Execute a query that returns a single row
 * @param {string} sql
 * @param {Array} params
 * @returns {object|undefined} row
 */
async function get(sql, params = []) {
  const result = await getPool().query(sql, params);
  return result.rows[0];
}

/**
 * Execute an INSERT/UPDATE/DELETE
 * @param {string} sql
 * @param {Array} params
 * @returns {object} { rowCount }
 */
async function run(sql, params = []) {
  const result = await getPool().query(sql, params);
  return { rowCount: result.rowCount };
}

module.exports = {
  initDatabase,
  getPool,
  all,
  get,
  run
};
