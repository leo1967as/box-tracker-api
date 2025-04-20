// api/update-position.js
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

module.exports = async (req, res) => {
  const { boxNumber, lat, lng } = req.body;
  if (!boxNumber || typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ message: "Missing or invalid fields" });
  }

  try {
    const snapshot = await db.collection("deliveries")
      .where("boxNumber", "==", boxNumber)
      .limit(1)
      .get();

    if (snapshot.empty) return res.status(404).json({ message: "Box not found" });

    const deliveryId = snapshot.docs[0].id;
    await db.collection("deliveries").doc(deliveryId).collection("positions").add({
      lat,
      lng,
      timestamp: new Date()
    });

    return res.status(200).json({ message: "Position updated" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
