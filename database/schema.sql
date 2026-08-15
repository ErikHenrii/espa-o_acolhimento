-- Espaço de Acolhimento - Jaqueline Camila
-- PostgreSQL Schema (auto-created on server startup via database.js, kept for reference)

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('paciente', 'terapeuta')),
    must_change_credentials INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. CHECKINS TABLE
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

-- 3. SLEEP RECORDS TABLE
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

-- 4. JOURNAL ENTRIES TABLE
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

-- ===========================================================
-- THERAPIST SEED (auto-created on startup via seed.js)
-- Default credentials:
--   Email: jaqueline@espacoacolhimento.com.br
--   Password: jac123456
-- Change via env vars: THERAPIST_EMAIL, THERAPIST_PASSWORD
-- On first login, must_change_credentials=1 forces a password/email change.
-- ===========================================================
