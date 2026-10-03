export type NotificationType = 'expense_added' | 'settlement_recorded' | 'member_joined';

export interface AppNotification {
  notificationId: string;
  type: NotificationType;
  title: string;
  body: string;
  groupId: string;
  groupName: string;
  expenseId?: string;
  settlementId?: string;
  actorId: string;
  actorName: string;
  amount?: number;
  createdAt: number;
  readBy?: Record<string, boolean>;
}

export interface DeviceTokenDoc {
  deviceId: string;
  fcmToken: string;
  platform: 'android' | 'ios';
  createdAt: number;
  updatedAt: number;
}
