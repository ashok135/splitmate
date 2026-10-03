import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Expense, Settlement, UserBalance, Debt } from '../../types/expense';

interface ExpenseState {
  expenses: Record<string, Expense[]>;       // groupId -> expenses
  settlements: Record<string, Settlement[]>; // groupId -> settlements
  balances: Record<string, Record<string, UserBalance>>; // groupId -> (uid -> balance)
  debts: Record<string, Debt[]>;             // groupId -> simplified debts
  loading: boolean;
  error: string | null;
  pendingSyncCount: number;
}

const initialState: ExpenseState = {
  expenses: {},
  settlements: {},
  balances: {},
  debts: {},
  loading: false,
  error: null,
  pendingSyncCount: 0,
};

const expenseSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    setExpenses: (
      state,
      action: PayloadAction<{ groupId: string; expenses: Expense[] }>
    ) => {
      state.expenses[action.payload.groupId] = action.payload.expenses;
      state.loading = false;
    },
    addExpenseSuccess: (
      state,
      action: PayloadAction<{ groupId: string; expense: Expense }>
    ) => {
      const { groupId, expense } = action.payload;
      if (!state.expenses[groupId]) {
        state.expenses[groupId] = [];
      }
      state.expenses[groupId].unshift(expense);
    },
    deleteExpenseSuccess: (
      state,
      action: PayloadAction<{ groupId: string; expenseId: string }>
    ) => {
      const { groupId, expenseId } = action.payload;
      if (state.expenses[groupId]) {
        state.expenses[groupId] = state.expenses[groupId].filter((e) => e.expenseId !== expenseId);
      }
    },
    setSettlements: (
      state,
      action: PayloadAction<{ groupId: string; settlements: Settlement[] }>
    ) => {
      state.settlements[action.payload.groupId] = action.payload.settlements;
    },
    addSettlementSuccess: (
      state,
      action: PayloadAction<{ groupId: string; settlement: Settlement }>
    ) => {
      const { groupId, settlement } = action.payload;
      if (!state.settlements[groupId]) {
        state.settlements[groupId] = [];
      }
      state.settlements[groupId].unshift(settlement);
    },
    setBalancesAndDebts: (
      state,
      action: PayloadAction<{
        groupId: string;
        balances: Record<string, UserBalance>;
        debts: Debt[];
      }>
    ) => {
      state.balances[action.payload.groupId] = action.payload.balances;
      state.debts[action.payload.groupId] = action.payload.debts;
    },
    setExpenseLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setExpenseError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    setPendingSyncCount: (state, action: PayloadAction<number>) => {
      state.pendingSyncCount = action.payload;
    },
  },
});

export const {
  setExpenses,
  addExpenseSuccess,
  deleteExpenseSuccess,
  setSettlements,
  addSettlementSuccess,
  setBalancesAndDebts,
  setExpenseLoading,
  setExpenseError,
  setPendingSyncCount,
} = expenseSlice.actions;

export default expenseSlice.reducer;
