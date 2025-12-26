// utils/middleware/barberAuth.middleware.js
const db = require('../../database/models');
const { verifyToken } = require('./token.util');

const authenticateBarber = async (request, response, next) => {
  try {
    console.log('🔍 BarberAuth: Token check started');  // Debug

    const token = request.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('❌ No token');
      return response.status(401).json({ message: 'No token provided' });
    }

    const decoded = verifyToken(token);
    console.log('🔍 Decoded:', decoded);  // Debug

    // ✅ FIXED: snake_case field names
    const barber = await db.Barber.findOne({
      where: { 
        barber_id: decoded.barberId,    // ✅ snake_case
        is_active: true                 // ✅ snake_case
      }
    });

    console.log('🔍 Barber found:', barber ? barber.barberId : 'NOT FOUND');  // Debug

    if (!barber) {
      return response.status(401).json({ message: 'Invalid barber token' });
    }

    request.barber = {
      barberId: barber.barberId,
      fullName: barber.fullName,
      phoneNumber: barber.phoneNumber,
      email: barber.email
    };
    
    console.log('✅ request.barber SET:', request.barber);  // Debug
    next();
  } catch (error) {
    console.log('❌ BarberAuth ERROR:', error.message);
    return response.status(401).json({ message: error.message });
  }
};

module.exports = { authenticateBarber };
