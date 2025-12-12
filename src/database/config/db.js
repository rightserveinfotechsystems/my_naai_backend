const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration
const dbConfig = {
    development: {
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'mynaai_dev',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: console.log,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true
        }
    },
    production: {
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false,
        pool: {
            max: 20,
            min: 5,
            acquire: 60000,
            idle: 10000
        },
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true
        },
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    }
};

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

// Create Sequelize instance
const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
);

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