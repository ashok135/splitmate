import { auth, firestore } from './firebase';
import { UserProfile } from '../types/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '329382178902-o5c2kehq18d5kpfikpm6era0o1skir36.apps.googleusercontent.com',
  scopes: ['email', 'profile'],
});

function formatAuthError(err: any): Error {
  const msg = err?.message || String(err);
  if (
    err?.code === '12501' ||
    err?.code === 'SIGN_IN_CANCELLED' ||
    msg.includes('SIGN_IN_CANCELLED') ||
    msg.includes('cancelled') ||
    msg.includes('Canceled')
  ) {
    return new Error('Sign-in was cancelled.');
  }
  if (err?.code === '12500' || msg.includes('SIGN_IN_REQUIRED')) {
    return new Error('Google Play Services error. Please update Google Play Services.');
  }
  if (err?.code === '10' || msg.includes('DEVELOPER_ERROR')) {
    return new Error('Google Sign-In configuration error (Developer Error 10). Please verify SHA-1 and Web Client ID.');
  }
  if (msg.includes('CONFIGURATION_NOT_FOUND')) {
    return new Error(
      'Firebase Authentication is not enabled yet in your Firebase Console. Please open Firebase Console > Authentication > Sign-in method and enable "Email/Password".'
    );
  }
  if (msg.includes('auth/email-already-in-use')) {
    return new Error('This email address is already in use by another account.');
  }
  if (msg.includes('auth/invalid-email')) {
    return new Error('Please enter a valid email address.');
  }
  if (
    msg.includes('auth/user-not-found') ||
    msg.includes('auth/wrong-password') ||
    msg.includes('auth/invalid-credential')
  ) {
    return new Error('Incorrect email or password. Please verify your credentials.');
  }
  if (msg.includes('auth/network-request-failed')) {
    return new Error('Network error. Please check your internet connection.');
  }
  return err;
}

/**
 * Authentication service using Firebase Auth and Firestore users collection
 */
export const authService = {
  /**
   * Register a new user with email and password
   */
  async register(email: string, password: string, displayName: string): Promise<UserProfile> {
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email.trim(), password);
      const user = userCredential.user;

      await user.updateProfile({ displayName: displayName.trim() });

      const now = Date.now();
      const profile: UserProfile = {
        uid: user.uid,
        displayName: displayName.trim(),
        email: user.email?.toLowerCase().trim() || email.toLowerCase().trim(),
        photoURL: user.photoURL || null,
        defaultGroupId: null,
        createdAt: now,
        updatedAt: now,
      };

      // Store in users/{uid}
      await firestore().collection('users').doc(user.uid).set(profile);
      return profile;
    } catch (err: any) {
      throw formatAuthError(err);
    }
  },

  /**
   * Login user with email and password
   */
  async login(email: string, password: string): Promise<UserProfile> {
    try {
      const userCredential = await auth().signInWithEmailAndPassword(email.trim(), password);
      const user = userCredential.user;

      const doc = await firestore().collection('users').doc(user.uid).get();
      if (!doc.exists) {
        // Re-create profile document if missing
        const now = Date.now();
        const profile: UserProfile = {
          uid: user.uid,
          displayName: user.displayName || email.split('@')[0],
          email: user.email?.toLowerCase().trim() || email.toLowerCase().trim(),
          photoURL: user.photoURL || null,
          defaultGroupId: null,
          createdAt: now,
          updatedAt: now,
        };
        await firestore().collection('users').doc(user.uid).set(profile);
        return profile;
      }

      return doc.data() as UserProfile;
    } catch (err: any) {
      throw formatAuthError(err);
    }
  },

  /**
   * Login user with Google Sign-In
   */
  async signInWithGoogle(): Promise<UserProfile> {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if ((response as any).type === 'cancelled') {
        throw new Error('Sign-in was cancelled.');
      }
      const idToken = (response as any).data?.idToken || (response as any).idToken;

      if (!idToken) {
        throw new Error('Google Sign-In failed: No ID token returned. Make sure Google provider is enabled in Firebase Console.');
      }

      // @ts-ignore
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);
      const user = userCredential.user;

      const doc = await firestore().collection('users').doc(user.uid).get();
      const now = Date.now();
      if (!doc.exists) {
        const profile: UserProfile = {
          uid: user.uid,
          displayName: user.displayName || 'Google User',
          email: user.email?.toLowerCase().trim() || '',
          photoURL: user.photoURL || null,
          defaultGroupId: null,
          createdAt: now,
          updatedAt: now,
        };
        await firestore().collection('users').doc(user.uid).set(profile);
        return profile;
      }

      return doc.data() as UserProfile;
    } catch (err: any) {
      throw formatAuthError(err);
    }
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await GoogleSignin.signOut();
    } catch {
      // Ignore if not signed in with Google
    }
    await auth().signOut();
  },

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<void> {
    try {
      await auth().sendPasswordResetEmail(email.trim());
    } catch (err: any) {
      throw formatAuthError(err);
    }
  },

  /**
   * Get user profile by UID
   */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const doc = await firestore().collection('users').doc(uid).get();
    if (!doc.exists) return null;
    return doc.data() as UserProfile;
  },

  /**
   * Update user's default group
   */
  async setDefaultGroup(uid: string, defaultGroupId: string | null): Promise<void> {
    await firestore().collection('users').doc(uid).update({
      defaultGroupId,
      updatedAt: Date.now(),
    });
  },

  /**
   * Update profile fields
   */
  async updateProfile(uid: string, fields: Partial<UserProfile>): Promise<void> {
    await firestore().collection('users').doc(uid).update({
      ...fields,
      updatedAt: Date.now(),
    });
  },

  /**
   * Listen to Firebase Auth state
   */
  onAuthStateChanged(callback: (user: any) => void) {
    return auth().onAuthStateChanged(callback);
  },
};
