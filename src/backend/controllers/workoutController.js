const {User} = require("../models/userModel")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const cloudinary = require('../config/cloudinary');
const fs = require('fs/promises');
const { Workout } = require('../models/workoutModel');
const { Exercise } = require('../models/exerciseModel')

cloudinary.config({
  secure: true
});

require("dotenv").config({
    path: require("path").resolve(__dirname, "../../../.env")
});

const SECRET_KEY = process.env.SECRET_KEY

const uploadImage = async (imagePath) => {
    const options = {
        folder: 'workout-photos',
        use_filename: true,
        unique_filename: true,
        overwrite: false
    };

    const result = await cloudinary.uploader.upload(imagePath, options);

    return result.secure_url;
};


const submitWorkout = async (request, response) => {
    const files = request.files || [];

    try {
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
                    const exercise = await Exercise.findOne({
                        name: exerciseName
                    });

                    if (!exercise) {
                        throw new Error(
                            `Exercise not found: ${exerciseName}`
                        );
                    }

                    const sets = Object.entries(
                        exerciseData.sets || {}
                    )
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .map(([, set]) => {
                            const convertedSet = {
                                reps: Number(set.reps)
                            };

                            if (set.kg !== undefined && set.kg !== '') {
                                convertedSet.kg = Number(set.kg);
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
        await Promise.all(
            files.map(file =>
                fs.unlink(file.path).catch(error => {
                    console.error('File cleanup failed:', error);
                })
            )
        );
    }
};

module.exports = { submitWorkout };