// middleware/authUser.js
const jwt = require('jsonwebtoken');
const userService = require('../../services/user.service'); 

const authenticateUser = async (request, response, next) => {
    try {
        // get token from headers
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return response.status(401).json({
                status: 'FAILED',
                message: 'Access token required'
            });
        }

        const token = authHeader.split(' ')[1]; // Bearer token
        
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // validate user from token
        const user = await userService.getUserById(decoded.userId);
        if (!user || !user.isActive) {
            return response.status(401).json({
                status: 'FAILED',
                message: 'Invalid or inactive user'
            });
        }

        //attach user to request object
        request.user = {
            id: user.userId,
            phoneNumber: user.phoneNumber
        };
        
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
