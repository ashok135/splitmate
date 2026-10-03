import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useGroups } from '../../hooks/useGroups';
import { Button } from '../../components/Button';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export const CreateGroupScreen = () => {
  const navigation = useNavigation<NavProp>();
  const { createNewGroup } = useGroups();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a group name');
      return;
    }

    try {
      setLoading(true);
      const group = await createNewGroup(name.trim());
      Alert.alert(
        'Group Created 🎉',
        `Group "${group.name}" is ready!\n\nInvite Code: ${group.inviteCode}\n\nShare this code with friends so they can join!`,
        [
          {
            text: 'Open Group',
            onPress: () =>
              navigation.replace('GroupDetails', {
                groupId: group.groupId,
                groupName: group.name,
              }),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Create a New Group</Text>
          <Text style={styles.subtitle}>
            A group keeps all your shared expenses, splits, and balances organized in one place.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>Group Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Goa Trip, Flat 402, Office Lunch"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
              autoFocus
              maxLength={40}
            />

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>💡 Invite Code</Text>
              <Text style={styles.infoText}>
                We will automatically generate a unique 6-character code (like GOA7K2) that anyone
                can use to join.
              </Text>
            </View>

            <Button
              title="Create Group"
              onPress={handleCreate}
              loading={loading}
              style={styles.submitBtn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: 24,
    justifyContent: 'center',
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#0284C7',
    lineHeight: 18,
  },
  submitBtn: {
    marginTop: 4,
  },
});
