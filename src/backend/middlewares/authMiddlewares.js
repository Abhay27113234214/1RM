const jwt = require("jsonwebtoken")
require("dotenv").config({
    path: require("path").resolve(__dirname, "../../../.env")
});

const SECRET_KEY = process.env.SECRET_KEY

const authenticationMiddleware = (request, response, next) => {
    const headers = request.headers.authorization
    const token = headers.split(" ")[1]
    const decode = jwt.verify(token, SECRET_KEY)
    if (decode) {
        request.user = decode
        next()
    } else {
        response.send({
            success: false,
            reason: 'invalid_jwt'
        })
    }
}

module.exports = {authenticationMiddleware}