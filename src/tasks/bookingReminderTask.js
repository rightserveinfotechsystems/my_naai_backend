const { CloudTasksClient } = require('@google-cloud/tasks');
const db = require('../database/models');
const client = new CloudTasksClient();

const createBookingReminderTask = async (booking) => {
    try {


        const project = process.env.GCP_PROJECT_ID;
        const location = process.env.GCP_LOCATION;
        const queue = process.env.GCP_REMINDER_QUEUE;

        const url = `${process.env.BASE_URL}/api/booking/send-reminder`;

        const payload = {
            bookingId: booking.bookingId
        };

        const task = {
            httpRequest: {
                httpMethod: 'POST',
                url,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: Buffer.from(JSON.stringify(payload)).toString('base64'),
            },
            scheduleTime: {
                seconds: Math.floor(
                    new Date(booking.reminderTime).getTime() / 1000
                ),
            },
        };

        const parent = client.queuePath(project, location, queue);
        const [response] = await client.createTask({ parent, task });
        await db.Booking.update(
            { reminderTaskName: response.name },
            { where: { bookingId: booking.bookingId } }
        );
        console.log('✅ Cloud Task created:', response.name);
    } catch (error) {
        console.log('Error creating Cloud Task:', error);
    }
};


const deleteReminderTask = async (taskName) => {
    try {
        await client.deleteTask({ name: taskName });
        console.log('🗑 Task deleted:', taskName);
    } catch (err) {
        console.log('Error deleting Cloud Task:', err);
        if (err.code === 5) {
            console.log('Task already executed or not found');
        } else {
            throw err;
        }
    }
};

module.exports = { createBookingReminderTask, deleteReminderTask };
