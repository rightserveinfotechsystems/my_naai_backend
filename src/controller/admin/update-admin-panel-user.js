// controllers/user/updateUser.controller.js
const adminService = require('../../services/admin.service');
const { updateAdminUserValidationSchema } = require('../../validations/admin.validation');

const updateAdminPanelUser = async (request, response) => {
  try {
    // 1) Extract data from request body
    const { userId, name, email, mobile, accessTab } = request.body;

    // 2) Validate input
    const validationResult = await updateAdminUserValidationSchema.validate(
      {
        userId,
        name, email, mobile: mobile?.toString(), accessTab
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
    const existingUser = await adminService.getAdminById(validData.userId);
    if (!existingUser) {
      return response.status(200).json({
        status: 'FAILED',
        message: 'User not exist'
      });
    }

    // 4) Check phone already used by some other user
    if (
      validData.mobile &&
      validData.mobile !== existingUser.mobile
    ) {
      const userByPhone = await adminService.getAdminUserByPhone(validData.mobile);
      if (userByPhone) {
        return response.status(200).json({
          status: 'FAILED',
          message: 'User already exists with this phone number'
        });
      }
    }

    // 5) Check email already used by some other user
    if (validData.email && validData.email !== existingUser.email) {
      const userByEmail = await adminService.getAdminUserByEmail(validData.email);
      if (userByEmail) {
        return response.status(200).json({
          status: 'FAILED',
          message: 'User already exists with this email'
        });
      }
    }

    // 6) Prepare data to update
    const dataToUpdate = {
      accessTab,
      mobile: mobile?.trim(),
      name: name?.trim(),
      email: email?.toLowerCase()?.trim()
    };







    // 7) Update data in DB
    const result = await adminService.updateAdminPanelUser(validData.userId, dataToUpdate);

    if (result) {
      const updatedUser = await adminService.getAdminById(validData.userId);

      return response.status(200).json({
        status: 'SUCCESS',
        message: 'User details updated successfully',
        user: {
          userId: updatedUser.userId,
          mobile: updatedUser.mobile,
          name: updatedUser.name,
          email: updatedUser.email,
          accessTab: updatedUser.accessTab,
          isActive: updatedUser.isActive,
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

module.exports = updateAdminPanelUser;
