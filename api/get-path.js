// api/get-path.js
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

module.exports = async (req, res) => {
  const { boxNumber } = req.query;
  if (!boxNumber) return res.status(400).json({ message: "Missing boxNumber" });

  try {
    const snapshot = await db.collection("deliveries")
      .where("boxNumber", "==", boxNumber)
      .limit(1)
      .get();

    if (snapshot.empty) return res.status(404).json({ message: "Box not found" });

    const deliveryId = snapshot.docs[0].id;
    const positionsSnapshot = await db.collection("deliveries").doc(deliveryId).collection("positions").orderBy("timestamp", "asc").get();

    const path = positionsSnapshot.docs.map(doc => ({
      lat: doc.data().lat,
      lng: doc.data().lng,
      timestamp: doc.data().timestamp.toDate()
    }));

    return res.status(200).json({ boxNumber, path });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal error" });
  }
};
