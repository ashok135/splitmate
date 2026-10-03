import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  setExpenses,
  addExpenseSuccess,
  setSettlements,
  addSettlementSuccess,
  setBalancesAndDebts,
  setExpenseLoading,
  setExpenseError,
} from '../store/slices/expenseSlice';
import { expenseService } from '../services/expenseService';
import { settlementService } from '../services/settlementService';
import { notificationService } from '../services/notificationService';
import { calculateBalances, simplifyDebts } from '../utils/splitCalculator';
import { Expense, ExpenseSplit, Settlement } from '../types/expense';
import { GroupMember } from '../types/group';

export const useExpenses = (groupId?: string) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const expenses = useSelector(
    (state: RootState) => (groupId ? state.expenses.expenses[groupId] || [] : [])
  );
  const settlements = useSelector(
    (state: RootState) => (groupId ? state.expenses.settlements[groupId] || [] : [])
  );
  const balances = useSelector(
    (state: RootState) => (groupId ? state.expenses.balances[groupId] || {} : {})
  );
  const debts = useSelector(
    (state: RootState) => (groupId ? state.expenses.debts[groupId] || [] : [])
  );
  const loading = useSelector((state: RootState) => state.expenses.loading);

  const refreshGroupData = useCallback(
    async (targetGroupId: string, members: GroupMember[]) => {
      try {
        dispatch(setExpenseLoading(true));
        const [loadedExpenses, loadedSettlements] = await Promise.all([
          expenseService.getGroupExpenses(targetGroupId),
          settlementService.getGroupSettlements(targetGroupId),
        ]);

        dispatch(setExpenses({ groupId: targetGroupId, expenses: loadedExpenses }));
        dispatch(setSettlements({ groupId: targetGroupId, settlements: loadedSettlements }));

        // Recalculate balances & simplified debts
        const calculatedBalances = calculateBalances(members, loadedExpenses, loadedSettlements);
        const calculatedDebts = simplifyDebts(calculatedBalances);

        dispatch(
          setBalancesAndDebts({
            groupId: targetGroupId,
            balances: calculatedBalances,
            debts: calculatedDebts,
          })
        );
      } catch (err: any) {
        dispatch(setExpenseError(err.message || 'Failed to refresh expense data'));
      }
    },
    [dispatch]
  );

  const createExpense = async (params: {
    targetGroupId: string;
    groupName: string;
    amount: number;
    description: string;
    merchant?: string;
    splitType: 'equal' | 'custom' | 'percentage';
    splits: Record<string, ExpenseSplit>;
    source?: 'manual' | 'bank_sms';
    fingerprint?: string;
    members: GroupMember[];
  }): Promise<Expense> => {
    if (!user) throw new Error('Must be logged in to create expense');
    const {
      targetGroupId,
      groupName,
      amount,
      description,
      merchant,
      splitType,
      splits,
      source = 'manual',
      fingerprint,
      members,
    } = params;

    try {
      dispatch(setExpenseLoading(true));
      const newExpense = await expenseService.createExpense(
        targetGroupId,
        {
          groupId: targetGroupId,
          amount,
          currency: 'INR',
          paidBy: user.uid,
          description,
          merchant,
          splitType,
          source,
        },
        splits,
        user,
        fingerprint
      );

      dispatch(addExpenseSuccess({ groupId: targetGroupId, expense: newExpense }));

      // Send group push notification to other members
      await notificationService.sendGroupExpenseNotification({
        groupId: targetGroupId,
        groupName,
        expenseId: newExpense.expenseId,
        payerId: user.uid,
        payerName: user.displayName,
        amount,
        description,
      });

      // Update balances
      const updatedExpenses = [newExpense, ...expenses];
      const updatedBalances = calculateBalances(members, updatedExpenses, settlements);
      const updatedDebts = simplifyDebts(updatedBalances);

      dispatch(
        setBalancesAndDebts({
          groupId: targetGroupId,
          balances: updatedBalances,
          debts: updatedDebts,
        })
      );

      return newExpense;
    } catch (err: any) {
      dispatch(setExpenseError(err.message));
      throw err;
    }
  };

  const recordSettlement = async (params: {
    targetGroupId: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
    notes?: string;
    members: GroupMember[];
  }): Promise<Settlement> => {
    const { targetGroupId, fromUserId, toUserId, amount, notes, members } = params;

    try {
      const settlement = await settlementService.recordSettlement(
        targetGroupId,
        fromUserId,
        toUserId,
        amount,
        notes
      );

      dispatch(addSettlementSuccess({ groupId: targetGroupId, settlement }));

      // Recalculate balances
      const updatedSettlements = [settlement, ...settlements];
      const updatedBalances = calculateBalances(members, expenses, updatedSettlements);
      const updatedDebts = simplifyDebts(updatedBalances);

      dispatch(
        setBalancesAndDebts({
          groupId: targetGroupId,
          balances: updatedBalances,
          debts: updatedDebts,
        })
      );

      return settlement;
    } catch (err: any) {
      dispatch(setExpenseError(err.message));
      throw err;
    }
  };

  return {
    expenses,
    settlements,
    balances,
    debts,
    loading,
    refreshGroupData,
    createExpense,
    recordSettlement,
  };
};
