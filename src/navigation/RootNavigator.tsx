import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { NotificationBanner } from '../components/NotificationBanner';
import { UpdateModal } from '../components/UpdateModal';
import { AppNotification } from '../types/notification';
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const RootNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  const handleNotificationPress = (notif: AppNotification) => {
    if (!navigationRef.isReady()) return;

    if (notif.expenseId && notif.groupId) {
      navigationRef.navigate('ExpenseDetails', {
        groupId: notif.groupId,
        expenseId: notif.expenseId,
      });
    } else if (notif.groupId) {
      navigationRef.navigate('GroupDetails', {
        groupId: notif.groupId,
        groupName: notif.groupName,
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashLogo}>SplitMate</Text>
        <ActivityIndicator size="large" color="#0F172A" style={styles.loader} />
        <Text style={styles.splashSubtitle}>Fair & Free Group Expense Sharing</Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={DefaultTheme}>
      {isAuthenticated ? (
        <>
          <AppNavigator />
          <NotificationBanner onPressNotification={handleNotificationPress} />
        </>
      ) : (
        <AuthNavigator />
      )}
      <UpdateModal />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  loader: {
    marginVertical: 16,
  },
  splashSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
});
