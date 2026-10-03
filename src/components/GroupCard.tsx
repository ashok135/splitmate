import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Group } from '../types/group';

interface GroupCardProps {
  group: Group;
  isDefault?: boolean;
  onPress: () => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  isDefault = false,
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.groupName} numberOfLines={1}>
            {group.name}
          </Text>
          {isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>DEFAULT</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Invite Code:</Text>
          <View style={styles.codePill}>
            <Text style={styles.codeText}>{group.inviteCode}</Text>
          </View>
        </View>

        <Text style={styles.memberText}>
          {group.memberCount || 1} {group.memberCount === 1 ? 'member' : 'members'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 8,
  },
  defaultBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  defaultBadgeText: {
    color: '#0284C7',
    fontSize: 10,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 12,
    color: '#64748B',
    marginRight: 6,
  },
  codePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.5,
  },
  memberText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
