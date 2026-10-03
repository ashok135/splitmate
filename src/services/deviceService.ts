import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@splitmate_device_id';

export const deviceService = {
  /**
   * Retrieves or generates a persistent unique device ID for this installation
   */
  async getDeviceId(): Promise<string> {
    try {
      let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        id = `dev_${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await AsyncStorage.setItem(DEVICE_ID_KEY, id);
      }
      return id;
    } catch {
      return `dev_${Platform.OS}_fallback`;
    }
  },

  getPlatform(): 'android' | 'ios' {
    return Platform.OS === 'ios' ? 'ios' : 'android';
  },
};
