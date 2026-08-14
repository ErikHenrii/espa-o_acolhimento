-- Espaço de Acolhimento - Jaqueline Camila
-- Database Schema for PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('paciente', 'terapeuta')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for user email lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. CHECKINS TABLE
CREATE TABLE IF NOT EXISTS checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    mood VARCHAR(100) NOT NULL,
    mood_emoji VARCHAR(10),
    wellness_score INT CHECK (wellness_score BETWEEN 1 AND 10),
    triggers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for checkins
CREATE INDEX IF NOT EXISTS idx_checkins_patient_id ON checkins(patient_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(date DESC);

-- 3. SLEEP RECORDS TABLE
CREATE TABLE IF NOT EXISTS sleep_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    sleep_hours DECIMAL(4,2) NOT NULL CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
    sleep_quality VARCHAR(50),
    sleep_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for sleep_records
CREATE INDEX IF NOT EXISTS idx_sleep_records_patient_id ON sleep_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_sleep_records_date ON sleep_records(date DESC);

-- 4. JOURNAL ENTRIES TABLE
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    content TEXT NOT NULL,
    privacy VARCHAR(20) NOT NULL CHECK (privacy IN ('shared', 'private')),
    audio_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for journal_entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_patient_id ON journal_entries(patient_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_privacy ON journal_entries(privacy);

/*
===================================================================
INSTRUÇÕES PARA CRIAÇÃO MANUAL DO USUÁRIO TERAPEUTA:
===================================================================
Para criar a conta da terapeuta Jaqueline Camila diretamente no banco de dados,
você precisa de um hash da senha gerado por bcrypt (10 rounds).

Exemplo de SQL para criar a terapeuta (substitua a senha hash pela desejada):

INSERT INTO users (name, email, password_hash, role)
VALUES (
    'Jaqueline Camila',
    'jaqueline@espacoacolhimento.com.br',
    '$2a$10$e.g.seu_hash_bcrypt_aqui', -- Gere usando bcrypt (ex: 'senha123')
    'terapeuta'
) ON CONFLICT (email) DO NOTHING;

Ou execute um script Node.js usando o helper do controller/bcrypt para inserir.
===================================================================
*/
