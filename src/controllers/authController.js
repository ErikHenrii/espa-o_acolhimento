const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { get, run } = require('../config/database');

// ============================================================
// Input sanitization helpers
// ============================================================

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 6) return false;
  if (password.length > 128) return false;
  return true;
}

// ============================================================
// Register a new patient
// ============================================================
const register = async (req, res) => {
  try {
    let { name, email, password, role, specialty, whatsapp } = req.body;

    name = sanitizeString(name);
    email = sanitizeString(email).toLowerCase();
    password = typeof password === 'string' ? password.trim() : '';

    if (!name || name.length < 2) {
      return res.status(400).json({
        error: 'Nome inválido',
        message: 'Por favor, informe um nome válido com pelo menos 2 caracteres.'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: 'E-mail inválido',
        message: 'Por favor, informe um e-mail válido.'
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        error: 'Senha inválida',
        message: 'A senha deve ter pelo menos 6 caracteres.'
      });
    }

    const existingUser = await get(
      'SELECT id FROM users WHERE email = @email',
      { email }
    );

    if (existingUser) {
      return res.status(400).json({
        error: 'E-mail em uso',
        message: 'Este e-mail já está cadastrado no sistema.'
      });
    }

    // Validate role
    const finalRole = (role === 'terapeuta') ? 'terapeuta' : 'paciente';
    const finalSpecialty = sanitizeString(specialty || 'Psicologia');
    const finalWhatsapp = sanitizeString(whatsapp || '');

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const userId = crypto.randomUUID();

    await run(
      `INSERT INTO users (id, name, email, password_hash, role, must_change_credentials, specialty, whatsapp)
       VALUES (@id, @name, @email, @passwordHash, @role, @mustChange, @specialty, @whatsapp)`,
      { id: userId, name, email, passwordHash, role: finalRole, mustChange: finalRole === 'terapeuta' ? 1 : 0, specialty: finalSpecialty, whatsapp: finalWhatsapp }
    );

    const newUser = await get(
      'SELECT id, name, email, role, must_change_credentials, specialty, whatsapp, created_at FROM users WHERE id = @id',
      { id: userId }
    );

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not configured!');
      return res.status(500).json({
        error: 'Erro de configuração',
        message: 'O servidor não está configurado corretamente.'
      });
    }

    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const token = jwt.sign(
      { id: newUser.id, role: newUser.role, name: newUser.name, email: newUser.email },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    return res.status(201).json({
      message: 'Cadastro realizado com sucesso!',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        must_change_credentials: newUser.must_change_credentials === 1,
        created_at: newUser.created_at
      },
      token
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    return res.status(500).json({
      error: 'Erro interno',
      message: 'Ocorreu um erro ao realizar o cadastro. Tente novamente mais tarde.'
    });
  }
};

// ============================================================
// Login user (patient or therapist)
// ============================================================
const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    email = sanitizeString(email).toLowerCase();
    password = typeof password === 'string' ? password : '';

    if (!email || !password) {
      return res.status(400).json({
        error: 'Dados incompletos',
        message: 'Por favor, informe o e-mail e a senha.'
      });
    }

    const user = await get(
      'SELECT id, name, email, password_hash, role, must_change_credentials, specialty, whatsapp, created_at FROM users WHERE email = @email',
      { email }
    );

    if (!user) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        message: 'E-mail ou senha incorretos.'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        message: 'E-mail ou senha incorretos.'
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not configured!');
      return res.status(500).json({
        error: 'Erro de configuração',
        message: 'O servidor não está configurado corretamente.'
      });
    }

    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, email: user.email },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    return res.status(200).json({
      message: 'Login realizado com sucesso!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        must_change_credentials: user.must_change_credentials === 1,
        created_at: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({
      error: 'Erro interno',
      message: 'Ocorreu um erro ao realizar o login. Tente novamente mais tarde.'
    });
  }
};

// ============================================================
// Update credentials (email and/or password)
// ============================================================
const updateCredentials = async (req, res) => {
  try {
    const userId = req.user.id;
    let { current_password, new_email, new_password, new_specialty, new_whatsapp } = req.body;

    current_password = typeof current_password === 'string' ? current_password : '';
    new_email = new_email ? sanitizeString(new_email).toLowerCase() : null;
    new_password = typeof new_password === 'string' ? new_password.trim() : '';

    if (!new_email && !new_password) {
      return res.status(400).json({
        error: 'Dados incompletos',
        message: 'Informe o novo e-mail ou a nova senha para atualizar.'
      });
    }

    const user = await get(
      'SELECT id, email, password_hash FROM users WHERE id = @id',
      { id: userId }
    );

    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        message: 'Conta não localizada.'
      });
    }

    const isCurrentValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isCurrentValid) {
      return res.status(401).json({
        error: 'Senha atual incorreta',
        message: 'A senha atual informada não confere.'
      });
    }

    let updates = [];
    let params = { id: userId };

    if (new_email) {
      if (!isValidEmail(new_email)) {
        return res.status(400).json({
          error: 'E-mail inválido',
          message: 'O novo e-mail informado não é válido.'
        });
      }

      if (new_email !== user.email) {
        const emailTaken = await get(
          'SELECT id FROM users WHERE email = @email AND id != @id',
          { email: new_email, id: userId }
        );

        if (emailTaken) {
          return res.status(400).json({
            error: 'E-mail em uso',
            message: 'Este e-mail já está cadastrado por outra conta.'
          });
        }

        updates.push('email = @newEmail');
        params.newEmail = new_email;
      }
    }

    if (new_password) {
      if (!validatePassword(new_password)) {
        return res.status(400).json({
          error: 'Senha inválida',
          message: 'A nova senha deve ter pelo menos 6 caracteres.'
        });
      }

      const newHash = await bcrypt.hash(new_password, 10);
      updates.push('password_hash = @newHash');
      params.newHash = newHash;
    }

    // Update specialty if provided
    if (new_specialty !== undefined) {
      const spec = sanitizeString(new_specialty);
      if (spec.length > 0) {
        updates.push('specialty = @newSpecialty');
        params.newSpecialty = spec;
      }
    }

    // Update whatsapp if provided
    if (new_whatsapp !== undefined) {
      const wa = sanitizeString(new_whatsapp);
      updates.push('whatsapp = @newWhatsapp');
      params.newWhatsapp = wa;
    }

    updates.push('must_change_credentials = 0');

    if (updates.length > 1) {
      await run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = @id`,
        params
      );
    } else {
      await run('UPDATE users SET must_change_credentials = 0 WHERE id = @id', { id: userId });
    }

    const updatedUser = await get(
      'SELECT id, name, email, role, must_change_credentials, specialty, whatsapp, created_at FROM users WHERE id = @id',
      { id: userId }
    );

    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const token = jwt.sign(
      { id: updatedUser.id, role: updatedUser.role, name: updatedUser.name, email: updatedUser.email },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    return res.status(200).json({
      message: 'Credenciais atualizadas com sucesso!',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        must_change_credentials: updatedUser.must_change_credentials === 1,
        created_at: updatedUser.created_at
      },
      token
    });
  } catch (error) {
    console.error('Erro ao atualizar credenciais:', error);
    return res.status(500).json({
      error: 'Erro interno',
      message: 'Ocorreu um erro ao atualizar as credenciais. Tente novamente.'
    });
  }
};

module.exports = {
  register,
  login,
  updateCredentials
};
