import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useGroups } from '../../hooks/useGroups';
import { smsService } from '../../services/smsService';
import { parseBankTransactionSms } from '../../utils/transactionFingerprint';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { updateService, CURRENT_VERSION_NAME } from '../../services/updateService';
import { ParsedTransaction } from '../../types/sms';

export const SettingsScreen = () => {
  const { user, updateDefaultGroup } = useAuth();
  const { groups } = useGroups();

  const [smsEnabled, setSmsEnabled] = useState(true);
  const [testSmsText, setTestSmsText] = useState(
    'Rs.500 debited from A/C XX1234 at XYZ Store on 03-10-26.'
  );
  const [parsedPreview, setParsedPreview] = useState<ParsedTransaction | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const handleCheckUpdate = async () => {
    try {
      setCheckingUpdate(true);
      const info = await updateService.checkForUpdate();
      if (info) {
        Alert.alert(
          'Update Available',
          `SplitMate v${info.versionName} is available!\n\n${info.releaseNotes || 'Bug fixes and performance improvements.'}`,
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Update Now',
              onPress: () => updateService.downloadAndInstallUpdate(info.downloadUrl),
            },
          ]
        );
      } else {
        Alert.alert(
          'Up to Date',
          `You are using the latest version of SplitMate (v${CURRENT_VERSION_NAME}).`
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not check for updates');
    } finally {
      setCheckingUpdate(false);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'android') {
      smsService.checkSmsPermission().then((granted) => {
        setSmsEnabled(granted);
      });
    }
  }, []);

  const handleToggleSms = async (value: boolean) => {
    if (Platform.OS !== 'android') {
      Alert.alert(
        'Platform Notice',
        'Automatic SMS reading is available on Android only. iOS requires manual expense entry.'
      );
      setSmsEnabled(false);
      return;
    }

    if (value) {
      const granted = await smsService.requestSmsPermissions();
      if (granted) {
        setSmsEnabled(true);
        smsService.setSmsDetectionEnabled(true);
      } else {
        setSmsEnabled(false);
        Alert.alert(
          'Permission Denied',
          'SMS permission is required for automatic transaction detection.'
        );
      }
    } else {
      setSmsEnabled(false);
      smsService.setSmsDetectionEnabled(false);
    }
  };

  const runTestParser = () => {
    const result = parseBankTransactionSms(testSmsText);
    setParsedPreview(result);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Settings</Text>

        {/* Default Group Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Default Group</Text>
          <Text style={styles.cardSubtitle}>
            When a transaction is detected from SMS, it is automatically routed to this group.
          </Text>

          <View style={styles.groupPicker}>
            {groups.map((g) => {
              const isSelected = user?.defaultGroupId === g.groupId;
              return (
                <TouchableOpacity
                  key={g.groupId}
                  style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                  onPress={() => updateDefaultGroup(g.groupId)}
                >
                  <Text
                    style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}
                  >
                    {g.name}
                  </Text>
                  {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Bank SMS Detection Card */}
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.cardTitle}>Bank SMS Detection</Text>
              <Text style={styles.cardSubtitle}>
                Automatically detect incoming debit transactions
              </Text>
            </View>
            <Switch
              value={smsEnabled}
              onValueChange={handleToggleSms}
              trackColor={{ false: '#CBD5E1', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Privacy Note */}
          <View style={styles.privacyBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Icon name="shield" size={15} color="#059669" />
              <Text style={styles.privacyTitle}> 100% On-Device Local Privacy</Text>
            </View>
            <Text style={styles.privacyText}>
              SMS messages are parsed strictly on your device using native pattern matching. The raw
              SMS body is NEVER uploaded to Firebase or any external server. Only the confirmed
              amount and merchant are stored.
            </Text>
          </View>
        </View>

        {/* Interactive SMS Parser Tester */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SMS Parser Simulator</Text>
          <Text style={styles.cardSubtitle}>
            Test how SplitMate parses sample bank SMS messages locally:
          </Text>

          <TextInput
            style={styles.textInput}
            multiline
            numberOfLines={3}
            value={testSmsText}
            onChangeText={setTestSmsText}
            placeholder="Paste sample bank SMS here..."
          />

          <Button
            title="Test Parser"
            size="sm"
            variant="secondary"
            onPress={runTestParser}
            style={styles.testBtn}
          />

          {parsedPreview && (
            <View style={styles.previewBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Icon
                  name={parsedPreview.isTransaction ? 'check-circle' : 'slash'}
                  size={15}
                  color={parsedPreview.isTransaction ? '#059669' : '#DC2626'}
                />
                <Text style={[styles.previewHeader, { color: parsedPreview.isTransaction ? '#059669' : '#DC2626' }]}>
                  {parsedPreview.isTransaction ? ' Valid Transaction' : ' Non-Transaction / Filtered'}
                </Text>
              </View>
              {parsedPreview.isTransaction && (
                <>
                  <Text style={styles.previewLine}>Type: {parsedPreview.type}</Text>
                  <Text style={styles.previewLine}>Amount: ₹{parsedPreview.amount}</Text>
                  <Text style={styles.previewLine}>Merchant: {parsedPreview.merchant || 'N/A'}</Text>
                  <Text style={styles.previewLine}>Bank: {parsedPreview.bank || 'Detected'}</Text>
                  <Text style={styles.previewLine} numberOfLines={1}>
                    Fingerprint: {parsedPreview.fingerprint}
                  </Text>
                </>
              )}
            </View>
          )}
        </View>

        {/* App Version & Updates */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>App Version & Updates</Text>
          <Text style={styles.cardSubtitle}>
            Current Installed Version: v{CURRENT_VERSION_NAME}
          </Text>

          <Button
            title={checkingUpdate ? 'Checking for Updates...' : 'Check for Updates'}
            variant="outline"
            size="sm"
            onPress={handleCheckUpdate}
            disabled={checkingUpdate}
            style={{ marginTop: 10 }}
          />
        </View>
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
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  groupPicker: {
    marginTop: 4,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  pickerItemSelected: {
    borderColor: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  pickerItemTextSelected: {
    color: '#0F172A',
    fontWeight: '700',
  },
  checkIcon: {
    color: '#10B981',
    fontWeight: '800',
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchInfo: {
    flex: 1,
    marginRight: 12,
  },
  privacyBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 12,
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 12,
    color: '#15803D',
    lineHeight: 16,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  testBtn: {
    marginBottom: 10,
  },
  previewBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 12,
  },
  previewHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  previewLine: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
});
