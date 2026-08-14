const { query } = require('../config/database');

/**
 * Get all data for the authenticated patient
 */
const getData = async (req, res) => {
  try {
    const patientId = req.user.id;

    // Fetch checkins, sleep records, and journal entries concurrently
    const [checkinsRes, sleepRes, journalRes] = await Promise.all([
      query(
        'SELECT id, patient_id, date, mood, mood_emoji, wellness_score, triggers, created_at FROM checkins WHERE patient_id = $1 ORDER BY date DESC, created_at DESC',
        [patientId]
      ),
      query(
        'SELECT id, patient_id, date, sleep_hours, sleep_quality, sleep_notes, created_at FROM sleep_records WHERE patient_id = $1 ORDER BY date DESC, created_at DESC',
        [patientId]
      ),
      query(
        'SELECT id, patient_id, date, content, privacy, audio_url, created_at FROM journal_entries WHERE patient_id = $1 ORDER BY date DESC, created_at DESC',
        [patientId]
      )
    ]);

    return res.status(200).json({
      checkins: checkinsRes.rows,
      sleep_records: sleepRes.rows,
      journal_entries: journalRes.rows
    });
  } catch (error) {
    console.error('Erro ao buscar dados do paciente:', error);
    return res.status(500).json({
      error: 'Erro interno',
      message: 'Não foi possível carregar os dados do paciente.'
    });
  }
};

/**
 * Create a new mood/wellness check-in
 */
const createCheckin = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { date, mood, mood_emoji, wellness_score, triggers } = req.body;

    if (!date || !mood || wellness_score === undefined) {
      return res.status(400).json({
        error: 'Dados incompletos',
        message: 'Por favor, informe a data, o humor e a pontuação de bem-estar.'
      });
    }

    const score = parseInt(wellness_score, 10);
    if (isNaN(score) || score < 1 || score > 10) {
      return res.status(400).json({
        error: 'Pontuação inválida',
        message: 'A pontuação de bem-estar deve ser um número entre 1 e 10.'
      });
    }

    // Process triggers (array or object to JSON string/object for JSONB field)
    const formattedTriggers = JSON.stringify(triggers || []);

    const result = await query(
      `INSERT INTO checkins (patient_id, date, mood, mood_emoji, wellness_score, triggers)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING id, patient_id, date, mood, mood_emoji, wellness_score, triggers, created_at`,
      [patientId, date, mood, mood_emoji || null, score, formattedTriggers]
    );

    return res.status(201).json({
      message: 'Check-in registrado com sucesso!',
      checkin: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar checkin:', error);
    return res.status(500).json({
      error: 'Erro interno',
      message: 'Não foi possível registrar o check-in.'
    });
  }
};

/**
 * Create a new sleep record
 */
const createSleep = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { date, sleep_hours, sleep_quality, sleep_notes } = req.body;

    if (!date || sleep_hours === undefined) {
      return res.status(400).json({
        error: 'Dados incompletos',
        message: 'Por favor, informe a data e a quantidade de horas dormidas.'
      });
    }

    const hours = parseFloat(sleep_hours);
    if (isNaN(hours) || hours < 0 || hours > 24) {
      return res.status(400).json({
        error: 'Horas de sono inválidas',
        message: 'A quantidade de horas de sono deve ser um número entre 0 e 24.'
      });
    }

    const result = await query(
      `INSERT INTO sleep_records (patient_id, date, sleep_hours, sleep_quality, sleep_notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, patient_id, date, sleep_hours, sleep_quality, sleep_notes, created_at`,
      [patientId, date, hours, sleep_quality || null, sleep_notes || null]
    );

    return res.status(201).json({
      message: 'Registro de sono cadastrado com sucesso!',
      sleep_record: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao registrar sono:', error);
    return res.status(500).json({
      error: 'Erro interno',
      message: 'Não foi possível registrar as informações de sono.'
    });
  }
};

/**
 * Create a new journal entry
 */
const createJournal = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { date, content, privacy, audio_url } = req.body;

    if (!date || !content) {
      return res.status(400).json({
        error: 'Dados incompletos',
        message: 'Por favor, informe a data e o conteúdo do diário.'
      });
    }

    const entryPrivacy = privacy === 'shared' ? 'shared' : 'private';

    const result = await query(
      `INSERT INTO journal_entries (patient_id, date, content, privacy, audio_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, patient_id, date, content, privacy, audio_url, created_at`,
      [patientId, date, content, entryPrivacy, audio_url || null]
    );

    return res.status(201).json({
      message: 'Entrada no diário criada com sucesso!',
      journal_entry: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar diário:', error);
    return res.status(500).json({
      error: 'Erro interno',
      message: 'Não foi possível salvar a entrada do diário.'
    });
  }
};

module.exports = {
  getData,
  createCheckin,
  createSleep,
  createJournal
};
