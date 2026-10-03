import { messaging, firestore } from './firebase';
import { deviceService } from './deviceService';
import { AppNotification, DeviceTokenDoc } from '../types/notification';
import { Platform } from 'react-native';

/**
 * Free-tier FCM and In-App notification service.
 * NOTE ON SECURITY:
 * Never puts Firebase Admin credentials or server keys in mobile code.
 * Push notifications are coordinated securely:
 * 1. Tokens stored in users/{uid}/devices/{deviceId}
 * 2. Notification records written to Firestore `notifications` collection
 * 3. Client devices listen or receive FCM pushes securely.
 */
export const notificationService = {
  /**
   * Request push notification permission and register FCM device token in Firestore
   */
  async registerDeviceToken(userId: string): Promise<string | null> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('Notification permission not granted');
        return null;
      }

      // Check if APNs token is needed on iOS first
      if (Platform.OS === 'ios') {
        const apnsToken = await messaging().getAPNSToken();
        if (!apnsToken) {
          console.log('Waiting for APNs token on iOS');
        }
      }

      const fcmToken = await messaging().getToken();
      if (!fcmToken) return null;

      const deviceId = await deviceService.getDeviceId();
      const now = Date.now();

      const tokenDoc: DeviceTokenDoc = {
        deviceId,
        fcmToken,
        platform: deviceService.getPlatform(),
        createdAt: now,
        updatedAt: now,
      };

      // Store in users/{uid}/devices/{deviceId}
      await firestore()
        .collection('users')
        .doc(userId)
        .collection('devices')
        .doc(deviceId)
        .set(tokenDoc, { merge: true });

      // Listen for token refreshes
      messaging().onTokenRefresh(async (newToken) => {
        await firestore()
          .collection('users')
          .doc(userId)
          .collection('devices')
          .doc(deviceId)
          .update({
            fcmToken: newToken,
            updatedAt: Date.now(),
          });
      });

      return fcmToken;
    } catch (error) {
      console.warn('Failed to register FCM device token:', error);
      return null;
    }
  },

  /**
   * Remove device token upon logout to stop receiving notifications on this device
   */
  async removeDeviceToken(userId: string): Promise<void> {
    try {
      const deviceId = await deviceService.getDeviceId();
      await firestore()
        .collection('users')
        .doc(userId)
        .collection('devices')
        .doc(deviceId)
        .delete();
    } catch (error) {
      console.warn('Failed to remove device token:', error);
    }
  },

  /**
   * Send group expense notification.
   * Creates an in-app notification record in Firestore for members of the group.
   * Payer ID is excluded so the person paying does not get their own notification.
   */
  async sendGroupExpenseNotification(params: {
    groupId: string;
    groupName: string;
    expenseId: string;
    payerId: string;
    payerName: string;
    amount: number;
    description?: string;
  }): Promise<void> {
    const { groupId, groupName, expenseId, payerId, payerName, amount, description } = params;

    const notifRef = firestore().collection('notifications').doc();
    const notificationId = notifRef.id;
    const now = Date.now();

    const title = '💰 New expense';
    const body = `${payerName} added ₹${amount} to ${groupName}${
      description ? `\n${description}` : ''
    }`;

    const notification: AppNotification = {
      notificationId,
      type: 'expense_added',
      title,
      body,
      groupId,
      groupName,
      expenseId,
      actorId: payerId,
      actorName: payerName,
      amount,
      createdAt: now,
      readBy: {
        [payerId]: true, // Payer already knows
      },
    };

    // Stored in Firestore notifications collection
    await notifRef.set(notification);

    /*
     * Note on Serverless / Free Architecture:
     * If an external backend or free webhook is configured with FCM v1 HTTP API,
     * it can trigger background push alerts without exposing credentials in the mobile app.
     */
  },

  /**
   * Fetch in-app notifications
   */
  async getNotifications(userId: string): Promise<AppNotification[]> {
    const snap = await firestore()
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get();

    return snap.docs
      .map((doc) => doc.data() as AppNotification)
      .filter((n) => n.actorId !== userId); // Exclude own actions
  },

  /**
   * Mark a notification as read
   */
  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    await firestore()
      .collection('notifications')
      .doc(notificationId)
      .update({
        [`readBy.${userId}`]: true,
      });
  },

  /**
   * Handle notification tap / deep linking
   */
  handleNotificationTap(
    data: any,
    navigate: (screen: string, params: any) => void
  ): void {
    if (!data) return;

    if (data.type === 'expense_added' || data.expenseId) {
      navigate('ExpenseDetails', {
        groupId: data.groupId,
        expenseId: data.expenseId,
      });
    } else if (data.groupId) {
      navigate('GroupDetails', {
        groupId: data.groupId,
      });
    }
  },
};
