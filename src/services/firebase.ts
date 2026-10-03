import '@react-native-firebase/app';
import auth, { GoogleAuthProvider } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';

// Enable offline persistence for React Native Firebase Firestore
try {
  firestore().settings({
    persistence: true,
  });
} catch (e) {
  // Settings can only be set before any other Firestore operations
  console.log('Firestore settings initialization info:', e);
}

export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => cleanForFirestore(item)) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned;
  }
  return data;
}

export { auth, GoogleAuthProvider, firestore, messaging };
