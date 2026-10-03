import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppNotification } from '../types/notification';
import { format } from 'date-fns';

interface NotificationCardProps {
  notification: AppNotification;
  onPress: () => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
}) => {
  const formattedDate = notification.createdAt
    ? format(new Date(notification.createdAt), 'dd MMM, hh:mm a')
    : '';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.date}>{formattedDate}</Text>
      </View>
      <Text style={styles.body}>{notification.body}</Text>
      <View style={styles.footer}>
        <Text style={styles.groupBadge}>{notification.groupName}</Text>
        <Text style={styles.viewLink}>VIEW →</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  date: {
    fontSize: 11,
    color: '#94A3B8',
  },
  body: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  groupBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  viewLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
});
