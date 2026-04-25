import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import * as dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function test() {
  try {
    console.log("Firebase config loaded, API Key:", firebaseConfig.apiKey?.substring(0, 10) + "...");
    
    // We cannot easily test write without auth if rules require it. 
    // Let's just try to read clients. If it says missing permissions, we know the rules require auth.
    console.log("Attempting to read clients...");
    const snap = await getDocs(collection(db, 'clients'));
    console.log("Success! Found clients:", snap.docs.length);
    
    console.log("Attempting to write test client...");
    const ref = await addDoc(collection(db, 'clients'), { name: "Test Sanity Check" });
    console.log("Write success! Doc ID:", ref.id);
    
  } catch (err: any) {
    console.error("FIREBASE ERROR:", err.message);
  }
}

test();
