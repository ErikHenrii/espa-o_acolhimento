const crypto = require('crypto');
const { all, get, run } = require('../config/database');

/**
 * Get all data for the authenticated patient
 */
const getData = async (req, res) => {
  try {
    const patientId = req.user.id;

    const checkins = all(
      `SELECT id, patient_id, date, mood, mood_emoji, wellness_score, triggers, created_at
       FROM checkins WHERE patient_id = @patientId
       ORDER BY date DESC, created_at DESC`,
      { patientId }
    );

    const sleepRecords = all(
      `SELECT id, patient_id, date, sleep_hours, sleep_quality, sleep_notes, created_at
       FROM sleep_records WHERE patient_id = @patientId
       ORDER BY date DESC, created_at DESC`,
      { patientId }
    );

    const journalEntries = all(
      `SELECT id, patient_id, date, content, privacy, audio_url, created_at
       FROM journal_entries WHERE patient_id = @patientId
       ORDER BY date DESC, created_at DESC`,
      { patientId }
    );

    // Parse triggers from JSON string
    checkins.forEach(c => {
      try { c.triggers = JSON.parse(c.triggers || '[]'); } catch { c.triggers = []; }
    });

    return res.status(200).json({
      checkins,
      sleep_records: sleepRecords,
      journal_entries: journalEntries
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

    const id = crypto.randomUUID();
    const triggersJson = JSON.stringify(triggers || []);

    run(
      `INSERT INTO checkins (id, patient_id, date, mood, mood_emoji, wellness_score, triggers)
       VALUES (@id, @patientId, @date, @mood, @moodEmoji, @score, @triggers)`,
      { id, patientId, date, mood, moodEmoji: mood_emoji || null, score, triggers: triggersJson }
    );

    const checkin = get(
      'SELECT id, patient_id, date, mood, mood_emoji, wellness_score, triggers, created_at FROM checkins WHERE id = @id',
      { id }
    );

    try { checkin.triggers = JSON.parse(checkin.triggers || '[]'); } catch { checkin.triggers = []; }

    return res.status(201).json({
      message: 'Check-in registrado com sucesso!',
      checkin
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

    const id = crypto.randomUUID();

    run(
      `INSERT INTO sleep_records (id, patient_id, date, sleep_hours, sleep_quality, sleep_notes)
       VALUES (@id, @patientId, @date, @hours, @sleepQuality, @sleepNotes)`,
      { id, patientId, date, hours, sleepQuality: sleep_quality || null, sleepNotes: sleep_notes || null }
    );

    const sleepRecord = get(
      'SELECT id, patient_id, date, sleep_hours, sleep_quality, sleep_notes, created_at FROM sleep_records WHERE id = @id',
      { id }
    );

    return res.status(201).json({
      message: 'Registro de sono cadastrado com sucesso!',
      sleep_record: sleepRecord
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
    const id = crypto.randomUUID();

    run(
      `INSERT INTO journal_entries (id, patient_id, date, content, privacy, audio_url)
       VALUES (@id, @patientId, @date, @content, @privacy, @audioUrl)`,
      { id, patientId, date, content, privacy: entryPrivacy, audioUrl: audio_url || null }
    );

    const journalEntry = get(
      'SELECT id, patient_id, date, content, privacy, audio_url, created_at FROM journal_entries WHERE id = @id',
      { id }
    );

    return res.status(201).json({
      message: 'Entrada no diário criada com sucesso!',
      journal_entry: journalEntry
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
