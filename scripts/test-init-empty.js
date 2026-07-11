import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const app = initializeApp({
  apiKey: undefined,
  authDomain: undefined,
});

try {
  const auth = getAuth(app);
  console.log("Auth initialized", !!auth);
} catch (e) {
  console.log("Error:", e.message);
}
