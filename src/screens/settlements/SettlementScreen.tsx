import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { AmountInput } from '../../components/AmountInput';
import { Button } from '../../components/Button';
import { MemberAvatar } from '../../components/MemberAvatar';
import { Icon } from '../../components/Icon';
import { formatINR } from '../../utils/currency';

import { monthlyLedgerService } from '../../services/monthlyLedgerService';
import { calculateBalances, simplifyDebts } from '../../utils/splitCalculator';

type SettlementRouteProp = RouteProp<RootStackParamList, 'Settlement'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

export const SettlementScreen = () => {
  const route = useRoute<SettlementRouteProp>();
  const navigation = useNavigation<NavProp>();
  const {
    groupId,
    fromUserId: initialFromUserId,
    toUserId: initialToUserId,
    suggestedAmount,
  } = route.params;

  const { user } = useAuth();
  const { members, fetchMembers } = useGroups();
  const groupMembers = members[groupId] || [];

  const { recordSettlement, expenses, settlements, refreshGroupData } = useExpenses(groupId);

  // Month-isolated debts calculation (Active Calendar Month)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const currentMonthExpenses = useMemo(() => {
    return monthlyLedgerService.filterByMonth(expenses, currentYear, currentMonth);
  }, [expenses, currentYear, currentMonth]);

  const currentMonthSettlements = useMemo(() => {
    return monthlyLedgerService.filterByMonth(settlements, currentYear, currentMonth);
  }, [settlements, currentYear, currentMonth]);

  const currentMonthBalances = useMemo(() => {
    return calculateBalances(groupMembers, currentMonthExpenses, currentMonthSettlements);
  }, [groupMembers, currentMonthExpenses, currentMonthSettlements]);

  const debts = useMemo(() => {
    return simplifyDebts(currentMonthBalances);
  }, [currentMonthBalances]);

  // Determine smart initial mode
  const initialMode = useMemo<'received' | 'paid'>(() => {
    if (initialFromUserId && user?.uid) {
      return initialFromUserId === user.uid ? 'paid' : 'received';
    }
    if (initialToUserId && user?.uid) {
      return initialToUserId === user.uid ? 'received' : 'paid';
    }
    // Debts check in current month
    const debtsOwedToMe = debts.filter((d) => d.toUserId === user?.uid);
    const debtsIOwe = debts.filter((d) => d.fromUserId === user?.uid);
    if (debtsOwedToMe.length > 0 && debtsIOwe.length === 0) {
      return 'received';
    }
    if (debtsIOwe.length > 0 && debtsOwedToMe.length === 0) {
      return 'paid';
    }
    return 'received';
  }, [initialFromUserId, initialToUserId, user?.uid, debts]);

  const [mode, setMode] = useState<'received' | 'paid'>(initialMode);

  // Other group members (excluding current user)
  const otherMembers = useMemo(() => {
    return groupMembers.filter((m) => m.uid !== user?.uid);
  }, [groupMembers, user?.uid]);

  // Smart default other member
  const defaultOtherId = useMemo(() => {
    if (mode === 'received') {
      if (initialFromUserId && initialFromUserId !== user?.uid) return initialFromUserId;
      const debtOwed = debts
        .filter((d) => d.toUserId === user?.uid)
        .sort((a, b) => b.amount - a.amount)[0];
      if (debtOwed) return debtOwed.fromUserId;
    } else {
      if (initialToUserId && initialToUserId !== user?.uid) return initialToUserId;
      const debtToPay = debts
        .filter((d) => d.fromUserId === user?.uid)
        .sort((a, b) => b.amount - a.amount)[0];
      if (debtToPay) return debtToPay.toUserId;
    }
    return otherMembers[0]?.uid || '';
  }, [mode, initialFromUserId, initialToUserId, user?.uid, debts, otherMembers]);

  const [selectedOtherUserId, setSelectedOtherUserId] = useState<string>(defaultOtherId);
  const [amountStr, setAmountStr] = useState<string>(
    suggestedAmount ? suggestedAmount.toString() : ''
  );
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchMembers(groupId);
  }, [groupId, fetchMembers]);

  useEffect(() => {
    if (!selectedOtherUserId && defaultOtherId) {
      setSelectedOtherUserId(defaultOtherId);
    }
  }, [defaultOtherId, selectedOtherUserId]);

  // Debt relationship with selected other member
  const selectedOtherDebt = useMemo(() => {
    if (!user?.uid || !selectedOtherUserId) return null;
    if (mode === 'received') {
      return debts.find((d) => d.fromUserId === selectedOtherUserId && d.toUserId === user.uid);
    } else {
      return debts.find((d) => d.fromUserId === user.uid && d.toUserId === selectedOtherUserId);
    }
  }, [debts, mode, selectedOtherUserId, user?.uid]);

  // Auto-fill suggested amount when other member or mode changes
  useEffect(() => {
    if (suggestedAmount) {
      setAmountStr(suggestedAmount.toString());
    } else if (selectedOtherDebt) {
      setAmountStr(selectedOtherDebt.amount.toString());
    }
  }, [selectedOtherDebt, suggestedAmount]);

  const payerId = mode === 'received' ? selectedOtherUserId : user?.uid || '';
  const recipientId = mode === 'received' ? user?.uid || '' : selectedOtherUserId;

  const payerMember = groupMembers.find((m) => m.uid === payerId);
  const recipientMember = groupMembers.find((m) => m.uid === recipientId);

  const payerName = payerMember?.uid === user?.uid ? 'You' : payerMember?.displayName || 'Payer';
  const recipientName =
    recipientMember?.uid === user?.uid ? 'You' : recipientMember?.displayName || 'Recipient';

  const handleRecord = async () => {
    const numAmount = parseFloat(amountStr) || 0;
    if (numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid settlement amount');
      return;
    }
    if (!payerId || !recipientId) {
      Alert.alert('Member Required', 'Please select a flatmate');
      return;
    }
    if (payerId === recipientId) {
      Alert.alert('Invalid Settlement', 'Payer and recipient cannot be the same member');
      return;
    }

    try {
      setLoading(true);
      await recordSettlement({
        targetGroupId: groupId,
        fromUserId: payerId,
        toUserId: recipientId,
        amount: numAmount,
        notes:
          notes.trim() || (mode === 'received' ? 'Received via UPI/Cash' : 'Paid via UPI/Cash'),
        members: groupMembers,
      });

      // Refresh group data so HomeScreen and all ledgers are instantly in sync
      await refreshGroupData(groupId, groupMembers);

      Alert.alert(
        'Payment Recorded',
        `Payment of ${formatINR(numAmount)} has been recorded successfully.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not record settlement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <Text style={styles.title}>Record Settlement</Text>
        <Text style={styles.subtitle}>
          Track direct payments (UPI, GPay, Cash) between flatmates so monthly dues clear
          instantly.
        </Text>

        {/* Mode Selector Tabs (Someone Paid Me vs I Paid Someone) */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'received' && styles.modeTabActiveGreen]}
            onPress={() => {
              setMode('received');
              const bestDebtor = debts
                .filter((d) => d.toUserId === user?.uid)
                .sort((a, b) => b.amount - a.amount)[0];
              if (bestDebtor) {
                setSelectedOtherUserId(bestDebtor.fromUserId);
                setAmountStr(bestDebtor.amount.toString());
              }
            }}
            activeOpacity={0.8}
          >
            <Icon
              name="arrow-down-left"
              size={18}
              color={mode === 'received' ? '#FFFFFF' : '#16A34A'}
            />
            <Text style={[styles.modeTabText, mode === 'received' && styles.modeTabTextActive]}>
              Someone Paid Me
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, mode === 'paid' && styles.modeTabActiveBlue]}
            onPress={() => {
              setMode('paid');
              const bestCreditor = debts
                .filter((d) => d.fromUserId === user?.uid)
                .sort((a, b) => b.amount - a.amount)[0];
              if (bestCreditor) {
                setSelectedOtherUserId(bestCreditor.toUserId);
                setAmountStr(bestCreditor.amount.toString());
              }
            }}
            activeOpacity={0.8}
          >
            <Icon
              name="arrow-up-right"
              size={18}
              color={mode === 'paid' ? '#FFFFFF' : '#4F46E5'}
            />
            <Text style={[styles.modeTabText, mode === 'paid' && styles.modeTabTextActive]}>
              I Paid Someone
            </Text>
          </TouchableOpacity>
        </View>

        {/* Visual Flow Banner */}
        <View style={styles.flowCard}>
          <View style={styles.flowMember}>
            <MemberAvatar name={payerName} size={36} />
            <Text style={styles.flowMemberName} numberOfLines={1}>
              {payerName}
            </Text>
            <Text style={styles.flowRole}>Payer</Text>
          </View>

          <View style={styles.flowCenter}>
            <Text style={styles.flowAmount}>
              {parseFloat(amountStr) > 0 ? formatINR(parseFloat(amountStr)) : '₹0'}
            </Text>
            <View style={styles.flowArrowRow}>
              <View style={styles.flowLine} />
              <Icon name="arrow-right" size={16} color="#64748B" />
            </View>
            <Text style={styles.flowType}>
              {mode === 'received' ? 'Paid to you' : 'Paid by you'}
            </Text>
          </View>

          <View style={styles.flowMember}>
            <MemberAvatar name={recipientName} size={36} />
            <Text style={styles.flowMemberName} numberOfLines={1}>
              {recipientName}
            </Text>
            <Text style={styles.flowRole}>Recipient</Text>
          </View>
        </View>

        {/* Flatmate Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {mode === 'received' ? 'Select Flatmate Who Paid You' : 'Select Flatmate You Paid'}
          </Text>
          <View style={styles.membersGrid}>
            {otherMembers.map((m) => {
              const isSelected = m.uid === selectedOtherUserId;
              const debtRel =
                mode === 'received'
                  ? debts.find((d) => d.fromUserId === m.uid && d.toUserId === user?.uid)
                  : debts.find((d) => d.fromUserId === user?.uid && d.toUserId === m.uid);

              return (
                <TouchableOpacity
                  key={m.uid}
                  style={[styles.memberCard, isSelected && styles.memberCardSelected]}
                  onPress={() => {
                    setSelectedOtherUserId(m.uid);
                    if (debtRel) {
                      setAmountStr(debtRel.amount.toString());
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.memberCardTop}>
                    <MemberAvatar name={m.displayName} size={32} />
                    {isSelected && (
                      <View style={styles.checkCircle}>
                        <Icon name="check" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {m.displayName}
                  </Text>
                  {debtRel ? (
                    <Text
                      style={[
                        styles.memberDebtText,
                        mode === 'received' ? styles.greenDebtText : styles.redDebtText,
                      ]}
                    >
                      {mode === 'received'
                        ? `Owes ${formatINR(debtRel.amount)}`
                        : `Owe ${formatINR(debtRel.amount)}`}
                    </Text>
                  ) : (
                    <Text style={styles.memberSettledText}>No dues</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <View style={styles.amountHeaderRow}>
            <Text style={styles.label}>Settlement Amount</Text>
            {selectedOtherDebt && (
              <TouchableOpacity
                onPress={() => setAmountStr(selectedOtherDebt.amount.toString())}
                style={styles.fullAmountBtn}
              >
                <Text style={styles.fullAmountBtnText}>
                  Use Full {formatINR(selectedOtherDebt.amount)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <AmountInput value={amountStr} onChangeText={setAmountStr} />
        </View>

        {/* Payment Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Payment Method / Notes (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder={
              mode === 'received'
                ? 'e.g. Received via GPay UPI, Cash'
                : 'e.g. Paid via PhonePe, Cash'
            }
            placeholderTextColor="#94A3B8"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Submit Button */}
        <Button
          title={mode === 'received' ? 'Record Payment Received' : 'Record Payment Made'}
          onPress={handleRecord}
          loading={loading}
          disabled={parseFloat(amountStr) <= 0 || !selectedOtherUserId}
          style={styles.submitBtn}
        />
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
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 6,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  modeTabActiveGreen: {
    backgroundColor: '#16A34A',
  },
  modeTabActiveBlue: {
    backgroundColor: '#4F46E5',
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  flowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  flowMember: {
    alignItems: 'center',
    width: 80,
  },
  flowMemberName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 6,
    textAlign: 'center',
  },
  flowRole: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  flowCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  flowAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  flowArrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    gap: 4,
  },
  flowLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#CBD5E1',
  },
  flowType: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  memberCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  memberCardSelected: {
    borderColor: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  memberCardTop: {
    position: 'relative',
    marginBottom: 8,
  },
  checkCircle: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: '#0F172A',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  memberName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  memberDebtText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  greenDebtText: {
    color: '#16A34A',
  },
  redDebtText: {
    color: '#DC2626',
  },
  memberSettledText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
  amountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fullAmountBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fullAmountBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  submitBtn: {
    marginTop: 8,
  },
});
