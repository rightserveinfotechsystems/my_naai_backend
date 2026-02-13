// ✅ CONTROLLER - controllers/salon.controller.js (removeSavedSalon add karo)
const salonService = require('../../services/salon.service');
const userService = require('../../services/user.service');

const removeSavedSalon = async (request, response) => {
    try {
        const userId = request.user?.id;
        console.log('User ID from request:', userId);
        const { salonId } = request.body;

        if (!salonId) {
            return response.status(400).json({
                status: 'FAILED',
                message: 'Salon ID is required'
            });
        }

        // ✅ Check if user has any salon saved
        // const user = await userService.getUserById(userId);
        // if (!user || !user.savedSalonId) {
        //     return response.status(200).json({
        //         status: 'FAILED',
        //         message: 'No saved salon found for this user'
        //     });
        // }

        // ✅ Remove saved salon
        // const success = await userService.removeUserSavedSalon(userId);
        // if (success) {
        //     return response.status(200).json({
        //         status: 'SUCCESS',
        //         message: 'Saved salon removed successfully'
        //     });
        // } else {
        //     return response.status(200).json({
        //         status: 'FAILED',
        //         message: 'Failed to remove saved salon'
        //     });
        // }

        const removed = await userService.removeUserBookmark(userId, salonId);
        if (!removed) {
            return response.status(200).json({
                status: 'FAILED',
                message: 'Saved Salon not found'
            });
        }

        return response.status(200).json({
            status: 'SUCCESS',
            message: 'Saved Salon removed successfully'
        });

    } catch (error) {
        return response.status(500).json({
            status: 'FAILED',
            message: error.message
        });
    }
};

module.exports = removeSavedSalon;
