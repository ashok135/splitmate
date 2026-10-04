import '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';
import { AppRegistry, NativeModules } from 'react-native';
import * as RNS from 'react-native-screens';
import App from './App';

// Register top-level background FCM handler
try {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('Background FCM message received:', remoteMessage);
    if (remoteMessage) {
      const title = remoteMessage.notification?.title || remoteMessage.data?.title;
      const body = remoteMessage.notification?.body || remoteMessage.data?.body;
      const groupId = remoteMessage.data?.groupId;
      const expenseId = remoteMessage.data?.expenseId;

      if (title && body && NativeModules.SmsModule?.showSystemNotification) {
        NativeModules.SmsModule.showSystemNotification(
          title,
          body,
          null,
          groupId || null,
          expenseId || null
        );
      }
    }
  });
} catch (e) {
  console.warn('FCM background setup error:', e);
}

// Ensure react-native-screens compatibilityFlags is always defined and safe
if (!RNS.compatibilityFlags || typeof RNS.compatibilityFlags !== 'object') {
  try {
    RNS.compatibilityFlags = {
      usesNewAndroidHeaderHeightImplementation: false,
    };
  } catch (e) {}
}

// Ensure ScreenStackItem is defined for @react-navigation/native-stack
if (!RNS.ScreenStackItem && RNS.Screen) {
  try {
    RNS.ScreenStackItem = RNS.Screen;
  } catch (e) {}
}

RNS.enableScreens(true);

AppRegistry.registerComponent('splitmate', () => App);
