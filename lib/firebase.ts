// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAZhk6ONlrLppdGMf7nWHbWGAXkPHSVqi0",
  authDomain: "pulseloop-f5b68.firebaseapp.com",
  projectId: "pulseloop-f5b68",
  storageBucket: "pulseloop-f5b68.firebasestorage.app",
  messagingSenderId: "464675985521",
  appId: "1:464675985521:web:c2eaf835698fb65acfe3d0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
