import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from './types';
import { HomeScreen } from '../screens/home/HomeScreen';
import { GroupsScreen } from '../screens/groups/GroupsScreen';
import { CreateGroupScreen } from '../screens/groups/CreateGroupScreen';
import { JoinGroupScreen } from '../screens/groups/JoinGroupScreen';
import { GroupDetailsScreen } from '../screens/groups/GroupDetailsScreen';
import { MembersScreen } from '../screens/groups/MembersScreen';
import { AddExpenseScreen } from '../screens/expenses/AddExpenseScreen';
import { EditExpenseScreen } from '../screens/expenses/EditExpenseScreen';
import { ExpenseDetailsScreen } from '../screens/expenses/ExpenseDetailsScreen';
import { SettlementScreen } from '../screens/settlements/SettlementScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { SettingsScreen } from '../screens/profile/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#0F172A',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Text style={[styles.tabIcon, { color }]}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="GroupsTab"
        component={GroupsScreen}
        options={{
          tabBarLabel: 'Groups',
          tabBarIcon: ({ color }) => <Text style={[styles.tabIcon, { color }]}>👥</Text>,
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color }) => <Text style={[styles.tabIcon, { color }]}>🔔</Text>,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={[styles.tabIcon, { color }]}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTitleStyle: { fontWeight: '700', color: '#0F172A' },
        headerTintColor: '#0F172A',
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{ title: 'Create Group' }}
      />
      <Stack.Screen
        name="JoinGroup"
        component={JoinGroupScreen}
        options={{ title: 'Join Group' }}
      />
      <Stack.Screen
        name="GroupDetails"
        component={GroupDetailsScreen}
        options={({ route }) => ({ title: route.params.groupName || 'Group Details' })}
      />
      <Stack.Screen
        name="Members"
        component={MembersScreen}
        options={{ title: 'Group Members' }}
      />
      <Stack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{ title: 'Add Expense' }}
      />
      <Stack.Screen
        name="EditExpense"
        component={EditExpenseScreen}
        options={{ title: 'Edit Expense' }}
      />
      <Stack.Screen
        name="ExpenseDetails"
        component={ExpenseDetailsScreen}
        options={{ title: 'Expense Details' }}
      />
      <Stack.Screen
        name="Settlement"
        component={SettlementScreen}
        options={{ title: 'Record Settlement' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    height: 60,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabIcon: {
    fontSize: 20,
  },
});
