const { applyRequestAction } = require('../../services/bookingRequestAction.service');

/**
 * An admin answering a lead on a salon's behalf.
 *
 * Body: `{ action: 'ACCEPT' | 'REJECT' | 'DELAY', delayMinutes?, reason? }`
 *
 * Why this exists: the Booking requests tab used to be read-only on purpose
 * ("an admin does not accept on a salon's behalf"). That is no longer the
 * operating rule — when a salon's phone is dead and the customer is standing at
 * the counter, somebody has to take the chair. What has NOT changed is the
 * reason the old rule existed: two answers to one request must never create two
 * bookings. So this endpoint does not implement an accept; it calls
 * `applyRequestAction` with `actor.role = 'ADMIN'`, which
 *
 *   · locks the request row for the whole transaction,
 *   · refuses a request that already has a booking or an answer,
 *   · refuses one past its 60 second window,
 *   · records `acted_by_role / acted_by_admin_id / acted_at / on_behalf_of_salon`,
 *   · tells the salon (in-app + socket) that My Naai answered for it.
 *
 * The salon id is the request's OWN salon — taken from the row after it is
 * loaded, never from the body. `reason` is optional for an accept and expected
 * for a reject; it is stored (500 chars) and shown to the salon.
 */
const adminBookingRequestAction = async (request, response) => {
    const { action, delayMinutes = null, reason = null } = request.body || {};
    const { bookingRequestId } = request.params;

    // authenticateAdmin puts the Admin row on `request.admin`; its primary key
    // is `id` (the token calls it adminId).
    if (!request.admin?.id) {
        return response.status(401).json({ status: 'FAILED', message: 'Not authorized' });
    }

    const result = await applyRequestAction({
        bookingRequestId,
        action,
        delayMinutes,
        reason,
        actor: { role: 'ADMIN', adminId: request.admin.id },
        io: request.io
    });

    return response.status(result.httpStatus).json(result.payload);
};

module.exports = adminBookingRequestAction;
