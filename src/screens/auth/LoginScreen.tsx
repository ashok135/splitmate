import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { authService } from '../../services/authService';
import { Button } from '../../components/Button';

type LoginNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginScreen = ({ navigation }: { navigation: LoginNavigationProp }) => {
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoading(true);
      await authService.login(data.email, data.password);
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await authService.signInWithGoogle();
    } catch (err: any) {
      Alert.alert('Google Sign-In Failed', err.message || 'Could not complete Google Sign-In');
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.logoText}>💰 SplitMate</Text>
            <Text style={styles.tagline}>Simple, fair group expense sharing</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to manage your group expenses</Text>

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    placeholder="you@example.com"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordHeader}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={styles.forgotLink}>Forgot?</Text>
                </TouchableOpacity>
              </View>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.password && styles.inputError]}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
            </View>

            <Button
              title="Sign In"
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              style={styles.submitBtn}
            />

            <View style={styles.orDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              title="Continue with Google"
              variant="outline"
              onPress={handleGoogleSignIn}
              loading={loading}
              style={styles.googleBtn}
            />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.signUpLink}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: '#64748B',
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 18,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  forgotLink: {
    fontSize: 13,
    color: '#0284C7',
    fontWeight: '600',
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
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  submitBtn: {
    marginTop: 8,
    marginBottom: 12,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  googleBtn: {
    marginBottom: 16,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  footerText: {
    color: '#64748B',
    fontSize: 14,
  },
  signUpLink: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 14,
  },
});
