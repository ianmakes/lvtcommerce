import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyC8dCWMzILos6DvgJ1nvQcPGrfodGoj6wM",
  authDomain: "lvt-commerce.firebaseapp.com",
  projectId: "lvt-commerce",
  storageBucket: "lvt-commerce.firebasestorage.app",
  messagingSenderId: "242857108739",
  appId: "1:242857108739:web:683065338bc0b961b9f536"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export instances
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
export default app;
