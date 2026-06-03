type Database = import("firebase/database").Database;

let _db: Database | undefined;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export async function getDb(): Promise<Database> {
  if (_db) return _db;
  const { initializeApp, getApps } = await import("firebase/app");
  const { getDatabase } = await import("firebase/database");
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  _db = getDatabase(app);
  return _db;
}
