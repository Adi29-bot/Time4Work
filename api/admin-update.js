import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") : undefined,
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { uid, email, password, displayName } = req.body;

  if (!uid) {
    return res.status(400).json({ error: "User UID is required" });
  }

  try {
    const updates = {};
    if (email) updates.email = email;
    if (password) updates.password = password;
    if (displayName) updates.displayName = displayName;
    await admin.auth().updateUser(uid, updates);

    if (email || displayName) {
      const dbUpdates = {};
      if (email) dbUpdates.email = email;
      if (displayName) dbUpdates.name = displayName;

      await admin.firestore().collection("users").doc(uid).update(dbUpdates);
    }

    return res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Update Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
