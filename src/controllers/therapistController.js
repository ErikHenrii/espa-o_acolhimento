const { query } = require('../config/database');

/**
 * List all registered patients
 */
const getPatients = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, created_at 
       FROM users 
       WHERE role = 'paciente' 
       ORDER BY name ASC`
    );

    return res.status(200).json({
      patients: result.rows
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
    const patientResult = await query(
      `SELECT id, name, email, created_at 
       FROM users 
       WHERE id = $1 AND role = 'paciente'`,
      [id]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Paciente não encontrado',
        message: 'Nenhum paciente cadastrado foi localizado com o ID fornecido.'
      });
    }

    const patient = patientResult.rows[0];

    // Fetch checkins, sleep records, and SHARED journal entries
    const [checkinsRes, sleepRes, journalRes] = await Promise.all([
      query(
        'SELECT id, patient_id, date, mood, mood_emoji, wellness_score, triggers, created_at FROM checkins WHERE patient_id = $1 ORDER BY date DESC, created_at DESC',
        [id]
      ),
      query(
        'SELECT id, patient_id, date, sleep_hours, sleep_quality, sleep_notes, created_at FROM sleep_records WHERE patient_id = $1 ORDER BY date DESC, created_at DESC',
        [id]
      ),
      query(
        "SELECT id, patient_id, date, content, privacy, audio_url, created_at FROM journal_entries WHERE patient_id = $1 AND privacy = 'shared' ORDER BY date DESC, created_at DESC",
        [id]
      )
    ]);

    return res.status(200).json({
      patient,
      checkins: checkinsRes.rows,
      sleep_records: sleepRes.rows,
      journal_entries: journalRes.rows
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
