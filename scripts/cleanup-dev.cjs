const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

const certPath = path.join(process.cwd(), "firebase-service-account.json");
const serviceAccount = JSON.parse(fs.readFileSync(certPath, "utf-8"));
const app = initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  console.log("Cleaning up Firestore test data...");
  const collections = ["users", "vendorApplications", "vendors", "products", "categories", "settings", "notifications", "applicationDocuments"];
  
  let deletedCount = 0;
  for (const c of collections) {
    const snap = await db.collection(c).where("isTestData", "==", true).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    if(snap.size > 0) {
      await batch.commit();
      deletedCount += snap.size;
    }
  }
  console.log(`Deleted ${deletedCount} test documents.`);

  console.log("Cleaning up Auth test users...");
  const testEmails = ["admin@test.com", "vendor-approved@test.com", "vendor-pending@test.com", "vendor-rejected@test.com", "vendor-suspended@test.com"];
  for (const e of testEmails) {
    try {
      const u = await auth.getUserByEmail(e);
      await auth.deleteUser(u.uid);
      console.log(`Deleted user: ${e}`);
    } catch(e) {}
  }

  console.log("Cleaning up static test images...");
  const publicTestDir = path.join(process.cwd(), "public", "test-data");
  if (fs.existsSync(publicTestDir)) {
    fs.rmSync(publicTestDir, { recursive: true, force: true });
    console.log("Deleted public/test-data/ directory.");
  }

  console.log("Cleanup complete!");
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
