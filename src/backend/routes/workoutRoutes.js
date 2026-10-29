const {submitWorkout, getWorkouts, getWorkout, patchWorkout} = require('../controllers/workoutController')
const express = require('express')
const workoutRoutes = express.Router()
const {authenticationMiddleware} = require("../middlewares/authMiddlewares")
const multer = require('multer')
const upload = multer({dest: 'src/backend/uploads/'})

workoutRoutes.post("/api/workouts", authenticationMiddleware, upload.array('photos'), submitWorkout)
workoutRoutes.post("/api/workouts/get", authenticationMiddleware, getWorkouts) // isme body bhejni hai, sort aur filter vaali
workoutRoutes.get("/api/workouts/get/:id", authenticationMiddleware, getWorkout) // ye redundant hai, hata doonga
workoutRoutes.get("/api/workouts/:id", authenticationMiddleware, getWorkout)
workoutRoutes.patch("/api/workouts/:id", authenticationMiddleware, patchWorkout)

module.exports = {workoutRoutes}