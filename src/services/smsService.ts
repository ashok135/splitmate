import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';
import { ParsedTransaction } from '../types/sms';
import { parseBankTransactionSms } from '../utils/transactionFingerprint';
import { calculateEqualSplit } from '../utils/splitCalculator';
import { expenseService } from './expenseService';
import { groupService } from './groupService';
import { UserProfile } from '../types/auth';

const { SmsModule } = NativeModules;
const smsEventEmitter = SmsModule ? new NativeEventEmitter(SmsModule) : null;

export interface PendingQuickAddItem {
  groupId: string;
  amount: number;
  merchant: string;
  fingerprint: string;
  timestamp: number;
  groupName?: string;
}

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
   * Show a heads-up system notification at the top of the screen
   */
  showSystemNotification(params: {
    title: string;
    body: string;
    subText?: string;
    groupId?: string;
    expenseId?: string;
  }): void {
    if (Platform.OS === 'android' && SmsModule?.showSystemNotification) {
      SmsModule.showSystemNotification(
        params.title,
        params.body,
        params.subText || null,
        params.groupId || null,
        params.expenseId || null
      );
    }
  },

  /**
   * Dispatch group push notification via FCM v1 to topic group_{groupId}
   */
  async dispatchGroupPush(params: {
    title: string;
    body: string;
    groupId: string;
    groupName: string;
    expenseId?: string;
    actorId: string;
    actorName: string;
  }): Promise<boolean> {
    if (Platform.OS === 'android' && SmsModule?.dispatchGroupPush) {
      try {
        await SmsModule.dispatchGroupPush(
          params.title,
          params.body,
          params.groupId,
          params.groupName,
          params.expenseId || null,
          params.actorId,
          params.actorName
        );
        return true;
      } catch (e) {
        console.warn('dispatchGroupPush failed:', e);
        return false;
      }
    }
    return false;
  },

  /**
   * Retrieve pending quick adds stored in SharedPreferences from notification [ADD] taps
   */
  async getPendingQuickAdds(): Promise<PendingQuickAddItem[]> {
    if (Platform.OS !== 'android' || !SmsModule?.getPendingQuickAdds) {
      return [];
    }

    try {
      const rawList: string[] = await SmsModule.getPendingQuickAdds();
      if (!Array.isArray(rawList)) return [];

      return rawList.map((raw) => {
        const parts = raw.split('|');
        return {
          groupId: parts[0] || '',
          amount: parseFloat(parts[1]) || 0,
          merchant: parts[2] || 'Bank Transaction',
          fingerprint: parts[3] || '',
          timestamp: parseInt(parts[4], 10) || Date.now(),
          groupName: parts[5] || undefined,
        };
      }).filter((item) => item.amount > 0 && Boolean(item.groupId));
    } catch (e) {
      console.warn('Failed to get pending quick adds:', e);
      return [];
    }
  },

  /**
   * Clear pending quick adds in SharedPreferences
   */
  async clearPendingQuickAdds(): Promise<void> {
    if (Platform.OS === 'android' && SmsModule?.clearPendingQuickAdds) {
      try {
        await SmsModule.clearPendingQuickAdds();
      } catch (e) {
        console.warn('Failed to clear pending quick adds:', e);
      }
    }
  },

  /**
   * Synchronize pending quick adds into Firestore and update group data
   */
  async syncPendingQuickAdds(params: {
    user: UserProfile;
    onExpenseCreated?: (expense: any) => void;
  }): Promise<number> {
    const { user, onExpenseCreated } = params;
    if (!user?.uid) return 0;

    const pending = await this.getPendingQuickAdds();
    if (!pending.length) return 0;

    let syncedCount = 0;

    for (const item of pending) {
      try {
        // Check if duplicate fingerprint already processed in Firestore
        const alreadyDone = await expenseService.isTransactionProcessed(item.fingerprint);
        if (!alreadyDone) {
          const members = await groupService.getGroupMembers(item.groupId);
          const memberIds = members.map((m) => m.uid);
          const splits = calculateEqualSplit(item.amount, memberIds);

          const newExpense = await expenseService.createExpense(
            item.groupId,
            {
              groupId: item.groupId,
              amount: item.amount,
              currency: 'INR',
              paidBy: user.uid,
              description: item.merchant,
              merchant: item.merchant,
              splitType: 'equal',
              source: 'bank_sms',
            },
            splits,
            user,
            item.fingerprint
          );

          if (onExpenseCreated) {
            onExpenseCreated(newExpense);
          }
          syncedCount++;
        }
      } catch (err) {
        console.warn('Error syncing pending item:', err);
      }
    }

    await this.clearPendingQuickAdds();
    return syncedCount;
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
   * Subscribe to notification [ADD] events triggered while app is running
   */
  subscribeToPendingQuickAddEvents(callback: () => void) {
    if (!smsEventEmitter) {
      return { remove: () => {} };
    }

    const subscription = smsEventEmitter.addListener('onPendingQuickAddUpdated', () => {
      callback();
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
