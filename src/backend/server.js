const express = require("express")
const {connection} = require("./config/db.js")
const app = express()
const cors = require("cors")
const {routes} = require("./routes/userRoutes.js")
app.use(express.json())

app.use(cors({
    origin: "http://127.0.0.1:5500"
}))

app.use("/", routes)

app.listen(5000, async () => {
    try {
        await connection
        console.log("DB connected successfully")
    } catch (error) {
        console.log(error)
    }
})