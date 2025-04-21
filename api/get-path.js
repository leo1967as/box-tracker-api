// ✅ /api/get-path.js
import { db } from "../firebase";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { boxNumber } = req.query;
  if (!boxNumber) {
    return res.status(400).json({ message: "Missing boxNumber" });
  }

  try {
    const snapshot = await db
      .collection("deliveries")
      .where("boxNumber", "==", boxNumber)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "Box not found" });
    }
    
    if (typeof boxNumber !== "string") {
      return res.status(400).json({ message: "boxNumber must be a string" });
    }
    const deliveryId = snapshot.docs[0].id;
    const positionsSnapshot = await db
      .collection("deliveries")
      .doc(deliveryId)
      .collection("positions")
      .orderBy("timestamp", "asc")
      .get();

      const path = positionsSnapshot.docs.map((doc) => ({
        lat: doc.data().lat,
        lng: doc.data().lng,
        timestamp: doc.data().timestamp.toDate().toISOString()}));
    return res.status(200).json({ boxNumber, path });
  } catch (error) {
    // เพิ่มส่วนนี้แทน console.error เดิม
    console.error("Error:", {
      message: error.message,
      stack: error.stack,
      request: req.query || req.body
    });
    return res.status(500).json({ message: "Internal server error" });
  }
}
