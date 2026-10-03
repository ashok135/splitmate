export type SplitType = 'equal' | 'custom' | 'percentage';

export type ExpenseSource = 'manual' | 'bank_sms';

export interface ExpenseSplit {
  userId: string;
  amountOwed: number; // in Rupees
  amountOwedPaise?: number; // in Paise for exact math
  percentage?: number;
  settled?: boolean;
}

export interface Expense {
  expenseId: string;
  groupId: string;
  amount: number; // in Rupees
  currency: 'INR';
  paidBy: string; // userId of payer
  description?: string;
  merchant?: string;
  splitType: SplitType;
  source: ExpenseSource;
  transactionId?: string;
  createdAt: number;
  updatedAt: number;
  splits?: Record<string, ExpenseSplit>;
}

export interface Settlement {
  settlementId: string;
  groupId: string;
  fromUserId: string; // User who paid
  toUserId: string;   // User who received
  amount: number;
  createdAt: number;
  notes?: string;
}

export interface UserBalance {
  userId: string;
  displayName: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number; // positive = owed money, negative = owes money
}

export interface Debt {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
}
