const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const app = initializeApp({ projectId: undefined });
const auth = getAuth(app);

async function test() {
  try {
    await auth.getUserByEmail("test@test.com");
  } catch (e) {
    console.log("Error type:", e.constructor.name);
    console.log("Error message:", e.message);
  }
}
test();
