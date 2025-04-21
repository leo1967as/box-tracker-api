import express from "express";
import admin from "firebase-admin";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// สำหรับ path static
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// init
dotenv.config();
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname))); // เสิร์ฟ index.html จาก root

// Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}
const db = admin.firestore();

// ===== เชื่อม API =====
import getPathHandler from "./my-vercel-api/api/get-path.js";
import updatePositionHandler from "./my-vercel-api/api/update-position.js";

// route API
app.get("/api/get-path", getPathHandler);
app.post("/api/update-position", updatePositionHandler);

// ===== Start server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
