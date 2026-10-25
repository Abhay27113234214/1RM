const {createUser, loginUser} = require("../controllers/userController")
const express = require("express")
const routes = express.Router()

// you can write routes in different file with help of express.Router 
// we will link logic with routes here 

routes.post("/api/auth/register", createUser)
routes.post("/api/auth/login", loginUser)
module.exports = {routes}