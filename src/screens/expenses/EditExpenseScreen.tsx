import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useGroups } from '../../hooks/useGroups';
import { useExpenses } from '../../hooks/useExpenses';
import { expenseService } from '../../services/expenseService';
import { AmountInput } from '../../components/AmountInput';
import { Button } from '../../components/Button';
import { calculateEqualSplit } from '../../utils/splitCalculator';

type EditExpenseRouteProp = RouteProp<RootStackParamList, 'EditExpense'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

export const EditExpenseScreen = () => {
  const route = useRoute<EditExpenseRouteProp>();
  const navigation = useNavigation<NavProp>();
  const { groupId, expenseId } = route.params;

  const { members, fetchMembers } = useGroups();
  const { refreshGroupData } = useExpenses(groupId);
  const groupMembers = members[groupId] || [];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');

  useEffect(() => {
    const loadExpense = async () => {
      try {
        setLoading(true);
        const [exp, mList] = await Promise.all([
          expenseService.getExpenseById(groupId, expenseId),
          fetchMembers(groupId),
        ]);

        if (exp) {
          setAmountStr(exp.amount.toString());
          setDescription(exp.description || '');
          setMerchant(exp.merchant || '');
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Could not load expense');
      } finally {
        setLoading(false);
      }
    };

    loadExpense();
  }, [groupId, expenseId, fetchMembers]);

  const handleUpdate = async () => {
    const numAmount = parseFloat(amountStr) || 0;
    if (numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please enter a description');
      return;
    }

    try {
      setSaving(true);
      const memberIds = groupMembers.map((m) => m.uid);
      const updatedSplits = calculateEqualSplit(numAmount, memberIds);

      await expenseService.updateExpense(
        groupId,
        expenseId,
        {
          amount: numAmount,
          description: description.trim(),
          merchant: merchant.trim() || undefined,
        },
        updatedSplits
      );

      await refreshGroupData(groupId, groupMembers);
      Alert.alert('Saved', 'Expense updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Edit Expense</Text>

        <AmountInput value={amountStr} onChangeText={setAmountStr} />

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.textInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Merchant (Optional)</Text>
          <TextInput
            style={styles.textInput}
            value={merchant}
            onChangeText={setMerchant}
            placeholder="Merchant name"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <Button
          title="Save Changes"
          onPress={handleUpdate}
          loading={saving || loading}
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
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
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
    marginTop: 12,
  },
});
