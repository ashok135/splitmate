import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import messaging from '@react-native-firebase/messaging';
import { smsService } from './src/services/smsService';

export default function App() {
  useEffect(() => {
    // Listen for incoming FCM messages in foreground and show heads-up top popup
    try {
      const unsubscribe = messaging().onMessage(async (remoteMessage) => {
        console.log('Foreground FCM notification received:', remoteMessage);
        if (remoteMessage) {
          const rawTitle = remoteMessage.notification?.title || remoteMessage.data?.title || 'SplitMate';
          const rawBody = remoteMessage.notification?.body || remoteMessage.data?.body || '';
          const title = typeof rawTitle === 'string' ? rawTitle : JSON.stringify(rawTitle);
          const body = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
          const groupId = remoteMessage.data?.groupId;
          const expenseId = remoteMessage.data?.expenseId;

          if (title && body) {
            smsService.showSystemNotification({
              title,
              body,
              groupId: typeof groupId === 'string' ? groupId : undefined,
              expenseId: typeof expenseId === 'string' ? expenseId : undefined,
            });
          }
        }
      });
      return unsubscribe;
    } catch (e) {
      console.log('FCM foreground listener setup:', e);
    }
  }, []);

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <RootNavigator />
        </SafeAreaProvider>
      </Provider>
    </ErrorBoundary>
  );
}
