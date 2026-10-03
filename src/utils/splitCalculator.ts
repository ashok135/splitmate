import { ExpenseSplit, SplitType, UserBalance, Debt, Expense, Settlement } from '../types/expense';
import { GroupMember } from '../types/group';
import { rupeesToPaise, paiseToRupees } from './currency';

/**
 * Calculates equal splits for a list of member IDs using integer paise arithmetic.
 * Ensures the sum of individual splits is exactly equal to the total expense amount.
 */
export const calculateEqualSplit = (
  totalAmountRupees: number,
  memberIds: string[]
): Record<string, ExpenseSplit> => {
  if (memberIds.length === 0 || totalAmountRupees <= 0) {
    return {};
  }

  const totalPaise = rupeesToPaise(totalAmountRupees);
  const count = memberIds.length;
  const basePaisePerMember = Math.floor(totalPaise / count);
  let remainderPaise = totalPaise % count;

  const splits: Record<string, ExpenseSplit> = {};

  memberIds.forEach((uid) => {
    // Distribute remainder 1 paise at a time to first members
    const memberPaise = basePaisePerMember + (remainderPaise > 0 ? 1 : 0);
    if (remainderPaise > 0) {
      remainderPaise -= 1;
    }

    const amountOwed = paiseToRupees(memberPaise);
    const percentage = Number(((memberPaise / totalPaise) * 100).toFixed(2));

    splits[uid] = {
      userId: uid,
      amountOwed,
      amountOwedPaise: memberPaise,
      percentage,
      settled: false,
    };
  });

  return splits;
};

/**
 * Calculates custom amount splits and validates total.
 */
export const calculateCustomSplit = (
  totalAmountRupees: number,
  customAmounts: Record<string, number>
): { splits: Record<string, ExpenseSplit>; isValid: boolean; difference: number } => {
  const targetPaise = rupeesToPaise(totalAmountRupees);
  let allocatedPaise = 0;
  const splits: Record<string, ExpenseSplit> = {};

  Object.entries(customAmounts).forEach(([uid, amount]) => {
    const memberPaise = rupeesToPaise(amount);
    allocatedPaise += memberPaise;
    const percentage = targetPaise > 0 ? Number(((memberPaise / targetPaise) * 100).toFixed(2)) : 0;

    splits[uid] = {
      userId: uid,
      amountOwed: paiseToRupees(memberPaise),
      amountOwedPaise: memberPaise,
      percentage,
      settled: false,
    };
  });

  const diffPaise = targetPaise - allocatedPaise;
  const isValid = diffPaise === 0;

  return {
    splits,
    isValid,
    difference: paiseToRupees(diffPaise),
  };
};

/**
 * Calculates percentage splits and validates that percentages sum to 100.
 * Allocates remainder paise so exact total matches.
 */
export const calculatePercentageSplit = (
  totalAmountRupees: number,
  percentages: Record<string, number>
): { splits: Record<string, ExpenseSplit>; isValid: boolean; percentageSum: number } => {
  const percentageSum = Object.values(percentages).reduce((sum, p) => sum + p, 0);
  const isPercentageValid = Math.abs(percentageSum - 100) < 0.01;

  const totalPaise = rupeesToPaise(totalAmountRupees);
  const splits: Record<string, ExpenseSplit> = {};

  const entries = Object.entries(percentages);
  let totalAllocatedPaise = 0;

  entries.forEach(([uid, pct], index) => {
    // For the last element, assign remaining paise if percentage sum is 100
    let memberPaise: number;
    if (index === entries.length - 1 && isPercentageValid) {
      memberPaise = totalPaise - totalAllocatedPaise;
    } else {
      memberPaise = Math.round((pct / 100) * totalPaise);
      totalAllocatedPaise += memberPaise;
    }

    splits[uid] = {
      userId: uid,
      amountOwed: paiseToRupees(memberPaise),
      amountOwedPaise: memberPaise,
      percentage: pct,
      settled: false,
    };
  });

  return {
    splits,
    isValid: isPercentageValid,
    percentageSum: Number(percentageSum.toFixed(2)),
  };
};

/**
 * Validates any split according to its type.
 */
export const validateSplits = (
  totalAmountRupees: number,
  splitType: SplitType,
  splits: Record<string, ExpenseSplit>
): { valid: boolean; message?: string } => {
  const splitList = Object.values(splits);
  if (splitList.length === 0) {
    return { valid: false, message: 'At least one member must be selected for splitting.' };
  }

  const targetPaise = rupeesToPaise(totalAmountRupees);
  const sumPaise = splitList.reduce(
    (sum, s) => sum + (s.amountOwedPaise ?? rupeesToPaise(s.amountOwed)),
    0
  );

  if (splitType === 'equal') {
    return { valid: true };
  }

  if (splitType === 'custom') {
    if (targetPaise !== sumPaise) {
      const diff = paiseToRupees(targetPaise - sumPaise);
      return {
        valid: false,
        message: `Sum of splits (₹${paiseToRupees(sumPaise)}) must equal total expense amount (₹${totalAmountRupees}). Difference: ₹${diff}`,
      };
    }
  }

  if (splitType === 'percentage') {
    const sumPct = splitList.reduce((sum, s) => sum + (s.percentage ?? 0), 0);
    if (Math.abs(sumPct - 100) > 0.05) {
      return {
        valid: false,
        message: `Sum of percentages (${sumPct.toFixed(1)}%) must equal 100%.`,
      };
    }
  }

  return { valid: true };
};

/**
 * Calculates net balance for every member in the group.
 * Formula:
 * totalPaid = sum(expenses paid by user) + sum(settlements paid by user)
 * totalOwed = sum(splits owed by user across all expenses) + sum(settlements received by user)
 * netBalance = totalPaid - totalOwed
 */
export const calculateBalances = (
  members: GroupMember[],
  expenses: Expense[],
  settlements: Settlement[] = []
): Record<string, UserBalance> => {
  const balances: Record<string, UserBalance> = {};
  const paidPaise: Record<string, number> = {};
  const owedPaise: Record<string, number> = {};
  const expensePaidPaise: Record<string, number> = {};
  const expenseSharePaise: Record<string, number> = {};

  // Helper to ensure member is initialized
  const ensureMember = (uid: string, name?: string) => {
    if (!balances[uid]) {
      balances[uid] = {
        userId: uid,
        displayName: name || 'Member',
        totalPaid: 0,
        totalOwed: 0,
        expensePaid: 0,
        expenseShare: 0,
        netBalance: 0,
      };
      paidPaise[uid] = 0;
      owedPaise[uid] = 0;
      expensePaidPaise[uid] = 0;
      expenseSharePaise[uid] = 0;
    }
  };

  // Initialize for all known members
  members.forEach((m) => {
    ensureMember(m.uid, m.displayName);
  });

  // Tally expenses with integer paise
  expenses.forEach((expense) => {
    const payerId = expense.paidBy;
    ensureMember(payerId);
    const amountP = rupeesToPaise(expense.amount);
    paidPaise[payerId] += amountP;
    expensePaidPaise[payerId] += amountP;

    if (expense.splits && Object.keys(expense.splits).length > 0) {
      Object.values(expense.splits).forEach((split) => {
        ensureMember(split.userId);
        const splitPaise = split.amountOwedPaise ?? rupeesToPaise(split.amountOwed);
        owedPaise[split.userId] += splitPaise;
        expenseSharePaise[split.userId] += splitPaise;
      });
    } else {
      // Fallback: If no splits recorded, distribute equally across group members
      const activeMembers = members.length > 0 ? members : [{ uid: payerId, displayName: 'Payer' } as GroupMember];
      const count = activeMembers.length;
      const base = Math.floor(amountP / count);
      let rem = amountP % count;

      activeMembers.forEach((m) => {
        ensureMember(m.uid, m.displayName);
        const portion = base + (rem > 0 ? 1 : 0);
        owedPaise[m.uid] += portion;
        expenseSharePaise[m.uid] += portion;
        if (rem > 0) rem--;
      });
    }
  });

  // Tally settlements with integer paise
  settlements.forEach((settlement) => {
    ensureMember(settlement.fromUserId);
    ensureMember(settlement.toUserId);
    paidPaise[settlement.fromUserId] += rupeesToPaise(settlement.amount);
    owedPaise[settlement.toUserId] += rupeesToPaise(settlement.amount);
  });

  // Compute final amounts in exact 2-decimal Rupees
  Object.keys(balances).forEach((uid) => {
    const b = balances[uid];
    b.totalPaid = paiseToRupees(paidPaise[uid]);
    b.totalOwed = paiseToRupees(owedPaise[uid]);
    b.expensePaid = paiseToRupees(expensePaidPaise[uid] || 0);
    b.expenseShare = paiseToRupees(expenseSharePaise[uid] || 0);
    b.netBalance = paiseToRupees(paidPaise[uid] - owedPaise[uid]);
  });

  return balances;
};

/**
 * Debt simplification algorithm using greedy approach on positive & negative balances.
 * Determines who owes whom directly with the minimum number of settlements.
 */
export const simplifyDebts = (
  balances: Record<string, UserBalance>
): Debt[] => {
  const debtors: { uid: string; name: string; amountPaise: number }[] = [];
  const creditors: { uid: string; name: string; amountPaise: number }[] = [];

  Object.values(balances).forEach((b) => {
    const netPaise = rupeesToPaise(b.netBalance);
    if (netPaise < 0) {
      debtors.push({ uid: b.userId, name: b.displayName, amountPaise: -netPaise });
    } else if (netPaise > 0) {
      creditors.push({ uid: b.userId, name: b.displayName, amountPaise: netPaise });
    }
  });

  // Sort descending by amount
  debtors.sort((a, b) => b.amountPaise - a.amountPaise);
  creditors.sort((a, b) => b.amountPaise - a.amountPaise);

  const debts: Debt[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settledPaise = Math.min(debtor.amountPaise, creditor.amountPaise);
    if (settledPaise > 0) {
      debts.push({
        fromUserId: debtor.uid,
        fromName: debtor.name,
        toUserId: creditor.uid,
        toName: creditor.name,
        amount: paiseToRupees(settledPaise),
      });
    }

    debtor.amountPaise -= settledPaise;
    creditor.amountPaise -= settledPaise;

    if (debtor.amountPaise <= 0) dIdx++;
    if (creditor.amountPaise <= 0) cIdx++;
  }

  return debts;
};
