
import { initializeApp } from "firebase/app";
// import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Firebase yapılandırma nesnesi
const firebaseConfig = {
  apiKey: "AIzaSyA8UsQZNNkhW-76nND5uysnTp65E-OEcik",
  authDomain: "poroductuploadedpage.firebaseapp.com",
  databaseURL: "https://poroductuploadedpage-default-rtdb.firebaseio.com",
  projectId: "poroductuploadedpage",
  storageBucket: "poroductuploadedpage.appspot.com",
  messagingSenderId: "448207131997",
  appId: "1:448207131997:web:0bc357afb437fb8f1f44b4",
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);

// Modül dışına db ve storage'ı aktar
export { database, storage };