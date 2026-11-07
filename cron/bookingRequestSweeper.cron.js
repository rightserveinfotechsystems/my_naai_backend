// cron/bookingRequestSweeper.cron.js
//
// The booking-request answer window, closed by the server.
//
// A customer sends a booking REQUEST and the salon has five minutes to accept,
// reject or propose another time (WINDOW_SECONDS in
// src/services/bookingRequestLead.service.js — the one place that window is
// defined; the copy below is built from it so the words cannot drift). When nobody answers, the request becomes
// AUTO_CANCELLED — the slot is released and the lead is recorded as MISSED.
// That is not a rejection: a salon that misses leads has a staffing problem, and
// the salon and admin tabs count the two separately.
//
// The Cloud Task scheduled at create time (`src/tasks/autoCancelTask.js`) already
// cancels one request at its own deadline. This sweeper is the safety net that
// makes the state true even when that task never fires — a lost task, a deploy,
// a database restored from a backup. It is safe to run it alongside the task
// because both are guarded by `status = 'PENDING'`.
//
// Idempotent by construction:
//
//   UPDATE booking_requests
//      SET status = 'AUTO_CANCELLED', responded_at = expires_at
//    WHERE status = 'PENDING' AND expires_at < NOW()
//   RETURNING …
//
// A second run in the same minute finds nothing to do, so nothing is notified
// twice.
const cron = require('node-cron');
const db = require('../src/database/models');
const sendNotificationToDevice = require('../src/firebase/sendNotification');
const { sweepExpiredRequests, WINDOW_MINUTES } = require('../src/services/bookingRequestLead.service');

const MESSAGE = `The salon did not answer within ${WINDOW_MINUTES} minutes, so this request was cancelled automatically and the slot released. You can send another request — it costs you nothing.`;

const MISSED_SALON_MESSAGE = `A customer asked for a slot and nobody answered within ${WINDOW_MINUTES} minutes, so it was cancelled automatically.`;
const MISSED_SALON_MESSAGE_LONG = `${MISSED_SALON_MESSAGE} It is counted as missed, not as a rejection.`;

/**
 * Tell the two people involved. Kept best-effort and per row: one customer with
 * a dead push token must not stop the next row's notification.
 */
const notifyMissed = async (row) => {
    try {
        const customer = await db.User.findByPk(row.customerId, { attributes: ['userId', 'fullName', 'deviceToken'] });
        if (customer?.deviceToken) {
            await sendNotificationToDevice(customer.deviceToken, 'No answer from the salon', MESSAGE, {
                bookingRequestId: row.bookingRequestId,
                type: 'BOOKING_AUTO_CANCELLED'
            });
        }
        await db.Notification.create({
            receiverType: 'USER',
            receiverId: row.customerId,
            title: 'No answer from the salon',
            message: MESSAGE,
            data: { bookingRequestId: row.bookingRequestId }
        });
    } catch (error) {
        console.error('[booking-request sweeper] customer notification failed:', error.message);
    }

    try {
        const tokens = await db.DeviceToken.findAll({
            where: { salonId: row.salonId, isActive: true },
            attributes: ['deviceToken'],
            raw: true
        });
        const unique = [...new Set(tokens.map((item) => item.deviceToken).filter(Boolean))];
        for (const token of unique) {
            await sendNotificationToDevice(
                token,
                'You missed a booking request',
                MISSED_SALON_MESSAGE_LONG,
                { bookingRequestId: row.bookingRequestId, type: 'BOOKING_REQUEST_MISSED' }
            );
        }
        await db.Notification.create({
            receiverType: 'SALON',
            receiverId: row.salonId,
            title: 'You missed a booking request',
            message: MISSED_SALON_MESSAGE,
            data: { bookingRequestId: row.bookingRequestId }
        });
    } catch (error) {
        console.error('[booking-request sweeper] salon notification failed:', error.message);
    }
};

/**
 * One pass. Exported so it can be called by hand (or from a test) without
 * waiting for the scheduler.
 */
const runBookingRequestSweep = async ({ notify = true } = {}) => {
    const cancelled = await sweepExpiredRequests({ force: true });
    if (!cancelled.length) return { cancelled: 0 };

    console.log(`[booking-request sweeper] ${cancelled.length} request(s) auto-cancelled after the answer window`);
    if (notify) {
        for (const row of cancelled) {
            await notifyMissed(row);
        }
    }
    return { cancelled: cancelled.length };
};

// Every 20 seconds. The window is five minutes, so a request is classified within
// a third of its life at worst — fast enough that the salon's own tab, which
// derives the same state, never disagrees with the stored one for long.
// `noOverlap` keeps a slow database from stacking runs.
const task = cron.schedule('*/20 * * * * *', async () => {
    try {
        await runBookingRequestSweep();
    } catch (error) {
        console.error('[booking-request sweeper] pass failed:', error.message);
    }
}, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
    noOverlap: true
});

module.exports = { runBookingRequestSweep, task };
