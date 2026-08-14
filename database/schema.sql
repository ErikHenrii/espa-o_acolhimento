-- ===========================================================
-- Espaço de Acolhimento - Jaqueline Camila
-- PostgreSQL Schema
-- ===========================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('paciente', 'terapeuta')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. CHECKINS TABLE
CREATE TABLE IF NOT EXISTS checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    date DATE NOT NULL,
    mood TEXT NOT NULL,
    mood_emoji TEXT,
    wellness_score INTEGER CHECK (wellness_score BETWEEN 1 AND 10),
    triggers JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_checkins_patient_id ON checkins(patient_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(date DESC);

-- 3. SLEEP RECORDS TABLE
CREATE TABLE IF NOT EXISTS sleep_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    date DATE NOT NULL,
    sleep_hours REAL NOT NULL CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
    sleep_quality TEXT,
    sleep_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sleep_records_patient_id ON sleep_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_sleep_records_date ON sleep_records(date DESC);

-- 4. JOURNAL ENTRIES TABLE
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    date DATE NOT NULL,
    content TEXT NOT NULL,
    privacy TEXT NOT NULL CHECK (privacy IN ('shared', 'private')),
    audio_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_patient_id ON journal_entries(patient_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_privacy ON journal_entries(privacy);

-- Enable gen_random_uuid() if not available (PostgreSQL < 13)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
