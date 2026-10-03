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
import { SplitSelector } from '../../components/SplitSelector';
import { Button } from '../../components/Button';
import { SplitType, ExpenseSplit } from '../../types/expense';
import {
  calculateEqualSplit,
  calculateCustomSplit,
  calculatePercentageSplit,
  validateSplits,
} from '../../utils/splitCalculator';

type AddExpenseRouteProp = RouteProp<RootStackParamList, 'AddExpense'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

export const AddExpenseScreen = () => {
  const route = useRoute<AddExpenseRouteProp>();
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();
  const { groups, members, fetchMembers } = useGroups();

  const detectedTx = route.params?.detectedTransaction;
  const initialGroupId =
    route.params?.groupId || user?.defaultGroupId || (groups[0] ? groups[0].groupId : '');

  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId);
  const [amountStr, setAmountStr] = useState<string>(
    detectedTx?.amount ? detectedTx.amount.toString() : ''
  );
  const [description, setDescription] = useState<string>(
    detectedTx?.merchant ? `Payment to ${detectedTx.merchant}` : ''
  );
  const [merchant, setMerchant] = useState<string>(detectedTx?.merchant || '');
  const [splitType, setSplitType] = useState<SplitType>('equal');

  // Member selection for splitting
  const currentGroup = groups.find((g) => g.groupId === selectedGroupId);
  const groupMembers = selectedGroupId ? members[selectedGroupId] || [] : [];
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});

  const { createExpense, loading } = useExpenses(selectedGroupId);

  // Fetch members when group changes
  useEffect(() => {
    if (selectedGroupId) {
      fetchMembers(selectedGroupId).then((loaded) => {
        setSelectedMemberIds(loaded.map((m) => m.uid));
      });
    }
  }, [selectedGroupId, fetchMembers]);

  // Default select all members if loaded
  useEffect(() => {
    if (groupMembers.length > 0 && selectedMemberIds.length === 0) {
      setSelectedMemberIds(groupMembers.map((m) => m.uid));
    }
  }, [groupMembers, selectedMemberIds.length]);

  const numAmount = parseFloat(amountStr) || 0;

  // Compute splits dynamically based on split type
  const { calculatedSplits, validationMessage, isSplitValid } = useMemo(() => {
    if (numAmount <= 0) {
      return { calculatedSplits: {}, validationMessage: '', isSplitValid: false };
    }

    if (splitType === 'equal') {
      const splits = calculateEqualSplit(numAmount, selectedMemberIds);
      return { calculatedSplits: splits, validationMessage: '', isSplitValid: selectedMemberIds.length > 0 };
    }

    if (splitType === 'custom') {
      const numCustom: Record<string, number> = {};
      selectedMemberIds.forEach((uid) => {
        numCustom[uid] = parseFloat(customAmounts[uid] || '0') || 0;
      });
      const res = calculateCustomSplit(numAmount, numCustom);
      return {
        calculatedSplits: res.splits,
        validationMessage: res.isValid ? '' : `Allocated: ₹${numAmount - res.difference} / ₹${numAmount}`,
        isSplitValid: res.isValid,
      };
    }

    if (splitType === 'percentage') {
      const numPct: Record<string, number> = {};
      selectedMemberIds.forEach((uid) => {
        numPct[uid] = parseFloat(percentages[uid] || '0') || 0;
      });
      const res = calculatePercentageSplit(numAmount, numPct);
      return {
        calculatedSplits: res.splits,
        validationMessage: res.isValid ? '' : `Total percentage: ${res.percentageSum}% / 100%`,
        isSplitValid: res.isValid,
      };
    }

    return { calculatedSplits: {}, validationMessage: '', isSplitValid: false };
  }, [numAmount, splitType, selectedMemberIds, customAmounts, percentages]);

  const handleToggleMember = (uid: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleCustomAmountChange = (uid: string, val: string) => {
    setCustomAmounts((prev) => ({ ...prev, [uid]: val }));
  };

  const handlePercentageChange = (uid: string, val: string) => {
    setPercentages((prev) => ({ ...prev, [uid]: val }));
  };

  const handleSave = async () => {
    if (numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please enter a description for the expense');
      return;
    }
    if (!currentGroup) {
      Alert.alert('Select Group', 'Please choose a group for this expense');
      return;
    }
    if (!isSplitValid) {
      Alert.alert('Invalid Split', validationMessage || 'Please verify split amounts before saving');
      return;
    }

    try {
      await createExpense({
        targetGroupId: currentGroup.groupId,
        groupName: currentGroup.name,
        amount: numAmount,
        description: description.trim(),
        merchant: merchant.trim() || undefined,
        splitType,
        splits: calculatedSplits,
        source: detectedTx ? 'bank_sms' : 'manual',
        fingerprint: detectedTx?.fingerprint,
        members: groupMembers,
      });

      Alert.alert('Expense Added 🎉', `₹${numAmount} added to ${currentGroup.name}!`, [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save expense');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Source Badge if from SMS */}
        {detectedTx && (
          <View style={styles.smsNotice}>
            <Text style={styles.smsNoticeTitle}>💰 Auto-Detected from SMS</Text>
            <Text style={styles.smsNoticeText}>
              Extracted from bank message. Please confirm group and split details.
            </Text>
          </View>
        )}

        {/* Group Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Group</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupScroll}>
            {groups.map((g) => {
              const isSelected = g.groupId === selectedGroupId;
              return (
                <TouchableOpacity
                  key={g.groupId}
                  style={[styles.groupChip, isSelected && styles.activeGroupChip]}
                  onPress={() => setSelectedGroupId(g.groupId)}
                >
                  <Text style={[styles.groupChipText, isSelected && styles.activeGroupChipText]}>
                    {g.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Amount Input */}
        <AmountInput
          value={amountStr}
          onChangeText={setAmountStr}
          placeholder="0.00"
          autoFocus={!detectedTx}
        />

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Dinner, Groceries, Hotel booking"
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Merchant Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Merchant / Store (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Swiggy, DMart, Uber"
            placeholderTextColor="#94A3B8"
            value={merchant}
            onChangeText={setMerchant}
          />
        </View>

        {/* Split Selector Component */}
        <SplitSelector
          totalAmount={numAmount}
          splitType={splitType}
          onSplitTypeChange={setSplitType}
          members={groupMembers}
          selectedMemberIds={selectedMemberIds}
          onToggleMember={handleToggleMember}
          customAmounts={customAmounts}
          onCustomAmountChange={handleCustomAmountChange}
          percentages={percentages}
          onPercentageChange={handlePercentageChange}
          splits={calculatedSplits}
          validationMessage={validationMessage}
        />

        {/* Save Button */}
        <Button
          title="Save Expense"
          onPress={handleSave}
          loading={loading}
          disabled={!isSplitValid || numAmount <= 0}
          style={styles.saveBtn}
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
    padding: 18,
    paddingBottom: 40,
  },
  smsNotice: {
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  smsNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  smsNoticeText: {
    fontSize: 12,
    color: '#B45309',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  groupScroll: {
    flexDirection: 'row',
  },
  groupChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  activeGroupChip: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  groupChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  activeGroupChipText: {
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  saveBtn: {
    marginTop: 10,
  },
});
