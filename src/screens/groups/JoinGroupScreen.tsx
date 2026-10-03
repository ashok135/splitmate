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

export const JoinGroupScreen = () => {
  const navigation = useNavigation<NavProp>();
  const { joinGroup } = useGroups();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode) {
      Alert.alert('Required', 'Please enter an invite code');
      return;
    }

    try {
      setLoading(true);
      const group = await joinGroup(cleanCode);
      Alert.alert('Success 🎉', `You have joined "${group.name}"!`, [
        {
          text: 'Open Group',
          onPress: () =>
            navigation.replace('GroupDetails', {
              groupId: group.groupId,
              groupName: group.name,
            }),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Could Not Join', err.message || 'Invalid invite code');
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
          <Text style={styles.title}>Join a Group</Text>
          <Text style={styles.subtitle}>
            Enter the 6-character invite code provided by the group creator.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>Invite Code</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. GOA7K2"
              placeholderTextColor="#94A3B8"
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              maxLength={8}
            />

            <Button
              title="Join Group"
              onPress={handleJoin}
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
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 20,
  },
  submitBtn: {
    marginTop: 4,
  },
});
