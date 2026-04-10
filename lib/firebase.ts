// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = { 
  apiKey: process.env.apiKey_firebase,
  authDomain: process.env.authDomain__firebase,
  projectId: process.env.projectId_firebase,
  storageBucket: process.env.storageBucket_firebase,
  messagingSenderId: process.env.messagingSenderId_firebase,
  appId: process.env.appId_firebase
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
