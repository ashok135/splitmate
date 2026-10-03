import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';

const linking = {
  prefixes: ['splitmate://'],
  config: {
    screens: {
      ExpenseDetails: 'expense/:groupId/:expenseId',
      GroupDetails: 'group/:groupId',
    },
  },
};

export const RootNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashLogo}>💰 SplitMate</Text>
        <ActivityIndicator size="large" color="#0F172A" style={styles.loader} />
        <Text style={styles.splashSubtitle}>Fair & Free Group Expense Sharing</Text>
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
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
