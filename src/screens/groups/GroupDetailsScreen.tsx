import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useGroups } from '../../hooks/useGroups';
import { useExpenses } from '../../hooks/useExpenses';
import { BalanceCard } from '../../components/BalanceCard';
import { Button } from '../../components/Button';
import { MemberAvatar } from '../../components/MemberAvatar';
import { Icon } from '../../components/Icon';
import { monthlyLedgerService } from '../../services/monthlyLedgerService';
import { calculateBalances, simplifyDebts } from '../../utils/splitCalculator';
import { formatINR } from '../../utils/currency';

type GroupDetailsRouteProp = RouteProp<RootStackParamList, 'GroupDetails'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

// ─── Skeleton Loader ────────────────────────────────────────────────────────
const SkeletonBox = ({ width, height, style }: { width?: number | string; height: number; style?: any }) => {
  const anim = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  return (
    <Animated.View
      style={[
        { width: width || '100%', height, borderRadius: 10, backgroundColor: '#E2E8F0', opacity: anim },
        style,
      ]}
    />
  );
};

const GroupDetailsSkeleton = () => (
  <ScrollView contentContainerStyle={skeletonStyles.wrap}>
    <View style={skeletonStyles.card}>
      <SkeletonBox height={24} width="60%" style={{ marginBottom: 12 }} />
      <SkeletonBox height={16} width="40%" style={{ marginBottom: 16 }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[1, 2, 3].map((i) => <SkeletonBox key={i} width={36} height={36} style={{ borderRadius: 18 }} />)}
      </View>
    </View>
    <SkeletonBox height={100} style={{ marginBottom: 12 }} />
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
      <SkeletonBox height={46} style={{ flex: 2 }} />
      <SkeletonBox height={46} style={{ flex: 1 }} />
    </View>
    {[1, 2, 3].map((i) => <SkeletonBox key={i} height={72} style={{ marginBottom: 10 }} />)}
  </ScrollView>
);

const skeletonStyles = StyleSheet.create({
  wrap: { padding: 18, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 12 },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
import { MonthlyHistoryList } from '../../components/MonthlyHistoryList';
import { MonthlyReportModal } from '../../components/MonthlyReportModal';
import { Modal } from 'react-native';

export const GroupDetailsScreen = () => {
  const route = useRoute<GroupDetailsRouteProp>();
  const navigation = useNavigation<NavProp>();
  const { groupId } = route.params;

  const { user, updateDefaultGroup } = useAuth();
  const { groups, fetchMembers, members, deleteGroup } = useGroups();
  const group = groups.find((g) => g.groupId === groupId);
  const groupMembers = members[groupId] || [];

  const { expenses, settlements, refreshGroupData, loading } = useExpenses(groupId);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Month-isolated ledger calculations (Current Month)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentMonthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const currentMonthExpenses = useMemo(() => {
    return monthlyLedgerService.filterByMonth(expenses, currentYear, currentMonth);
  }, [expenses, currentYear, currentMonth]);

  const currentMonthSettlements = useMemo(() => {
    return monthlyLedgerService.filterByMonth(settlements, currentYear, currentMonth);
  }, [settlements, currentYear, currentMonth]);

  const currentMonthBalances = useMemo(() => {
    return calculateBalances(groupMembers, currentMonthExpenses, currentMonthSettlements);
  }, [groupMembers, currentMonthExpenses, currentMonthSettlements]);

  const currentMonthDebts = useMemo(() => {
    return simplifyDebts(currentMonthBalances);
  }, [currentMonthBalances]);

  useEffect(() => {
    fetchMembers(groupId).then((mList) => {
      refreshGroupData(groupId, mList);
    });
  }, [groupId, fetchMembers, refreshGroupData]);

  const onRefresh = async () => {
    setRefreshing(true);
    const mList = await fetchMembers(groupId);
    await refreshGroupData(groupId, mList);
    setRefreshing(false);
  };

  const isDefault = user?.defaultGroupId === groupId;
  // If createdBy matches user.uid or is not explicitly set, allow creator actions
  const isOwner = !group?.createdBy || group?.createdBy === user?.uid;
  const userBalance = user?.uid && currentMonthBalances[user.uid] ? currentMonthBalances[user.uid].netBalance : 0;

  const totalGroupExpenses = useMemo(() => {
    return currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [currentMonthExpenses]);

  const handleDeleteGroup = () => {
    setMenuVisible(false);
    Alert.alert(
      'Delete Group',
      `Are you sure you want to permanently delete "${group?.name}"? All expenses, settlements, and balances will be removed. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteGroup(groupId);
              Alert.alert('Group Deleted', `"${group?.name || 'Group'}" was deleted successfully.`);
              navigation.reset({ index: 0, routes: [{ name: 'MainTabs' as any }] });
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete group');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleCopyInviteCode = () => {
    setMenuVisible(false);
    if (group?.inviteCode) {
      Alert.alert('Invite Code', `Share this code with friends: ${group.inviteCode}`);
    }
  };

  if (loading && expenses.length === 0 && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <GroupDetailsSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Top Header Card with 3-Dot Menu */}
        <View style={styles.headerCard}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.groupName} numberOfLines={2}>
                {group?.name || 'Group Details'}
              </Text>
              <View style={styles.ownerBadgeRow}>
                {isOwner && <Icon name="shield" size={13} color="#0284C7" />}
                <Text style={styles.groupCreatedText}>
                  {isOwner ? ' You are the Group Creator' : 'Group Member'}
                </Text>
              </View>
            </View>

            {/* Prominent 3-Dot Button */}
            <TouchableOpacity
              style={styles.threeDotBtn}
              onPress={() => setMenuVisible(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Icon name="more-vertical" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* Quick Info Bar */}
          <View style={styles.metaRow}>
            {isDefault ? (
              <View style={styles.defaultPill}>
                <Icon name="star" size={11} color="#0284C7" />
                <Text style={styles.defaultPillText}> DEFAULT GROUP</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.setDefaultBtn}
                onPress={() => updateDefaultGroup(groupId)}
              >
                <Text style={styles.setDefaultText}>Set as Default</Text>
              </TouchableOpacity>
            )}

            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>Code: {group?.inviteCode || '...'}</Text>
            </View>
          </View>

          {/* Members Bar */}
          <TouchableOpacity
            style={styles.membersRow}
            onPress={() => navigation.navigate('Members', { groupId })}
          >
            <View style={styles.avatarStack}>
              {groupMembers.slice(0, 4).map((m, idx) => (
                <View key={m.uid} style={[styles.avatarWrapper, { marginLeft: idx > 0 ? -10 : 0 }]}>
                  <MemberAvatar name={m.displayName} size={30} />
                </View>
              ))}
            </View>
            <Text style={styles.membersCountText}>
              {groupMembers.length} {groupMembers.length === 1 ? 'member' : 'members'} →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <BalanceCard
          netBalance={userBalance}
          totalPaid={user?.uid ? (currentMonthBalances[user.uid]?.expensePaid ?? currentMonthBalances[user.uid]?.totalPaid) : undefined}
          totalOwed={user?.uid ? (currentMonthBalances[user.uid]?.expenseShare ?? currentMonthBalances[user.uid]?.totalOwed) : undefined}
          groupName={`${currentMonthLabel} • Total: ${formatINR(totalGroupExpenses)}`}
        />

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Button
            title="+ Add Expense"
            onPress={() => navigation.navigate('AddExpense', { groupId })}
            style={styles.addBtn}
          />
          <Button
            title={userBalance > 0 ? 'Receive Payment' : userBalance < 0 ? 'Pay Dues' : 'Transfer'}
            variant="outline"
            onPress={() =>
              navigation.navigate('Settlement', {
                groupId,
                ...(userBalance > 0 ? { toUserId: user?.uid } : userBalance < 0 ? { fromUserId: user?.uid } : {}),
              })
            }
            style={styles.settleBtn}
          />
        </View>

        {/* Who Owes Whom (Simplified Debts for Current Month) */}
        {currentMonthDebts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Who Owes Whom ({currentMonthLabel})</Text>
            <View style={styles.debtCard}>
              {currentMonthDebts.map((debt, index) => {
                const isUserDebtor = debt.fromUserId === user?.uid;
                const isUserCreditor = debt.toUserId === user?.uid;

                return (
                  <View key={`${debt.fromUserId}_${debt.toUserId}_${index}`} style={styles.debtRow}>
                    <View style={styles.debtInfo}>
                      <Text style={styles.debtNames}>
                        <Text style={isUserDebtor ? styles.boldName : undefined}>
                          {isUserDebtor ? 'You' : debt.fromName}
                        </Text>
                        {' owes '}
                        <Text style={isUserCreditor ? styles.boldName : undefined}>
                          {isUserCreditor ? 'you' : debt.toName}
                        </Text>
                      </Text>
                    </View>
                    <View style={styles.debtAction}>
                      <Text style={styles.debtAmount}>{formatINR(debt.amount)}</Text>
                      {isUserDebtor ? (
                        <TouchableOpacity
                          style={styles.payBtn}
                          onPress={() =>
                            navigation.navigate('Settlement', {
                              groupId,
                              fromUserId: user?.uid,
                              toUserId: debt.toUserId,
                              suggestedAmount: debt.amount,
                            })
                          }
                        >
                          <Text style={styles.payBtnText}>Pay</Text>
                        </TouchableOpacity>
                      ) : isUserCreditor ? (
                        <TouchableOpacity
                          style={styles.receivedBtn}
                          onPress={() =>
                            navigation.navigate('Settlement', {
                              groupId,
                              fromUserId: debt.fromUserId,
                              toUserId: user?.uid,
                              suggestedAmount: debt.amount,
                            })
                          }
                        >
                          <Text style={styles.receivedBtnText}>Received</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Google Pay Style Monthly Grouped Transaction History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Monthly History</Text>
            <Text style={styles.countText}>{expenses.length} expenses</Text>
          </View>

          <MonthlyHistoryList
            expenses={expenses}
            settlements={settlements}
            members={groupMembers}
            currentUserId={user?.uid}
            onPressExpense={(expense) =>
              navigation.navigate('ExpenseDetails', {
                groupId,
                expenseId: expense.expenseId,
              })
            }
          />
        </View>
      </ScrollView>

      {/* 3-Dot Options Modal / Bottom Sheet */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalGroupTitle}>{group?.name || 'Group Options'}</Text>
              <Text style={styles.modalGroupSub}>Manage group settings & options</Text>
            </View>

            {/* Menu Items */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('Members', { groupId });
              }}
            >
              <View style={styles.menuIconWrap}>
                <Icon name="users" size={20} color="#475569" />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={styles.menuItemTitle}>View & Add Members</Text>
                <Text style={styles.menuItemSub}>{groupMembers.length} active flatmates</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleCopyInviteCode}
            >
              <View style={styles.menuIconWrap}>
                <Icon name="copy" size={20} color="#475569" />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={styles.menuItemTitle}>Copy Invite Code</Text>
                <Text style={styles.menuItemSub}>Code: {group?.inviteCode || 'N/A'}</Text>
              </View>
            </TouchableOpacity>

            {!isDefault && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  updateDefaultGroup(groupId);
                }}
              >
                <View style={styles.menuIconWrap}>
                  <Icon name="star" size={20} color="#475569" />
                </View>
                <View style={styles.menuItemTextCol}>
                  <Text style={styles.menuItemTitle}>Set as Default Group</Text>
                  <Text style={styles.menuItemSub}>Show on Home Screen</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Monthly Report & Day 1 Reminder */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setShowReportModal(true);
              }}
            >
              <View style={styles.menuIconWrap}>
                <Icon name="file-text" size={20} color="#475569" />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={styles.menuItemTitle}>Monthly Report & Day-1 Reminders</Text>
                <Text style={styles.menuItemSub}>Full statement & WhatsApp reminder</Text>
              </View>
            </TouchableOpacity>

            {/* Delete Group Button */}
            <TouchableOpacity
              style={[styles.menuItem, styles.deleteMenuItem]}
              onPress={handleDeleteGroup}
              disabled={deleting}
            >
              <View style={styles.menuIconWrap}>
                <Icon name="trash-2" size={20} color="#DC2626" />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={styles.deleteMenuTitle}>Delete Group</Text>
                <Text style={styles.deleteMenuSub}>Permanently delete all expenses & data</Text>
              </View>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelMenuItem}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.cancelMenuText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Monthly Report Modal */}
      {group && (
        <MonthlyReportModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          groupName={group.name}
          groupId={groupId}
          currentUserId={user?.uid}
          members={groupMembers}
          expenses={expenses}
          settlements={settlements}
          onMonthClosed={onRefresh}
        />
      )}
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
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  groupName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  defaultPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defaultPillText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '700',
  },
  setDefaultBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  setDefaultText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  ownerBadge: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ownerBadgeText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '600',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  codeLabel: {
    fontSize: 13,
    color: '#64748B',
    marginRight: 6,
  },
  codeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  membersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 16,
  },
  membersCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284C7',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  addBtn: {
    flex: 2,
  },
  settleBtn: {
    flex: 1,
  },
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  debtCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  debtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  debtInfo: {
    flex: 1,
  },
  debtNames: {
    fontSize: 14,
    color: '#334155',
  },
  boldName: {
    fontWeight: '700',
    color: '#0F172A',
  },
  debtAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  debtAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  payBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  receivedBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  receivedBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  settlementItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  settlementText: {
    fontSize: 13,
    color: '#334155',
  },
  boldText: {
    fontWeight: '600',
    color: '#0F172A',
  },
  threeDotBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  threeDotIcon: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 24,
  },
  groupCreatedText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 10,
  },
  countText: {
    fontSize: 12,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  modalGroupTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalGroupSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  ownerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  menuIconWrap: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  menuItemIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  menuItemTextCol: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  menuItemSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  deleteMenuItem: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginVertical: 8,
    borderBottomWidth: 0,
  },
  deleteMenuTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
  },
  deleteMenuSub: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 1,
  },
  cancelMenuItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  cancelMenuText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
});
