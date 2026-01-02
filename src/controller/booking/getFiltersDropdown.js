const BookingService = require('../../services/booking.service');
const getFiltersDropdown = async (req, res) => {
  try {
    const filtersData = await BookingService.getFiltersDropdownData();

    res.status(200).json({
      status: "SUCCESS",
      message: "Filters data fetched successfully",
      data: filtersData  
    });
  } catch (error) {
    console.error('❌ Error in getFiltersDropdown:', error);
    res.status(500).json({
      status: "FAILED",
      message: error.message || "Something went wrong!"
    });
  }
};
module.exports = getFiltersDropdown;