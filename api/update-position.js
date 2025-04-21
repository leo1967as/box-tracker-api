// api/update-position.js
import { db } from "../firebase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { boxNumber, lat, lng } = req.body;

  if (!boxNumber || typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ message: "Missing or invalid fields" });
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

    const deliveryId = snapshot.docs[0].id;

    await db
      .collection("deliveries")
      .doc(deliveryId)
      .collection("positions")
      .add({
        lat,
        lng,
        timestamp: new Date(),
      });

    return res.status(200).json({ message: "Position updated" });
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
