/**
 * workout.routes.js / routes.js
 * Express Routes for Workout Module (MVC: Route layer)
 */

import express from 'express';
import {
  getExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
  getWorkouts,
  getWorkoutById,
  createWorkout,
  updateWorkout,
  deleteWorkout,
} from '../workout_controller/workout.controller.js';

const router = express.Router();

/* ==========================================================================
   EXERCISE ENDPOINTS
   Base: /api/exercises
   ========================================================================== */
router.route('/exercises')
  .get(getExercises)
  .post(createExercise);

router.route('/exercises/:id')
  .get(getExerciseById)
  .put(updateExercise)
  .delete(deleteExercise);

/* ==========================================================================
   WORKOUT ENDPOINTS
   Base: /api/workouts
   ========================================================================== */
router.route('/workouts')
  .get(getWorkouts)
  .post(createWorkout);

router.route('/workouts/:id')
  .get(getWorkoutById)
  .put(updateWorkout)
  .delete(deleteWorkout);

export default router;
