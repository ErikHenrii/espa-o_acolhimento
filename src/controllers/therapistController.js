const { all, get, run } = require('../config/database');

// ============================================================
// Input sanitization helper
// ============================================================

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * List all registered patients
 * Returns: { patients: [...] } with frontend-friendly field names
 */
const getPatients = async (req, res) => {
  try {
    const patients = await all(
      `SELECT id, name, email, created_at, is_active
       FROM users
       WHERE role = 'paciente'
       ORDER BY name ASC`,
      {}
    );

    const patientsWithStats = [];
    for (const p of patients) {
      const checkinData = await all(
        `SELECT wellness_score FROM checkins WHERE patient_id = @patientId ORDER BY created_at DESC LIMIT 30`,
        { patientId: p.id }
      );

      const scores = checkinData.map(c => c.wellness_score).filter(s => s != null);
      const avgScore = scores.length > 0
        ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
        : 0;

      const lastActivity = await all(
        `SELECT created_at FROM checkins WHERE patient_id = @patientId ORDER BY created_at DESC LIMIT 1`,
        { patientId: p.id }
      );

      let status = 'sem_dados';
      if (avgScore >= 7) status = 'estavel';
      else if (avgScore >= 5) status = 'atencao';
      else if (avgScore > 0) status = 'critico';

      patientsWithStats.push({
        ...p,
        is_active: p.is_active === undefined ? 1 : p.is_active,
        avg_score: avgScore,
        last_activity: lastActivity.length > 0 ? lastActivity[0].created_at : p.created_at,
        status
      });
    }

    return res.status(200).json({
      patients: patientsWithStats
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
 * Returns data in frontend-friendly format
 */
const getPatientHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await get(
      `SELECT id, name, email, created_at, is_active
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

    const checkins = await all(
      `SELECT id, patient_id, date, mood, mood_emoji, wellness_score, triggers, notes, created_at
       FROM checkins WHERE patient_id = @id
       ORDER BY date DESC, created_at DESC`,
      { id }
    );

    const sleepRecords = await all(
      `SELECT id, patient_id, date, sleep_hours, sleep_quality, sleep_notes, created_at
       FROM sleep_records WHERE patient_id = @id
       ORDER BY date DESC, created_at DESC`,
      { id }
    );

    const journalEntries = await all(
      `SELECT id, patient_id, date, content, privacy, audio_url, created_at
       FROM journal_entries WHERE patient_id = @id AND privacy = 'shared'
       ORDER BY date DESC, created_at DESC`,
      { id }
    );

    const scores = checkins.map(c => c.wellness_score).filter(s => s != null);
    const avgScore = scores.length > 0
      ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
      : 0;

    let status = 'sem_dados';
    if (avgScore >= 7) status = 'estavel';
    else if (avgScore >= 5) status = 'atencao';
    else if (avgScore > 0) status = 'critico';

    const checkinsMapped = checkins.map(c => {
      let triggers = [];
      try { triggers = JSON.parse(c.triggers || '[]'); } catch { triggers = []; }
      return {
        id: c.id,
        patient_id: c.patient_id,
        date: c.date,
        mood: c.mood,
        mood_emoji: c.mood_emoji,
        score: c.wellness_score,
        triggers: triggers,
        notes: c.notes || '',
        created_at: c.created_at
      };
    });

    const sleepMapped = sleepRecords.map(s => ({
      id: s.id,
      patient_id: s.patient_id,
      date: s.date,
      hours: s.sleep_hours,
      quality: s.sleep_quality,
      notes: s.sleep_notes || '',
      created_at: s.created_at
    }));

    const journalsMapped = journalEntries.map(j => ({
      id: j.id,
      patient_id: j.patient_id,
      date: j.date,
      content: j.content,
      is_shared: j.privacy === 'shared',
      privacy: j.privacy,
      audio_url: j.audio_url,
      created_at: j.created_at
    }));

    const overview = {
      ...patient,
      is_active: patient.is_active === undefined ? 1 : patient.is_active,
      avg_score: avgScore,
      status
    };

    return res.status(200).json({
      overview,
      checkins: checkinsMapped,
      sleep: sleepMapped,
      journals: journalsMapped
    });
  } catch (error) {
    console.error('Erro ao buscar histórico do paciente:', error);
    return res.status(500).json({
      error: 'Erro interno',
      message: 'Não foi possível buscar o histórico do paciente.'
    });
  }
};


/**
 * Toggle patient active/inactive status
 */
const togglePatientStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await get(
      `SELECT id, is_active FROM users WHERE id = @id AND role = 'paciente'`,
      { id }
    );

    if (!patient) {
      return res.status(404).json({
        error: 'Paciente não encontrado',
        message: 'Nenhum paciente cadastrado foi localizado com o ID fornecido.'
      });
    }

    const newStatus = patient.is_active === 1 ? 0 : 1;
    await run(
      `UPDATE users SET is_active = @newStatus WHERE id = @id`,
      { newStatus, id }
    );

    return res.status(200).json({
      id: id,
      is_active: newStatus,
      message: newStatus === 1 ? 'Paciente reativado com sucesso.' : 'Paciente arquivado com sucesso.'
    });
  } catch (error) {
    console.error('Erro ao alternar status do paciente:', error);
    return res.status(500).json({
      error: 'Erro interno',
      message: 'Não foi possível atualizar o status do paciente.'
    });
  }
};

module.exports = {
  getPatients,
  getPatientHistory,
  togglePatientStatus
};
