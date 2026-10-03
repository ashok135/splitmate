import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import groupReducer from './slices/groupSlice';
import expenseReducer from './slices/expenseSlice';
import notificationReducer from './slices/notificationSlice';
import settingsReducer from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    groups: groupReducer,
    expenses: expenseReducer,
    notifications: notificationReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // For timestamps & Firebase refs
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
