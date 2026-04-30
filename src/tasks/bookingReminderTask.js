const { CloudTasksClient } = require('@google-cloud/tasks');
const client = new CloudTasksClient();

const createBookingReminderTask = async (booking) => {
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

    console.log('✅ Cloud Task created:', response.name);
};

module.exports = { createBookingReminderTask };
