const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');

// Public routes - Get all courses
router.get('/all', courseController.getAllCourses);

module.exports = router; 