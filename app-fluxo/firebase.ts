/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Mesmo projeto Firebase do app antigo (backend compartilhado); o app novo só
// usa coleções/pastas próprias. Lê as mesmas VITE_FIREBASE_* do .env da raiz.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.error('Firebase API Key ausente! Confira o .env (VITE_FIREBASE_*).');
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// Nota: fotos ficam como data URL dentro do doc do Firestore (não usamos
// Firebase Storage, que exigiria plano pago). Imagem já é redimensionada
// para ~256px JPEG (~15-30 KB), bem abaixo do limite de 1 MB por documento.
