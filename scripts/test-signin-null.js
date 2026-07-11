import { signInWithEmailAndPassword } from "firebase/auth";
try {
  signInWithEmailAndPassword(null, "test@test.com", "password");
} catch (e) {
  console.log("Error:", e.message);
}
