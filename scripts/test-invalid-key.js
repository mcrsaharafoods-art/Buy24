import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const app = initializeApp({
  apiKey: '"invalid_key"', // Like what was in .env
  authDomain: "test.firebaseapp.com",
  projectId: "test",
});

const auth = getAuth(app);

async function test() {
  try {
    await signInWithEmailAndPassword(auth, "test@test.com", "password");
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();
