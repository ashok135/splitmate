import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatINR } from '../utils/currency';

interface BalanceCardProps {
  netBalance: number;
  totalPaid?: number;
  totalOwed?: number;
  groupName?: string;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  netBalance,
  totalPaid,
  totalOwed,
  groupName,
}) => {
  const isPositive = netBalance > 0.01;
  const isNegative = netBalance < -0.01;

  const getStatusText = (): string => {
    if (isPositive) return 'You are owed';
    if (isNegative) return 'You owe';
    return 'All settled up';
  };

  const getStatusColor = (): string => {
    if (isPositive) return '#10B981'; // Green
    if (isNegative) return '#EF4444'; // Red
    return '#64748B';                // Slate
  };

  return (
    <View style={styles.card}>
      {groupName ? <Text style={styles.groupLabel}>{groupName}</Text> : null}
      <Text style={[styles.statusTitle, { color: getStatusColor() }]}>
        {getStatusText()}
      </Text>
      <Text style={[styles.balanceAmount, { color: getStatusColor() }]}>
        {formatINR(Math.abs(netBalance))}
      </Text>

      {(totalPaid !== undefined || totalOwed !== undefined) && (
        <View style={styles.breakdownRow}>
          {totalPaid !== undefined && (
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Total Paid</Text>
              <Text style={styles.metricValue}>{formatINR(totalPaid)}</Text>
            </View>
          )}

          <View style={styles.metricDivider} />

          {totalOwed !== undefined && (
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Total Share</Text>
              <Text style={styles.metricValue}>{formatINR(totalOwed)}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginVertical: 12,
  },
  groupLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
  },
  metricLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
});
