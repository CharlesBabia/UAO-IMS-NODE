
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAaM01n5R7AXzCnO4J6RK8ctrWg0CZ4Csk",
  authDomain: "uao-ims-f9f38.firebaseapp.com",
  projectId: "uao-ims-f9f38",
  storageBucket: "uao-ims-f9f38.appspot.com",
  messagingSenderId: "436671320117",
  appId: "1:436671320117:web:6d12e6dba8e6e7e182217c",
  measurementId: "G-MYR91X7BLK"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, analytics, db, auth, storage };