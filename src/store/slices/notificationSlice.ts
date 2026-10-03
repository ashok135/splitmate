import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppNotification } from '../../types/notification';

interface NotificationState {
  notifications: AppNotification[];
  loading: boolean;
  unreadCount: number;
}

const initialState: NotificationState = {
  notifications: [],
  loading: false,
  unreadCount: 0,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications: (state, action: PayloadAction<AppNotification[]>) => {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter((n) => !n.readBy).length;
      state.loading = false;
    },
    markRead: (state, action: PayloadAction<string>) => {
      const notif = state.notifications.find((n) => n.notificationId === action.payload);
      if (notif) {
        notif.readBy = notif.readBy || {};
        if (state.unreadCount > 0) state.unreadCount -= 1;
      }
    },
    setNotificationLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setNotifications, markRead, setNotificationLoading } = notificationSlice.actions;
export default notificationSlice.reducer;
