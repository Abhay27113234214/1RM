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
const { authenticationMiddleware } = require('../middlewares/authMiddlewares');

const router = express.Router();

router.route('/api/exercises')
  .get(authenticationMiddleware, getExercises)
  .post(authenticationMiddleware, createExercise);

router.route('/api/exercises/:id')
  .get(authenticationMiddleware, getExerciseById)
  .put(authenticationMiddleware, updateExercise)
  .delete(authenticationMiddleware, deleteExercise);

module.exports = router;
