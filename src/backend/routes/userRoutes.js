const {createUser, loginUser, getUserFromToken, updateUser, authenticateUserFronToken, getUserFromId} = require("../controllers/userController")
const express = require("express")
const routes = express.Router()
const {authenticationMiddleware} = require("../middlewares/authMiddlewares")

// you can write routes in different file with help of express.Router 
// we will link logic with routes here 

routes.get("/api/auth", authenticationMiddleware, authenticateUserFronToken)
routes.post("/api/auth/register", createUser)
routes.post("/api/auth/login", loginUser)
routes.get("/api/auth/get", authenticationMiddleware, getUserFromToken)
routes.get("/api/auth/get/:id", authenticationMiddleware, getUserFromId)
routes.patch("/api/auth/update", authenticationMiddleware, updateUser) 

module.exports = {routes}