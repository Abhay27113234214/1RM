/**
 * exerciseController.js
 * Controller layer for Exercises (MVC: Controller - CommonJS)
 * 
 * Handles:
 *   - getExercises: filter by ?muscle=, ?equipment=, ?q=
 *   - getExerciseById: retrieves by ID
 *   - createExercise: validates fields, rejects duplicates, creates custom exercise
 *   - updateExercise: updates exercise by ID
 *   - deleteExercise: deletes exercise by ID
 */

const mongoose = require('mongoose');
const Exercise = require('../models/exerciseModel');

/**
 * GET /api/exercises
 * Query filters:
 *   - muscle: filter by primary_muscle_group (case-insensitive)
 *   - equipment: filter by equipment_type (case-insensitive)
 *   - q: search exercise name
 */
const getExercises = async (req, res, next) => {
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
 * Retrieve a single exercise by ID
 */
const getExerciseById = async (req, res, next) => {
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
 * Creates a new custom exercise.
 * Validates: name, primary_muscle_group, exercise_type, duplicate name check.
 * Returns 201 with the created exercise.
 */
const createExercise = async (req, res, next) => {
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

    // 1. Validation: required fields
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

    // 2. Check for duplicate name (case-insensitive)
    const existing = await Exercise.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An exercise named "${name.trim()}" already exists`,
      });
    }

    // 3. Create and save custom exercise
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
 * Update an existing exercise
 */
const updateExercise = async (req, res, next) => {
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
 * Delete an exercise
 */
const deleteExercise = async (req, res, next) => {
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

module.exports = {
  getExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
};
