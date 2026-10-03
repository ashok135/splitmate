import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useGroups } from '../../hooks/useGroups';
import { groupService } from '../../services/groupService';
import { MemberAvatar } from '../../components/MemberAvatar';
import { GroupMember } from '../../types/group';
import Icon from 'react-native-vector-icons/Feather';

type MembersRouteProp = RouteProp<RootStackParamList, 'Members'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

export const MembersScreen = () => {
  const route = useRoute<MembersRouteProp>();
  const navigation = useNavigation<NavProp>();
  const { groupId } = route.params;

  const { user } = useAuth();
  const { groups, fetchMembers, members, leaveGroup } = useGroups();
  const group = groups.find((g) => g.groupId === groupId);
  const memberList: GroupMember[] = members[groupId] || [];
  const [leaving, setLeaving] = useState(false);

  const currentUserMember = memberList.find((m) => m.uid === user?.uid);
  const isOwner = Boolean(
    (group?.createdBy && user?.uid && group.createdBy === user.uid) ||
    currentUserMember?.role === 'owner'
  );
  const isOwnerOrAdmin = isOwner || currentUserMember?.role === 'admin';

  useEffect(() => {
    fetchMembers(groupId);
  }, [groupId, fetchMembers]);

  const handleRemoveMember = (targetMember: GroupMember) => {
    if (targetMember.uid === user?.uid) {
      Alert.alert('Cannot Remove', 'Use the "Leave Group" button below to exit this group.');
      return;
    }

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${targetMember.displayName} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupService.removeMember(groupId, targetMember.uid);
              await fetchMembers(groupId);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not remove member');
            }
          },
        },
      ]
    );
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave "${group?.name || 'this group'}"? You will no longer share expenses with this group.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Group',
          style: 'destructive',
          onPress: async () => {
            try {
              setLeaving(true);
              await leaveGroup(groupId);
              Alert.alert('Left Group', `You have left "${group?.name || 'this group'}".`);
              navigation.reset({ index: 0, routes: [{ name: 'MainTabs' as any }] });
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not leave group');
            } finally {
              setLeaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Invite Code Share Card */}
        <View style={styles.inviteCard}>
          <Text style={styles.inviteTitle}>Invite Friends</Text>
          <Text style={styles.inviteSubtitle}>
            Share this code to let anyone join {group?.name || 'this group'}
          </Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{group?.inviteCode || '...'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Members ({memberList.length})
        </Text>

        <View style={styles.card}>
          {memberList.map((member) => {
            const isSelf = member.uid === user?.uid;
            return (
              <View key={member.uid} style={styles.memberRow}>
                <MemberAvatar name={member.displayName} size={42} />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {member.displayName} {isSelf ? '(You)' : ''}
                  </Text>
                  {member.email ? <Text style={styles.memberEmail}>{member.email}</Text> : null}
                </View>

                <View style={styles.rightSide}>
                  <View
                    style={[
                      styles.roleBadge,
                      member.role === 'owner' ? styles.ownerBadge : styles.memberBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBadgeText,
                        member.role === 'owner' ? styles.ownerBadgeText : styles.memberBadgeText,
                      ]}
                    >
                      {member.role.toUpperCase()}
                    </Text>
                  </View>

                  {isOwnerOrAdmin && !isSelf && member.role !== 'owner' && (
                    <TouchableOpacity
                      onPress={() => handleRemoveMember(member)}
                      style={styles.removeBtn}
                    >
                      <Text style={styles.removeText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Leave Group Action Button */}
        {(!isOwner || memberList.length > 1) && (
          <TouchableOpacity
            style={styles.leaveGroupBtn}
            onPress={handleLeaveGroup}
            disabled={leaving}
            activeOpacity={0.8}
          >
            {leaving ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <>
                <Icon name="log-out" size={18} color="#DC2626" style={{ marginRight: 8 }} />
                <Text style={styles.leaveGroupText}>Leave Group</Text>
              </>
            )}
          </TouchableOpacity>
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
  scrollContent: {
    padding: 18,
  },
  inviteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 20,
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  inviteSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
  },
  codeBox: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingHorizontal: 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  memberInfo: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  memberEmail: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ownerBadge: {
    backgroundColor: '#FEF3C7',
  },
  memberBadge: {
    backgroundColor: '#F1F5F9',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  ownerBadgeText: {
    color: '#B45309',
  },
  memberBadgeText: {
    color: '#64748B',
  },
  removeBtn: {
    padding: 6,
  },
  removeText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  leaveGroupBtn: {
    marginTop: 24,
    marginBottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 14,
    borderRadius: 14,
  },
  leaveGroupText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '700',
  },
});
