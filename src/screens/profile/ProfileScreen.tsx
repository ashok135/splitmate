import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useGroups } from '../../hooks/useGroups';
import { MemberAvatar } from '../../components/MemberAvatar';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export const ProfileScreen = () => {
  const navigation = useNavigation<NavProp>();
  const { user, logout } = useAuth();
  const { groups } = useGroups();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const defaultGroup = groups.find((g) => g.groupId === user?.defaultGroupId);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View style={styles.userCard}>
          <MemberAvatar name={user?.displayName || 'User'} size={72} />
          <Text style={styles.name}>{user?.displayName || 'User'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{groups.length}</Text>
            <Text style={styles.statLabel}>Active Groups</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber} numberOfLines={1}>
              {defaultGroup ? defaultGroup.name : 'None'}
            </Text>
            <Text style={styles.statLabel}>Default Group</Text>
          </View>
        </View>

        {/* Action Menu */}
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={styles.menuLeft}>
              <Text style={styles.menuIcon}>⚙️</Text>
              <Text style={styles.menuText}>Settings & SMS Detection</Text>
            </View>
            <Text style={styles.menuChevron}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('CreateGroup')}
          >
            <View style={styles.menuLeft}>
              <Text style={styles.menuIcon}>➕</Text>
              <Text style={styles.menuText}>Create New Group</Text>
            </View>
            <Text style={styles.menuChevron}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('JoinGroup')}
          >
            <View style={styles.menuLeft}>
              <Icon name="key" size={18} color="#4F46E5" style={{ marginRight: 12 }} />
              <Text style={styles.menuText}>Join Group with Invite Code</Text>
            </View>
            <Icon name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <Button
          title="Sign Out"
          variant="outline"
          onPress={handleLogout}
          style={styles.logoutBtn}
          textStyle={{ color: '#EF4444' }}
        />

        <Text style={styles.versionText}>SplitMate v2.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  userCard: {
    alignItems: 'center',
    marginVertical: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
  },
  email: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginVertical: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: 10,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  menuChevron: {
    fontSize: 16,
    color: '#94A3B8',
  },
  logoutBtn: {
    width: '100%',
    borderColor: '#FECACA',
  },
  versionText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 24,
  },
});
