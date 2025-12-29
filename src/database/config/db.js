const { Sequelize, DataTypes } = require("sequelize");
const dotenv = require('dotenv');
dotenv.config();

// Destructure variables from .env for easier usage
const { DB_URL, DB_SSL } = process.env;

// Initialize Sequelize using the DB_URL
const sequelize = new Sequelize(DB_URL, {
    dialect: "postgres",
    dialectOptions: {
        ssl: DB_SSL === "true" ? { require: true, rejectUnauthorized: false } : false, // Convert the string "true" to a boolean
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
});
// sequelize
//     .authenticate()
//     .then(() => {
//         console.log("connected to neon database...🟢");
//     })
//     .catch((err) => {
//         console.log("Database connection error: ❌" + err);
//         throw err;
//     });
/**
 * Test database connection
 */
const connectDb = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully');
        return true;
    } catch (error) {
        console.error('❌ Unable to connect to database:', error.message);
        return false;
    }
};

/**
 * Close database connection
 */
const closeConnection = async () => {
    try {
        await sequelize.close();
        console.log('🔌 Database connection closed');
    } catch (error) {
        console.error('❌ Error closing database connection:', error.message);
    }
};

module.exports = {
    sequelize,
    connectDb,
    closeConnection
};