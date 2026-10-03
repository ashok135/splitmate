import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import { Expense, Settlement, UserBalance, Debt } from '../types/expense';
import { GroupMember } from '../types/group';
import { Icon } from './Icon';
import { MemberAvatar } from './MemberAvatar';
import { formatINR } from '../utils/currency';
import { monthlyLedgerService } from '../services/monthlyLedgerService';
import { calculateBalances, simplifyDebts } from '../utils/splitCalculator';

interface MonthlyReportModalProps {
  visible: boolean;
  onClose: () => void;
  groupName: string;
  groupId: string;
  currentUserId?: string;
  members: GroupMember[];
  expenses: Expense[];
  settlements: Settlement[];
  onMonthClosed?: () => void;
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  visible,
  onClose,
  groupName,
  groupId,
  currentUserId,
  members,
  expenses,
  settlements,
  onMonthClosed,
}) => {
  // Current date: October 2026 (or dynamic from Date)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 9 = October

  const [selectedMonthOffset, setSelectedMonthOffset] = useState<number>(0); // 0 = Current month, 1 = Previous month

  // Target month calculations
  const targetDate = new Date(currentYear, currentMonthIdx - selectedMonthOffset, 1);
  const targetYear = targetDate.getFullYear();
  const targetMonthIdx = targetDate.getMonth();
  const targetMonthLabel = targetDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Filter expenses and settlements for target month
  const monthlyExpenses = useMemo(() => {
    return monthlyLedgerService.filterByMonth(expenses, targetYear, targetMonthIdx);
  }, [expenses, targetYear, targetMonthIdx]);

  const monthlySettlements = useMemo(() => {
    return monthlyLedgerService.filterByMonth(settlements, targetYear, targetMonthIdx);
  }, [settlements, targetYear, targetMonthIdx]);

  // Exact balances & debts for this month's ledger
  const monthlyBalances = useMemo(() => {
    return calculateBalances(members, monthlyExpenses, monthlySettlements);
  }, [members, monthlyExpenses, monthlySettlements]);

  const monthlyDebts = useMemo(() => {
    return simplifyDebts(monthlyBalances);
  }, [monthlyBalances]);

  const totalMonthlySpend = useMemo(() => {
    return monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [monthlyExpenses]);

  // Current user's stats for this month
  const myBalance = currentUserId && monthlyBalances[currentUserId] ? monthlyBalances[currentUserId] : null;

  // Day 1 Reminder message for user
  const reminderText = useMemo(() => {
    if (!currentUserId) return '';
    return monthlyLedgerService.generateDay1ReminderText(
      groupName,
      targetMonthLabel,
      currentUserId,
      monthlyDebts
    );
  }, [groupName, targetMonthLabel, currentUserId, monthlyDebts]);

  // Full report text
  const fullReportText = useMemo(() => {
    return monthlyLedgerService.generateFullMonthlyReportText(
      groupName,
      targetMonthLabel,
      members,
      monthlyExpenses,
      monthlyBalances,
      monthlyDebts
    );
  }, [groupName, targetMonthLabel, members, monthlyExpenses, monthlyBalances, monthlyDebts]);

  const handleShareReminder = async () => {
    await monthlyLedgerService.shareReport(reminderText, `${groupName} ${targetMonthLabel} Dues Reminder`);
  };

  const handleShareFullReport = async () => {
    await monthlyLedgerService.shareReport(fullReportText, `${groupName} ${targetMonthLabel} Statement`);
  };

  const handleCloseAndStartFresh = () => {
    Alert.alert(
      '🔄 Close Month & Start Fresh',
      `This will finalize the ${targetMonthLabel} statement and prepare a clean new ledger for the upcoming month starting from scratch.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finalize & Start Fresh',
          onPress: async () => {
            if (!currentUserId) return;
            try {
              await monthlyLedgerService.closeMonthAndArchive({
                groupId,
                groupName,
                year: targetYear,
                monthIndex: targetMonthIdx,
                monthLabel: targetMonthLabel,
                members,
                expenses,
                settlements,
                userId: currentUserId,
              });
              Alert.alert('✅ Month Finalized', `${targetMonthLabel} ledger archived. Starting fresh for the new month!`);
              onMonthClosed?.();
              onClose();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not close month');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Icon name="x" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>Monthly Ledger & Report</Text>
            <Text style={styles.headerSub}>{groupName}</Text>
          </View>
          <TouchableOpacity onPress={handleShareFullReport} style={styles.shareHeaderBtn}>
            <Icon name="share-2" size={20} color="#0284C7" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Month Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, selectedMonthOffset === 0 && styles.activeTabBtn]}
              onPress={() => setSelectedMonthOffset(0)}
            >
              <Text style={[styles.tabText, selectedMonthOffset === 0 && styles.activeTabText]}>
                October 2026 (Active)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, selectedMonthOffset === 1 && styles.activeTabBtn]}
              onPress={() => setSelectedMonthOffset(1)}
            >
              <Text style={[styles.tabText, selectedMonthOffset === 1 && styles.activeTabText]}>
                September 2026 (Past)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Month Banner */}
          <View style={styles.monthBanner}>
            <View style={styles.bannerRow}>
              <View>
                <Text style={styles.bannerMonthLabel}>{targetMonthLabel.toUpperCase()}</Text>
                <Text style={styles.bannerSpend}>
                  Group Spend: <Text style={styles.boldText}>{formatINR(totalMonthlySpend)}</Text>
                </Text>
              </View>
              <View style={styles.expenseCountBadge}>
                <Text style={styles.expenseCountText}>{monthlyExpenses.length} expenses</Text>
              </View>
            </View>

            {myBalance && (
              <View style={styles.myStatStrip}>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>You Paid</Text>
                  <Text style={styles.statBoxVal}>{formatINR(myBalance.expensePaid ?? myBalance.totalPaid)}</Text>
                </View>
                <View style={styles.statBoxDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Your Share</Text>
                  <Text style={styles.statBoxVal}>{formatINR(myBalance.expenseShare ?? myBalance.totalOwed)}</Text>
                </View>
                <View style={styles.statBoxDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Net Position</Text>
                  <Text
                    style={[
                      styles.statBoxVal,
                      myBalance.netBalance > 0
                        ? styles.greenText
                        : myBalance.netBalance < 0
                        ? styles.redText
                        : styles.slateText,
                    ]}
                  >
                    {myBalance.netBalance > 0
                      ? `+${formatINR(myBalance.netBalance)}`
                      : myBalance.netBalance < 0
                      ? `-${formatINR(Math.abs(myBalance.netBalance))}`
                      : 'Settled'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Day 1 Reminder Message Box */}
          <View style={styles.reminderCard}>
            <View style={styles.reminderHeader}>
              <View style={styles.inlineIconText}>
                <Icon name="bell" size={16} color="#4F46E5" />
                <Text style={styles.reminderTitle}> 1st of the Month Reminder Message</Text>
              </View>
              <TouchableOpacity onPress={handleShareReminder} style={styles.copyPill}>
                <Icon name="send" size={12} color="#FFFFFF" />
                <Text style={styles.copyPillText}> Send / Share</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{reminderText}</Text>
            </View>
            <Text style={styles.reminderFooterText}>
              Flatmates receive this exact message so they know how much to pay before the 5th.
            </Text>
          </View>

          {/* Member Statement Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Flatmates Statement Breakdown</Text>
            <View style={styles.membersTable}>
              {members.map((m) => {
                const bal = monthlyBalances[m.uid];
                const net = bal ? bal.netBalance : 0;
                return (
                  <View key={m.uid} style={styles.memberRow}>
                    <MemberAvatar name={m.displayName} size={36} />
                    <View style={styles.memberInfoCol}>
                      <Text style={styles.memberName}>{m.displayName}</Text>
                      <Text style={styles.memberSub}>
                        Paid {formatINR(bal ? (bal.expensePaid ?? bal.totalPaid) : 0)} • Share {formatINR(bal ? (bal.expenseShare ?? bal.totalOwed) : 0)}
                      </Text>
                    </View>
                    <View style={styles.memberNetCol}>
                      <Text
                        style={[
                          styles.memberNetVal,
                          net > 0 ? styles.greenText : net < 0 ? styles.redText : styles.slateText,
                        ]}
                      >
                        {net > 0
                          ? `+${formatINR(net)}`
                          : net < 0
                          ? `-${formatINR(Math.abs(net))}`
                          : '₹0'}
                      </Text>
                      <Text style={styles.memberNetLabel}>
                        {net > 0 ? 'To receive' : net < 0 ? 'To pay' : 'Settled'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Direct Settlement Transfers */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pairwise Settlement Instructions</Text>
            {monthlyDebts.length > 0 ? (
              <View style={styles.debtsBox}>
                {monthlyDebts.map((d, index) => (
                  <View key={index} style={styles.debtLine}>
                    <View style={styles.inlineIconText}>
                      <Icon name="arrow-right" size={14} color="#64748B" />
                      <Text style={styles.debtText}>
                        {' '}
                        <Text style={styles.boldText}>{d.fromName}</Text> pays{' '}
                        <Text style={styles.boldText}>{d.toName}</Text>
                      </Text>
                    </View>
                    <Text style={styles.debtAmountBold}>{formatINR(d.amount)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.allSettledBox}>
                <Icon name="check-circle" size={16} color="#15803D" />
                <Text style={styles.allSettledText}> No dues pending! All accounts balanced.</Text>
              </View>
            )}
          </View>

          {/* Bottom Actions */}
          <View style={styles.actionCol}>
            <TouchableOpacity style={styles.shareReportBtn} onPress={handleShareFullReport}>
              <Icon name="share-2" size={18} color="#FFFFFF" />
              <Text style={styles.shareReportBtnText}> Share Full Monthly Report (WhatsApp / SMS)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeMonthBtn} onPress={handleCloseAndStartFresh}>
              <Icon name="refresh-cw" size={18} color="#0F172A" />
              <Text style={styles.closeMonthBtnText}> Close Month & Start Fresh Next Month</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeBtn: {
    padding: 6,
  },
  headerTitleCol: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  shareHeaderBtn: {
    padding: 6,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
  },
  activeTabBtn: {
    backgroundColor: '#0F172A',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  monthBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerMonthLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#334155',
    letterSpacing: 0.5,
  },
  bannerSpend: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  boldText: {
    fontWeight: '800',
    color: '#0F172A',
  },
  expenseCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expenseCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  myStatStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statBoxDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  statBoxLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  statBoxVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  greenText: {
    color: '#16A34A',
  },
  redText: {
    color: '#DC2626',
  },
  slateText: {
    color: '#64748B',
  },
  reminderCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 16,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  inlineIconText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4338CA',
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  copyPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  messageBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  messageText: {
    fontSize: 13,
    color: '#1E1B4B',
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  reminderFooterText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  membersTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  memberInfoCol: {
    flex: 1,
    marginLeft: 10,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  memberSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  memberNetCol: {
    alignItems: 'flex-end',
  },
  memberNetVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  memberNetLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  debtsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  debtLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  debtText: {
    fontSize: 13,
    color: '#334155',
  },
  debtAmountBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  allSettledBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
  },
  allSettledText: {
    fontSize: 13,
    color: '#15803D',
    fontWeight: '600',
  },
  actionCol: {
    marginTop: 10,
    gap: 10,
  },
  shareReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 14,
  },
  shareReportBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  closeMonthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    borderRadius: 14,
  },
  closeMonthBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
});
