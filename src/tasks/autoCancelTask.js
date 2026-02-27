// // bookingRequest/autoCancelTask.js
// const { CloudTasksClient } = require('@google-cloud/tasks');

// const client = new CloudTasksClient();

// const scheduleAutoCancelTask = async (bookingRequest) => {
//     const project = process.env.GCP_PROJECT_ID;
//     const location = process.env.GCP_LOCATION; // eg: us-central1
//     const queue = 'auto-cancel-booking';

//     const url = `${process.env.BASE_URL}/api/bookingRequest/auto-cancel`;

//     const payload = {
//         bookingRequestId: bookingRequest.bookingRequestId
//     };

//     const task = {
//         httpRequest: {
//             httpMethod: 'POST',
//             url,
//             headers: { 'Content-Type': 'application/json' },
//             body: Buffer.from(JSON.stringify(payload)).toString('base64'),
//         },
//         scheduleTime: {
//             seconds: Math.floor(
//                 new Date(Date.now() + 5 * 60 * 1000).getTime() / 1000
//             ),
//         },
//     };

//     const parent = client.queuePath(project, location, queue);
//     const [response] = await client.createTask({ parent, task });

//     console.log('✅ Auto-cancel Cloud Task created:', response.name);
// };

// module.exports = { scheduleAutoCancelTask };

const { CloudTasksClient } = require('@google-cloud/tasks');
const client = new CloudTasksClient();

const scheduleAutoCancelTask = async ({
  bookingRequestId,
  delayInSeconds,
}) => {
  const project = process.env.GCP_PROJECT_ID;
  const location = process.env.GCP_LOCATION;
  const queue = 'auto-cancel-booking';

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
  console.log('Task scheduled for:', new Date((Math.floor(Date.now() / 1000) + delayInSeconds)*1000));

  const parent = client.queuePath(project, location, queue);
  await client.createTask({ parent, task });
};

module.exports = { scheduleAutoCancelTask };