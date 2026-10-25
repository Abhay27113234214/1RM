const {User} = require("../models/userModel")
const bcrypt = require("bcrypt")

const createUser = async (request, response) => {
    try {
        const {email, password, name, username} = request.body
        const user_query = await User.find({
            email: email
        }).exec()
        if (user_query.length >= 1) {
            response.status(409).send({
                success: false,
                reason: "user_already_exists"
            })
            return;
        }
        const newUser = {
            email: email, 
            name: name, 
            username: username,
            password: await bcrypt.hash(password, 10)
        }
        const data = await User.create(newUser)
        response.status(201).send({
            success: true
        })
        return;
    } catch (error) {
        response.send({
            success: false,
            reason: "some_error_occured",
            error: error
        })
        return;
    }
}

const loginUser = async (request, response) => {
    try {
        const {email, password} = request.body 
        const user_query = await User.find({
            email: email
        }).exec()
        if (user_query.length < 1) {
            response.status(409).send({
                success: false,
                reason: "user_not_found"
            })
            return;
        }
        const check_user = await bcrypt.compare(password, user_query[0].password)
        if (!check_user) {
            response.send({
                success: false,
                reason: "invalid_password"
            })
            return;
        }
        response.send({success: true, user: user_query[0]})
    } catch (error) {
        response.send({
            success: false,
            reason: "some_error_occured",
            error: error
        })
        return;
    }
}

module.exports = { createUser, loginUser }