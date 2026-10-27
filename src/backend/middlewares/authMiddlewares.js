const jwt = require("jsonwebtoken")
require("dotenv").config({
    path: require("path").resolve(__dirname, "../../../.env")
});

const SECRET_KEY = process.env.SECRET_KEY

const authenticationMiddleware = (request, response, next) => {
    try {
        const headers = request.headers.authorization;
        if (!headers || !headers.startsWith("Bearer ")) {
            return response.status(401).json({
                success: false,
                reason: "missing_or_invalid_authorization_header"
            });
        }
        const token = headers.split(" ")[1];
        const decode = jwt.verify(token, SECRET_KEY);
        request.user = decode;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return response.status(401).json({
                success: false,
                reason: "token_expired"
            });
        }
        if ( error.name === "JsonWebTokenError" || error.name === "NotBeforeError" ) {
            return response.status(401).json({
                success: false,
                reason: "invalid_jwt"
            });
        }
        console.error("Authentication middleware error:", error);
        return response.status(500).json({
            success: false,
            reason: "internal_server_error"
        });
    }
};

module.exports = {authenticationMiddleware}