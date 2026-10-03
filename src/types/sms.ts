export type TransactionType = 'DEBIT' | 'CREDIT' | 'UNKNOWN';

export interface ParsedTransaction {
  isTransaction: boolean;
  type: TransactionType;
  amount: number | null;
  merchant: string | null;
  referenceId: string | null;
  timestamp: number | null;
  fingerprint: string;
  bank?: string | null;
  accountSuffix?: string | null;
}

export interface ProcessedTransactionDoc {
  fingerprint: string;
  userId: string;
  amount: number;
  detectedAt: number;
  createdExpenseId?: string;
  groupId?: string;
  merchant?: string;
}
