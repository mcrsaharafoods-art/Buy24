const { initializeApp, cert } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");
const fs = require("fs");

const serviceAccount = JSON.parse(fs.readFileSync("firebase-service-account.json", "utf-8"));

async function testBucket(bucketName) {
  console.log(`Testing bucket: ${bucketName}`);
  try {
    const app = initializeApp({ credential: cert(serviceAccount) }, bucketName);
    const bucket = getStorage(app).bucket(bucketName);
    await bucket.file("test.txt").save("test");
    console.log(`✅ SUCCESS: ${bucketName}`);
    process.exit(0);
  } catch (e) {
    console.log(`❌ FAILED: ${bucketName} - ${e.message}`);
  }
}

async function run() {
  const bucketsToTest = [
    "buy24s.appspot.com",
    "buy24s.firebasestorage.app",
    "buy24us-launchpad.appspot.com",
    "buy24us-launchpad.firebasestorage.app",
    "buy24s-launchpad.appspot.com",
  ];

  for (const b of bucketsToTest) {
    await testBucket(b);
  }
  console.log("All tests failed.");
  process.exit(1);
}

run();
