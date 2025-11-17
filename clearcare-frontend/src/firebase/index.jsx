import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC9JCQluY7rD_leCF1uRmQWsQ8nmi-2YXI",
  authDomain: "clearcare-e7e34.firebaseapp.com",
  projectId: "clearcare-e7e34",
  storageBucket: "clearcare-e7e34.firebasestorage.app",
  messagingSenderId: "404772754430",
  appId: "1:404772754430:web:105b82abb459b67e0a26af"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export {
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
};
