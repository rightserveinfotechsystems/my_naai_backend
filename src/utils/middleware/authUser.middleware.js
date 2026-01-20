// middleware/authUser.js
const jwt = require('jsonwebtoken');
const userService = require('../../services/user.service');

const authenticateUser = async (request, response, next) => {
    try {
        // get token from headers
        const authHeader = request.headers.authorization;

        //check if token is missing
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return response.status(401).json({
                status: 'FAILED',
                message: 'Access token required'
            });
        }

        const token = authHeader.split(' ')[1]; // Bearer token

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        console.log('Decoded Token:', decoded);

        // validate user from token
        const user = await userService.getUserById(decoded.userId);
        // check if user exists
        if (!user) {
            return response.status(401).json({
                status: 'FAILED',
                message: 'User not found'
            });
        }

        // check if user is active
        if (!user.isActive) {
            return response.status(403).json({
                status: 'FAILED',
                message: 'User is not active. Please contact support.'
            })
        }

        //attach user to request object
        request.user = {
            id: user.userId,
            phoneNumber: user.phoneNumber
        };
        request.name = user?.fullName

        next(); //call next middleware
    } catch (error) {
        console.log("error : ", error)
        return response.status(401).json({
            status: 'FAILED',
            message: 'Invalid token'
        });
    }
};

module.exports = authenticateUser;
