const { Pool } = require('pg');

let pool;

/**
 * Convert @param style named parameters to PostgreSQL $N style.
 * Example: "WHERE email = @email" + { email: 'a@b.com' }
 *       → "WHERE email = $1" + ['a@b.com']
 */
function convertNamedParams(sql, params = {}) {
  const keys = Object.keys(params);
  const values = [];
  let index = 1;
  let convertedSql = sql;

  for (const key of keys) {
    // Use word boundary to avoid partial matches (@id won't match @patientId)
    const regex = new RegExp(`@${key}\\b`, 'g');
    convertedSql = convertedSql.replace(regex, `$${index}`);
    values.push(params[key]);
    index++;
  }

  return { text: convertedSql, values };
}

/**
 * Initialize PostgreSQL database and create tables if they don't exist.
 */
async function initDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('DATABASE_URL is not set!');
    console.error('For local dev, set DATABASE_URL=postgresql://user:pass@localhost:5432/dbname');
    process.exit(1);
  }

  pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
  });

  // Test connection
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    console.log('PostgreSQL connected successfully.');
  } finally {
    client.release();
  }

  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('paciente', 'terapeuta')),
      must_change_credentials INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

    CREATE TABLE IF NOT EXISTS checkins (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      mood TEXT NOT NULL,
      mood_emoji TEXT,
      wellness_score INTEGER CHECK (wellness_score BETWEEN 1 AND 10),
      triggers TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')
    );

    CREATE INDEX IF NOT EXISTS idx_checkins_patient_id ON checkins(patient_id);
    CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(date DESC);

    CREATE TABLE IF NOT EXISTS sleep_records (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      sleep_hours REAL NOT NULL CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
      sleep_quality TEXT,
      sleep_notes TEXT DEFAULT '',
      created_at TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')
    );

    CREATE INDEX IF NOT EXISTS idx_sleep_records_patient_id ON sleep_records(patient_id);
    CREATE INDEX IF NOT EXISTS idx_sleep_records_date ON sleep_records(date DESC);

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      content TEXT NOT NULL,
      privacy TEXT NOT NULL CHECK (privacy IN ('shared', 'private')),
      audio_url TEXT,
      created_at TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')
    );

    CREATE INDEX IF NOT EXISTS idx_journal_entries_patient_id ON journal_entries(patient_id);
    CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date DESC);
    CREATE INDEX IF NOT EXISTS idx_journal_entries_privacy ON journal_entries(privacy);
  `);

  // --- Migrations for existing databases ---
  await safeAddColumn('users', 'must_change_credentials INTEGER NOT NULL DEFAULT 0');
  await safeAddColumn('users', 'is_active INTEGER NOT NULL DEFAULT 1');
  await safeAddColumn('checkins', "notes TEXT DEFAULT ''");

  console.log('PostgreSQL tables initialized.');
  return pool;
}

/**
 * Safely add a column if it doesn't exist (PostgreSQL version)
 */
async function safeAddColumn(table, columnDef) {
  const columnName = columnDef.split(' ')[0];
  try {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${columnDef};`);
    console.log(`Migration: added column ${columnName} to ${table}`);
  } catch (e) {
    // Column already exists — expected, ignore
  }
}

/**
 * Get the pool instance
 */
function getPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
}

/**
 * Execute a query that returns all rows (SELECT)
 */
async function all(sql, params = {}) {
  const { text, values } = convertNamedParams(sql, params);
  const result = await getPool().query(text, values);
  return result.rows;
}

/**
 * Execute a query that returns a single row
 */
async function get(sql, params = {}) {
  const { text, values } = convertNamedParams(sql, params);
  const result = await getPool().query(text, values);
  return result.rows[0] || null;
}

/**
 * Execute an INSERT/UPDATE/DELETE
 */
async function run(sql, params = {}) {
  const { text, values } = convertNamedParams(sql, params);
  await getPool().query(text, values);
}

module.exports = {
  initDatabase,
  getPool,
  all,
  get,
  run
};
