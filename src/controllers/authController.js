const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, run } = require('../config/database');

/**
 * Register a new patient
 */
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Dados incompletos',
        message: 'Por favor, informe nome, e-mail e senha.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Senha muito curta',
        message: 'A senha deve ter pelo menos 6 caracteres.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await get(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (existingUser) {
      return res.status(400).json({
        error: 'E-mail em uso',
        message: 'Este e-mail já está cadastrado no sistema.'
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new patient
    const newUser = await get(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'paciente')
       RETURNING id, name, email, role, created_at`,
      [name.trim(), normalizedEmail, passwordHash]
    );

    // Generate JWT Token
    const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret_change_me';
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const token = jwt.sign(
      {
        id: newUser.id,
        role: newUser.role,
        name: newUser.name,
        email: newUser.email
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    return res.status(201).json({
      message: 'Cadastro realizado com sucesso!',
      user: newUser,
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

/**
 * Login user (patient or therapist)
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Dados incompletos',
        message: 'Por favor, informe o e-mail e a senha.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user
    const user = await get(
      'SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (!user) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        message: 'E-mail ou senha incorretos.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        message: 'E-mail ou senha incorretos.'
      });
    }

    // Generate token
    const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret_change_me';
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email
      },
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

module.exports = {
  register,
  login
};
