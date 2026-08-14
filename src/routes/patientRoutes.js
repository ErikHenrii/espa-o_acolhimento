const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Apply auth middleware and require 'paciente' role for all patient routes
router.use(authenticateToken);
router.use(requireRole('paciente'));

// GET /api/patient/data
router.get('/data', patientController.getData);

// POST /api/patient/checkin
router.post('/checkin', patientController.createCheckin);

// POST /api/patient/sleep
router.post('/sleep', patientController.createSleep);

// POST /api/patient/journal
router.post('/journal', patientController.createJournal);

module.exports = router;
