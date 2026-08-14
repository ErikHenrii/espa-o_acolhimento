const crypto = require('crypto');
const { all, get, run } = require('../config/database');

// ============================================================
// Input sanitization helpers
// ============================================================

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

function sanitizeTriggers(triggers) {
  if (!Array.isArray(triggers)) return [];
  return triggers
    .map(t => sanitizeString(String(t)))
    .filter(t => t.length > 0 && t.length <= 50)
    .slice(0, 10); // max 10 triggers
}

/**
 * Get all data for the authenticated patient
 * Returns data in the format the frontend expects:
 *   { checkins, sleep, journals }
 * With frontend-friendly field aliases:
 *   checkins:  score (from wellness_score), notes, triggers (array), mood_emoji
 *   sleep:     hours (from sleep_hours), quality (from sleep_quality), notes (from sleep_notes)
 *   journals:  is_shared (from privacy === 'shared'), content
 */
const getData = async (req, res) => {
  try {
    const patientId = req.user.id;

    const checkins = all(
      `SELECT id, patient_id, date, mood, mood_emoji, wellness_score, triggers, notes, created_at
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

    // Map to frontend-friendly format
    const checkinsMapped = checkins.map(c => {
      let triggers = [];
      try { triggers = JSON.parse(c.triggers || '[]'); } catch { triggers = []; }
      return {
        id: c.id,
        patient_id: c.patient_id,
        date: c.date,
        mood: c.mood,
        mood_emoji: c.mood_emoji,
        score: c.wellness_score,        // alias
        triggers: triggers,
        notes: c.notes || '',            // alias
        created_at: c.created_at
      };
    });

    const sleepMapped = sleepRecords.map(s => ({
      id: s.id,
      patient_id: s.patient_id,
      date: s.date,
      hours: s.sleep_hours,              // alias
      quality: s.sleep_quality,          // alias
      notes: s.sleep_notes || '',        // alias
      created_at: s.created_at
    }));

    const journalsMapped = journalEntries.map(j => ({
      id: j.id,
      patient_id: j.patient_id,
      date: j.date,
      content: j.content,
      is_shared: j.privacy === 'shared', // alias
      privacy: j.privacy,
      audio_url: j.audio_url,
      created_at: j.created_at
    }));

    return res.status(200).json({
      checkins: checkinsMapped,
      sleep: sleepMapped,
      journals: journalsMapped
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
 * Accepts both backend field names and frontend-friendly aliases:
 *   date (required), mood (required), wellness_score OR score, mood_emoji, triggers, notes
 */
const createCheckin = async (req, res) => {
  try {
    const patientId = req.user.id;
    let { date, mood, mood_emoji, wellness_score, score, triggers, notes } = req.body;

    // Use alias 'score' if wellness_score is not provided
    const finalScore = wellness_score !== undefined ? wellness_score : score;

    // Sanitize
    mood = sanitizeString(mood);
    mood_emoji = mood_emoji ? sanitizeString(mood_emoji) : null;
    notes = notes ? sanitizeString(notes) : '';
    const triggersArray = sanitizeTriggers(triggers);

    if (!date || !mood || finalScore === undefined) {
      return res.status(400).json({
        error: 'Dados incompletos',
        message: 'Por favor, informe a data, o humor e a pontuação de bem-estar.'
      });
    }

    const scoreInt = parseInt(finalScore, 10);
    if (isNaN(scoreInt) || scoreInt < 1 || scoreInt > 10) {
      return res.status(400).json({
        error: 'Pontuação inválida',
        message: 'A pontuação de bem-estar deve ser um número entre 1 e 10.'
      });
    }

    const id = crypto.randomUUID();
    const triggersJson = JSON.stringify(triggersArray);

    run(
      `INSERT INTO checkins (id, patient_id, date, mood, mood_emoji, wellness_score, triggers, notes)
       VALUES (@id, @patientId, @date, @mood, @moodEmoji, @score, @triggers, @notes)`,
      { id, patientId, date, mood, moodEmoji: mood_emoji, score: scoreInt, triggers: triggersJson, notes }
    );

    return res.status(201).json({
      message: 'Check-in registrado com sucesso!',
      checkin: {
        id,
        patient_id: patientId,
        date,
        mood,
        mood_emoji: mood_emoji,
        score: scoreInt,
        triggers: triggersArray,
        notes: notes,
        created_at: new Date().toISOString()
      }
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
 * Accepts both backend and frontend-friendly field names:
 *   date (required), sleep_hours OR hours, sleep_quality OR quality, sleep_notes OR notes
 */
const createSleep = async (req, res) => {
  try {
    const patientId = req.user.id;
    let { date, sleep_hours, hours, sleep_quality, quality, sleep_notes, notes } = req.body;

    // Use aliases if backend names are not provided
    const finalHours = sleep_hours !== undefined ? sleep_hours : hours;
    const finalQuality = sleep_quality !== undefined ? sleep_quality : quality;
    const finalNotes = sleep_notes !== undefined ? sleep_notes : notes;

    // Sanitize
    const qualityStr = finalQuality ? sanitizeString(String(finalQuality)) : null;
    const notesStr = finalNotes ? sanitizeString(finalNotes) : '';

    if (!date || finalHours === undefined) {
      return res.status(400).json({
        error: 'Dados incompletos',
        message: 'Por favor, informe a data e a quantidade de horas dormidas.'
      });
    }

    const hoursFloat = parseFloat(finalHours);
    if (isNaN(hoursFloat) || hoursFloat < 0 || hoursFloat > 24) {
      return res.status(400).json({
        error: 'Horas de sono inválidas',
        message: 'A quantidade de horas de sono deve ser um número entre 0 e 24.'
      });
    }

    const id = crypto.randomUUID();

    run(
      `INSERT INTO sleep_records (id, patient_id, date, sleep_hours, sleep_quality, sleep_notes)
       VALUES (@id, @patientId, @date, @hours, @sleepQuality, @sleepNotes)`,
      { id, patientId, date, hours: hoursFloat, sleepQuality: qualityStr, sleepNotes: notesStr }
    );

    return res.status(201).json({
      message: 'Registro de sono cadastrado com sucesso!',
      sleep_record: {
        id,
        patient_id: patientId,
        date,
        hours: hoursFloat,
        quality: qualityStr,
        notes: notesStr,
        created_at: new Date().toISOString()
      }
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
 * Accepts both backend and frontend-friendly field names:
 *   date (required), content (required), privacy OR is_shared, audio_url
 */
const createJournal = async (req, res) => {
  try {
    const patientId = req.user.id;
    let { date, content, privacy, is_shared, audio_url } = req.body;

    // Sanitize content (keep line breaks, strip HTML tags)
    content = typeof content === 'string' ? content.replace(/<[^>]*>/g, '').trim() : '';

    // Derive privacy from either 'privacy' or 'is_shared'
    let finalPrivacy;
    if (privacy) {
      finalPrivacy = privacy === 'shared' ? 'shared' : 'private';
    } else if (is_shared !== undefined) {
      finalPrivacy = is_shared ? 'shared' : 'private';
    } else {
      finalPrivacy = 'private';
    }

    audio_url = audio_url ? sanitizeString(audio_url) : null;

    if (!date || !content) {
      return res.status(400).json({
        error: 'Dados incompletos',
        message: 'Por favor, informe a data e o conteúdo do diário.'
      });
    }

    if (content.length > 10000) {
      return res.status(400).json({
        error: 'Conteúdo muito longo',
        message: 'O texto do diário deve ter no máximo 10.000 caracteres.'
      });
    }

    const id = crypto.randomUUID();

    run(
      `INSERT INTO journal_entries (id, patient_id, date, content, privacy, audio_url)
       VALUES (@id, @patientId, @date, @content, @privacy, @audioUrl)`,
      { id, patientId, date, content, privacy: finalPrivacy, audioUrl: audio_url }
    );

    return res.status(201).json({
      message: 'Entrada no diário criada com sucesso!',
      journal_entry: {
        id,
        patient_id: patientId,
        date,
        content,
        is_shared: finalPrivacy === 'shared',
        privacy: finalPrivacy,
        audio_url: audio_url,
        created_at: new Date().toISOString()
      }
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
