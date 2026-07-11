const { Storage } = require("@google-cloud/storage");
const storage = new Storage({ keyFilename: "firebase-service-account.json" });

async function listBuckets() {
  try {
    const [buckets] = await storage.getBuckets();
    console.log("Buckets:");
    if (buckets.length === 0) {
      console.log("No buckets found.");
    } else {
      buckets.forEach((bucket) => {
        console.log(bucket.name);
      });
    }
    process.exit(0);
  } catch (err) {
    console.error("ERROR:", err);
    process.exit(1);
  }
}
listBuckets();
