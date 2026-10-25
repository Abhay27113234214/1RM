/**
 * workout.controller.js / controller.js
 * Controller layer for Exercises and Workouts (MVC: Controller)
 */

import mongoose from 'mongoose';
import { Exercise, Workout } from '../workout_model/workout.model.js';

/* ==========================================================================
   EXERCISES CONTROLLERS
   ========================================================================== */

/**
 * GET /api/exercises
 */
export const getExercises = async (req, res, next) => {
  try {
    const { muscle, equipment, q } = req.query;
    const filter = {};

    if (muscle) {
      filter.primary_muscle_group = new RegExp(`^${muscle.trim()}$`, 'i');
    }
    if (equipment) {
      filter.equipment_type = new RegExp(`^${equipment.trim()}$`, 'i');
    }
    if (q) {
      filter.name = new RegExp(q.trim(), 'i');
    }

    const exercises = await Exercise.find(filter).sort({ name: 1 });
    return res.status(200).json(exercises);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/exercises/:id
 */
export const getExerciseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Exercise not found' });
    }

    const exercise = await Exercise.findById(id);
    if (!exercise) {
      return res.status(404).json({ success: false, message: 'Exercise not found' });
    }

    return res.status(200).json(exercise);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/exercises
 */
export const createExercise = async (req, res, next) => {
  try {
    const {
      name,
      primary_muscle_group,
      exercise_type,
      equipment_type,
      other_muscles,
      measurement,
      asset,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Exercise name is required' });
    }
    if (!primary_muscle_group || !primary_muscle_group.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Primary muscle group is required (e.g. chest, back, legs)',
      });
    }
    if (!exercise_type || !exercise_type.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Exercise type is required (e.g. weight_and_reps, bodyweight_reps)',
      });
    }

    const existing = await Exercise.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An exercise named "${name.trim()}" already exists`,
      });
    }

    const newExercise = new Exercise({
      name: name.trim(),
      primary_muscle_group: primary_muscle_group.trim().toLowerCase(),
      exercise_type: exercise_type.trim(),
      equipment_type: equipment_type ? equipment_type.trim() : 'other',
      other_muscles: Array.isArray(other_muscles) ? other_muscles : [],
      measurement: Array.isArray(measurement) && measurement.length ? measurement : ['reps', 'kg'],
      asset: asset || 'None',
      is_custom: true,
    });

    const savedExercise = await newExercise.save();
    return res.status(201).json(savedExercise);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/exercises/:id
 */
export const updateExercise = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Exercise not found' });
    }

    const updated = await Exercise.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Exercise not found' });
    }

    return res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/exercises/:id
 */
export const deleteExercise = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Exercise not found' });
    }

    const deleted = await Exercise.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Exercise not found' });
    }

    return res.status(200).json({ success: true, message: 'Exercise deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/* ==========================================================================
   WORKOUTS CONTROLLERS
   ========================================================================== */

/**
 * GET /api/workouts
 */
export const getWorkouts = async (req, res, next) => {
  try {
    const { user_id, date } = req.query;
    const filter = {};

    if (user_id) filter.user_id = user_id.trim();
    if (date) filter.date = date.trim();

    const workouts = await Workout.find(filter).sort({ date: -1, createdAt: -1 });
    return res.status(200).json(workouts);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/workouts/:id
 */
export const getWorkoutById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Workout not found' });
    }

    const workout = await Workout.findById(id);
    if (!workout) {
      return res.status(404).json({ success: false, message: 'Workout not found' });
    }

    return res.status(200).json(workout);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/workouts
 */
export const createWorkout = async (req, res, next) => {
  try {
    const {
      user_id,
      date,
      title,
      description,
      start_time,
      total_time,
      total_volume,
      photos,
      spots,
      comments,
      exercises,
    } = req.body;

    if (!user_id || typeof user_id !== 'string' || !user_id.trim()) {
      return res.status(400).json({ success: false, message: 'Validation failed: user_id is required' });
    }

    if (!date || typeof date !== 'string' || !date.trim()) {
      return res.status(400).json({ success: false, message: 'Validation failed: date is required (YYYY-MM-DD)' });
    }

    if (!exercises || typeof exercises !== 'object' || Object.keys(exercises).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed: workout must contain at least one exercise',
      });
    }

    let hasLoggedSets = false;
    for (const [exName, exData] of Object.entries(exercises)) {
      if (exData && exData.sets && Object.keys(exData.sets).length > 0) {
        hasLoggedSets = true;
        break;
      }
    }

    if (!hasLoggedSets) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed: at least one exercise must have logged sets',
      });
    }

    const newWorkout = new Workout({
      user_id: user_id.trim(),
      date: date.trim(),
      title: title && title.trim() ? title.trim() : 'Grinded',
      description: description ? description.trim() : '',
      start_time: start_time || Date.now(),
      total_time: total_time || '0:00',
      total_volume: total_volume || '0',
      photos: Array.isArray(photos) && photos.length ? photos : ['../assets/default_workout_image.png'],
      spots: Array.isArray(spots) ? spots : [],
      comments: Array.isArray(comments) ? comments : [],
      exercises,
    });

    const savedWorkout = await newWorkout.save();
    return res.status(201).json(savedWorkout);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/workouts/:id
 */
export const updateWorkout = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Workout not found' });
    }

    const updated = await Workout.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Workout not found' });
    }

    return res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/workouts/:id
 */
export const deleteWorkout = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Workout not found' });
    }

    const deleted = await Workout.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Workout not found' });
    }

    return res.status(200).json({ success: true, message: 'Workout deleted successfully' });
  } catch (err) {
    next(err);
  }
};
