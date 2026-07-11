const { Storage } = require("@google-cloud/storage");
const storage = new Storage({ keyFilename: "firebase-service-account.json" });

async function createBucket() {
  const bucketName = "buy24s.firebasestorage.app";
  try {
    console.log(`Attempting to create bucket: ${bucketName}...`);
    await storage.createBucket(bucketName);
    console.log(`Bucket ${bucketName} created successfully.`);
    process.exit(0);
  } catch (err) {
    console.error("Failed to create bucket:", err.message);
    process.exit(1);
  }
}
createBucket();
