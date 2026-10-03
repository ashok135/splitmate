import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Expense, Settlement } from '../types/expense';
import { GroupMember } from '../types/group';
import { formatINR } from '../utils/currency';
import { Icon } from './Icon';

interface HistoryItem {
  id: string;
  type: 'expense' | 'settlement';
  title: string;
  subtitle: string;
  dateStr: string;
  timestamp: number;
  amount: number;
  paidByUid: string;
  paidByName: string;
  isCurrentUserPayer: boolean;
  userShare: number;
  iconName: string;
  iconColor: string;
  iconBg: string;
  rawExpense?: Expense;
  rawSettlement?: Settlement;
}

interface MonthlyHistoryListProps {
  expenses: Expense[];
  settlements?: Settlement[];
  members: GroupMember[];
  currentUserId?: string;
  onPressExpense?: (expense: Expense) => void;
}

const getCategoryDetails = (desc: string = '', merchant: string = '') => {
  const text = `${desc} ${merchant}`.toLowerCase();
  if (text.includes('rent') || text.includes('flat') || text.includes('room')) {
    return { iconName: 'home', bg: '#EEF2FF', color: '#4F46E5' }; // Indigo
  }
  if (
    text.includes('swiggy') ||
    text.includes('zomato') ||
    text.includes('food') ||
    text.includes('dinner') ||
    text.includes('lunch') ||
    text.includes('biryani')
  ) {
    return { iconName: 'coffee', bg: '#FFF7ED', color: '#EA580C' }; // Orange
  }
  if (
    text.includes('wifi') ||
    text.includes('airtel') ||
    text.includes('electric') ||
    text.includes('bescom') ||
    text.includes('bill') ||
    text.includes('power')
  ) {
    return { iconName: 'zap', bg: '#FEF3C7', color: '#D97706' }; // Amber
  }
  if (
    text.includes('grocer') ||
    text.includes('supermarket') ||
    text.includes('market') ||
    text.includes('veggie')
  ) {
    return { iconName: 'shopping-cart', bg: '#ECFDF5', color: '#059669' }; // Emerald
  }
  if (
    text.includes('movie') ||
    text.includes('pvr') ||
    text.includes('cinema') ||
    text.includes('netflix') ||
    text.includes('ticket')
  ) {
    return { iconName: 'film', bg: '#FDF2F8', color: '#DB2777' }; // Pink
  }
  if (
    text.includes('cab') ||
    text.includes('uber') ||
    text.includes('ola') ||
    text.includes('travel') ||
    text.includes('flight')
  ) {
    return { iconName: 'navigation', bg: '#EFF6FF', color: '#2563EB' }; // Blue
  }
  return { iconName: 'credit-card', bg: '#F1F5F9', color: '#475569' }; // Slate
};

const formatGPayDate = (timestamp: number): string => {
  const d = new Date(timestamp);
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day} ${month}, ${hours}:${minutes} ${ampm}`;
};

const getMonthYearKey = (timestamp: number): string => {
  const d = new Date(timestamp);
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

export const MonthlyHistoryList: React.FC<MonthlyHistoryListProps> = ({
  expenses,
  settlements = [],
  members,
  currentUserId,
  onPressExpense,
}) => {
  const memberMap = React.useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.uid, m.displayName));
    return map;
  }, [members]);

  // Combine and sort all transactions descending
  const historyItems: HistoryItem[] = React.useMemo(() => {
    const items: HistoryItem[] = [];

    // Expenses
    expenses.forEach((e) => {
      const payerName = memberMap.get(e.paidBy) || (e.paidBy === currentUserId ? 'You' : 'Member');
      const isCurrentUserPayer = e.paidBy === currentUserId;
      const { iconName, bg, color } = getCategoryDetails(e.description, e.merchant);

      const userSplit = currentUserId && e.splits ? e.splits[currentUserId] : null;
      const userShare = userSplit ? userSplit.amountOwed : e.amount / Math.max(members.length, 1);

      items.push({
        id: e.expenseId,
        type: 'expense',
        title: e.description || e.merchant || 'Expense',
        subtitle: `${formatGPayDate(e.createdAt)} • Paid by ${payerName}`,
        dateStr: formatGPayDate(e.createdAt),
        timestamp: e.createdAt,
        amount: e.amount,
        paidByUid: e.paidBy,
        paidByName: payerName,
        isCurrentUserPayer,
        userShare,
        iconName,
        iconColor: color,
        iconBg: bg,
        rawExpense: e,
      });
    });

    // Settlements
    settlements.forEach((s) => {
      const fromName = memberMap.get(s.fromUserId) || (s.fromUserId === currentUserId ? 'You' : 'Member');
      const toName = memberMap.get(s.toUserId) || (s.toUserId === currentUserId ? 'You' : 'Member');
      const isCurrentUserPayer = s.fromUserId === currentUserId;
      const isCurrentUserRecipient = s.toUserId === currentUserId;

      items.push({
        id: s.settlementId,
        type: 'settlement',
        title: `Settlement: ${fromName} → ${toName}`,
        subtitle: `${formatGPayDate(s.createdAt)} • ${s.notes || 'Payment Settle Up'}`,
        dateStr: formatGPayDate(s.createdAt),
        timestamp: s.createdAt,
        amount: s.amount,
        paidByUid: s.fromUserId,
        paidByName: fromName,
        isCurrentUserPayer,
        userShare: isCurrentUserRecipient ? s.amount : 0,
        iconName: 'check-circle',
        iconColor: '#0D9488',
        iconBg: '#F0FDF4',
        rawSettlement: s,
      });
    });

    // Sort newest first
    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [expenses, settlements, memberMap, currentUserId, members.length]);

  // Group items by month (e.g. "October 2026")
  const groupedByMonth = React.useMemo(() => {
    const groups: { [key: string]: HistoryItem[] } = {};
    historyItems.forEach((item) => {
      const key = getMonthYearKey(item.timestamp);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [historyItems]);

  const monthKeys = Object.keys(groupedByMonth);

  if (historyItems.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Icon name="file-text" size={32} color="#94A3B8" />
        <Text style={styles.emptyTitle}>No Transaction History</Text>
        <Text style={styles.emptySubtitle}>All your monthly group expenses will be organized here like GPay.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {monthKeys.map((monthKey) => {
        const items = groupedByMonth[monthKey];
        const monthlyTotal = items
          .filter((i) => i.type === 'expense')
          .reduce((sum, i) => sum + i.amount, 0);

        return (
          <View key={monthKey} style={styles.monthSection}>
            {/* GPay style Monthly Header */}
            <View style={styles.monthHeaderRow}>
              <View style={styles.monthBadge}>
                <Text style={styles.monthBadgeText}>{monthKey.toUpperCase()}</Text>
              </View>
              <Text style={styles.monthTotalText}>
                Total: <Text style={styles.boldText}>{formatINR(monthlyTotal)}</Text>
              </Text>
            </View>

            {/* List of transactions for this month */}
            <View style={styles.monthCard}>
              {items.map((item, idx) => {
                const isLast = idx === items.length - 1;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.txRow, !isLast && styles.txBorder]}
                    onPress={() => item.rawExpense && onPressExpense?.(item.rawExpense)}
                    activeOpacity={0.7}
                  >
                    {/* Category Icon */}
                    <View style={[styles.avatarCircle, { backgroundColor: item.iconBg }]}>
                      <Icon name={item.iconName} size={20} color={item.iconColor} />
                    </View>

                    {/* Transaction Details */}
                    <View style={styles.detailsCol}>
                      <Text style={styles.txTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.txSubtitle} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    </View>

                    {/* Amount & Status */}
                    <View style={styles.amountCol}>
                      {item.type === 'settlement' ? (
                        <>
                          <Text style={styles.settleAmount}>{formatINR(item.amount)}</Text>
                          <Text style={styles.settleLabel}>SETTLED</Text>
                        </>
                      ) : item.isCurrentUserPayer ? (
                        <>
                          <Text style={styles.greenAmount}>+{formatINR(item.amount)}</Text>
                          <Text style={styles.payerLabel}>You paid</Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.redAmount}>-{formatINR(item.userShare)}</Text>
                          <Text style={styles.shareLabel}>Your share</Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  monthSection: {
    marginBottom: 16,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  monthBadge: {
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  monthBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.5,
  },
  monthTotalText: {
    fontSize: 12,
    color: '#64748B',
  },
  boldText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  monthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  txBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailsCol: {
    flex: 1,
    marginRight: 8,
  },
  txTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  txSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  greenAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#16A34A',
  },
  payerLabel: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 2,
  },
  redAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
  },
  shareLabel: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 2,
  },
  settleAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  settleLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0D9488',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  emptyWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
});
