import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCe87G_tncL4f6g6JmGwi6S8tX5XNs90Rw",
  authDomain: "matiko-stadium.firebaseapp.com",
  projectId: "matiko-stadium",
  messagingSenderId: "123987900465",
  appId: "1:123987900465:web:22e17c5c3d9f5c5ec83d10"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
