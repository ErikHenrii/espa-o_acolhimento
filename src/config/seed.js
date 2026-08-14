const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { get, run } = require('./database');

/**
 * Seed the therapist account if it doesn't exist yet.
 * SAFE for Render Free: only creates the account on FIRST run.
 * On subsequent restarts (even with a fresh disk), it checks by email
 * and skips if the account already exists. If the disk was wiped,
 * the account is recreated with default credentials + must_change_credentials=1.
 *
 * IMPORTANT: This NEVER overwrites an existing account's email or password.
 */
function seedTherapist() {
  const therapistEmail = process.env.THERAPIST_EMAIL || 'jaqueline@espacoacolhimento.com.br';
  const therapistName = process.env.THERAPIST_NAME || 'Jaqueline Camila';
  const therapistPassword = process.env.THERAPIST_PASSWORD || 'jac123456';

  const existing = get(
    'SELECT id, must_change_credentials FROM users WHERE email = @email',
    { email: therapistEmail }
  );

  if (existing) {
    // Account already exists — do NOT touch it.
    // This is the critical safety: if the terapeuta already changed their
    // email/password, we must not overwrite it.
    console.log('Therapist account already exists, skipping seed.');
    return;
  }

  const passwordHash = bcrypt.hashSync(therapistPassword, 10);
  const id = crypto.randomUUID();

  run(
    `INSERT INTO users (id, name, email, password_hash, role, must_change_credentials)
     VALUES (@id, @name, @email, @passwordHash, @role, @mustChange)`,
    { id, name: therapistName, email: therapistEmail, passwordHash, role: 'terapeuta', mustChange: 1 }
  );

  console.log('========================================');
  console.log('Therapist account created successfully!');
  console.log(`Email: ${therapistEmail}`);
  console.log(`Password: ${therapistPassword}`);
  console.log('IMPORTANT: Change the password after first login!');
  console.log('========================================');
}

module.exports = { seedTherapist };
