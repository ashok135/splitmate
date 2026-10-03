import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useGroups } from '../../hooks/useGroups';
import { GroupCard } from '../../components/GroupCard';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export const GroupsScreen = () => {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();
  const { groups, fetchUserGroups, loading } = useGroups();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUserGroups();
  }, [fetchUserGroups]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserGroups();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Groups</Text>
        <Text style={styles.headerSubtitle}>Manage trips, housemates, and shared tabs</Text>
      </View>

      <View style={styles.actionButtons}>
        <Button
          title="+ Create Group"
          onPress={() => navigation.navigate('CreateGroup')}
          style={styles.actionBtn}
        />
        <Button
          title="Join with Code"
          variant="outline"
          onPress={() => navigation.navigate('JoinGroup')}
          style={styles.actionBtn}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {groups.length === 0 ? (
          <EmptyState
            iconName="users"
            title="No Groups Found"
            description="Create your first group or enter an invite code to join an existing group."
            actionTitle="Create Group"
            onAction={() => navigation.navigate('CreateGroup')}
          />
        ) : (
          groups.map((group) => (
            <GroupCard
              key={group.groupId}
              group={group}
              isDefault={user?.defaultGroupId === group.groupId}
              onPress={() =>
                navigation.navigate('GroupDetails', {
                  groupId: group.groupId,
                  groupName: group.name,
                })
              }
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
});
