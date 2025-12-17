// controllers/user/updateUser.controller.js
const userService = require('../../services/user.service');
const { updateUserValidationSchema } = require('../../validations/user.validation');

const updateUser = async (request, response) => {
  try {
    // 1) Extract data from request body
    const { userId, phoneNumber, fullName, email, profileImageUrl } = request.body;

    // 2) Validate input
    const validationResult = await updateUserValidationSchema.validate(
      {
        userId,
        phoneNumber: phoneNumber?.toString(),
        fullName,
        email,
        profileImageUrl
      },
      { abortEarly: true }
    );

    if (validationResult.error) {
      return response.status(200).json({
        status: 'FAILED',
        message: validationResult.error.details[0].message
      });
    }

    const validData = validationResult.value;

    // 3) Check user exists by id
    const existingUser = await userService.getUserById(validData.userId);
    if (!existingUser) {
      return response.status(200).json({
        status: 'FAILED',
        message: 'User not exist'
      });
    }

    // 4) Check phone already used by some other user
    if (
      validData.phoneNumber &&
      validData.phoneNumber !== existingUser.phoneNumber
    ) {
      const userByPhone = await userService.getUserByPhone(validData.phoneNumber);
      if (userByPhone) {
        return response.status(200).json({
          status: 'FAILED',
          message: 'User already exists with this phone number'
        });
      }
    }

    // 5) Check email already used by some other user
    if (validData.email && validData.email !== existingUser.email) {
      const userByEmail = await userService.getUserByEmail(validData.email);
      if (userByEmail) {
        return response.status(200).json({
          status: 'FAILED',
          message: 'User already exists with this email'
        });
      }
    }

    // 6) Prepare data to update
    const dataToUpdate = {};

    if (validData.phoneNumber) {
      dataToUpdate.phoneNumber = validData.phoneNumber.trim();
    }

    if (validData.fullName) {
      dataToUpdate.fullName = validData.fullName;
    }

    if (validData.email) {
      dataToUpdate.email = validData.email.toLowerCase().trim();
    }

    if (validData.profileImageUrl !== undefined) {
      dataToUpdate.profileImageUrl = validData.profileImageUrl;
    }

    // 7) Update data in DB
    const result = await userService.updateUser(validData.userId, dataToUpdate);

    if (result) {
      const updatedUser = await userService.getUserById(validData.userId);

      return response.status(200).json({
        status: 'SUCCESS',
        message: 'User details updated successfully',
        user: {
          userId: updatedUser.userId,
          phoneNumber: updatedUser.phoneNumber,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          profileImageUrl: updatedUser.profileImageUrl,
          isActive: updatedUser.isActive,
          isVerified: updatedUser.isVerified
        }
      });
    }

    return response.status(200).json({
      status: 'FAILED',
      message: 'Failed to update user, please try again!'
    });
  } catch (error) {
    return response.status(500).json({
      status: 'FAILED',
      message: error.message
    });
  }
};

module.exports = updateUser;
