import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { SplitType, ExpenseSplit } from '../types/expense';
import { GroupMember } from '../types/group';
import { MemberAvatar } from './MemberAvatar';
import { formatINR } from '../utils/currency';

interface SplitSelectorProps {
  totalAmount: number;
  splitType: SplitType;
  onSplitTypeChange: (type: SplitType) => void;
  members: GroupMember[];
  selectedMemberIds: string[];
  onToggleMember: (uid: string) => void;
  customAmounts: Record<string, string>;
  onCustomAmountChange: (uid: string, value: string) => void;
  percentages: Record<string, string>;
  onPercentageChange: (uid: string, value: string) => void;
  splits: Record<string, ExpenseSplit>;
  validationMessage?: string;
}

export const SplitSelector: React.FC<SplitSelectorProps> = ({
  totalAmount,
  splitType,
  onSplitTypeChange,
  members,
  selectedMemberIds,
  onToggleMember,
  customAmounts,
  onCustomAmountChange,
  percentages,
  onPercentageChange,
  splits,
  validationMessage,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>
        Split Type {totalAmount > 0 ? `(${formatINR(totalAmount)})` : ''}
      </Text>

      {/* Split Tabs */}
      <View style={styles.tabContainer}>
        {(['equal', 'custom', 'percentage'] as SplitType[]).map((type) => {
          const isActive = splitType === type;
          return (
            <TouchableOpacity
              key={type}
              style={[styles.tab, isActive ? styles.activeTab : null]}
              onPress={() => onSplitTypeChange(type)}
            >
              <Text style={[styles.tabText, isActive ? styles.activeTabText : null]}>
                {type.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {validationMessage ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>{validationMessage}</Text>
        </View>
      ) : null}

      {/* Member breakdown list */}
      <View style={styles.memberList}>
        {members.map((member) => {
          const isSelected = selectedMemberIds.includes(member.uid);
          const memberSplit = splits[member.uid];

          return (
            <View key={member.uid} style={styles.memberRow}>
              <TouchableOpacity
                style={styles.memberInfo}
                activeOpacity={splitType === 'equal' ? 0.7 : 1}
                onPress={() => splitType === 'equal' && onToggleMember(member.uid)}
              >
                <MemberAvatar name={member.displayName} size={36} />
                <View style={styles.nameContainer}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {member.displayName}
                  </Text>
                  {splitType === 'equal' && (
                    <Text style={styles.subText}>
                      {isSelected ? 'Included' : 'Excluded'}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>

              {/* Input or calculated amount based on splitType */}
              <View style={styles.inputArea}>
                {splitType === 'equal' && (
                  <Text style={[styles.calculatedAmount, !isSelected && styles.excludedAmount]}>
                    {isSelected && memberSplit ? formatINR(memberSplit.amountOwed) : '₹0'}
                  </Text>
                )}

                {splitType === 'custom' && (
                  <View style={styles.customInputWrapper}>
                    <Text style={styles.prefix}>₹</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="numeric"
                      placeholder="0"
                      value={customAmounts[member.uid] || ''}
                      onChangeText={(val) => onCustomAmountChange(member.uid, val)}
                    />
                  </View>
                )}

                {splitType === 'percentage' && (
                  <View style={styles.customInputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="numeric"
                      placeholder="0"
                      value={percentages[member.uid] || ''}
                      onChangeText={(val) => onPercentageChange(member.uid, val)}
                    />
                    <Text style={styles.suffix}>%</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  activeTabText: {
    color: '#0F172A',
  },
  warningBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  warningText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '500',
  },
  memberList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nameContainer: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  subText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  inputArea: {
    marginLeft: 12,
    minWidth: 90,
    alignItems: 'flex-end',
  },
  calculatedAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  excludedAmount: {
    color: '#CBD5E1',
    textDecorationLine: 'line-through',
  },
  customInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  prefix: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginRight: 4,
  },
  suffix: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 4,
  },
  textInput: {
    width: 65,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    padding: 0,
    textAlign: 'right',
  },
});
