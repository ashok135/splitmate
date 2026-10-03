import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { authService } from '../../services/authService';
import { Button } from '../../components/Button';

type ForgotPasswordNavProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen = ({ navigation }: { navigation: ForgotPasswordNavProp }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your registered email address');
      return;
    }

    try {
      setLoading(true);
      await authService.resetPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back to Login</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you instructions to reset your password.
          </Text>

          {sent ? (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>Check your inbox!</Text>
              <Text style={styles.successText}>
                We've sent a password reset link to {email}.
              </Text>
              <Button
                title="Return to Login"
                onPress={() => navigation.navigate('Login')}
                style={styles.actionBtn}
              />
            </View>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <Button
                title="Send Reset Link"
                onPress={handleReset}
                loading={loading}
                style={styles.actionBtn}
              />
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 24,
    justifyContent: 'center',
    flex: 1,
  },
  backBtn: {
    marginBottom: 20,
  },
  backText: {
    color: '#0284C7',
    fontSize: 15,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
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
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  actionBtn: {
    marginTop: 8,
  },
  successBox: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },
  successText: {
    fontSize: 13,
    color: '#15803D',
    textAlign: 'center',
    marginBottom: 16,
  },
});
