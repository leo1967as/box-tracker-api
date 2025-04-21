import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDj4aYtdPAI3-uWGKUUcScYaTn66vhuTHt4",
  authDomain: "tissueboxdb.firebaseapp.com",
  projectId: "tissueboxdb",
  storageBucket: "tissueboxdb.appspot.com",
  messagingSenderId: "578294379663",
  appId: "1:578294379663:web:592d86722575dcc1676cfa",
  measurementId: "G-CE000PRNNC"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
