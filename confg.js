import firebase from "firebase"
require("@firebase/firestore")

const firebaseConfig = {
    apiKey: "AIzaSyAM-rhY3HOLavkKEmMNDglFIl7V0lODscU",
    authDomain: "biblioteca-eletronica-cbd46.firebaseapp.com",
    projectId: "biblioteca-eletronica-cbd46",
    storageBucket: "biblioteca-eletronica-cbd46.appspot.com",
    messagingSenderId: "281120908384",
    appId: "1:281120908384:web:5ce210776b0a0b25634f05"
  };
  
firebase.initializeApp(firebaseConfig);

export default firebase.firestore()