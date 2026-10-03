import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';
import { ParsedTransaction } from '../types/sms';
import { parseBankTransactionSms } from '../utils/transactionFingerprint';

const { SmsModule } = NativeModules;
const smsEventEmitter = SmsModule ? new NativeEventEmitter(SmsModule) : null;

export const smsService = {
  /**
   * Request SMS and notification permissions on Android
   */
  async requestSmsPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const permissionsToRequest = [
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        PermissionsAndroid.PERMISSIONS.READ_SMS,
      ];

      // Android 13+ (API 33+) requires POST_NOTIFICATIONS permission
      if (Platform.Version >= 33) {
        permissionsToRequest.push(
          // @ts-ignore
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
      }

      const results = await PermissionsAndroid.requestMultiple(permissionsToRequest);

      const smsGranted =
        results[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED;

      return smsGranted;
    } catch (err) {
      console.warn('Failed to request SMS permissions:', err);
      return false;
    }
  },

  /**
   * Check if SMS permission is granted
   */
  async checkSmsPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
  },

  /**
   * Enable or disable native SMS detection
   */
  setSmsDetectionEnabled(enabled: boolean): void {
    if (Platform.OS === 'android' && SmsModule?.setDetectionEnabled) {
      SmsModule.setDetectionEnabled(enabled);
    }
  },

  /**
   * Set user's default group in native layer for background quick add
   */
  setDefaultGroup(groupId: string | null, groupName?: string | null): void {
    if (Platform.OS === 'android' && SmsModule?.setDefaultGroup) {
      SmsModule.setDefaultGroup(groupId || '', groupName || '');
    }
  },

  /**
   * Subscribe to incoming parsed SMS transactions when app is in foreground
   */
  subscribeToSmsTransactions(callback: (transaction: ParsedTransaction) => void) {
    if (!smsEventEmitter) {
      return { remove: () => {} };
    }

    const subscription = smsEventEmitter.addListener('onBankTransactionDetected', (event) => {
      if (event && event.isTransaction) {
        callback(event);
      }
    });

    return subscription;
  },

  /**
   * Re-usable JS parser method (useful for manual parsing, previews, testing)
   */
  parseMessage(body: string, timestamp?: number): ParsedTransaction {
    return parseBankTransactionSms(body, timestamp);
  },
};
