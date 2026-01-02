const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require('path');
const dotenv = require("dotenv");
const helmet = require('helmet');
const { closeConnection, connectDb } = require("./src/database/config/db");
const db = require("./src/database/models");
const routes = require("./src/routes/routes");
const errorHandler = require("./src/utils/middleware/error.middleware");
const fs = require('fs');

dotenv.config();

const PORT = process.env.PORT || 8000;


const app = express();


// Middleware
app.use(cors({ origin: "*" }));
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    })
)
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));




// public directory path
const publicDir = path.join(__dirname, 'public');

// uploads directory path (inside public)
const uploadsDir = path.join(publicDir, 'uploads');

// create public folder if not exists
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
    console.log('📁 public directory created');
}

// create uploads folder if not exists
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    console.log('📁 uploads directory created inside public');
}


app.use("/getFiles", express.static(path.join(__dirname, ""), {
    setHeaders: (res) => {
        res.set("Access-Control-Allow-Origin", "*")
    }
}));

// Routes
app.use("/api", routes);
app.get("/", (request, response) => {
    response.status(200).json({
        message: "MYNAAI.IN backend is running 🏃‍♂️🏃‍♂️",
    });
});

// Test database & models
app.get("/test-db", async (req, res) => {
    try {
        await db.sequelize.authenticate();
        db.sequelize.sync({ alter: true });
        const models = Object.keys(db).filter(key => key !== 'sequelize');

        res.json({
            success: true,
            message: "Database connected successfully",
            models: models
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Database connection failed",
            error: error.message
        });
    }
});




// ✅ Catch-all for any method (GET, POST, PUT, DELETE, etc.)
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

app.use(errorHandler);
// Handle shutdown gracefully by disconnecting from the database
process.on('SIGINT', async () => {
    await closeConnection()
    console.log('👋 SIGINT received, closing server gracefully');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeConnection()
    console.log('👋 SIGTERM received, closing server gracefully');
    process.exit(0);
});

//connect db
connectDb();
// listen on PORT
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} 🏃‍♂️`);
});