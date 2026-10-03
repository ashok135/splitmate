import { messaging, firestore, cleanForFirestore } from './firebase';
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
    targetUserIds?: string[];
  }): Promise<void> {
    const { groupId, groupName, expenseId, payerId, payerName, amount, description, targetUserIds } = params;

    const notifRef = firestore().collection('notifications').doc();
    const notificationId = notifRef.id;
    const now = Date.now();

    const title = 'New expense';
    const body = `${payerName} added ₹${amount} to ${groupName}${
      description ? ` • ${description}` : ''
    }`;

    const notification: AppNotification = cleanForFirestore({
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
      targetUserIds: targetUserIds || [],
      createdAt: now,
      readBy: {
        [payerId]: true, // Payer already knows
      },
    });

    // Stored in Firestore notifications collection
    await notifRef.set(notification);
  },

  /**
   * Send settlement recorded notification to group members
   */
  async sendSettlementNotification(params: {
    groupId: string;
    groupName: string;
    settlementId: string;
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    toUserName: string;
    amount: number;
    notes?: string;
    targetUserIds?: string[];
  }): Promise<void> {
    const {
      groupId,
      groupName,
      settlementId,
      fromUserId,
      fromUserName,
      toUserName,
      amount,
      notes,
      targetUserIds,
    } = params;

    const notifRef = firestore().collection('notifications').doc();
    const notificationId = notifRef.id;
    const now = Date.now();

    const title = 'Settlement recorded';
    const body = `${fromUserName} paid ₹${amount} to ${toUserName} in ${groupName}${
      notes ? ` • ${notes}` : ''
    }`;

    const notification: AppNotification = cleanForFirestore({
      notificationId,
      type: 'settlement_recorded',
      title,
      body,
      groupId,
      groupName,
      settlementId,
      actorId: fromUserId,
      actorName: fromUserName,
      amount,
      targetUserIds: targetUserIds || [],
      createdAt: now,
      readBy: {
        [fromUserId]: true,
      },
    });

    await notifRef.set(notification);
  },

  /**
   * Send member joined notification to existing group members
   */
  async sendMemberJoinedNotification(params: {
    groupId: string;
    groupName: string;
    memberId: string;
    memberName: string;
    targetUserIds?: string[];
  }): Promise<void> {
    const { groupId, groupName, memberId, memberName, targetUserIds } = params;

    const notifRef = firestore().collection('notifications').doc();
    const notificationId = notifRef.id;
    const now = Date.now();

    const title = 'New member joined';
    const body = `${memberName} joined ${groupName}`;

    const notification: AppNotification = cleanForFirestore({
      notificationId,
      type: 'member_joined',
      title,
      body,
      groupId,
      groupName,
      actorId: memberId,
      actorName: memberName,
      targetUserIds: targetUserIds || [],
      createdAt: now,
      readBy: {
        [memberId]: true,
      },
    });

    await notifRef.set(notification);
  },

  /**
   * Real-time listener for incoming notifications (for popups / banners)
   * Only triggers for events created during the current app session.
   */
  subscribeToIncomingNotifications(
    userId: string,
    onNotification: (notif: AppNotification) => void
  ): () => void {
    const sessionStart = Date.now() - 3000; // Allow 3s clock skew

    return firestore()
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .onSnapshot(
        (snapshot) => {
          if (!snapshot || snapshot.empty) return;

          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data() as AppNotification;
              // Check if notification is recent (after session start)
              if (data.createdAt >= sessionStart) {
                // Check if user is recipient (not the author, and in targetUserIds if present)
                if (data.actorId !== userId) {
                  const isRecipient =
                    !data.targetUserIds ||
                    data.targetUserIds.length === 0 ||
                    data.targetUserIds.includes(userId);
                  if (isRecipient) {
                    onNotification(data);
                  }
                }
              }
            }
          });
        },
        (error) => {
          console.warn('Real-time notifications listener error:', error);
        }
      );
  },

  /**
   * Real-time subscription for the Activity / Notifications tab
   */
  subscribeToUserNotificationsList(
    userId: string,
    onUpdate: (notifications: AppNotification[]) => void
  ): () => void {
    return firestore()
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot(
        (snapshot) => {
          if (!snapshot) return;
          const list = snapshot.docs
            .map((doc) => {
              const data = doc.data() as AppNotification;
              if (data.actorId === userId) {
                return {
                  ...data,
                  body: data.body ? data.body.replace(new RegExp(`^${data.actorName}\\b`), 'You') : data.body,
                };
              }
              return data;
            })
            .filter((n) => {
              if (n.actorId === userId) return true;
              if (n.targetUserIds && n.targetUserIds.length > 0) {
                return n.targetUserIds.includes(userId);
              }
              return true;
            });
          onUpdate(list);
        },
        (error) => {
          console.warn('Notifications list subscription error:', error);
        }
      );
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
      .map((doc) => {
        const data = doc.data() as AppNotification;
        if (data.actorId === userId) {
          return {
            ...data,
            body: data.body ? data.body.replace(new RegExp(`^${data.actorName}\\b`), 'You') : data.body,
          };
        }
        return data;
      })
      .filter((n) => {
        if (n.actorId === userId) return true;
        if (n.targetUserIds && n.targetUserIds.length > 0) {
          return n.targetUserIds.includes(userId);
        }
        return true;
      });
  },

  /**
   * Mark a notification as read
   */
  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await firestore()
        .collection('notifications')
        .doc(notificationId)
        .update({
          [`readBy.${userId}`]: true,
        });
    } catch (e) {
      console.warn('Mark as read note:', e);
    }
  },

  /**
   * Delete a single notification permanently from Firestore
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await firestore().collection('notifications').doc(notificationId).delete();
  },

  /**
   * Clear / delete all notifications for a given user from Firestore
   */
  async clearAllNotifications(userId: string): Promise<void> {
    const snap = await firestore()
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const batch = firestore().batch();
    let count = 0;
    snap.docs.forEach((doc) => {
      const data = doc.data() as AppNotification;
      const isTarget =
        data.actorId === userId ||
        !data.targetUserIds ||
        data.targetUserIds.length === 0 ||
        data.targetUserIds.includes(userId);

      if (isTarget) {
        batch.delete(doc.ref);
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }
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
