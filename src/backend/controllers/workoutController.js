const { User } = require("../models/userModel")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const cloudinary = require('../config/cloudinary');
const fs = require('fs/promises');
const { Workout } = require('../models/workoutModel');
const { Exercise } = require('../models/exerciseModel');
const { request } = require("http");

cloudinary.config({
    secure: true
});

require("dotenv").config({
    path: require("path").resolve(__dirname, "../../../.env")
});

const SECRET_KEY = process.env.SECRET_KEY

const submitWorkout = async (request, response) => {
    const files = request.files || [];

    try {
        console.log("2. Starting workout processing");
        const {
            start_time,
            title,
            description,
            total_time,
            total_volume,
            comments
        } = request.body;

        const exerciseDictionary = JSON.parse(
            request.body.exercises || '{}'
        );

        const exercises = await Promise.all(
            Object.entries(exerciseDictionary).map(
                async ([exerciseName, exerciseData]) => {
                    const cleanName = exerciseName.trim();
                    const escapedName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    let exercise = await Exercise.findOne({
                        name: new RegExp(`^${escapedName}$`, 'i')
                    });

                    if (!exercise) {
                        exercise = await Exercise.create({
                            name: cleanName,
                            primary_muscle_group: 'other',
                            exercise_type: exerciseData.type || 'weight_and_reps',
                            measurement: ['reps', 'kg'],
                            is_custom: true
                        });
                    }

                    const sets = Object.entries(
                        exerciseData.sets || {}
                    )
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .map(([, set]) => {
                            const convertedSet = {};

                            if (set.reps !== undefined && set.reps !== '') {
                                convertedSet.reps = Number(set.reps) || 0;
                            }
                            if (set.kg !== undefined && set.kg !== '') {
                                convertedSet.kg = Number(set.kg);
                            }
                            if (set.time !== undefined && set.time !== '') {
                                convertedSet.time = String(set.time);
                            }
                            if (set.distance !== undefined && set.distance !== '') {
                                convertedSet.distance = Number(set.distance);
                            }

                            return convertedSet;
                        });

                    return {
                        exercise: exercise._id,
                        sets,
                        notes: exerciseData.notes || '',
                        type: exerciseData.type || 'weight_and_reps'
                    };
                }
            )
        );

        const photoUrls = await Promise.all(
            files.map(async file => {
                const result = await cloudinary.uploader.upload(
                    file.path,
                    {
                        folder: 'workout-photos',
                        use_filename: true,
                        unique_filename: true,
                        overwrite: false
                    }
                );

                return result.secure_url;
            })
        );

        const parsedComments = comments
            ? JSON.parse(comments)
            : [];

        const rawVolume = total_volume;
        const workout = await Workout.create({
            start_time: Number(start_time),
            exercises,
            title,
            description: description || '',
            photos: photoUrls,
            date: Date.now(),
            total_time: total_time || undefined,
            total_volume: rawVolume,
            comments: parsedComments,
            user: request.user.id
        });

        return response.status(201).json({
            success: true,
            workout
        });

    } catch (error) {
        console.error('Error submitting workout:', error);

        return response.status(500).json({
            success: false,
            reason: 'workout_submission_failed'
        });

    } finally {
        for (const file of files) {
            fs.unlink(file.path).catch(error => {
                console.error("File cleanup failed:", error);
            });
        }
    }
};

const getWorkouts = async (request, response) => {
    try {
        const filter = request.body.filter || {};
        const sort = request.body.sort || { start_time: -1 };

        const workouts = await Workout.find(filter)
            .populate('user', 'name username email')
            .populate('exercises.exercise')
            .sort(sort);

        return response.status(200).json({
            success: true,
            workouts
        });
    } catch (error) {
        console.error(error);

        return response.status(500).json({
            success: false,
            reason: 'failed_to_fetch_workouts'
        });
    }
};

const getWorkout = async (request, response) => {
    try {
        const rawId = request.params.id || '';
        const id = rawId.startsWith(':') ? rawId.slice(1) : rawId;
        const workout = await Workout.findById(id)
            .populate('user', 'name username email')
            .populate('exercises.exercise');

        if (!workout) {
            return response.status(404).json({
                success: false,
                reason: 'workout_not_found'
            });
        }

        return response.status(200).json({
            success: true,
            workout
        });
    } catch (error) {
        console.error('getWorkout error:', error);
        return response.status(500).json({
            success: false,
            reason: error.message
        });
    }
};

const patchWorkout = async (request, response) => {
    try {
        const rawId = request.params.id || '';
        const id = rawId.startsWith(':') ? rawId.slice(1) : rawId;
        const workout = await Workout.findByIdAndUpdate(id, request.body, { new: true })
            .populate('user', 'name username email')
            .populate('exercises.exercise');
        return response.status(200).json({
            success: true,
            workout
        });
    } catch (error) {
        console.error('patchWorkout error:', error);
        return response.status(500).json({
            success: false,
            reason: error.message
        });
    }
};

module.exports = { submitWorkout, getWorkouts, getWorkout, patchWorkout };