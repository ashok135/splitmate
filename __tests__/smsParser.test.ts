import { parseBankTransactionSms } from '../src/utils/transactionFingerprint';

describe('Bank Transaction SMS Parser', () => {
  it('parses "Rs.500 debited from your account"', () => {
    const res = parseBankTransactionSms('Rs.500 debited from your account');
    expect(res.isTransaction).toBe(true);
    expect(res.type).toBe('DEBIT');
    expect(res.amount).toBe(500);
  });

  it('filters out OTP messages: "Your OTP is 123456"', () => {
    const res = parseBankTransactionSms('Your OTP is 123456');
    expect(res.isTransaction).toBe(false);
  });

  it('detects credit transactions: "Rs.500 credited to your account"', () => {
    const res = parseBankTransactionSms('Rs.500 credited to your account');
    expect(res.type).toBe('CREDIT');
  });

  it('ignores balance-only alerts: "Your account balance is Rs.5000"', () => {
    const res = parseBankTransactionSms('Your account balance is Rs.5000');
    expect(res.isTransaction).toBe(false);
  });

  it('ignores failed transactions: "Transaction failed for Rs.500"', () => {
    const res = parseBankTransactionSms('Transaction failed for Rs.500');
    expect(res.isTransaction).toBe(false);
  });

  it('ignores reversed transactions: "Transaction reversed Rs.500"', () => {
    const res = parseBankTransactionSms('Transaction reversed Rs.500');
    expect(res.isTransaction).toBe(false);
  });

  it('extracts merchant and amount from detailed bank SMS', () => {
    const res = parseBankTransactionSms(
      'Rs.500 debited from A/C XX1234 at XYZ Store on 03-10-26.'
    );
    expect(res.isTransaction).toBe(true);
    expect(res.type).toBe('DEBIT');
    expect(res.amount).toBe(500);
    expect(res.merchant).toBe('XYZ Store');
    expect(res.accountSuffix).toBe('1234');
    expect(res.fingerprint).toBeTruthy();
  });

  it('parses "INR 500 spent at Starbucks"', () => {
    const res = parseBankTransactionSms('INR 500 spent at Starbucks');
    expect(res.isTransaction).toBe(true);
    expect(res.amount).toBe(500);
    expect(res.merchant).toBe('Starbucks');
  });

  it('parses "₹500 debited"', () => {
    const res = parseBankTransactionSms('₹500 debited');
    expect(res.isTransaction).toBe(true);
    expect(res.amount).toBe(500);
  });

  it('parses "debited by Rs 500"', () => {
    const res = parseBankTransactionSms('debited by Rs 500');
    expect(res.isTransaction).toBe(true);
    expect(res.amount).toBe(500);
  });

  it('parses "transaction of INR 500"', () => {
    const res = parseBankTransactionSms('transaction of INR 500 debited');
    expect(res.isTransaction).toBe(true);
    expect(res.amount).toBe(500);
  });
});
