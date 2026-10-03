import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
} from 'react-native';
import { AppNotification } from '../types/notification';
import { format } from 'date-fns';
import Icon from 'react-native-vector-icons/Feather';

interface NotificationCardProps {
  notification: AppNotification;
  onPress: () => void;
  onDelete?: (notificationId: string) => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
  onDelete,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Prioritize horizontal drag over vertical scroll
        return (
          Math.abs(gestureState.dx) > 10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (!isOpen.current) {
          // Dragging left (negative dx)
          if (gestureState.dx < 0) {
            translateX.setValue(Math.max(-85, gestureState.dx));
          }
        } else {
          // Already open at -80, can drag back to 0 or slightly more left
          const newX = -80 + gestureState.dx;
          translateX.setValue(Math.min(0, Math.max(-95, newX)));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!isOpen.current) {
          if (gestureState.dx < -30) {
            // Snap open to reveal delete button
            Animated.spring(translateX, {
              toValue: -80,
              useNativeDriver: true,
              friction: 7,
              tension: 60,
            }).start();
            isOpen.current = true;
          } else {
            // Snap back
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              friction: 7,
            }).start();
            isOpen.current = false;
          }
        } else {
          if (gestureState.dx > 25) {
            // Swiped right to close
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              friction: 7,
            }).start();
            isOpen.current = false;
          } else {
            // Stay open
            Animated.spring(translateX, {
              toValue: -80,
              useNativeDriver: true,
              friction: 7,
            }).start();
            isOpen.current = true;
          }
        }
      },
    })
  ).current;

  const closeSwipe = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 7,
    }).start();
    isOpen.current = false;
  };

  const handleDelete = () => {
    Animated.timing(translateX, {
      toValue: -500,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDelete?.(notification.notificationId);
    });
  };

  const formattedDate = notification.createdAt
    ? format(new Date(notification.createdAt), 'dd MMM, hh:mm a')
    : '';

  return (
    <View style={styles.wrapper}>
      {/* Red Delete Button underlay */}
      <View style={styles.underlay}>
        <TouchableOpacity
          style={styles.underlayDeleteBtn}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Icon name="trash-2" size={20} color="#FFFFFF" />
          <Text style={styles.underlayDeleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Foreground Swipeable Card */}
      <Animated.View
        style={[styles.card, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            if (isOpen.current) {
              closeSwipe();
            } else {
              onPress();
            }
          }}
        >
          <View style={styles.headerRow}>
            <Text style={styles.title}>{notification.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.date}>{formattedDate}</Text>
              {onDelete && (
                <TouchableOpacity
                  onPress={handleDelete}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.inlineDeleteBtn}
                >
                  <Icon name="trash-2" size={14} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <Text style={styles.body}>{notification.body}</Text>
          <View style={styles.footer}>
            <Text style={styles.groupBadge}>{notification.groupName}</Text>
            <Text style={styles.viewLink}>VIEW →</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 6,
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
  },
  underlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EF4444',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  underlayDeleteBtn: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DC2626',
  },
  underlayDeleteText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
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
  inlineDeleteBtn: {
    padding: 2,
    marginLeft: 2,
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
