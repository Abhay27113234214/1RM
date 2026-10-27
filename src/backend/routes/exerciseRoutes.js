/**
 * exerciseRoutes.js
 * Express Routes for Exercises (MVC: Route layer - CommonJS)
 */

const express = require('express');
const {
  getExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
} = require('../controllers/exerciseController');

const router = express.Router();

router.route('/api/exercises')
  .get(getExercises)
  .post(createExercise);

router.route('/api/exercises/:id')
  .get(getExerciseById)
  .put(updateExercise)
  .delete(deleteExercise);

module.exports = router;
