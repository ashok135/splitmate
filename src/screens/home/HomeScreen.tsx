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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useGroups } from '../../hooks/useGroups';
import { useExpenses } from '../../hooks/useExpenses';
import { BalanceCard } from '../../components/BalanceCard';
import { ExpenseCard } from '../../components/ExpenseCard';
import { GroupCard } from '../../components/GroupCard';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { smsService } from '../../services/smsService';
import { Icon } from '../../components/Icon';
import { ParsedTransaction } from '../../types/sms';
import { calculateEqualSplit } from '../../utils/splitCalculator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen = () => {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();
  const { groups, fetchUserGroups, fetchMembers, members } = useGroups();
  const [refreshing, setRefreshing] = useState(false);
  const [detectedTx, setDetectedTx] = useState<ParsedTransaction | null>(null);

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
  const { expenses, balances, refreshGroupData, createExpense } = useExpenses(defaultGroupId);

  // User's balance in default group
  const userBalance = user?.uid && balances[user.uid] ? balances[user.uid].netBalance : 0;
  const totalPaid = user?.uid && balances[user.uid] ? balances[user.uid].totalPaid : 0;
  const totalOwed = user?.uid && balances[user.uid] ? balances[user.uid].totalOwed : 0;

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.displayName?.split(' ')[0] || 'there'}</Text>
            <Text style={styles.subGreeting}>Here's your expense summary</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsIconBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <Icon name="settings" size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* SMS Transaction Detection Banner (If detected) */}
        {detectedTx && defaultGroup && (
          <View style={styles.txAlertCard}>
            <View style={styles.txAlertHeader}>
              <Text style={styles.txAlertTitle}>Transaction detected</Text>
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
                title="ADD"
                size="sm"
                onPress={() => handleQuickAdd(detectedTx)}
                style={styles.txActionBtn}
              />
              <Button
                title="VIEW / EDIT"
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

        {/* Net Balance Card */}
        {defaultGroup ? (
          <BalanceCard
            netBalance={userBalance}
            totalPaid={totalPaid}
            totalOwed={totalOwed}
            groupName={defaultGroup.name}
          />
        ) : null}

        {/* Quick Add Expense Action */}
        {defaultGroup ? (
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
        ) : null}

        {/* Default Group Section */}
        {defaultGroup ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Default Group</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('GroupDetails', {
                    groupId: defaultGroup.groupId,
                    groupName: defaultGroup.name,
                  })
                }
              >
                <Text style={styles.seeAllText}>Manage Group →</Text>
              </TouchableOpacity>
            </View>
            <GroupCard
              group={defaultGroup}
              isDefault={true}
              onPress={() =>
                navigation.navigate('GroupDetails', {
                  groupId: defaultGroup.groupId,
                  groupName: defaultGroup.name,
                })
              }
            />
          </View>
        ) : (
          <EmptyState
            iconName="users"
            title="No Groups Yet"
            description="Create or join a group to start splitting expenses with friends, family, or flatmates."
            actionTitle="Create Group"
            onAction={() => navigation.navigate('CreateGroup')}
          />
        )}

        {/* Recent Expenses List */}
        {defaultGroup && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Expenses</Text>
              <Text style={styles.countText}>{expenses.length} total</Text>
            </View>

            {expenses.length === 0 ? (
              <View style={styles.noExpensesCard}>
                <Text style={styles.noExpensesText}>No expenses recorded yet in this group.</Text>
              </View>
            ) : (
              expenses.slice(0, 5).map((expense) => {
                const payer = groupMembers.find((m) => m.uid === expense.paidBy);
                return (
                  <ExpenseCard
                    key={expense.expenseId}
                    expense={expense}
                    payerName={payer?.displayName}
                    isCurrentUserPayer={expense.paidBy === user?.uid}
                    onPress={() =>
                      navigation.navigate('ExpenseDetails', {
                        groupId: expense.groupId,
                        expenseId: expense.expenseId,
                      })
                    }
                  />
                );
              })
            )}
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
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  subGreeting: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  settingsIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gearIcon: {
    fontSize: 18,
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
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284C7',
  },
  countText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  noExpensesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  noExpensesText: {
    color: '#94A3B8',
    fontSize: 14,
  },
});
