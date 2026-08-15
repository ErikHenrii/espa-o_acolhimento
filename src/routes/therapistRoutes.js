const express = require('express');
const router = express.Router();
const therapistController = require('../controllers/therapistController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Apply auth middleware and require 'terapeuta' role for all therapist routes
router.use(authenticateToken);
router.use(requireRole('terapeuta'));

// GET /api/therapist/patients
router.get('/patients', therapistController.getPatients);

// GET /api/therapist/patient/:id/history
router.get('/patient/:id/history', therapistController.getPatientHistory);

// PATCH /api/therapist/patient/:id/toggle-status
router.patch('/patient/:id/toggle-status', therapistController.togglePatientStatus);

// POST /api/therapist/patient/:id/mark-attended
router.post('/patient/:id/mark-attended', therapistController.markPatientAttended);

module.exports = router;
