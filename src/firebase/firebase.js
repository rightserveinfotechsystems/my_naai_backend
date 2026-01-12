var firebaseAdmin = require("firebase-admin");
var serviceAccount = require("./blueladder-firebase.json");

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount)
});

module.exports = firebaseAdmin;
