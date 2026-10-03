import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useGroups } from '../../hooks/useGroups';
import { useExpenses } from '../../hooks/useExpenses';
import { expenseService } from '../../services/expenseService';
import { Expense } from '../../types/expense';
import { MemberAvatar } from '../../components/MemberAvatar';
import { Button } from '../../components/Button';
import { formatINR } from '../../utils/currency';
import { format } from 'date-fns';

type DetailsRouteProp = RouteProp<RootStackParamList, 'ExpenseDetails'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

export const ExpenseDetailsScreen = () => {
  const route = useRoute<DetailsRouteProp>();
  const navigation = useNavigation<NavProp>();
  const { groupId, expenseId } = route.params;

  const { user } = useAuth();
  const { members, fetchMembers } = useGroups();
  const { refreshGroupData } = useExpenses(groupId);
  const groupMembers = members[groupId] || [];

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const [exp, mList] = await Promise.all([
          expenseService.getExpenseById(groupId, expenseId),
          fetchMembers(groupId),
        ]);
        setExpense(exp);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Could not load expense details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [groupId, expenseId, fetchMembers]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense? Balances will be recalculated.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await expenseService.deleteExpense(groupId, expenseId);
              await refreshGroupData(groupId, groupMembers);
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  if (!expense) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading expense...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const payer = groupMembers.find((m) => m.uid === expense.paidBy);
  const isPayer = user?.uid === expense.paidBy;
  const formattedDate = expense.createdAt
    ? format(new Date(expense.createdAt), 'dd MMMM yyyy, hh:mm a')
    : '';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main Card */}
        <View style={styles.card}>
          <View style={styles.sourceRow}>
            {expense.source === 'bank_sms' ? (
              <View style={styles.smsPill}>
                <Text style={styles.smsPillText}>📱 AUTOMATICALLY DETECTED VIA BANK SMS</Text>
              </View>
            ) : (
              <View style={styles.manualPill}>
                <Text style={styles.manualPillText}>MANUAL ENTRY</Text>
              </View>
            )}
          </View>

          <Text style={styles.amountText}>{formatINR(expense.amount)}</Text>
          <Text style={styles.descriptionText}>
            {expense.merchant || expense.description || 'Expense'}
          </Text>

          {expense.merchant && expense.description && expense.merchant !== expense.description && (
            <Text style={styles.subDescription}>{expense.description}</Text>
          )}

          <Text style={styles.dateText}>{formattedDate}</Text>

          <View style={styles.payerBox}>
            <MemberAvatar name={payer?.displayName || 'User'} size={40} />
            <View style={styles.payerInfo}>
              <Text style={styles.payerLabel}>Paid by</Text>
              <Text style={styles.payerName}>
                {payer?.displayName || 'Unknown member'} {isPayer ? '(You)' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Splits Breakdown Card */}
        <Text style={styles.sectionTitle}>Split Breakdown ({expense.splitType} split)</Text>
        <View style={styles.card}>
          {expense.splits &&
            Object.values(expense.splits).map((split) => {
              const member = groupMembers.find((m) => m.uid === split.userId);
              const isCurrentUser = user?.uid === split.userId;

              return (
                <View key={split.userId} style={styles.splitRow}>
                  <View style={styles.memberLeft}>
                    <MemberAvatar name={member?.displayName || 'User'} size={34} />
                    <View style={styles.memberNameBox}>
                      <Text style={styles.memberName}>
                        {member?.displayName || 'Member'} {isCurrentUser ? '(You)' : ''}
                      </Text>
                      {split.percentage !== undefined && (
                        <Text style={styles.splitPct}>{split.percentage}% share</Text>
                      )}
                    </View>
                  </View>
                  <Text style={styles.splitAmount}>{formatINR(split.amountOwed)}</Text>
                </View>
              );
            })}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Button
            title="Edit Expense"
            variant="outline"
            onPress={() => navigation.navigate('EditExpense', { groupId, expenseId })}
            style={styles.actionBtn}
          />
          <Button
            title="Delete Expense"
            variant="danger"
            onPress={handleDelete}
            style={styles.actionBtn}
          />
        </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#64748B',
    fontSize: 15,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  sourceRow: {
    marginBottom: 12,
  },
  smsPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  smsPillText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '700',
  },
  manualPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  manualPillText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  amountText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  subDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 16,
  },
  payerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  payerInfo: {
    marginLeft: 12,
  },
  payerLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  payerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginLeft: 4,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberNameBox: {
    marginLeft: 10,
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  splitPct: {
    fontSize: 11,
    color: '#94A3B8',
  },
  splitAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
  },
});
