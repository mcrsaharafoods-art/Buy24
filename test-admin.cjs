require("ts-node").register();
const { adminDb, adminAuth } = require("./src/integrations/firebase/admin");

console.log("Admin DB Initialized");
process.exit(0);
