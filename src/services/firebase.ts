import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: 'AIzaSyBsWcph8ORnShHN07YgjfvUa2RaxznefPc',
  authDomain: 'splitmate-605bf.firebaseapp.com',
  projectId: 'splitmate-605bf',
  storageBucket: 'splitmate-605bf.firebasestorage.app',
  messagingSenderId: '329382178902',
  appId: '1:329382178902:web:c620f6d91c582a45af8bf7',
  measurementId: 'G-X7TDPY7CMV',
};

// Initialize Firebase JS SDK
export const webFirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const webAuth = getAuth(webFirebaseApp);
export const webFirestore = getFirestore(webFirebaseApp);

// Enable offline persistence for React Native Firebase Firestore
try {
  firestore().settings({
    persistence: true,
    cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
  });
} catch (e) {
  // Settings can only be set before any other Firestore operations
  console.log('Firestore settings initialization info:', e);
}

export { auth, firestore, messaging };
