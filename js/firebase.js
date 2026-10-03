// js/firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDpViJ5kDR13a0U57nQXgcsRNQSLRH--jk",
  authDomain: "cha-t-p-p.firebaseapp.com",
  projectId: "cha-t-p-p",
  storageBucket: "cha-t-p-p.firebasestorage.app",
  messagingSenderId: "561783930115",
  appId: "1:561783930115:web:0a51bba7babe3184eb7d36",
  measurementId: "G-JHQXPEKN98"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account"
});

export {
  app,
  auth,
  db,
  googleProvider
};