const admin = require("firebase-admin");
require("dotenv").config();

const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
};

// Check if service account exists/is valid before initializing to prevent crash
if (serviceAccount.project_id && serviceAccount.client_email && serviceAccount.private_key) {
    // Sanitize private key to handle cases where it might be loaded with escaped newlines
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            // databaseURL: "https://your-project.firebaseio.com" // Optional for Firestore
        });
        console.log("Firebase Admin initialized successfully");
    } catch (error) {
        console.error("Firebase Admin initialization error:", error);
    }
} else {
    console.warn("Firebase Service Account Config not found or invalid in .env. Notifications will not work.");
}

const db = admin.firestore();

module.exports = { admin, db };
