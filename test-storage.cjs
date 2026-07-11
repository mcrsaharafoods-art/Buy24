const { initializeApp, cert } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");
const fs = require("fs");

const serviceAccount = JSON.parse(fs.readFileSync("firebase-service-account.json", "utf-8"));
const app = initializeApp({ 
  credential: cert(serviceAccount),
  storageBucket: "buy24s.firebasestorage.app"
});

async function run() {
  try {
    const bucket = getStorage(app).bucket();
    await bucket.file("test-connection.txt").save("test");
    console.log("Uploaded successfully to buy24s.firebasestorage.app");
    process.exit(0);
  } catch (e) {
    console.error("Error with firebasestorage.app:", e.message);
    try {
      const app2 = initializeApp({ credential: cert(serviceAccount), storageBucket: "buy24s.appspot.com" }, "app2");
      const bucket2 = getStorage(app2).bucket();
      await bucket2.file("test-connection.txt").save("test");
      console.log("Uploaded successfully to buy24s.appspot.com");
      process.exit(0);
    } catch (e2) {
      console.error("Error with appspot.com:", e2.message);
      process.exit(1);
    }
  }
}
run();
