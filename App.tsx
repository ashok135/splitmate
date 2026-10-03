import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import messaging from '@react-native-firebase/messaging';

// Register background FCM handler safely
try {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('Background FCM message received:', remoteMessage);
  });
} catch (e) {
  console.log('FCM background setup:', e);
}

export default function App() {
  useEffect(() => {
    // Listen for foreground FCM messages safely
    try {
      const unsubscribe = messaging().onMessage(async (remoteMessage) => {
        console.log('Foreground FCM notification received:', remoteMessage);
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
