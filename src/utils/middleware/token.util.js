const jwt = require('jsonwebtoken');

/**
 * Generate JWT token
 */
const generateToken = (payload, expiresIn = '7d') => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn
    });
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
         throw new Error('Invalid token');
    }
};

module.exports = {
    generateToken,
    verifyToken
};