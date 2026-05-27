import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Shared database configuration for Dudu & Bubu to sync instantly out of the box
const firebaseConfig = {
  apiKey: "AIzaSyCb4gYvD1uE_mJk3pQ9rS8tV7wX-demo",
  authDomain: "mission-bubu-shared.firebaseapp.com",
  projectId: "mission-bubu-shared",
  storageBucket: "mission-bubu-shared.appspot.com",
  messagingSenderId: "598273918273",
  appId: "1:598273918273:web:987a2c6d4e5f6a7b8c9d0e"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore (default config avoids indexedDB crashes on native mobile devices)
const db = getFirestore(app);

// The hardcoded channel ID linking Dudu and Bubu's devices together
export const CHANNEL_ID = 'shared_dudu_bubu_room';

export { db };
