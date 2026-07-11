import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

import * as dotenv from "dotenv";
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function test() {
  try {
    await signInWithEmailAndPassword(auth, "muneendra2you@gmail.com", "admin@1990");
    console.log("Success");
  } catch (e) {
    console.log("Error type:", e.constructor.name);
    console.log("Error message:", e.message);
    if (e.stack) console.log("Stack:", e.stack);
  }
}
test();
