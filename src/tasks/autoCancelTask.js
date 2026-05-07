const { CloudTasksClient } = require('@google-cloud/tasks');
const db = require('../database/models');
const client = new CloudTasksClient();

const scheduleAutoCancelTask = async ({ bookingRequestId, delayInSeconds }) => {
  const project = process.env.GCP_PROJECT_ID;
  const location = process.env.GCP_LOCATION;
  const queue = process.env.QUEUE_NAME;

  const url = `${process.env.BASE_URL}/api/bookingRequest/auto-cancel`;

  const task = {
    httpRequest: {
      httpMethod: 'POST',
      url,
      headers: { 'Content-Type': 'application/json' },
      body: Buffer.from(
        JSON.stringify({ bookingRequestId })
      ).toString('base64'),
    },
    scheduleTime: {
      seconds: Math.floor(Date.now() / 1000) + delayInSeconds,
    },
  };
  console.log('Task scheduled for:', new Date((Math.floor(Date.now() / 1000) + delayInSeconds) * 1000));

  const parent = client.queuePath(project, location, queue);
  const [response] = await client.createTask({ parent, task });
  console.log(" response.name", response.name);

  await db.BookingRequest.update(
    { autoCancelTaskName: response.name },
    { where: { bookingRequestId: bookingRequestId } }
  );
};


const deleteBookingAutoCancelTask = async (taskName) => {
  try {
    await client.deleteTask({ name: taskName });
    console.log('🗑 Task deleted:', taskName);
  } catch (err) {
    if (err.code === 5) {
      console.log('Task already executed or not found');
    } else {
      throw err;
    }
  }
};

module.exports = { scheduleAutoCancelTask, deleteBookingAutoCancelTask };