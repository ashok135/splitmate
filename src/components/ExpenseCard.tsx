import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Expense } from '../types/expense';
import { formatINR } from '../utils/currency';
import { format } from 'date-fns';

interface ExpenseCardProps {
  expense: Expense;
  payerName?: string;
  isCurrentUserPayer?: boolean;
  onPress: () => void;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({
  expense,
  payerName,
  isCurrentUserPayer = false,
  onPress,
}) => {
  const formattedDate = expense.createdAt
    ? format(new Date(expense.createdAt), 'dd MMM, hh:mm a')
    : '';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.leftColumn}>
        <View style={styles.titleRow}>
          <Text style={styles.description} numberOfLines={1}>
            {expense.merchant || expense.description || 'Expense'}
          </Text>
          {expense.source === 'bank_sms' && (
            <View style={styles.smsBadge}>
              <Text style={styles.smsBadgeText}>SMS</Text>
            </View>
          )}
        </View>

        <Text style={styles.metaText}>
          {isCurrentUserPayer ? 'You paid' : `${payerName || 'Member'} paid`} • {formattedDate}
        </Text>
      </View>

      <View style={styles.rightColumn}>
        <Text style={styles.amountText}>{formatINR(expense.amount)}</Text>
        <Text style={styles.splitTypeText}>{expense.splitType} split</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginVertical: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  leftColumn: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  description: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginRight: 6,
  },
  smsBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  smsBadgeText: {
    color: '#D97706',
    fontSize: 9,
    fontWeight: '700',
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },
  rightColumn: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  splitTypeText: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'capitalize',
  },
});
