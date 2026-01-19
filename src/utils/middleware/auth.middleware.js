const db = require('../../database/models');
const { verifyToken } = require('./token.util');


/**
 * Authenticate admin
 */
const authenticateAdmin = async (request, response, next) => {
    try {
        let token;

        // Get token from header
        if (request.headers.authorization && request.headers.authorization.startsWith('Bearer')) {
            token = request.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return response.status(401).json({
                status: 'FAILED',
                message: 'Not authorized, no token provided'
            });
        }

        // Verify token
        const decoded = verifyToken(token);
        if (!decoded) {
            return response.status(401).json({
                status: 'FAILED',
                message: 'Not authorized, invalid token'
            });
        }

        // Get admin from token
        const admin = await db.Admin.findByPk(decoded.adminId, {
            attributes: { exclude: ['password'] }
        });
        if (!admin) {
            return response.status(401).json({
                status: 'FAILED',
                message: 'Admin not found'
            });
        }

        if (!admin.isActive) {
            return response.status(403).json({
                status: 'FAILED',
                message: 'Account is deactivated'
            });
        }
        request.admin = admin;
        next();
    } catch (error) {
       
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

/**
 * Check if super admin
 */
// const isSuperAdmin = (request, response, next) => {
//     if (request.admin.role !== 'super_admin') {
//         return response.status(403).json({
//             status: 'FAILED',
//             message: 'Access denied. Super admin only.'
//         });
//     }
//     next();
// };

module.exports = {
    authenticateAdmin
};