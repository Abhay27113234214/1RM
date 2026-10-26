const mongoose = require("mongoose")
const userSchema = new mongoose.Schema({
    "name":{type:String, required:true},
    "username": {type:String, required:true},
    "email": {type:String, required:true},
    "password": {type:String, required:true},
    "incomplete": {type:Boolean, default:true},
    age: {type: Number},
    sex: { type: String, enum: ["Man", "Woman", "Other"] },
    main_goal: { type: String },
    experience: { type: String, enum: ["Beginner", "Intermediate", "Advanced"] },
    training_days: { type: String },
    measurements: {
        height: { type: Number },
        weight: { type: Number },
        body_fat: { type: Number }
    }
})

// now we will connect this schema with our table, or colllection 
const User = mongoose.model("users", userSchema)
module.exports = {User}