const bcrypt = require('bcryptjs');
const { get, run } = require('./database');

/**
 * Seed the therapist account if it doesn't exist yet.
 * Runs automatically on server startup (async).
 */
async function seedTherapist() {
  const therapistEmail = process.env.THERAPIST_EMAIL || 'jaqueline@espacoacolhimento.com.br';
  const therapistName = process.env.THERAPIST_NAME || 'Jaqueline Camila';
  const therapistPassword = process.env.THERAPIST_PASSWORD || 'jac123456';

  try {
    const existing = await get(
      'SELECT id FROM users WHERE email = $1',
      [therapistEmail]
    );

    if (existing) {
      console.log('Therapist account already exists, skipping seed.');
      return;
    }

    const passwordHash = bcrypt.hashSync(therapistPassword, 10);

    await run(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'terapeuta')`,
      [therapistName, therapistEmail, passwordHash]
    );

    console.log('========================================');
    console.log('Therapist account created successfully!');
    console.log(`Email: ${therapistEmail}`);
    console.log(`Password: ${therapistPassword}`);
    console.log('Change the password after first login!');
    console.log('========================================');
  } catch (err) {
    console.error('Error seeding therapist account:', err.message);
  }
}

module.exports = { seedTherapist };
