const mongoose = require("mongoose")
require("dotenv").config({
    path: require("path").resolve(__dirname, "../../../.env")
});

const url = process.env.MONGO_URL

const connection = mongoose.connect(url)

module.exports = {connection}