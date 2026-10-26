const {createUser, loginUser, getUserFromToken, updateUser} = require("../controllers/userController")
const express = require("express")
const routes = express.Router()
const {authenticationMiddleware} = require("../middlewares/authMiddlewares")

// you can write routes in different file with help of express.Router 
// we will link logic with routes here 

routes.post("/api/auth/register", createUser) // jwt authentication aur authorization k liye abhi middleware lagana hai
routes.post("/api/auth/login", loginUser) // jwt authentication aur authorization k liye abhi middleware lagana hai
routes.get("/api/auth/get", authenticationMiddleware, getUserFromToken) // jwt authentication aur authorization k liye abhi middleware lagana hai
routes.patch("/api/auth/update", authenticationMiddleware, updateUser) // jwt authentication aur authorization k liye abhi middleware lagana hai
module.exports = {routes}