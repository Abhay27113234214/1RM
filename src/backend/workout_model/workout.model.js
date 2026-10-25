/**
 * workout.model.js / model.js
 * Mongoose Schemas and Models for Workout Module (MVC: Model layer)
 */

import mongoose from 'mongoose';

/* ==========================================================================
   1. EXERCISE SCHEMA
   ========================================================================== */
const exerciseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Exercise name is required'],
      trim: true,
      unique: true,
    },
    asset: {
      type: String,
      default: 'None',
      trim: true,
    },
    equipment_type: {
      type: String,
      default: 'other',
      trim: true,
    },
    primary_muscle_group: {
      type: String,
      required: [true, 'Primary muscle group is required'],
      trim: true,
    },
    other_muscles: {
      type: [String],
      default: [],
    },
    exercise_type: {
      type: String,
      required: [true, 'Exercise type is required'],
      trim: true,
    },
    measurement: {
      type: [String],
      default: ['reps', 'kg'],
    },
    is_custom: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/* ==========================================================================
   2. WORKOUT SCHEMA
   ========================================================================== */
const workoutSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: [true, 'User ID is required'],
      trim: true,
      index: true,
    },
    date: {
      type: String,
      required: [true, 'Date is required (YYYY-MM-DD)'],
      trim: true,
      index: true,
    },
    title: {
      type: String,
      default: 'Grinded',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    start_time: {
      type: mongoose.Schema.Types.Mixed,
      default: () => Date.now(),
    },
    total_time: {
      type: String,
      default: '0:00',
      trim: true,
    },
    total_volume: {
      type: String,
      default: '0',
      trim: true,
    },
    photos: {
      type: [String],
      default: ['../assets/default_workout_image.png'],
    },
    spots: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    comments: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    exercises: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Workout must include at least one exercise'],
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Exercise = mongoose.model('Exercise', exerciseSchema);
export const Workout = mongoose.model('Workout', workoutSchema);
export default { Exercise, Workout };
