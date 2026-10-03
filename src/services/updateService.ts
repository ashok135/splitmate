import { Linking, Alert } from 'react-native';
import { firestore } from './firebase';
import { AppUpdateInfo } from '../types/update';

export const CURRENT_VERSION_CODE = 1;
export const CURRENT_VERSION_NAME = '1.0.0';

const GITHUB_VERSION_URL =
  'https://raw.githubusercontent.com/ashok135/splitmate/main/version.json';

export const updateService = {
  /**
   * Checks GitHub or Firestore for available updates
   */
  async checkForUpdate(): Promise<AppUpdateInfo | null> {
    // 1. Try checking GitHub version.json first
    try {
      const response = await fetch(`${GITHUB_VERSION_URL}?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (response.ok) {
        const data: AppUpdateInfo = await response.json();
        if (data && typeof data.versionCode === 'number') {
          if (data.versionCode > CURRENT_VERSION_CODE) {
            return data;
          }
          return null;
        }
      }
    } catch (gitErr) {
      console.log('GitHub update check note:', gitErr);
    }

    // 2. Fallback to Firestore app_config/version
    try {
      const doc = await firestore().collection('app_config').doc('version').get();
      if (doc.exists) {
        const data = doc.data() as AppUpdateInfo | undefined;
        if (data && typeof data.versionCode === 'number') {
          if (data.versionCode > CURRENT_VERSION_CODE) {
            return data;
          }
        }
      }
    } catch (fsErr) {
      console.log('Firestore update check note:', fsErr);
    }

    return null;
  },

  /**
   * Opens the download URL in the device browser to download & install the APK
   */
  async downloadAndInstallUpdate(downloadUrl: string): Promise<void> {
    try {
      const supported = await Linking.canOpenURL(downloadUrl);
      if (supported) {
        await Linking.openURL(downloadUrl);
      } else {
        Alert.alert(
          'Download Link',
          `Please open this link in your browser to download the latest update:\n\n${downloadUrl}`
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not open update link');
    }
  },
};
