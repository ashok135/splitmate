import React, { useState, useEffect } from 'react';
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

type SettlementRouteProp = RouteProp<RootStackParamList, 'Settlement'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

export const SettlementScreen = () => {
  const route = useRoute<SettlementRouteProp>();
  const navigation = useNavigation<NavProp>();
  const { groupId, toUserId, suggestedAmount } = route.params;

  const { user } = useAuth();
  const { members, fetchMembers } = useGroups();
  const groupMembers = members[groupId] || [];

  const [fromUserId, setFromUserId] = useState<string>(user?.uid || '');
  const [targetToUserId, setTargetToUserId] = useState<string>(
    toUserId || (groupMembers.find((m) => m.uid !== user?.uid)?.uid || '')
  );
  const [amountStr, setAmountStr] = useState<string>(
    suggestedAmount ? suggestedAmount.toString() : ''
  );
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const { recordSettlement } = useExpenses(groupId);

  useEffect(() => {
    fetchMembers(groupId);
  }, [groupId, fetchMembers]);

  useEffect(() => {
    if (!targetToUserId && groupMembers.length > 0) {
      const other = groupMembers.find((m) => m.uid !== user?.uid);
      if (other) setTargetToUserId(other.uid);
    }
  }, [groupMembers, targetToUserId, user?.uid]);

  const handleRecord = async () => {
    const numAmount = parseFloat(amountStr) || 0;
    if (numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid settlement amount');
      return;
    }
    if (!fromUserId || !targetToUserId) {
      Alert.alert('Members Required', 'Please select who is paying and who is receiving');
      return;
    }
    if (fromUserId === targetToUserId) {
      Alert.alert('Invalid Settlement', 'Payer and recipient cannot be the same member');
      return;
    }

    try {
      setLoading(true);
      await recordSettlement({
        targetGroupId: groupId,
        fromUserId,
        toUserId: targetToUserId,
        amount: numAmount,
        notes: notes.trim() || undefined,
        members: groupMembers,
      });

      Alert.alert('Settled! 🤝', `Payment of ₹${numAmount} successfully recorded!`, [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not record settlement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Record Settlement</Text>
        <Text style={styles.subtitle}>
          Mark that a member paid another member directly (via UPI, cash, etc.).
        </Text>

        <AmountInput value={amountStr} onChangeText={setAmountStr} autoFocus={!suggestedAmount} />

        {/* Payer selector */}
        <View style={styles.section}>
          <Text style={styles.label}>Payer (Who paid)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberScroll}>
            {groupMembers.map((m) => {
              const isSelected = m.uid === fromUserId;
              return (
                <TouchableOpacity
                  key={m.uid}
                  style={[styles.memberChip, isSelected && styles.activeChip]}
                  onPress={() => setFromUserId(m.uid)}
                >
                  <MemberAvatar name={m.displayName} size={24} />
                  <Text style={[styles.chipText, isSelected && styles.activeChipText]}>
                    {m.displayName} {m.uid === user?.uid ? '(You)' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Recipient selector */}
        <View style={styles.section}>
          <Text style={styles.label}>Recipient (Who received)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberScroll}>
            {groupMembers.map((m) => {
              const isSelected = m.uid === targetToUserId;
              return (
                <TouchableOpacity
                  key={m.uid}
                  style={[styles.memberChip, isSelected && styles.activeChip]}
                  onPress={() => setTargetToUserId(m.uid)}
                >
                  <MemberAvatar name={m.displayName} size={24} />
                  <Text style={[styles.chipText, isSelected && styles.activeChipText]}>
                    {m.displayName} {m.uid === user?.uid ? '(You)' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Notes / Payment Method (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Paid via Google Pay UPI, Cash"
            placeholderTextColor="#94A3B8"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <Button
          title="Record Payment"
          onPress={handleRecord}
          loading={loading}
          disabled={parseFloat(amountStr) <= 0 || fromUserId === targetToUserId}
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
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 20,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  memberScroll: {
    flexDirection: 'row',
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    gap: 8,
  },
  activeChip: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  activeChipText: {
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
  submitBtn: {
    marginTop: 16,
  },
});
