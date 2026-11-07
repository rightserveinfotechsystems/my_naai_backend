const { applyRequestAction } = require('../../services/bookingRequestAction.service');

/**
 * The salon's answer to a lead — the web tab, the mobile app's alert card and
 * everything else that speaks this endpoint.
 *
 * The rules (the five-minute answer window, "already actioned", one booking per request,
 * the queue entry and the reminders) live in
 * `services/bookingRequestAction.service.js`, because an admin may now answer on
 * a salon's behalf through a second endpoint and the two must not be able to
 * disagree — or to create two bookings for one request.
 *
 * The salon id comes from the token. A body never names the salon.
 */
const ownerActionBooking = async (req, res) => {
    const { action, delayMinutes = null } = req.body || {};
    const { bookingRequestId } = req.params;

    const result = await applyRequestAction({
        bookingRequestId,
        action,
        delayMinutes,
        actor: { role: 'SALON', salonId: req.salon?.salonId },
        io: req.io
    });

    return res.status(result.httpStatus).json(result.payload);
};

module.exports = { ownerActionBooking };
