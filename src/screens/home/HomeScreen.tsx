import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useGroups } from '../../hooks/useGroups';
import { useExpenses } from '../../hooks/useExpenses';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { MonthlyHistoryList } from '../../components/MonthlyHistoryList';
import { MonthlyReportModal } from '../../components/MonthlyReportModal';
import { MemberAvatar } from '../../components/MemberAvatar';
import { smsService } from '../../services/smsService';
import { dummyDataService } from '../../services/dummyDataService';
import { Icon } from '../../components/Icon';
import { ParsedTransaction } from '../../types/sms';
import { calculateEqualSplit } from '../../utils/splitCalculator';
import { formatINR } from '../../utils/currency';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen = () => {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();
  const { groups, fetchUserGroups, fetchMembers, members } = useGroups();
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [detectedTx, setDetectedTx] = useState<ParsedTransaction | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Find default group
  const defaultGroup = useMemo(() => {
    if (!groups.length) return null;
    if (user?.defaultGroupId) {
      return groups.find((g) => g.groupId === user.defaultGroupId) || groups[0];
    }
    return groups[0];
  }, [groups, user?.defaultGroupId]);

  const defaultGroupId = defaultGroup?.groupId;
  const groupMembers = defaultGroupId ? members[defaultGroupId] || [] : [];
  const {
    expenses,
    settlements,
    balances,
    debts,
    refreshGroupData,
    createExpense,
    loading: expensesLoading,
  } = useExpenses(defaultGroupId);

  // User's balance in default group
  const userBalance = user?.uid && balances[user.uid] ? balances[user.uid].netBalance : 0;
  const totalPaid = user?.uid && balances[user.uid] ? (balances[user.uid].expensePaid ?? balances[user.uid].totalPaid) : 0;
  const totalOwed = user?.uid && balances[user.uid] ? (balances[user.uid].expenseShare ?? balances[user.uid].totalOwed) : 0;

  // Monthly totals
  const totalGroupExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  // Outstanding debts where current user is debtor (has to pay)
  const myDebtsToPay = useMemo(() => {
    return debts.filter((d) => d.fromUserId === user?.uid);
  }, [debts, user?.uid]);

  // Debts where others owe current user
  const debtsOwedToMe = useMemo(() => {
    return debts.filter((d) => d.toUserId === user?.uid);
  }, [debts, user?.uid]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserGroups();
    if (defaultGroupId) {
      const mList = await fetchMembers(defaultGroupId);
      await refreshGroupData(defaultGroupId, mList);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    fetchUserGroups();
  }, [fetchUserGroups]);

  useEffect(() => {
    if (defaultGroupId) {
      fetchMembers(defaultGroupId).then((mList) => {
        refreshGroupData(defaultGroupId, mList);
      });
    }
  }, [defaultGroupId, fetchMembers, refreshGroupData]);

  // Listen for native SMS transactions
  useEffect(() => {
    const sub = smsService.subscribeToSmsTransactions((tx) => {
      setDetectedTx(tx);
    });
    return () => sub.remove();
  }, []);

  // Quick Add handler for detected transaction
  const handleQuickAdd = async (tx: ParsedTransaction) => {
    if (!defaultGroup || !user || !tx.amount) return;
    try {
      const memberList = groupMembers.length > 0 ? groupMembers : await fetchMembers(defaultGroup.groupId);
      const memberIds = memberList.map((m) => m.uid);
      const splits = calculateEqualSplit(tx.amount, memberIds);

      await createExpense({
        targetGroupId: defaultGroup.groupId,
        groupName: defaultGroup.name,
        amount: tx.amount,
        description: tx.merchant || 'Bank Transaction',
        merchant: tx.merchant || undefined,
        splitType: 'equal',
        splits,
        source: 'bank_sms',
        fingerprint: tx.fingerprint,
        members: memberList,
      });

      setDetectedTx(null);
      Alert.alert('Success', `₹${tx.amount} added to ${defaultGroup.name}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not add transaction');
    }
  };

  // Seed 4-Member Dummy Data
  const handleSeedDemoData = async () => {
    if (!user) return;
    Alert.alert(
      '⚡ Load 4-Member Flatmates Demo',
      'This will create a complete active group "Apartment 402 Flatmates" with 4 members (You, Rahul, Priya, Amit), realistic monthly expenses (Rent, Swiggy, WiFi, Groceries), and settlements.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load Demo Group',
          onPress: async () => {
            try {
              setSeeding(true);
              const group = await dummyDataService.seedFourMemberData(user);
              await fetchUserGroups();
              const mList = await fetchMembers(group.groupId);
              await refreshGroupData(group.groupId, mList);
              Alert.alert('🎉 Demo Loaded!', '4-member group created with full monthly expenses and balances.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to create demo data');
            } finally {
              setSeeding(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              Hello, {user?.displayName?.split(' ')[0] || 'Friend'}
            </Text>
            <Text style={styles.subGreeting}>
              {defaultGroup ? `${defaultGroup.name} • Monthly Overview` : 'Expense & Split Dashboard'}
            </Text>
          </View>

          <View style={styles.headerActionRow}>
            {/* Quick Demo Button */}
            <TouchableOpacity
              style={styles.demoPillBtn}
              onPress={handleSeedDemoData}
              disabled={seeding}
              activeOpacity={0.7}
            >
              {seeding ? (
                <ActivityIndicator size="small" color="#4F46E5" />
              ) : (
                <View style={styles.iconTextInline}>
                  <Icon name="users" size={13} color="#4F46E5" />
                  <Text style={styles.demoPillText}> 4 Members</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingsIconBtn}
              onPress={() => navigation.navigate('Settings')}
            >
              <Icon name="settings" size={20} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        {/* SMS Transaction Detected Banner */}
        {detectedTx && defaultGroup && (
          <View style={styles.txAlertCard}>
            <View style={styles.txAlertHeader}>
              <View style={styles.iconTextInline}>
                <Icon name="bell" size={16} color="#1D4ED8" />
                <Text style={styles.txAlertTitle}> Bank Transaction Detected</Text>
              </View>
              <TouchableOpacity onPress={() => setDetectedTx(null)}>
                <Text style={styles.closeAlert}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.txAlertBody}>
              ₹{detectedTx.amount} spent{detectedTx.merchant ? ` at ${detectedTx.merchant}` : ''}.
              Add to {defaultGroup.name}?
            </Text>
            <View style={styles.txActionRow}>
              <Button
                title="Quick Add"
                size="sm"
                onPress={() => handleQuickAdd(detectedTx)}
                style={styles.txActionBtn}
              />
              <Button
                title="Review & Split"
                size="sm"
                variant="outline"
                onPress={() => {
                  navigation.navigate('AddExpense', {
                    groupId: defaultGroup.groupId,
                    detectedTransaction: detectedTx,
                  });
                  setDetectedTx(null);
                }}
                style={styles.txActionBtn}
              />
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* MAIN HERO CARD: PROMINENT "HOW MUCH YOU HAVE TO PAY" BIG NUMBER */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {defaultGroup ? (
          <View
            style={[
              styles.heroCard,
              userBalance < 0
                ? styles.heroCardOwe
                : userBalance > 0
                ? styles.heroCardReceive
                : styles.heroCardSettled,
            ]}
          >
            {/* Tag / Badge */}
            <View style={styles.heroBadgeRow}>
              <View
                style={[
                  styles.heroBadge,
                  userBalance < 0
                    ? styles.badgeOwe
                    : userBalance > 0
                    ? styles.badgeReceive
                    : styles.badgeSettled,
                ]}
              >
                <View style={styles.iconTextInline}>
                  {userBalance < 0 ? (
                    <Icon name="arrow-up-right" size={13} color="#E11D48" />
                  ) : userBalance > 0 ? (
                    <Icon name="arrow-down-left" size={13} color="#15803D" />
                  ) : (
                    <Icon name="check-circle" size={13} color="#475569" />
                  )}
                  <Text
                    style={[
                      styles.heroBadgeText,
                      userBalance < 0
                        ? styles.badgeTextOwe
                        : userBalance > 0
                        ? styles.badgeTextReceive
                        : styles.badgeTextSettled,
                    ]}
                  >
                    {userBalance < 0
                      ? ' YOU HAVE TO PAY'
                      : userBalance > 0
                      ? ' YOU ARE OWED'
                      : ' ALL SETTLED UP'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('GroupDetails', {
                    groupId: defaultGroup.groupId,
                    groupName: defaultGroup.name,
                  })
                }
              >
                <Text style={styles.heroGroupLink}>{defaultGroup.name} →</Text>
              </TouchableOpacity>
            </View>

            {/* BIG NUMBER DISPLAY */}
            <View style={styles.bigAmountContainer}>
              <Text
                style={[
                  styles.bigAmountNumber,
                  userBalance < 0
                    ? styles.amountOweText
                    : userBalance > 0
                    ? styles.amountReceiveText
                    : styles.amountSettledText,
                ]}
              >
                {userBalance < 0
                  ? formatINR(Math.abs(userBalance))
                  : userBalance > 0
                  ? `+${formatINR(userBalance)}`
                  : '₹0'}
              </Text>
              <Text style={styles.bigAmountSub}>
                {userBalance < 0
                  ? 'Your outstanding balance to clear this month'
                  : userBalance > 0
                  ? 'Total amount friends need to pay you'
                  : 'You have cleared all payments for this month'}
              </Text>
            </View>

            {/* Financial Details Row */}
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatCol}>
                <Text style={styles.heroStatLabel}>You Paid</Text>
                <Text style={styles.heroStatVal}>{formatINR(totalPaid)}</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatCol}>
                <Text style={styles.heroStatLabel}>Your Share</Text>
                <Text style={styles.heroStatVal}>{formatINR(totalOwed)}</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatCol}>
                <Text style={styles.heroStatLabel}>Group Total</Text>
                <Text style={styles.heroStatVal}>{formatINR(totalGroupExpenses)}</Text>
              </View>
            </View>

            {/* Fast Action CTA inside Hero Card */}
            <View style={styles.heroActionRow}>
              {userBalance < 0 ? (
                <TouchableOpacity
                  style={styles.heroSettleBtn}
                  onPress={() => navigation.navigate('Settlement', { groupId: defaultGroup.groupId })}
                  activeOpacity={0.8}
                >
                  <View style={styles.iconTextInline}>
                    <Icon name="check" size={16} color="#FFFFFF" />
                    <Text style={styles.heroSettleBtnText}> Settle Month's Dues</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.heroAddBtn}
                  onPress={() => navigation.navigate('AddExpense', { groupId: defaultGroup.groupId })}
                  activeOpacity={0.8}
                >
                  <View style={styles.iconTextInline}>
                    <Icon name="plus" size={16} color="#FFFFFF" />
                    <Text style={styles.heroAddBtnText}> Add New Expense</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.noGroupHero}>
            <Icon name="users" size={40} color="#64748B" />
            <Text style={styles.noGroupTitle}>No Active Group</Text>
            <Text style={styles.noGroupSub}>
              Create a group or load the 4-member flatmates demo to start tracking and monthly settlements.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Button
                title="Create Group"
                onPress={() => navigation.navigate('CreateGroup')}
                style={{ flex: 1 }}
              />
              <Button
                title="Load 4-Member Demo"
                variant="outline"
                onPress={handleSeedDemoData}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* QUICK ACTION BUTTONS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {defaultGroup && (
          <View style={styles.quickAddRow}>
            <Button
              title="+ Add Expense"
              onPress={() => navigation.navigate('AddExpense', { groupId: defaultGroup.groupId })}
              style={styles.quickAddBtn}
            />
            <Button
              title="Settle Up"
              variant="outline"
              onPress={() => navigation.navigate('Settlement', { groupId: defaultGroup.groupId })}
              style={styles.settleBtn}
            />
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* MONTHLY SETTLEMENT CYCLE ("home setle we do montly once make it") */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {defaultGroup && (
          <View style={styles.monthlySettleCard}>
            <View style={styles.monthlySettleHeader}>
              <View>
                <View style={styles.iconTextInline}>
                  <Icon name="calendar" size={17} color="#4F46E5" />
                  <Text style={styles.monthlySettleTitle}> Monthly Settlement Cycle</Text>
                </View>
                <Text style={styles.monthlySettleSub}>
                  Expenses settled once a month. Clear debts via UPI.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.settleCyclePill}
                onPress={() => navigation.navigate('Settlement', { groupId: defaultGroup.groupId })}
              >
                <Text style={styles.settleCyclePillText}>Settle All →</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Monthly Statement & Day 1 Reminder Button */}
            <TouchableOpacity
              style={styles.monthlyReportPillBtn}
              onPress={() => setShowReportModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.iconTextInline}>
                <Icon name="file-text" size={14} color="#4F46E5" />
                <Text style={styles.monthlyReportPillText}> View Monthly Report & Day-1 Reminders →</Text>
              </View>
            </TouchableOpacity>

            {/* Direct Debts summary */}
            {debts.length > 0 ? (
              <View style={styles.debtsList}>
                {debts.map((d, index) => {
                  const isMeDebtor = d.fromUserId === user?.uid;
                  const isMeCreditor = d.toUserId === user?.uid;
                  return (
                    <View key={`${d.fromUserId}_${d.toUserId}_${index}`} style={styles.debtItem}>
                      <View style={styles.debtItemLeft}>
                        <View style={styles.debtIconWrap}>
                          <Icon
                            name={isMeDebtor ? 'arrow-up-right' : 'arrow-down-left'}
                            size={16}
                            color={isMeDebtor ? '#DC2626' : '#16A34A'}
                          />
                        </View>
                        <View>
                          <Text style={styles.debtItemText}>
                            <Text style={{ fontWeight: '800', color: '#0F172A' }}>
                              {isMeDebtor ? 'You owe ' : `${d.fromName} owes `}
                            </Text>
                            <Text style={{ fontWeight: '800', color: '#0F172A' }}>
                              {isMeCreditor ? 'you' : d.toName}
                            </Text>
                          </Text>
                          <Text style={styles.debtItemSub}>Direct transfer</Text>
                        </View>
                      </View>

                      <View style={styles.debtItemRight}>
                        <Text
                          style={[
                            styles.debtAmountValue,
                            isMeDebtor ? { color: '#DC2626' } : { color: '#16A34A' },
                          ]}
                        >
                          {formatINR(d.amount)}
                        </Text>
                        {isMeDebtor && (
                          <TouchableOpacity
                            style={styles.payNowBtn}
                            onPress={() =>
                              navigation.navigate('Settlement', {
                                groupId: defaultGroup.groupId,
                                toUserId: d.toUserId,
                                suggestedAmount: d.amount,
                              })
                            }
                          >
                            <Text style={styles.payNowBtnText}>Pay</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.noDebtsBox}>
                <View style={styles.iconTextInline}>
                  <Icon name="check-circle" size={15} color="#15803D" />
                  <Text style={styles.noDebtsText}> All flatmates are settled up for this month!</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* FLATMATES / MEMBERS STRIP (4 Members Preview) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {defaultGroup && groupMembers.length > 0 && (
          <View style={styles.membersSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Group Members ({groupMembers.length})</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Members', { groupId: defaultGroup.groupId })}
              >
                <Text style={styles.seeAllText}>Manage Flatmates →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersScroll}>
              {groupMembers.map((m) => {
                const bal = balances[m.uid]?.netBalance || 0;
                const isMe = m.uid === user?.uid;
                return (
                  <View key={m.uid} style={styles.memberChip}>
                    <MemberAvatar name={m.displayName} size={38} />
                    <Text style={styles.memberChipName} numberOfLines={1}>
                      {isMe ? 'You' : m.displayName.split(' ')[0]}
                    </Text>
                    <Text
                      style={[
                        styles.memberChipBal,
                        bal > 0 ? styles.posBal : bal < 0 ? styles.negBal : styles.zeroBal,
                      ]}
                    >
                      {bal > 0 ? `+${formatINR(bal)}` : bal < 0 ? `-${formatINR(Math.abs(bal))}` : '₹0'}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* GPAY STYLE MONTHLY TRANSACTION HISTORY */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {defaultGroup && (
          <View style={styles.historySection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Transaction History</Text>
                <Text style={styles.sectionSub}>Grouped by month like GPay</Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('GroupDetails', {
                    groupId: defaultGroup.groupId,
                    groupName: defaultGroup.name,
                  })
                }
              >
                <Text style={styles.seeAllText}>View All →</Text>
              </TouchableOpacity>
            </View>

            <MonthlyHistoryList
              expenses={expenses}
              settlements={settlements}
              members={groupMembers}
              currentUserId={user?.uid}
              onPressExpense={(expense) =>
                navigation.navigate('ExpenseDetails', {
                  groupId: defaultGroup.groupId,
                  expenseId: expense.expenseId,
                })
              }
            />
          </View>
        )}
      </ScrollView>

      {/* Monthly Report & Statement Modal */}
      {defaultGroup && (
        <MonthlyReportModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          groupName={defaultGroup.name}
          groupId={defaultGroup.groupId}
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
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  subGreeting: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  demoPillBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  demoPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
  },
  settingsIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  txAlertCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    marginBottom: 14,
  },
  txAlertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  txAlertTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  closeAlert: {
    fontSize: 16,
    color: '#64748B',
    padding: 4,
  },
  txAlertBody: {
    fontSize: 13,
    color: '#1E40AF',
    marginBottom: 12,
  },
  txActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  txActionBtn: {
    flex: 1,
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  heroCardOwe: {
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  heroCardReceive: {
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  heroCardSettled: {
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeOwe: {
    backgroundColor: '#FFE4E6',
  },
  badgeReceive: {
    backgroundColor: '#DCFCE7',
  },
  badgeSettled: {
    backgroundColor: '#F1F5F9',
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgeTextOwe: {
    color: '#E11D48',
  },
  badgeTextReceive: {
    color: '#15803D',
  },
  badgeTextSettled: {
    color: '#475569',
  },
  heroGroupLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  bigAmountContainer: {
    marginVertical: 4,
  },
  bigAmountNumber: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1,
  },
  amountOweText: {
    color: '#BE123C', // Rich crimson
  },
  amountReceiveText: {
    color: '#15803D', // Emerald
  },
  amountSettledText: {
    color: '#0F172A',
  },
  bigAmountSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  heroStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  heroStatLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  heroStatVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroActionRow: {
    marginTop: 14,
  },
  heroSettleBtn: {
    backgroundColor: '#E11D48',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  heroSettleBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  heroAddBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  heroAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  noGroupHero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  noGroupIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  noGroupTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  noGroupSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },

  /* Quick Actions */
  quickAddRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickAddBtn: {
    flex: 2,
  },
  settleBtn: {
    flex: 1,
  },

  /* Monthly Settle Up Card */
  monthlySettleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  monthlySettleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthlySettleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  monthlySettleSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  settleCyclePill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  settleCyclePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  debtsList: {
    marginTop: 4,
  },
  debtItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  debtItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  debtIcon: {
    fontSize: 22,
  },
  debtItemText: {
    fontSize: 14,
    color: '#334155',
  },
  debtItemSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  debtItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  debtAmountValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  payNowBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  payNowBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  noDebtsBox: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  noDebtsText: {
    fontSize: 13,
    color: '#15803D',
    fontWeight: '600',
  },

  /* Members section */
  membersSection: {
    marginBottom: 16,
  },
  membersScroll: {
    flexDirection: 'row',
    marginTop: 8,
  },
  memberChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    marginRight: 10,
    width: 86,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  memberChipName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 6,
  },
  memberChipBal: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  posBal: {
    color: '#16A34A',
  },
  negBal: {
    color: '#DC2626',
  },
  zeroBal: {
    color: '#94A3B8',
  },

  /* History section */
  historySection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  iconTextInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debtIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthlyReportPillBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  monthlyReportPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
  },
});
