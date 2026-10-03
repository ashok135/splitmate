import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Icon } from './Icon';
import { Button } from './Button';
import { updateService, CURRENT_VERSION_NAME } from '../services/updateService';
import { AppUpdateInfo } from '../types/update';

interface UpdateModalProps {
  manualCheckTrigger?: number;
  onCheckComplete?: (hasUpdate: boolean) => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  manualCheckTrigger,
  onCheckComplete,
}) => {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [visible, setVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const check = async () => {
    try {
      const info = await updateService.checkForUpdate();
      if (info) {
        setUpdateInfo(info);
        setVisible(true);
        onCheckComplete?.(true);
      } else {
        onCheckComplete?.(false);
      }
    } catch {
      onCheckComplete?.(false);
    }
  };

  // Check on initial app launch (Android only for APK)
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Short delay so app finishes mounting
      const timer = setTimeout(() => {
        check();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Check on manual trigger
  useEffect(() => {
    if (manualCheckTrigger && manualCheckTrigger > 0) {
      check();
    }
  }, [manualCheckTrigger]);

  const handleUpdateNow = async () => {
    if (!updateInfo) return;
    setDownloading(true);
    await updateService.downloadAndInstallUpdate(updateInfo.downloadUrl);
    setDownloading(false);
  };

  const handleDismiss = () => {
    if (updateInfo?.forceUpdate) return; // Cannot dismiss force update
    setVisible(false);
  };

  if (!visible || !updateInfo) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header Icon */}
          <View style={styles.iconCircle}>
            <Icon name="arrow-up-circle" size={32} color="#4F46E5" />
          </View>

          <Text style={styles.title}>Update Available</Text>
          <Text style={styles.subtitle}>
            A new version of SplitMate is ready to install.
          </Text>

          {/* Version Badges */}
          <View style={styles.badgeRow}>
            <View style={styles.versionBadgeNew}>
              <Text style={styles.versionBadgeNewText}>v{updateInfo.versionName}</Text>
            </View>
            <Text style={styles.versionArrow}>→</Text>
            <View style={styles.versionBadgeOld}>
              <Text style={styles.versionBadgeOldText}>Current: v{CURRENT_VERSION_NAME}</Text>
            </View>
          </View>

          {/* Release Notes */}
          {updateInfo.releaseNotes ? (
            <View style={styles.notesContainer}>
              <Text style={styles.notesTitle}>What's New:</Text>
              <ScrollView style={styles.notesScroll} nestedScrollEnabled>
                <Text style={styles.notesBody}>{updateInfo.releaseNotes}</Text>
              </ScrollView>
            </View>
          ) : null}

          {/* Safety Notice */}
          <View style={styles.safetyBox}>
            <Icon name="shield" size={14} color="#059669" />
            <Text style={styles.safetyText}>
              {' '}Your groups, expenses, and account data will be completely preserved.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            {!updateInfo.forceUpdate && (
              <TouchableOpacity
                style={styles.laterBtn}
                onPress={handleDismiss}
                activeOpacity={0.7}
              >
                <Text style={styles.laterBtnText}>Later</Text>
              </TouchableOpacity>
            )}

            <Button
              title={downloading ? 'Starting Download...' : 'Update Now'}
              onPress={handleUpdateNow}
              disabled={downloading}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  versionBadgeNew: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  versionBadgeNewText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
  versionArrow: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
  },
  versionBadgeOld: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  versionBadgeOldText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  notesContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  notesScroll: {
    maxHeight: 90,
  },
  notesBody: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  safetyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 18,
  },
  safetyText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
    flex: 1,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  laterBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  laterBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
});
