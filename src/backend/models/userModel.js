const mongoose = require("mongoose")
const userSchema = new mongoose.Schema({
    "name":{type:String, required:true},
    "username": {type:String, required:true},
    "email": {type:String, required:true},
    "password": {type:String, required:true},
    "incomplete": {type:Boolean, default:true}
})

// now we will connect this schema with our table, or colllection 
const User = mongoose.model("users", userSchema)
module.exports = {User}