// services/bookingRequestAction.service.js
//
// Answering a booking request — ACCEPT / REJECT / DELAY — in ONE place.
//
// There are two doors onto this: the salon owner's tab (`POST
// /api/bookingRequest/owner-action/:id`, and the same endpoint from the mobile
// app) and, since admins may answer on a salon's behalf, the admin panel
// (`POST /api/bookingRequest/admin/action/:id`). Both call this function.
//
// They have to call the SAME function, not a copy each, for the reason the
// original implementation was careful about: an accept creates a queue entry
// and a booking, so a second path would put two customers in one chair for one
// request. The rules below are therefore shared, not re-implemented:
//
//   1. The row is locked (`SELECT … FOR UPDATE`) for the whole transaction.
//      Before this, two answers arriving in the same second both read
//      `status = PENDING`, both passed the guard, and both created a booking.
//      The lock makes the second one wait, then read ACCEPTED.
//   2. A request that already carries a `booking_id` never creates another one.
//   3. Past its window (five minutes, `WINDOW_SECONDS` in
//      bookingRequestLead.service.js), a request is AUTO_CANCELLED — written
//      down here and refused, so an accept can never succeed after the deadline.
//   4. Only the roles in `ACTOR_ROLES` may answer, and an admin answer is
//      recorded as such: `acted_by_role`, `acted_by_admin_id`, `acted_at`,
//      `on_behalf_of_salon`. The salon's tab shows "accepted by My Naai on your
//      behalf" from those columns, so nobody has to guess who moved the chair.

const db = require('../database/models');
const { Op } = require('sequelize');
const sendNotificationToDevice = require('../firebase/sendNotification');
const { formatTo12Hour } = require('../utils/timeFormat');
const { scheduleAutoCancelTask } = require('../tasks/autoCancelTask');
const { createBookingReminderTask } = require('../tasks/bookingReminderTask');

const ACTOR_ROLES = ['SALON', 'ADMIN'];

// How long the CUSTOMER has to answer a proposed delay. The same five minutes as
// the request's own answer window: a proposal that expires while the customer is
// in a meeting is the same unfairness as a request that expires while the salon
// is cutting hair, and "all of it is five minutes" is the rule the client asked
// for. Kept as its own name because the two are different promises.
const DELAY_RESPONSE_SECONDS = 5 * 60;

const ACTIONS = ['ACCEPT', 'REJECT', 'DELAY'];

// The salon-facing sentence for an answer given by the platform team. The
// customer is never told who answered: from their side "the salon" is the
// service, and an internal routing detail is not their business.
const adminAnswered = (label) => `An admin ${label} this request on behalf of the salon`;

const fail = (httpStatus, message) => ({ httpStatus, payload: { status: 'FAILED', message } });

/**
 * Answer one request.
 *
 * @param {object}  input
 * @param {string}  input.bookingRequestId
 * @param {'ACCEPT'|'REJECT'|'DELAY'} input.action
 * @param {number}  [input.delayMinutes]  DELAY only
 * @param {string}  [input.reason]        admin only, optional; shown to the salon
 * @param {object}  input.actor           `{ role: 'SALON', salonId }` or `{ role: 'ADMIN', adminId }`
 * @param {object}  [input.io]            socket server (`req.io`)
 * @returns {Promise<{ httpStatus: number, payload: object }>}
 */
const applyRequestAction = async ({
    bookingRequestId,
    action,
    delayMinutes = null,
    reason = null,
    actor,
    io
} = {}) => {
    if (!actor || !ACTOR_ROLES.includes(actor.role)) {
        return fail(401, 'Not authorized');
    }
    if (!ACTIONS.includes(action)) {
        return fail(400, 'Invalid action. Allowed values: ACCEPT, REJECT, DELAY');
    }
    if (actor.role === 'SALON' && !actor.salonId) {
        return fail(401, 'Not authorized');
    }

    const transaction = await db.sequelize.transaction();
    try {
        // 1. Lock the row. `FOR UPDATE` inside the transaction is what makes two
        //    simultaneous answers (salon + admin, or two of either) serialise.
        let bookingRequest = await db.BookingRequest.findByPk(bookingRequestId, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!bookingRequest) {
            await transaction.rollback();
            return fail(404, 'Booking request not found.');
        }

        // 2. An admin may answer for any salon; a salon may answer only its own.
        //    The salon id comes from the token, never from the body.
        if (actor.role === 'SALON' && String(bookingRequest.salonId) !== String(actor.salonId)) {
            await transaction.rollback();
            return fail(403, 'This request does not belong to your salon');
        }

        // 3. Already answered: refuse, and say so with the booking it produced so
        //    the panel can point at the chair that exists.
        if (bookingRequest.bookingId) {
            await transaction.rollback();
            return {
                httpStatus: 200,
                payload: {
                    status: 'FAILED',
                    message: 'This request was already actioned',
                    data: { bookingId: bookingRequest.bookingId, status: bookingRequest.status }
                }
            };
        }

        if (bookingRequest.status === 'CANCELLED' || bookingRequest.status === 'AUTO_CANCELLED') {
            await transaction.rollback();
            return fail(200, 'Booking request already cancelled');
        }

        // 4. The answer window (five minutes). A request past it is auto-cancelled whether or
        //    not the sweeper has written that down yet, so the answer is a plain
        //    sentence instead of an accept that cannot succeed. `responded_at` is
        //    stamped with the deadline (not \"now\") so the lead's response time
        //    stays honest.
        const expiresAt = bookingRequest.expiresAt ? new Date(bookingRequest.expiresAt).getTime() : null;
        if (bookingRequest.status === 'PENDING' && expiresAt && expiresAt <= Date.now()) {
            bookingRequest.status = 'AUTO_CANCELLED';
            bookingRequest.respondedAt = bookingRequest.respondedAt || bookingRequest.expiresAt;
            await bookingRequest.save({ transaction });
            await transaction.commit();
            return fail(200, 'This request has expired and was cancelled automatically');
        }

        if (['ACCEPTED', 'REJECTED', 'DELAY_PROPOSED'].includes(bookingRequest.status)) {
            await transaction.rollback();
            return fail(200, 'This request was already actioned');
        }

        const user = await db.User.findByPk(bookingRequest.customerId, {
            attributes: ['userId', 'fullName', 'deviceToken']
        });
        const deviceTokens = user && user.deviceToken ? [user.deviceToken] : [];
        const uniqueTokens = [...new Set(deviceTokens)];

        // The audit stamp, written with the answer rather than after it.
        const stampAnswer = () => {
            bookingRequest.actedByRole = actor.role;
            bookingRequest.actedByAdminId = actor.role === 'ADMIN' ? String(actor.adminId || '') : null;
            bookingRequest.actedAt = new Date();
            bookingRequest.onBehalfOfSalon = actor.role === 'ADMIN';
            if (actor.role === 'ADMIN' && reason) bookingRequest.adminNote = String(reason).slice(0, 500);
        };

        // Tell the salon when somebody answered for it. Their tab, their phone
        // and their inbox all say the same thing.
        const tellSalon = async (message) => {
            if (actor.role !== 'ADMIN') return;
            try {
                await db.Notification.create({
                    receiverType: 'SALON',
                    receiverId: bookingRequest.salonId,
                    title: 'Booking request answered by My Naai',
                    message
                }, { transaction });
            } catch (notificationError) {
                console.error('[booking-request] salon notification skipped:', notificationError.message);
            }
            if (io) {
                io.to(`salon_${bookingRequest.salonId}`).emit('booking_request_answered_by_admin', {
                    title: 'Booking request answered by My Naai',
                    message,
                    bookingRequestId: bookingRequest.bookingRequestId,
                    action
                });
            }
        };

        // ------------------------------------------------------------ REJECT
        if (action === 'REJECT') {
            bookingRequest.status = 'REJECTED';
            bookingRequest.respondedAt = new Date();
            stampAnswer();
            await bookingRequest.save({ transaction });

            for (const deviceToken of uniqueTokens) {
                await sendNotificationToDevice(deviceToken, 'Booking Rejected', 'Your booking request has been rejected by the salon.',
                    {
                        bookingRequestId: bookingRequest.bookingRequestId,
                        type: 'BOOKING_REJECTED'
                    });
            }

            await db.Notification.create({
                receiverType: 'USER',
                receiverId: bookingRequest.customerId,
                title: 'Booking Rejected',
                message: 'Your booking request has been rejected by the salon.'
            }, { transaction });

            await tellSalon(adminAnswered('rejected'));

            if (io) {
                io.to(`user_${bookingRequest.customerId}`).emit('booking_status_updated', {
                    title: 'Booking Rejected',
                    message: 'Your booking request has been rejected by the salon.',
                    bookingId: bookingRequest.bookingRequestId
                });
            }

            await transaction.commit();
            return {
                httpStatus: 200,
                payload: {
                    status: 'SUCCESS',
                    message: 'Booking request rejected',
                    data: { status: 'REJECTED', actedByRole: actor.role }
                }
            };
        }

        // ------------------------------------------------------------- DELAY
        if (action === 'DELAY') {
            if (!delayMinutes) {
                await transaction.rollback();
                return fail(400, 'Delay minutes required');
            }

            const originalTime = new Date(`${bookingRequest.bookingDate}T${bookingRequest.startTime}`);
            const proposedTime = new Date(originalTime.getTime() + delayMinutes * 60 * 1000);
            const proposedTimeStr = formatTo12Hour(proposedTime.toTimeString().slice(0, 5));

            bookingRequest.status = 'DELAY_PROPOSED';
            bookingRequest.delayMinutes = delayMinutes;
            stampAnswer();
            await bookingRequest.save({ transaction });

            for (const deviceToken of uniqueTokens) {
                await sendNotificationToDevice(deviceToken, 'Booking Delay Proposed',
                    `Salon proposed to delay your booking to ${proposedTimeStr}. Accept or Reject?`,
                    {
                        bookingRequestId: bookingRequest.bookingRequestId,
                        type: 'DELAY_TIME_PROPOSAL',
                        delayMinutes: delayMinutes,
                        proposedTime: proposedTimeStr
                    });
            }

            await db.Notification.create({
                receiverType: 'USER',
                receiverId: bookingRequest.customerId,
                title: 'Booking Delay Proposed',
                message: `Salon proposed to delay your booking to ${proposedTimeStr}. Accept or Reject?`
            }, { transaction });

            await tellSalon(adminAnswered('proposed a delay on'));

            await transaction.commit();

            // The customer has DELAY_RESPONSE_SECONDS to answer the proposal.
            try {
                await scheduleAutoCancelTask({
                    bookingRequestId: bookingRequest.bookingRequestId,
                    delayInSeconds: DELAY_RESPONSE_SECONDS
                });
            } catch (error) {
                console.error('Error scheduling auto-cancel for delayed booking:', error);
            }

            if (io) {
                io.to(`user_${bookingRequest.customerId}`).emit('booking_status_updated', {
                    title: 'Booking Delay Proposed',
                    message: `Salon proposed to delay your booking to ${proposedTimeStr}. Accept or Reject?`,
                    bookingId: bookingRequest.bookingRequestId
                });
            }

            return {
                httpStatus: 200,
                payload: {
                    status: 'SUCCESS',
                    message: 'Delay proposed to customer',
                    data: { status: 'DELAY_PROPOSED', delayMinutes }
                }
            };
        }

        // ------------------------------------------------------------ ACCEPT
        const requested = Array.isArray(bookingRequest.serviceIds) ? bookingRequest.serviceIds : [];
        const serviceIds = requested.map((item) => item?.serviceId || item?.id).filter(Boolean);

        const services = serviceIds.length
            ? await db.Service.findAll({ where: { serviceId: { [Op.in]: serviceIds } }, transaction })
            : [];
        const totalDuration = services.reduce((sum, service) => sum + (Number(service.durationMinutes) || 0), 0);

        const bookingStartTime = new Date(`${bookingRequest.bookingDate}T${bookingRequest.startTime}`);
        const bookingEndTime = new Date(bookingStartTime.getTime() + totalDuration * 60 * 1000);
        const bookingTime12hr = formatTo12Hour(bookingRequest.startTime);

        // Queue position: the last chair taken at this salon on that day.
        const lastQueue = await db.Queue.findOne({
            where: { salonId: bookingRequest.salonId, bookingDate: bookingRequest.bookingDate },
            order: [['queueNumber', 'DESC']],
            transaction,
            lock: transaction.LOCK.UPDATE
        });
        const queueNumber = lastQueue ? lastQueue.queueNumber + 1 : 1;

        const queue = await db.Queue.create({
            salonId: bookingRequest.salonId,
            userId: bookingRequest.customerId,
            barberId: bookingRequest.barberId,
            bookingDate: bookingRequest.bookingDate,
            bookingTime: bookingRequest.startTime,
            queueNumber,
            estimatedWaitTime: totalDuration
        }, { transaction });

        const booking = await db.Booking.create({
            queueId: queue.queueId,
            salonId: bookingRequest.salonId,
            userId: bookingRequest.customerId,
            barberId: bookingRequest.barberId,
            bookingDate: bookingRequest.bookingDate,
            bookingTime: bookingRequest.startTime,
            bookingEndTime: bookingEndTime.toTimeString().slice(0, 8),
            bookingStatus: 'confirmed',
            services: bookingRequest.serviceIds,
            serviceDuration: totalDuration,
            bookingRequestId: bookingRequest.bookingRequestId
        }, { transaction });

        // Reminder ten minutes before the chair, in the salon's timezone.
        const bookingDateTime = new Date(`${booking.bookingDate}T${booking.bookingTime}+05:30`);
        booking.reminderTime = new Date(bookingDateTime.getTime() - 10 * 60 * 1000);
        booking.reminderSent = false;
        await booking.save({ transaction });

        // The request keeps a POINTER to the booking, not a copy of it: the two
        // stay separate tables (a request is a lead, a booking is a chair), and
        // this id is the only link between them.
        bookingRequest.status = 'ACCEPTED';
        bookingRequest.respondedAt = new Date();
        bookingRequest.bookingId = booking.bookingId;
        bookingRequest.routedBarberId = bookingRequest.routedBarberId || bookingRequest.barberId || null;
        stampAnswer();
        await bookingRequest.save({ transaction });

        for (const deviceToken of uniqueTokens) {
            await sendNotificationToDevice(deviceToken, 'Booking Confirmed', `Your booking at salon is confirmed for ${bookingTime12hr}`,
                {
                    bookingRequestId: bookingRequest.bookingRequestId,
                    type: 'BOOKING_CONFIRMED'
                });
        }

        await db.Notification.create({
            receiverType: 'USER',
            receiverId: bookingRequest.customerId,
            title: 'Booking Confirmed',
            message: `Your booking at salon is confirmed for ${bookingTime12hr}`
        }, { transaction });

        await tellSalon(`An admin accepted this request on your behalf: ${bookingTime12hr}, queue #${queueNumber}`);

        await transaction.commit();

        try {
            await createBookingReminderTask(booking);
        } catch (reminderError) {
            console.error('Error creating booking reminder task:', reminderError);
        }

        if (io) {
            io.to(`user_${bookingRequest.customerId}`).emit('booking_status_updated', {
                title: 'Booking Accepted',
                message: 'Your booking request has been accepted by the salon.',
                bookingId: bookingRequest.bookingRequestId
            });

            io.to(`salon_${bookingRequest.salonId}`).emit('queue_updated', {
                title: 'Booking Confirmed',
                message: `A booking was confirmed for ${bookingTime12hr}`,
                bookingId: bookingRequest.bookingRequestId
            });
        }

        return {
            httpStatus: 200,
            payload: {
                status: 'SUCCESS',
                message: 'Booking request accepted and confirmed',
                data: {
                    // The booking as created, so the app can open the chair it
                    // just made. Plus who answered, which the admin panel shows.
                    ...(typeof booking.toJSON === 'function' ? booking.toJSON() : booking),
                    actedByRole: actor.role,
                    onBehalfOfSalon: actor.role === 'ADMIN'
                }
            }
        };
    } catch (error) {
        await transaction.rollback();
        console.error('BOOKING REQUEST ACTION ERROR:', error);
        return fail(500, error.message);
    }
};

/**
 * The row an admin tab shows after an answer: who answered, when, and whether it
 * was done for the salon. Read straight off the columns so the panel never
 * infers it from a status.
 */
const actorSummary = (row) => {
    if (!row) return null;
    const role = row.actedByRole || 'SALON';
    return {
        role,
        onBehalfOfSalon: Boolean(row.onBehalfOfSalon),
        adminId: row.actedByAdminId || null,
        actedAt: row.actedAt || row.respondedAt || null,
        note: row.adminNote || null
    };
};

module.exports = {
    ACTOR_ROLES,
    ACTIONS,
    applyRequestAction,
    actorSummary
};
