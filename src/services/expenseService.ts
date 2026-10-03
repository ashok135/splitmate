import { firestore } from './firebase';
import { Expense, ExpenseSplit } from '../types/expense';
import { UserProfile } from '../types/auth';
import { ProcessedTransactionDoc } from '../types/sms';

export const expenseService = {
  /**
   * Check if a transaction fingerprint has already been processed
   */
  async isTransactionProcessed(fingerprint: string): Promise<boolean> {
    if (!fingerprint) return false;
    const doc = await firestore().collection('processedTransactions').doc(fingerprint).get();
    return doc.exists;
  },

  /**
   * Create a new expense with splits and duplicate protection
   */
  async createExpense(
    groupId: string,
    expenseData: Omit<Expense, 'expenseId' | 'createdAt' | 'updatedAt'>,
    splits: Record<string, ExpenseSplit>,
    user: UserProfile,
    fingerprint?: string
  ): Promise<Expense> {
    const expenseRef = firestore()
      .collection('groups')
      .doc(groupId)
      .collection('expenses')
      .doc();

    const expenseId = expenseRef.id;
    const now = Date.now();

    const fullExpense: Expense = {
      ...expenseData,
      expenseId,
      groupId,
      createdAt: now,
      updatedAt: now,
      splits, // Embedded for single-document read efficiency
    };

    const batch = firestore().batch();

    // 1. Write the main expense doc
    batch.set(expenseRef, fullExpense);

    // 2. Write each split into groups/{groupId}/expenses/{expenseId}/splits/{uid}
    Object.values(splits).forEach((split) => {
      const splitRef = expenseRef.collection('splits').doc(split.userId);
      batch.set(splitRef, split);
    });

    // 3. If there is a bank SMS fingerprint, record in processedTransactions/{fingerprint}
    if (fingerprint) {
      const procRef = firestore().collection('processedTransactions').doc(fingerprint);
      const procData: ProcessedTransactionDoc = {
        fingerprint,
        userId: user.uid,
        amount: expenseData.amount,
        detectedAt: now,
        createdExpenseId: expenseId,
        groupId,
        merchant: expenseData.merchant,
      };
      batch.set(procRef, procData);
    }

    // 4. Update group updatedAt
    const groupRef = firestore().collection('groups').doc(groupId);
    batch.update(groupRef, { updatedAt: now });

    await batch.commit();
    return fullExpense;
  },

  /**
   * Update an existing expense
   */
  async updateExpense(
    groupId: string,
    expenseId: string,
    expenseData: Partial<Expense>,
    splits?: Record<string, ExpenseSplit>
  ): Promise<void> {
    const expenseRef = firestore()
      .collection('groups')
      .doc(groupId)
      .collection('expenses')
      .doc(expenseId);

    const now = Date.now();
    const updateData: any = {
      ...expenseData,
      updatedAt: now,
    };

    if (splits) {
      updateData.splits = splits;
    }

    const batch = firestore().batch();
    batch.update(expenseRef, updateData);

    if (splits) {
      Object.values(splits).forEach((split) => {
        const splitRef = expenseRef.collection('splits').doc(split.userId);
        batch.set(splitRef, split);
      });
    }

    await batch.commit();
  },

  /**
   * Delete an expense
   */
  async deleteExpense(groupId: string, expenseId: string): Promise<void> {
    const expenseRef = firestore()
      .collection('groups')
      .doc(groupId)
      .collection('expenses')
      .doc(expenseId);

    await expenseRef.delete();
  },

  /**
   * Fetch all expenses for a group
   */
  async getGroupExpenses(groupId: string): Promise<Expense[]> {
    const snap = await firestore()
      .collection('groups')
      .doc(groupId)
      .collection('expenses')
      .orderBy('createdAt', 'desc')
      .get();

    return snap.docs.map((doc) => doc.data() as Expense);
  },

  /**
   * Get single expense by ID
   */
  async getExpenseById(groupId: string, expenseId: string): Promise<Expense | null> {
    const doc = await firestore()
      .collection('groups')
      .doc(groupId)
      .collection('expenses')
      .doc(expenseId)
      .get();

    if (!doc.exists) return null;
    return doc.data() as Expense;
  },
};
