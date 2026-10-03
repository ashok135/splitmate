import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';

interface AmountInputProps {
  value: string;
  onChangeText: (text: string) => void;
  currency?: string;
  placeholder?: string;
  error?: string;
  autoFocus?: boolean;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChangeText,
  currency = '₹',
  placeholder = '0.00',
  error,
  autoFocus = false,
}) => {
  const handleChange = (text: string) => {
    // Only allow numbers and at most one decimal point with 2 decimals
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    onChangeText(cleaned);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inputBox, error ? styles.inputBoxError : null]}>
        <Text style={styles.currencySymbol}>{currency}</Text>
        <TextInput
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          style={styles.input}
          autoFocus={autoFocus}
          maxLength={10}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  inputBoxError: {
    borderColor: '#EF4444',
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
    padding: 0,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
  },
});
