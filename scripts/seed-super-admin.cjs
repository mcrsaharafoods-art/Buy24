const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");

const serviceAccount = require("../firebase-service-account.json");

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const auth = getAuth();
const db = getFirestore();

async function seedSuperAdmin() {
  const email = "muneendra2you@gmail.com";
  const password = "admin@1990";
  let uid = null;

  console.log(`Checking if user ${email} exists...`);
  try {
    const userRecord = await auth.getUserByEmail(email);
    uid = userRecord.uid;
    console.log(`User already exists with UID: ${uid}`);

    // Update password just in case
    await auth.updateUser(uid, { password });
    console.log("Updated password for existing user.");
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      console.log(`User does not exist. Creating new user...`);
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: "Super Admin",
      });
      uid = userRecord.uid;
      console.log(`Successfully created new user with UID: ${uid}`);
    } else {
      console.error("Error fetching user:", error);
      process.exit(1);
    }
  }

  // Set custom claims (optional but good practice for role-based access)
  await auth.setCustomUserClaims(uid, { role: "admin", isSuperAdmin: true });
  console.log("Set custom claims for user.");

  // Update Firestore Document
  const userRef = db.collection("users").doc(uid);
  await userRef.set(
    {
      email,
      name: "Super Admin",
      role: "admin",
      status: "active",
      isSuperAdmin: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  console.log(`Firestore document updated for UID: ${uid}`);
  console.log("Super Admin setup complete.");
  process.exit(0);
}

seedSuperAdmin().catch(console.error);
