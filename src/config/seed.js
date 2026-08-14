const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { get, run } = require('./config/database');

/**
 * Seed the therapist account if it doesn't exist yet.
 * This runs automatically on server startup.
 */
function seedTherapist() {
  const therapistEmail = process.env.THERAPIST_EMAIL || 'jaqueline@espacoacolhimento.com.br';
  const therapistName = process.env.THERAPIST_NAME || 'Jaqueline Camila';
  const therapistPassword = process.env.THERAPIST_PASSWORD || 'jac123456';

  const existing = get(
    'SELECT id FROM users WHERE email = @email',
    { email: therapistEmail }
  );

  if (existing) {
    console.log('Therapist account already exists, skipping seed.');
    return;
  }

  const passwordHash = bcrypt.hashSync(therapistPassword, 10);
  const id = crypto.randomUUID();

  run(
    `INSERT INTO users (id, name, email, password_hash, role)
     VALUES (@id, @name, @email, @passwordHash, @role)`,
    { id, name: therapistName, email: therapistEmail, passwordHash, role: 'terapeuta' }
  );

  console.log('========================================');
  console.log('Therapist account created successfully!');
  console.log(`Email: ${therapistEmail}`);
  console.log(`Password: ${therapistPassword}`);
  console.log('Change the password after first login!');
  console.log('========================================');
}

module.exports = { seedTherapist };
