// controllers/booking/getBookingRequestByIdForSalonFlat.js
const db = require('../../database/models');

// 24-hour time → 12-hour format
function formatTimeToAMPM(time24) {
  let [hours, minutes] = time24.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

// YYYY-MM-DD → DD/MM/YYYY
function formatDateDMY(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

const getBookingRequestById = async (req, res) => {
  try {
    const salonId = req.salon.salonId;
    const { bookingRequestId } = req.params;

    if (!bookingRequestId) {
      return res.status(400).json({ status: 'FAILED', message: 'BookingRequestId is required' });
    }

    const br = await db.BookingRequest.findByPk(bookingRequestId);
    if (!br) {
      return res.status(404).json({ status: 'FAILED', message: 'Booking request not found' });
    }

    if (br.salonId !== salonId) {
      return res.status(403).json({ status: 'FAILED', message: 'Not authorized to view this booking' });
    }

    const customer = await db.User.findByPk(br.customerId, { attributes: ['fullName', 'phoneNumber'] });
    const barber = br.barberId ? await db.Barber.findByPk(br.barberId, { attributes: ['fullName'] }) : null;
    const services = Array.isArray(br.serviceIds) ? br.serviceIds : [];

    // response
    const data = {
      bookingRequestId: br.bookingRequestId,
      status: br.status,
      bookingDate: formatDateDMY(br.bookingDate),
      startTime: formatTimeToAMPM(br.startTime),
      endTime: formatTimeToAMPM(br.endTime),
      customerName: customer?.fullName || null,
      customerPhoneNumber: customer?.phoneNumber || null,
      barberName: barber?.fullName || null,
      services: services.map(s => `${s.name}`).join(', ') // flat string
    };

    return res.status(200).json({
      status: 'SUCCESS',
      message: 'Booking request fetched successfully',
      data
    });

  } catch (error) {
    console.error('GET BOOKING REQUEST BY ID (SALON FLAT) ERROR:', error);
    return res.status(500).json({ status: 'FAILED', message: error.message });
  }
};

module.exports = { getBookingRequestById };
