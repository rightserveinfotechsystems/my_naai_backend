const { updateBarberValidationSchema } = require("../../validations/barber.validation");
const barberService = require("../../services/barber.service");

const updateBarber = async (request, response) => {
  try {
    // 1) Extract data from request body
    const { barberId, phoneNumber, fullName, email, profileImageUrl, ratingAverage } = request.body;

    // 2) Validate input
    const validationResult = await updateBarberValidationSchema.validate(
      {
        barberId,
        phoneNumber,
        fullName,
        email,
        ratingAverage,
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

    // 3) Check barber exists by id
    const existingBarber = await barberService.getBarberById(validData.barberId);
    if (!existingBarber) {
      return response.status(200).json({
        status: 'FAILED',
        message: 'Barber not exist'
      });
    }

    // 4) Check phone already used by some other user
    if (
      validData.phoneNumber &&
      validData.phoneNumber !== existingBarber.phoneNumber
    ) {
      const barberByPhoneNumber = await barberService.getBarberByPhoneNumber(validData.phoneNumber);
      if (barberByPhoneNumber) {
        return response.status(200).json({
          status: 'FAILED',
          message: 'Barber already exists with this phone number'
        });
      }
    }

    // 5) Check email already used by some other user
    if (validData.email && validData.email !== existingBarber.email) {
      const barberByEmail = await barberService.getBarberByEmail(validData.email);
      if (barberByEmail) {
        return response.status(200).json({
          status: 'FAILED',
          message: 'Barber already exists with this email'
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
    if (validData.ratingAverage !== undefined) {
      dataToUpdate.ratingAverage = parseFloat(validData.ratingAverage).toFixed(2);
      console.log('Rating converted:', dataToUpdate.ratingAverage); 
    }

    if (validData.profileImageUrl !== undefined) {
      dataToUpdate.profileImageUrl = validData.profileImageUrl;
    }

    // 7) Update data in DB
    const result = await barberService.updateBarber(validData.barberId, dataToUpdate);

    if (result) {
      const updatesBarber = await barberService.getBarberById(validData.barberId);

      return response.status(200).json({
        status: 'SUCCESS',
        message: 'Barber details updated successfully',
        barber: {
          barberId: updatesBarber.barberId,
          phoneNumber: updatesBarber.phoneNumber,
          fullName: updatesBarber.fullName,
          email: updatesBarber.email,
          profileImageUrl: updatesBarber?.profileImageUrl,
          ratingAverage: updatesBarber.ratingAverage,
          isActive: updatesBarber.isActive,
          isVerified: updatesBarber.isVerified
        }
      });
    }

    return response.status(200).json({
      status: 'FAILED',
      message: 'Failed to update barber, please try again!'
    });
  } catch (error) {
    console.error('Update Error:', error);
    return response.status(500).json({
      status: 'FAILED',
      message: error.message
    });
  }
};

module.exports = updateBarber;
