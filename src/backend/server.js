const dns = require('node:dns');

dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require("express")
const {connection} = require("./config/db.js")
const app = express()
const cors = require("cors")
const {routes} = require("./routes/userRoutes.js")
const exerciseRoutes = require('./routes/exerciseRoutes.js')
const {workoutRoutes} = require('./routes/workoutRoutes.js')
app.use(express.json())

app.use(cors({
    origin: ["http://127.0.0.1:5500", "http://localhost:5500"],
    credentials: true
}))

app.use("/", routes)
app.use("/", exerciseRoutes)
app.use("/", workoutRoutes)

app.listen(5000, async () => {
    try {
        await connection
        console.log("DB connected successfully")
    } catch (error) {
        console.log(error)
    }
})