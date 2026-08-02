import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
  inMemoryPersistence,
  type Auth,
} from "firebase/auth";

// Firebase config — only used for Google Sign-In
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Lazy initialization — only runs on the client side
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let googleProvider: GoogleAuthProvider | undefined;
let initialized = false;

async function getFirebase() {
  if (typeof window === "undefined") {
    throw new Error("Firebase should only be used on the client side.");
  }

  if (!initialized) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);

    // Use in-memory persistence to avoid IndexedDB "Database is closing/hidden" errors
    // We don't need Firebase persistence since we bridge to Supabase sessions
    try {
      await setPersistence(auth, inMemoryPersistence);
    } catch (e) {
      console.warn("Firebase persistence setup failed, continuing:", e);
    }

    googleProvider = new GoogleAuthProvider();
    initialized = true;
  }

  return { auth: auth!, googleProvider: googleProvider! };
}

export { getFirebase };
