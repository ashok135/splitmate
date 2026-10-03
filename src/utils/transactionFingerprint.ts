import { ParsedTransaction } from '../types/sms';

/**
 * Generates a deterministic hash/fingerprint for duplicate transaction protection.
 */
export const generateFingerprint = (
  amount: number | null,
  referenceId: string | null,
  timestamp: number | null,
  merchant: string | null
): string => {
  const raw = `${amount ?? 0}|${(referenceId ?? '').toLowerCase().trim()}|${
    timestamp ? Math.floor(timestamp / (1000 * 60 * 5)) : 0 // 5-minute bucket if exact timestamp varies
  }|${(merchant ?? '').toLowerCase().trim()}`;

  // Simple, deterministic 32-bit FNV-1a based hex hash string (works everywhere without native crypto)
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hexPart1 = (hash >>> 0).toString(16).padStart(8, '0');
  
  // Secondary hash pass for 64-bit uniqueness
  let hash2 = 0;
  for (let i = raw.length - 1; i >= 0; i--) {
    hash2 = (hash2 * 31 + raw.charCodeAt(i)) >>> 0;
  }
  const hexPart2 = hash2.toString(16).padStart(8, '0');

  return `tx_${hexPart1}${hexPart2}`;
};

/**
 * Filter keywords that indicate non-transactional or ineligible SMS messages.
 */
const IGNORED_PATTERNS = [
  /\botp\b/i,
  /\bone time password\b/i,
  /\bverification code\b/i,
  /\bsecurity code\b/i,
  /\bbalance is\b/i,
  /\bavailable balance\b/i,
  /\bavail bal\b/i,
  /\bfailed\b/i,
  /\bfailure\b/i,
  /\breversed\b/i,
  /\breversal\b/i,
  /\bcancelled\b/i,
  /\bcanceled\b/i,
  /\blogin alert\b/i,
  /\bpromo\b/i,
  /\boffer\b/i,
  /\bapply for\b/i,
  /\bpre-approved\b/i,
];

/**
 * Known banks in India for tagging
 */
const BANK_PATTERNS = [
  { name: 'HDFC Bank', regex: /\b(hdfc|hdfcbank)\b/i },
  { name: 'SBI', regex: /\b(sbi|state bank of india)\b/i },
  { name: 'ICICI Bank', regex: /\b(icici|icicibank)\b/i },
  { name: 'Axis Bank', regex: /\b(axis|axisbank)\b/i },
  { name: 'Kotak Bank', regex: /\b(kotak|kotakbank)\b/i },
  { name: 'Punjab National Bank', regex: /\b(pnb|punjab national)\b/i },
  { name: 'Bank of Baroda', regex: /\b(bob|bank of baroda)\b/i },
  { name: 'Paytm Payments Bank', regex: /\bpaytm\b/i },
  { name: 'Google Pay / UPI', regex: /\b(gpay|google pay|upi)\b/i },
];

/**
 * Parses bank transaction SMS locally on device.
 * Extracts amount, debit/credit, merchant, bank, reference ID, and fingerprint.
 */
export const parseBankTransactionSms = (
  message: string,
  smsTimestamp: number = Date.now()
): ParsedTransaction => {
  const emptyResult: ParsedTransaction = {
    isTransaction: false,
    type: 'UNKNOWN',
    amount: null,
    merchant: null,
    referenceId: null,
    timestamp: smsTimestamp,
    fingerprint: '',
    bank: null,
    accountSuffix: null,
  };

  if (!message || typeof message !== 'string') {
    return emptyResult;
  }

  const trimmed = message.trim();

  // 1. Filter out OTP, promotional, balance-only, failed, and reversed messages
  for (const pattern of IGNORED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return emptyResult;
    }
  }

  // 2. Determine Transaction Type (DEBIT vs CREDIT)
  const isDebit = /\b(debited|spent|paid|withdrawn|deducted|purchase of|debit of|sent to)\b/i.test(trimmed);
  const isCredit = /\b(credited|received|deposit|deposited)\b/i.test(trimmed);

  if (isCredit && !isDebit) {
    // As per MVP requirement: Initially support DEBIT transactions only
    return {
      ...emptyResult,
      isTransaction: true,
      type: 'CREDIT',
    };
  }
  if (!isDebit) {
    return emptyResult;
  }

  // 3. Extract Amount
  // Matches: "Rs.500", "Rs. 500.50", "INR 500", "₹500", "Rs 500", "INR. 500", "debited by Rs 500"
  const amountRegexes = [
    /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:rs\.?|inr|₹)/i,
    /(?:debited by|spent|paid)\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /transaction of\s*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ];

  let amount: number | null = null;
  for (const regex of amountRegexes) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      const cleanNum = match[1].replace(/,/g, '');
      const parsed = parseFloat(cleanNum);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
        break;
      }
    }
  }

  if (amount === null || amount <= 0) {
    return emptyResult;
  }

  // 4. Extract Merchant / Recipient
  // Matches: "at XYZ Store", "to XYZ", "vpa XYZ@upi", "for XYZ"
  let merchant: string | null = null;
  const merchantRegexes = [
    /(?:at|to|info\/|vpa)\s+([A-Za-z0-9\s&'.-]{2,30}?)(?:\s+on|\s+at|\s+ref|\s+dated|\s+bal|\.|\band\b|$)/i,
    /(?:towards|for)\s+([A-Za-z0-9\s&'.-]{2,25}?)(?:\s+on|\s+ref|\.|$)/i,
  ];

  for (const regex of merchantRegexes) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      const cleanMerchant = match[1].trim();
      // Exclude generic bank words from being the merchant
      if (!/^(a\/c|account|your account|card|bank|upi|atm|cash)$/i.test(cleanMerchant)) {
        merchant = cleanMerchant;
        break;
      }
    }
  }

  // 5. Extract Reference / UTR / Txn ID
  let referenceId: string | null = null;
  const refRegexes = [
    /(?:ref(?:erence)?(?:\s*no|\s*id)?|txn(?:\s*id)?|utr(?:\s*no)?)\s*[:#\-]?\s*([A-Za-z0-9]{6,22})/i,
    /upi\/[a-z0-9]+\/([0-9]{10,14})/i,
  ];

  for (const regex of refRegexes) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      referenceId = match[1].trim();
      break;
    }
  }

  // 6. Extract Account Suffix
  let accountSuffix: string | null = null;
  const accMatch = trimmed.match(/(?:a\/c|acct|card|ending)\s*(?:no\.?)?\s*[*xX]*([0-9]{4})/i);
  if (accMatch && accMatch[1]) {
    accountSuffix = accMatch[1];
  }

  // 7. Extract Bank Name
  let bank: string | null = null;
  for (const b of BANK_PATTERNS) {
    if (b.regex.test(trimmed)) {
      bank = b.name;
      break;
    }
  }

  // 8. Generate Fingerprint
  const fingerprint = generateFingerprint(amount, referenceId, smsTimestamp, merchant);

  return {
    isTransaction: true,
    type: 'DEBIT',
    amount,
    merchant,
    referenceId,
    timestamp: smsTimestamp,
    fingerprint,
    bank,
    accountSuffix,
  };
};
