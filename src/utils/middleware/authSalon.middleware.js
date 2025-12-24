// utils/middleware/salonAuth.middleware.js
const db = require('../../database/models');
const { verifyToken } = require('./token.util');

const authenticateSalon = async (request, response, next) => {
  try {
    let token;
    if (
      request.headers.authorization &&
      request.headers.authorization.startsWith('Bearer ')
    ) {
      token = request.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return response.status(401).json({
        status: 'FAILED',
        message: 'Not authorized, no token provided'
      });
    }

    const decoded = verifyToken(token);

        if (!decoded || !decoded.salonId) {
      return response.status(401).json({
        status: 'FAILED',
        message: 'Invalid token payload'  
      });
    }

    const salon = await db.Salon.findOne({
      where: { salonId: decoded.salonId, isActive: true }
    });

    if (!salon) {
      return response.status(401).json({
        status: 'FAILED',
        message: 'Not authorized, invalid salon token'
      });
    }

    request.salon = {
      salonId: salon.salonId,
      salonName: salon.salonName,
      phoneNumber: salon.phoneNumber
    };

    next();
  } catch (error) {
      console.log('ERROR:', error.message);
    return response.status(401).json({
      status: 'FAILED',
      message: 'Not authorized'
    });
  }
};

module.exports = { authenticateSalon };
