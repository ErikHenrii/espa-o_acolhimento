const { all, get } = require('../config/database');

/**
 * List all registered patients
 */
const getPatients = async (req, res) => {
  try {
    const patients = all(
      `SELECT id, name, email, created_at 
       FROM users 
       WHERE role = 'paciente' 
       ORDER BY name ASC`,
      {}
    );

    return res.status(200).json({
      patients
    });
  } catch (error) {
    console.error('Erro ao listar pacientes:', error);
    return res.status(500).json({
      error: 'Erro interno',
      message: 'Não foi possível carregar a lista de pacientes.'
    });
  }
};

/**
 * Get detailed history of a specific patient (only shared journal entries)
 */
const getPatientHistory = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify patient exists and has role 'paciente'
    const patient = get(
      `SELECT id, name, email, created_at 
       FROM users 
       WHERE id = @id AND role = 'paciente'`,
      { id }
    );

    if (!patient) {
      return res.status(404).json({
        error: 'Paciente não encontrado',
        message: 'Nenhum paciente cadastrado foi localizado com o ID fornecido.'
      });
    }

    const checkins = all(
      `SELECT id, patient_id, date, mood, mood_emoji, wellness_score, triggers, created_at
       FROM checkins WHERE patient_id = @id
       ORDER BY date DESC, created_at DESC`,
      { id }
    );

    const sleepRecords = all(
      `SELECT id, patient_id, date, sleep_hours, sleep_quality, sleep_notes, created_at
       FROM sleep_records WHERE patient_id = @id
       ORDER BY date DESC, created_at DESC`,
      { id }
    );

    const journalEntries = all(
      `SELECT id, patient_id, date, content, privacy, audio_url, created_at
       FROM journal_entries WHERE patient_id = @id AND privacy = 'shared'
       ORDER BY date DESC, created_at DESC`,
      { id }
    );

    // Parse triggers from JSON string
    checkins.forEach(c => {
      try { c.triggers = JSON.parse(c.triggers || '[]'); } catch { c.triggers = []; }
    });

    return res.status(200).json({
      patient,
      checkins,
      sleep_records: sleepRecords,
      journal_entries: journalEntries
    });
  } catch (error) {
    console.error('Erro ao buscar histórico do paciente:', error);
    return res.status(500).json({
      error: 'Erro interno',
      message: 'Não foi possível buscar o histórico do paciente.'
    });
  }
};

module.exports = {
  getPatients,
  getPatientHistory
};
