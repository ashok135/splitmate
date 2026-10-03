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
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useGroups } from '../../hooks/useGroups';
import { useExpenses } from '../../hooks/useExpenses';
import { BalanceCard } from '../../components/BalanceCard';
import { ExpenseCard } from '../../components/ExpenseCard';
import { Button } from '../../components/Button';
import { MemberAvatar } from '../../components/MemberAvatar';
import { formatINR } from '../../utils/currency';

type GroupDetailsRouteProp = RouteProp<RootStackParamList, 'GroupDetails'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

export const GroupDetailsScreen = () => {
  const route = useRoute<GroupDetailsRouteProp>();
  const navigation = useNavigation<NavProp>();
  const { groupId } = route.params;

  const { user, updateDefaultGroup } = useAuth();
  const { groups, fetchMembers, members } = useGroups();
  const group = groups.find((g) => g.groupId === groupId);
  const groupMembers = members[groupId] || [];

  const { expenses, settlements, balances, debts, refreshGroupData, loading } = useExpenses(groupId);
  const [refreshing, setRefreshing] = useState(false);

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
  const userBalance = user?.uid && balances[user.uid] ? balances[user.uid].netBalance : 0;
  const totalGroupExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} />}
      >
        {/* Top Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.titleRow}>
            <Text style={styles.groupName}>{group?.name || 'Group Details'}</Text>
            {isDefault ? (
              <View style={styles.defaultPill}>
                <Text style={styles.defaultPillText}>DEFAULT</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.setDefaultBtn}
                onPress={() => updateDefaultGroup(groupId)}
              >
                <Text style={styles.setDefaultText}>Set as Default</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Invite Code row */}
          <View style={styles.codeRow}>
            <Text style={styles.codeLabel}>Invite Code:</Text>
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>{group?.inviteCode || '...'}</Text>
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
          totalPaid={user?.uid ? balances[user.uid]?.totalPaid : undefined}
          totalOwed={user?.uid ? balances[user.uid]?.totalOwed : undefined}
          groupName={`Total Expenses: ${formatINR(totalGroupExpenses)}`}
        />

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Button
            title="+ Add Expense"
            onPress={() => navigation.navigate('AddExpense', { groupId })}
            style={styles.addBtn}
          />
          <Button
            title="Settle Up"
            variant="outline"
            onPress={() => navigation.navigate('Settlement', { groupId })}
            style={styles.settleBtn}
          />
        </View>

        {/* Who Owes Whom (Simplified Debts) */}
        {debts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Who Owes Whom</Text>
            <View style={styles.debtCard}>
              {debts.map((debt, index) => {
                const isUserDebtor = debt.fromUserId === user?.uid;
                const isUserCreditor = debt.toUserId === user?.uid;

                return (
                  <View key={`${debt.fromUserId}_${debt.toUserId}_${index}`} style={styles.debtRow}>
                    <View style={styles.debtInfo}>
                      <Text style={styles.debtNames}>
                        <Text style={isUserDebtor ? styles.boldName : null}>
                          {isUserDebtor ? 'You' : debt.fromName}
                        </Text>
                        {' owes '}
                        <Text style={isUserCreditor ? styles.boldName : null}>
                          {isUserCreditor ? 'you' : debt.toName}
                        </Text>
                      </Text>
                    </View>
                    <View style={styles.debtAction}>
                      <Text style={styles.debtAmount}>{formatINR(debt.amount)}</Text>
                      {isUserDebtor && (
                        <TouchableOpacity
                          style={styles.payBtn}
                          onPress={() =>
                            navigation.navigate('Settlement', {
                              groupId,
                              toUserId: debt.toUserId,
                              suggestedAmount: debt.amount,
                            })
                          }
                        >
                          <Text style={styles.payBtnText}>Pay</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Expenses List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Expenses ({expenses.length})</Text>
          </View>

          {expenses.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No expenses yet. Tap "+ Add Expense" above!</Text>
            </View>
          ) : (
            expenses.map((expense) => {
              const payer = groupMembers.find((m) => m.uid === expense.paidBy);
              return (
                <ExpenseCard
                  key={expense.expenseId}
                  expense={expense}
                  payerName={payer?.displayName}
                  isCurrentUserPayer={expense.paidBy === user?.uid}
                  onPress={() =>
                    navigation.navigate('ExpenseDetails', {
                      groupId,
                      expenseId: expense.expenseId,
                    })
                  }
                />
              );
            })
          )}
        </View>

        {/* Settlements History */}
        {settlements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settlements History</Text>
            {settlements.map((s) => {
              const from = groupMembers.find((m) => m.uid === s.fromUserId)?.displayName || 'Member';
              const to = groupMembers.find((m) => m.uid === s.toUserId)?.displayName || 'Member';
              return (
                <View key={s.settlementId} style={styles.settlementItem}>
                  <Text style={styles.settlementText}>
                    🤝 <Text style={styles.boldText}>{from}</Text> paid{' '}
                    <Text style={styles.boldText}>{to}</Text> {formatINR(s.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
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
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  payBtnText: {
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
});
