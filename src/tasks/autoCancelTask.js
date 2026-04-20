const { CloudTasksClient } = require('@google-cloud/tasks');
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
  await client.createTask({ parent, task });
};

module.exports = { scheduleAutoCancelTask };