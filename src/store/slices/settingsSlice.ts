import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  smsDetectionEnabled: boolean;
  offlineStatus: 'online' | 'offline' | 'syncing';
  currency: 'INR';
}

const initialState: SettingsState = {
  smsDetectionEnabled: true,
  offlineStatus: 'online',
  currency: 'INR',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSmsDetection: (state, action: PayloadAction<boolean>) => {
      state.smsDetectionEnabled = action.payload;
    },
    setOfflineStatus: (state, action: PayloadAction<'online' | 'offline' | 'syncing'>) => {
      state.offlineStatus = action.payload;
    },
  },
});

export const { setSmsDetection, setOfflineStatus } = settingsSlice.actions;
export default settingsSlice.reducer;
