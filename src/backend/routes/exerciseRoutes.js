/**
 * exerciseRoutes.js
 * Express Routes for Exercises (MVC: Route layer)
 */

import express from 'express';
import {
  getExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
} from '../controllers/exerciseController.js';

const router = express.Router();

router.route('/')
  .get(getExercises)
  .post(createExercise);

router.route('/:id')
  .get(getExerciseById)
  .put(updateExercise)
  .delete(deleteExercise);

export default router;
