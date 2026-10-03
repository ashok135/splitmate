import { calculateBalances, simplifyDebts } from '../src/utils/splitCalculator';
import { GroupMember } from '../src/types/group';
import { Expense, Settlement } from '../src/types/expense';

describe('Balance & Settlement Calculations', () => {
  const members: GroupMember[] = [
    { uid: 'u_ashok', displayName: 'Ashok', role: 'owner', joinedAt: 1 },
    { uid: 'u_arun', displayName: 'Arun', role: 'member', joinedAt: 2 },
    { uid: 'u_kumar', displayName: 'Kumar', role: 'member', joinedAt: 3 },
    { uid: 'u_priya', displayName: 'Priya', role: 'member', joinedAt: 4 },
  ];

  it('calculates net balance correctly when Ashok pays ₹500 split equally 4 ways', () => {
    const expenses: Expense[] = [
      {
        expenseId: 'exp_1',
        groupId: 'grp_goa',
        amount: 500,
        currency: 'INR',
        paidBy: 'u_ashok',
        description: 'Hotel',
        splitType: 'equal',
        source: 'manual',
        createdAt: 1000,
        updatedAt: 1000,
        splits: {
          u_ashok: { userId: 'u_ashok', amountOwed: 125 },
          u_arun: { userId: 'u_arun', amountOwed: 125 },
          u_kumar: { userId: 'u_kumar', amountOwed: 125 },
          u_priya: { userId: 'u_priya', amountOwed: 125 },
        },
      },
    ];

    const balances = calculateBalances(members, expenses, []);

    // Ashok: Paid = 500, Owed = 125, Net = +375
    expect(balances['u_ashok'].totalPaid).toBe(500);
    expect(balances['u_ashok'].totalOwed).toBe(125);
    expect(balances['u_ashok'].netBalance).toBe(375);

    // Arun: Paid = 0, Owed = 125, Net = -125
    expect(balances['u_arun'].totalPaid).toBe(0);
    expect(balances['u_arun'].totalOwed).toBe(125);
    expect(balances['u_arun'].netBalance).toBe(-125);

    // Kumar: Paid = 0, Owed = 125, Net = -125
    expect(balances['u_kumar'].netBalance).toBe(-125);

    // Priya: Paid = 0, Owed = 125, Net = -125
    expect(balances['u_priya'].netBalance).toBe(-125);

    // Check debt simplification
    const debts = simplifyDebts(balances);
    expect(debts.length).toBe(3);
    expect(debts.every((d) => d.toUserId === 'u_ashok')).toBe(true);
    expect(debts.reduce((sum, d) => sum + d.amount, 0)).toBe(375);
  });

  it('updates balance to 0 after settlement (Arun pays Ashok ₹125)', () => {
    const expenses: Expense[] = [
      {
        expenseId: 'exp_1',
        groupId: 'grp_goa',
        amount: 500,
        currency: 'INR',
        paidBy: 'u_ashok',
        splitType: 'equal',
        source: 'manual',
        createdAt: 1000,
        updatedAt: 1000,
        splits: {
          u_ashok: { userId: 'u_ashok', amountOwed: 125 },
          u_arun: { userId: 'u_arun', amountOwed: 125 },
          u_kumar: { userId: 'u_kumar', amountOwed: 125 },
          u_priya: { userId: 'u_priya', amountOwed: 125 },
        },
      },
    ];

    const settlements: Settlement[] = [
      {
        settlementId: 'set_1',
        groupId: 'grp_goa',
        fromUserId: 'u_arun',
        toUserId: 'u_ashok',
        amount: 125,
        createdAt: 2000,
      },
    ];

    const balances = calculateBalances(members, expenses, settlements);

    // Arun balance is now 0!
    expect(balances['u_arun'].netBalance).toBe(0);

    // Ashok balance is now +250
    expect(balances['u_ashok'].netBalance).toBe(250);

    // Debts now only contain Kumar and Priya
    const debts = simplifyDebts(balances);
    expect(debts.length).toBe(2);
    expect(debts.some((d) => d.fromUserId === 'u_arun')).toBe(false);
  });
});
