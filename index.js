import '@react-native-firebase/app';
import { AppRegistry } from 'react-native';
import * as RNS from 'react-native-screens';
import App from './App';

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
