import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { setUser, setLoading, logoutSuccess, setDefaultGroupId } from '../store/slices/authSlice';
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';
import { smsService } from '../services/smsService';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated, loading, error } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          let profile = await authService.getUserProfile(firebaseUser.uid);
          if (!profile) {
            const now = Date.now();
            profile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || null,
              defaultGroupId: null,
              createdAt: now,
              updatedAt: now,
            };
            try {
              await authService.updateProfile(firebaseUser.uid, profile);
            } catch {}
          }
          dispatch(setUser(profile));

          // Non-critical background registrations
          try {
            await notificationService.registerDeviceToken(profile.uid);
          } catch (notifErr) {
            console.warn('Notification registration skipped:', notifErr);
          }

          try {
            if (profile.defaultGroupId) {
              smsService.setDefaultGroup(profile.defaultGroupId);
            }
          } catch (smsErr) {
            console.warn('SMS default group sync skipped:', smsErr);
          }
        } catch (e) {
          console.warn('Failed to load user profile on auth change:', e);
          dispatch(
            setUser({
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || null,
              defaultGroupId: null,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            })
          );
        }
      } else {
        dispatch(logoutSuccess());
      }
    });

    return unsubscribe;
  }, [dispatch]);

  const logout = async () => {
    if (user?.uid) {
      await notificationService.removeDeviceToken(user.uid);
    }
    await authService.logout();
    dispatch(logoutSuccess());
  };

  const updateDefaultGroup = async (groupId: string | null) => {
    if (!user) return;
    await authService.setDefaultGroup(user.uid, groupId);
    dispatch(setDefaultGroupId(groupId));
    smsService.setDefaultGroup(groupId);
  };

  return {
    user,
    isAuthenticated,
    loading,
    error,
    logout,
    updateDefaultGroup,
  };
};
