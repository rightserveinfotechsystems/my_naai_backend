const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(
  __dirname,
  "my-naai-firebase.json"
));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;
