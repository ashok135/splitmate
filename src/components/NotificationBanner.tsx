import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Vibration,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { notificationService } from '../services/notificationService';
import { AppNotification } from '../types/notification';
import { messaging } from '../services/firebase';

interface NotificationBannerProps {
  onPressNotification?: (notif: AppNotification) => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  onPressNotification,
}) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [currentNotif, setCurrentNotif] = useState<AppNotification | null>(null);
  const translateY = useRef(new Animated.Value(-150)).current;
  const hideTimer = useRef<any>(null);

  const showBanner = (notif: AppNotification) => {
    // Clear any existing timer
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }

    setCurrentNotif(notif);

    // Light haptic vibration
    try {
      Vibration.vibrate(Platform.OS === 'android' ? [0, 80, 50, 80] : 100);
    } catch (e) {
      // Ignore vibration error
    }

    // Slide down animation
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();

    // Auto dismiss after 6 seconds
    hideTimer.current = setTimeout(() => {
      dismissBanner();
    }, 6000);
  };

  const dismissBanner = () => {
    Animated.timing(translateY, {
      toValue: -150,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setCurrentNotif(null);
    });
  };

  useEffect(() => {
    if (!user?.uid) return;

    // 1. Subscribe to real-time Firestore notifications
    const unsubscribeFirestore = notificationService.subscribeToIncomingNotifications(
      user.uid,
      (notif) => {
        showBanner(notif);
      }
    );

    // 2. Subscribe to foreground FCM messages
    let unsubscribeFCM: (() => void) | undefined;
    try {
      unsubscribeFCM = messaging().onMessage(async (remoteMessage) => {
        if (remoteMessage.notification) {
          const fakeNotif: AppNotification = {
            notificationId: remoteMessage.messageId || String(Date.now()),
            type: 'expense_added',
            title: remoteMessage.notification.title || '💰 New expense',
            body: remoteMessage.notification.body || 'A new expense was added to your group.',
            groupId: (remoteMessage.data?.groupId as string) || '',
            groupName: (remoteMessage.data?.groupName as string) || 'Group',
            expenseId: remoteMessage.data?.expenseId as string | undefined,
            actorId: 'other',
            actorName: 'Group Mate',
            createdAt: Date.now(),
          };
          showBanner(fakeNotif);
        }
      });
    } catch (e) {
      console.log('Foreground FCM listener setup note:', e);
    }

    return () => {
      unsubscribeFirestore();
      if (unsubscribeFCM) unsubscribeFCM();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [user?.uid]);

  if (!currentNotif) return null;

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          top: Math.max(insets.top, 12),
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          dismissBanner();
          if (onPressNotification && currentNotif) {
            onPressNotification(currentNotif);
          }
        }}
        style={styles.bannerCard}
      >
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>
            {currentNotif.type === 'settlement_recorded'
              ? '🤝'
              : currentNotif.type === 'member_joined'
              ? '👋'
              : '💰'}
          </Text>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.titleText} numberOfLines={1}>
              {currentNotif.title}
            </Text>
            <Text style={styles.timeTag}>Just now</Text>
          </View>
          <Text style={styles.bodyText} numberOfLines={2}>
            {currentNotif.body}
          </Text>
        </View>

        <TouchableOpacity
          onPress={dismissBanner}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeBtn}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    elevation: 999,
  },
  bannerCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  contentContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  timeTag: {
    fontSize: 10,
    color: '#38BDF8',
    fontWeight: '600',
    marginLeft: 6,
  },
  bodyText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  closeBtn: {
    paddingLeft: 10,
    paddingVertical: 4,
  },
  closeText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
});
