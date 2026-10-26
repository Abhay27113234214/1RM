const {User} = require("../models/userModel")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

require("dotenv").config({
    path: require("path").resolve(__dirname, "../../../.env")
});

const SECRET_KEY = process.env.SECRET_KEY

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
        const token = jwt.sign({
            "id":data._id
        }, SECRET_KEY, {"expiresIn":"1hr"})
        response.status(201).send({
            success: true,
            token: token
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
        const token = jwt.sign({
            "id":user_query[0]._id
        }, SECRET_KEY, {"expiresIn":"1hr"})
        response.send({success: true, user: user_query[0], token: token})
    } catch (error) {
        response.send({
            success: false,
            reason: "some_error_occured",
            error: error
        })
        return;
    }
}

const getUserFromToken = async (request, response) => {
    // const token = request.headers.authorization.split(" ")[1];
    // const decode = jwt.verify(token, SECRET_KEY)
    // if (decode) {
    //     const user = await User.findById(decode.id).exec()
    //     response.send({
    //         success: true,
    //         user: user
    //     })
    //     return
    // } else {
    //     response.send({
    //         success: false,
    //         reason: "invalid_jwt"
    //     })
    //     return
    // }
    const user = await User.findById(request.user.id)
    return response.send({
        "success": true,
        "email": user.email,
        "username": user.username,
        "name": user.name
    })
}

const updateUser = async (request, response) => {
    const token = request.headers.authorization.split(" ")[1];
    const decode = jwt.verify(token, SECRET_KEY)
    if (decode) {
        const data = await User.findByIdAndUpdate(decode.id, request.body, {returnDocument: 'after'})
        response.send({
            success: true
        })
        return
    } else {
        response.status(504).send({
            success: false,
            reason: "invalid_jwt"
        })
        return
    }
}

const authenticateUserFronToken = (request, response) => {
    response.send({
        success: true
    })
}

module.exports = { createUser, loginUser, getUserFromToken, updateUser, authenticateUserFronToken }