const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// PUT /api/auth/update-credentials — protected, requires valid JWT
router.put('/update-credentials', authenticateToken, authController.updateCredentials);

module.exports = router;
