import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Free tier: Firebase Authentication's Spark (free) plan covers email/password
// login with no card required. Create a project at https://console.firebase.google.com,
// enable "Email/Password" under Authentication -> Sign-in method, then paste your
// web app's config values into frontend/.env (copy from .env.example).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log("API KEY:", JSON.stringify(firebaseConfig.apiKey));
console.log("API KEY LENGTH:", firebaseConfig.apiKey ? firebaseConfig.apiKey.length : "undefined");

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);