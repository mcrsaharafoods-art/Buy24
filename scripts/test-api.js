import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import dotenv from "dotenv";

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function run() {
  try {
    console.log("1. Authenticating Admin...");
    const userCredential = await signInWithEmailAndPassword(auth, "muneendra2you@gmail.com", "admin@1990");
    const idToken = await userCredential.user.getIdToken();
    console.log("-> Success. Token obtained.");
    
    console.log("2. Creating Session...");
    const payload = [{ data: { idToken } }];
    const res = await fetch("http://localhost:5173/_server/?_serverFnId=createSession", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Origin": "http://localhost:5173",
        "Referer": "http://localhost:5173/admin/login",
      },
      body: JSON.stringify(payload)
    });
    
    console.log("-> Session response:", res.status);
    if (!res.ok) {
      console.log("-> Error body:", await res.text());
    }
    const cookies = res.headers.get("set-cookie");
    console.log("-> Cookies:", cookies ? "Set" : "None");
    
    const tokenCookie = cookies?.split(';').find(c => c.includes('auth_token'));
    const tokenVal = tokenCookie ? tokenCookie.split('=')[1] : null;

    if (!tokenVal) {
      throw new Error("No auth_token cookie received from createSession");
    }

    console.log("3. Testing Admin Server Function (listApplications)...");
    const listRes = await fetch("http://localhost:5173/_server/?_serverFnId=listApplications", {
      method: "GET",
      headers: {
        "Cookie": `auth_token=${tokenVal}`
      }
    });

    console.log("-> listApplications response:", listRes.status);
    if (!listRes.ok) {
      const text = await listRes.text();
      console.log("-> Error Body:", text);
      throw new Error("listApplications failed");
    }
    
    const apps = await listRes.json();
    console.log("-> Apps loaded:", Array.isArray(apps) ? apps.length : "Unknown");

    console.log("\nALL API TESTS PASSED!");
    process.exit(0);
  } catch (e) {
    console.error("API TEST FAILED:", e);
    process.exit(1);
  }
}

run();
