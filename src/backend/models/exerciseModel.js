/**
 * exerciseModel.js
 * Mongoose Schema and Model for Exercises (MVC: Model layer)
 */

import mongoose from 'mongoose';

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

export const Exercise = mongoose.model('Exercise', exerciseSchema);
export default Exercise;
