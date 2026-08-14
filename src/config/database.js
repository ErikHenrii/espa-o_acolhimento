const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'espaco_acolhimento.db');

let db;

/**
 * Initialize SQLite database and create tables if they don't exist
 */
function initDatabase() {
  // Ensure data directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('paciente', 'terapeuta')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

    CREATE TABLE IF NOT EXISTS checkins (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      date TEXT NOT NULL,
      mood TEXT NOT NULL,
      mood_emoji TEXT,
      wellness_score INTEGER CHECK (wellness_score BETWEEN 1 AND 10),
      triggers TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_checkins_patient_id ON checkins(patient_id);
    CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(date DESC);

    CREATE TABLE IF NOT EXISTS sleep_records (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      date TEXT NOT NULL,
      sleep_hours REAL NOT NULL CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
      sleep_quality TEXT,
      sleep_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sleep_records_patient_id ON sleep_records(patient_id);
    CREATE INDEX IF NOT EXISTS idx_sleep_records_date ON sleep_records(date DESC);

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      date TEXT NOT NULL,
      content TEXT NOT NULL,
      privacy TEXT NOT NULL CHECK (privacy IN ('shared', 'private')),
      audio_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_journal_entries_patient_id ON journal_entries(patient_id);
    CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date DESC);
    CREATE INDEX IF NOT EXISTS idx_journal_entries_privacy ON journal_entries(privacy);
  `);

  console.log('SQLite database initialized at:', DB_PATH);
  return db;
}

/**
 * Get the database instance
 */
function getDb() {
  if (!db) {
    initDatabase();
  }
  return db;
}

/**
 * Execute a query that returns rows (SELECT)
 * @param {string} sql
 * @param {object} params - named parameters { param1: value1, ... }
 * @returns {Array} rows
 */
function all(sql, params = {}) {
  return getDb().prepare(sql).all(params);
}

/**
 * Execute a query that returns a single row (SELECT ... LIMIT 1)
 * @param {string} sql
 * @param {object} params
 * @returns {object|undefined} row
 */
function get(sql, params = {}) {
  return getDb().prepare(sql).get(params);
}

/**
 * Execute an INSERT/UPDATE/DELETE and return info
 * @param {string} sql
 * @param {object} params
 * @returns {object} { lastInsertRowid, changes }
 */
function run(sql, params = {}) {
  return getDb().prepare(sql).run(params);
}

module.exports = {
  initDatabase,
  getDb,
  all,
  get,
  run
};
