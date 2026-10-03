import { auth, firestore } from './firebase';
import { UserProfile } from '../types/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  scopes: ['email', 'profile'],
});

/**
 * Authentication service using Firebase Auth and Firestore users collection
 */
export const authService = {
  /**
   * Register a new user with email and password
   */
  async register(email: string, password: string, displayName: string): Promise<UserProfile> {
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
  },

  /**
   * Login user with email and password
   */
  async login(email: string, password: string): Promise<UserProfile> {
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
  },

  /**
   * Login user with Google Sign-In
   */
  async signInWithGoogle(): Promise<UserProfile> {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    const idToken = (response as any).data?.idToken || (response as any).idToken;

    if (!idToken) {
      throw new Error('Google Sign-In failed: No ID token returned');
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
    await auth().sendPasswordResetEmail(email.trim());
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
