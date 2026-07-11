import { signInWithEmailAndPassword } from "firebase/auth";
try {
  signInWithEmailAndPassword(undefined, "test@test.com", "password");
} catch (e) {
  console.log("Error:", e.message);
}
