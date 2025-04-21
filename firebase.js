import admin from "firebase-admin";

// ตรวจสอบ Environment Variables ตั้งแต่เริ่มต้น
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing environment variable: ${envVar}`);
  }
});

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }
} catch (error) {
  console.error("🔥 Firebase Initialization Error:", {
    message: error.message,
    stack: error.stack,
    privateKeySnippet: process.env.FIREBASE_PRIVATE_KEY?.slice(0, 50) // แสดงส่วนต้นของ Private Key เพื่อตรวจสอบ
  });
  throw error;
}

const db = admin.firestore();

export { db };