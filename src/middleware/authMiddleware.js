const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate requests using JWT token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Acesso não autorizado',
      message: 'Token de autenticação não fornecido.'
    });
  }

  const secret = process.env.JWT_SECRET || 'default_jwt_secret_change_me';

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        error: 'Acesso não autorizado',
        message: 'Token inválido ou expirado.'
      });
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      name: decoded.name,
      email: decoded.email
    };

    next();
  });
};

/**
 * Middleware to restrict access based on user role
 * @param  {...string} roles Allowed roles (e.g. 'paciente', 'terapeuta')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Acesso não autorizado',
        message: 'Usuário não autenticado.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Você não tem permissão para acessar este recurso.'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};
