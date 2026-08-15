const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { get, run } = require('./database');

/**
 * Seed the therapist account if it doesn't exist yet.
 * SAFE for Render: only creates the account on FIRST run.
 * On subsequent restarts, it checks by email and skips if the account
 * already exists. Since we now use PostgreSQL (persistent), the data
 * survives restarts — this is just a safety net for initial deployment.
 */
async function seedTherapist() {
  const therapistEmail = process.env.THERAPIST_EMAIL || 'jaqueline@espacoacolhimento.com.br';
  const therapistName = process.env.THERAPIST_NAME || 'Jaqueline Camila';
  const therapistPassword = process.env.THERAPIST_PASSWORD || 'jac123456';
  const therapistSpecialty = process.env.THERAPIST_SPECIALTY || 'Psicologia';
  const therapistWhatsapp = process.env.THERAPIST_WHATSAPP || '';

  const existing = await get(
    'SELECT id, must_change_credentials FROM users WHERE email = @email',
    { email: therapistEmail }
  );

  if (existing) {
    console.log('Therapist account already exists, skipping seed.');
    return;
  }

  const passwordHash = bcrypt.hashSync(therapistPassword, 10);
  const id = crypto.randomUUID();

  await run(
    `INSERT INTO users (id, name, email, password_hash, role, must_change_credentials, specialty, whatsapp)
     VALUES (@id, @name, @email, @passwordHash, @role, @mustChange, @specialty, @whatsapp)`,
    { id, name: therapistName, email: therapistEmail, passwordHash, role: 'terapeuta', mustChange: 1, specialty: therapistSpecialty, whatsapp: therapistWhatsapp }
  );

  console.log('========================================');
  console.log('Therapist account created successfully!');
  console.log(`Email: ${therapistEmail}`);
  console.log(`Password: ${therapistPassword}`);
  console.log('IMPORTANT: Change the password after first login!');
  console.log('========================================');
}

module.exports = { seedTherapist };
