const {submitWorkout, getWorkouts} = require('../controllers/workoutController')
const express = require('express')
const workoutRoutes = express.Router()
const {authenticationMiddleware} = require("../middlewares/authMiddlewares")
const multer = require('multer')
const upload = multer({dest: 'src/backend/uploads/'})

workoutRoutes.post("/api/workouts", authenticationMiddleware, upload.array('photos'), submitWorkout)
workoutRoutes.post("/api/workouts/get", authenticationMiddleware, getWorkouts)

module.exports = {workoutRoutes}