import { Share } from 'react-native';
import { Expense, Settlement, UserBalance, Debt } from '../types/expense';
import { GroupMember } from '../types/group';
import { formatINR } from '../utils/currency';
import { firestore, cleanForFirestore } from './firebase';
import { calculateBalances, simplifyDebts } from '../utils/splitCalculator';

export interface MonthlyStatement {
  statementId: string;
  groupId: string;
  groupName: string;
  monthYear: string; // e.g. "2026-10"
  monthLabel: string; // e.g. "October 2026"
  totalExpenseAmount: number;
  totalExpensesCount: number;
  memberBalances: Record<string, UserBalance>;
  finalDebts: Debt[];
  closedAt: number;
  closedBy: string;
}

export const monthlyLedgerService = {
  /**
   * Filter expenses for a specific month (0-indexed month: 0=Jan, 9=Oct, etc.)
   */
  filterByMonth<T extends { createdAt: number }>(items: T[], year: number, monthIndex: number): T[] {
    return items.filter((item) => {
      const d = new Date(item.createdAt);
      return d.getFullYear() === year && d.getMonth() === monthIndex;
    });
  },

  /**
   * Formats the 1st of the month reminder message for a member:
   * e.g. "You have to pay ₹1,000 to Rahul and ₹200 to Priya"
   */
  generateDay1ReminderText(
    groupName: string,
    monthLabel: string,
    currentUserId: string,
    debts: Debt[]
  ): string {
    const myDebts = debts.filter((d) => d.fromUserId === currentUserId);
    const debtsToMe = debts.filter((d) => d.toUserId === currentUserId);

    let message = `${groupName} • ${monthLabel} Monthly Settlement\n`;
    message += `-----------------------------------------\n`;

    if (myDebts.length === 0 && debtsToMe.length === 0) {
      message += `All flatmates are completely settled up! You have ₹0 dues for ${monthLabel}.\n`;
    } else {
      if (myDebts.length > 0) {
        message += `What you need to pay this month:\n`;
        myDebts.forEach((d) => {
          message += `• Pay ${formatINR(d.amount)} to ${d.toName}\n`;
        });
        message += `\n`;
      }

      if (debtsToMe.length > 0) {
        message += `Money friends owe you:\n`;
        debtsToMe.forEach((d) => {
          message += `• ${d.fromName} owes you ${formatINR(d.amount)}\n`;
        });
        message += `\n`;
      }
    }

    message += `Please settle before the 5th of the month via UPI.\nShared via SplitMate`;
    return message;
  },

  /**
   * Generates a complete comprehensive monthly report for flatmates
   */
  generateFullMonthlyReportText(
    groupName: string,
    monthLabel: string,
    members: GroupMember[],
    monthlyExpenses: Expense[],
    balances: Record<string, UserBalance>,
    debts: Debt[]
  ): string {
    const totalSpent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

    let report = `${groupName.toUpperCase()} — ${monthLabel.toUpperCase()} STATEMENT\n`;
    report += `=========================================\n`;
    report += `Total Group Spend: ${formatINR(totalSpent)} (${monthlyExpenses.length} expenses)\n\n`;

    report += `MEMBER BREAKDOWN:\n`;
    members.forEach((m) => {
      const bal = balances[m.uid];
      const paid = bal ? formatINR(bal.expensePaid ?? bal.totalPaid) : '₹0';
      const share = bal ? formatINR(bal.expenseShare ?? bal.totalOwed) : '₹0';
      const net = bal ? bal.netBalance : 0;
      const netStr = net > 0 ? `+${formatINR(net)} (to receive)` : net < 0 ? `-${formatINR(Math.abs(net))} (to pay)` : 'Settled';
      report += `• ${m.displayName}: Paid ${paid} | Share ${share} | Net: ${netStr}\n`;
    });

    report += `\nFINAL SETTLEMENT INSTRUCTIONS:\n`;
    if (debts.length === 0) {
      report += `• No pending payments. All settled!\n`;
    } else {
      debts.forEach((d) => {
        report += `• ${d.fromName} pays ${d.toName} -> ${formatINR(d.amount)}\n`;
      });
    }

    report += `\n=========================================\n`;
    report += `Generated with SplitMate. Starting fresh for next month!`;
    return report;
  },

  /**
   * Share report or reminder via native Android share sheet (WhatsApp, SMS, etc.)
   */
  async shareReport(message: string, title: string = 'SplitMate Monthly Report'): Promise<void> {
    try {
      await Share.share(
        {
          title,
          message,
        },
        {
          dialogTitle: title,
        }
      );
    } catch (error) {
      console.warn('Share error:', error);
    }
  },

  /**
   * Archive/Close month in Firestore and return statement record
   */
  async closeMonthAndArchive(params: {
    groupId: string;
    groupName: string;
    year: number;
    monthIndex: number;
    monthLabel: string;
    members: GroupMember[];
    expenses: Expense[];
    settlements: Settlement[];
    userId: string;
  }): Promise<MonthlyStatement> {
    const {
      groupId,
      groupName,
      year,
      monthIndex,
      monthLabel,
      members,
      expenses,
      settlements,
      userId,
    } = params;

    const monthlyExpenses = this.filterByMonth(expenses, year, monthIndex);
    const monthlySettlements = this.filterByMonth(settlements, year, monthIndex);

    const balances = calculateBalances(members, monthlyExpenses, monthlySettlements);
    const debts = simplifyDebts(balances);
    const totalSpent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    const statementRef = firestore()
      .collection('groups')
      .doc(groupId)
      .collection('monthlyStatements')
      .doc(monthKey);

    const statement: MonthlyStatement = cleanForFirestore({
      statementId: monthKey,
      groupId,
      groupName,
      monthYear: monthKey,
      monthLabel,
      totalExpenseAmount: totalSpent,
      totalExpensesCount: monthlyExpenses.length,
      memberBalances: balances,
      finalDebts: debts,
      closedAt: Date.now(),
      closedBy: userId,
    });

    await statementRef.set(statement);
    return statement;
  },

  /**
   * Get past archived monthly statements
   */
  async getPastStatements(groupId: string): Promise<MonthlyStatement[]> {
    const snap = await firestore()
      .collection('groups')
      .doc(groupId)
      .collection('monthlyStatements')
      .orderBy('closedAt', 'desc')
      .get();

    return snap.docs.map((doc) => doc.data() as MonthlyStatement);
  },
};
