import { getAuth } from "firebase/auth";
try {
  getAuth(undefined);
} catch (e) {
  console.log("Error:", e.message);
}
