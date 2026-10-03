import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { notificationService } from '../../services/notificationService';
import { AppNotification } from '../../types/notification';
import { NotificationCard } from '../../components/NotificationCard';
import { EmptyState } from '../../components/EmptyState';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export const NotificationsScreen = () => {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);
    const unsubscribe = notificationService.subscribeToUserNotificationsList(
      user.uid,
      (list) => {
        setNotifications(list);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.uid]);

  const onRefresh = async () => {
    if (!user?.uid) return;
    try {
      setRefreshing(true);
      const list = await notificationService.getNotifications(user.uid);
      setNotifications(list);
    } catch (e) {
      console.warn('Failed to refresh notifications:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleNotificationPress = async (item: AppNotification) => {
    if (user) {
      await notificationService.markNotificationAsRead(item.notificationId, user.uid);
    }

    if (item.expenseId && item.groupId) {
      navigation.navigate('ExpenseDetails', {
        groupId: item.groupId,
        expenseId: item.expenseId,
      });
    } else if (item.groupId) {
      navigation.navigate('GroupDetails', {
        groupId: item.groupId,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity & Alerts</Text>
        <Text style={styles.subtitle}>Real-time updates on group expenses and settlements</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && notifications.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0F172A" />
            <Text style={styles.loadingText}>Loading activity...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <EmptyState
            iconName="bell"
            title="All Caught Up!"
            description="You have no new notifications. Activity from other group members will show up here."
          />
        ) : (
          notifications.map((item) => (
            <NotificationCard
              key={item.notificationId}
              notification={item}
              onPress={() => handleNotificationPress(item)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
});
