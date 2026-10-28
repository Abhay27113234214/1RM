const mongoose = require('mongoose')

const setSchema = mongoose.Schema({
    "kg": {type: Number},
    "reps": {type: Number},
    "time": {type: String},
    "distance": {type: Number}
},  { _id: false }) 

const workoutExerciseSchema = mongoose.Schema({
    "exercise":{
        type: mongoose.Schema.Types.ObjectId,
        ref: "exercises",
        required: true
    },
    "sets": [setSchema],
    "notes": {type: String},
    "type": {type: String, default: 'weight_and_reps'}
})

const commentSchema = mongoose.Schema({
    "user": {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "users",
        required: true
    },
    "comment": {type: String, default: ""}
})

const workoutSchema = mongoose.Schema({
    "start_time": {type: Number, required: true},
    "exercises": {type: [workoutExerciseSchema], default: []},
    "title": {type: String, required: true},
    "description": {type: String, default: ""},
    "photos": {type: [String], default: []},
    "date": {type: Date, default: Date.now},
    "total_time": {type: String},
    "total_volume": {type: String},
    "spots": { type: [{type: mongoose.Schema.Types.ObjectId, ref: "users" }], default: [] },
    "comments": {type: [commentSchema], default: []},
    "user": { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true}
}, { timestamps: true })

const Workout = mongoose.model("workouts", workoutSchema)
module.exports = {Workout}