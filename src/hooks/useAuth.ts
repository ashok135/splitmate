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
          const profile = await authService.getUserProfile(firebaseUser.uid);
          if (profile) {
            dispatch(setUser(profile));
            // Register FCM device token
            await notificationService.registerDeviceToken(profile.uid);
            // Sync default group to native SMS detection
            if (profile.defaultGroupId) {
              smsService.setDefaultGroup(profile.defaultGroupId);
            }
          } else {
            dispatch(setUser(null));
          }
        } catch (e) {
          console.warn('Failed to load user profile on auth change:', e);
          dispatch(setUser(null));
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
