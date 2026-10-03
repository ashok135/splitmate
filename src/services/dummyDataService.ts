import { firestore, cleanForFirestore } from './firebase';
import { Group, GroupMember } from '../types/group';
import { Expense, Settlement } from '../types/expense';
import { UserProfile } from '../types/auth';
import { generateInviteCode } from './groupService';
import { calculateEqualSplit } from '../utils/splitCalculator';

export const dummyDataService = {
  /**
   * Generates a fully populated 4-member group with realistic monthly expenses
   * (October 2026 & September 2026) and settlements.
   */
  async seedFourMemberData(currentUser: UserProfile): Promise<Group> {
    const groupRef = firestore().collection('groups').doc();
    const groupId = groupRef.id;
    const now = Date.now();
    const inviteCode = generateInviteCode('FLAT');

    const member1 = {
      uid: currentUser.uid,
      displayName: currentUser.displayName || 'You',
      email: currentUser.email || 'you@example.com',
      role: 'owner' as const,
      joinedAt: now - 30 * 24 * 60 * 60 * 1000,
    };

    const member2 = {
      uid: 'demo_user_rahul',
      displayName: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      role: 'member' as const,
      joinedAt: now - 28 * 24 * 60 * 60 * 1000,
    };

    const member3 = {
      uid: 'demo_user_priya',
      displayName: 'Priya Patel',
      email: 'priya.patel@example.com',
      role: 'member' as const,
      joinedAt: now - 27 * 24 * 60 * 60 * 1000,
    };

    const member4 = {
      uid: 'demo_user_amit',
      displayName: 'Amit Kumar',
      email: 'amit.kumar@example.com',
      role: 'member' as const,
      joinedAt: now - 26 * 24 * 60 * 60 * 1000,
    };

    const allMembers: GroupMember[] = [member1, member2, member3, member4];
    const memberIds = allMembers.map((m) => m.uid);

    const groupData: Group = {
      groupId,
      name: 'Apartment 402 Flatmates',
      inviteCode,
      createdBy: currentUser.uid,
      createdAt: now - 30 * 24 * 60 * 60 * 1000,
      updatedAt: now,
      memberCount: 4,
      memberIds,
    };

    const batch = firestore().batch();

    // 1. Group document
    batch.set(groupRef, cleanForFirestore(groupData));

    // 2. Members subcollection
    allMembers.forEach((m) => {
      const mRef = groupRef.collection('members').doc(m.uid);
      batch.set(mRef, cleanForFirestore(m));
    });

    // 3. User default group
    const userRef = firestore().collection('users').doc(currentUser.uid);
    batch.update(userRef, { defaultGroupId: groupId, updatedAt: now });

    await batch.commit();

    // 4. Create expenses in batches
    // Realistic dates:
    // October 2026:
    const oct1 = new Date('2026-10-01T10:00:00Z').getTime();
    const oct2 = new Date('2026-10-02T13:30:00Z').getTime();
    const oct2Night = new Date('2026-10-02T20:15:00Z').getTime();
    const oct3 = new Date('2026-10-03T19:00:00Z').getTime();

    // September 2026:
    const sep25 = new Date('2026-09-25T18:00:00Z').getTime();
    const sep28 = new Date('2026-09-28T11:00:00Z').getTime();
    const sep29 = new Date('2026-09-29T16:00:00Z').getTime();

    const sampleExpenses: Array<{
      description: string;
      amount: number;
      paidBy: string;
      merchant?: string;
      createdAt: number;
    }> = [
      {
        description: 'October Flat Rent',
        amount: 24000,
        paidBy: currentUser.uid,
        merchant: 'Landlord - Mr. Gupta',
        createdAt: oct1,
      },
      {
        description: 'Swiggy Weekend Biryani & Starters',
        amount: 2400,
        paidBy: member2.uid,
        merchant: 'Swiggy',
        createdAt: oct3,
      },
      {
        description: 'Airtel Broadband WiFi (300 Mbps)',
        amount: 1199,
        paidBy: member3.uid,
        merchant: 'Airtel Fibernet',
        createdAt: oct2Night,
      },
      {
        description: "Nature's Basket Groceries & Veggies",
        amount: 3600,
        paidBy: member4.uid,
        merchant: "Nature's Basket",
        createdAt: oct2,
      },
      {
        description: 'BESCOM Electricity Bill',
        amount: 2800,
        paidBy: currentUser.uid,
        merchant: 'BESCOM Bangalore',
        createdAt: sep28,
      },
      {
        description: 'PVR Cinemas Movie Tickets & Snacks',
        amount: 1800,
        paidBy: member2.uid,
        merchant: 'PVR Cinemas',
        createdAt: sep25,
      },
    ];

    const expBatch = firestore().batch();

    sampleExpenses.forEach((item) => {
      const expRef = groupRef.collection('expenses').doc();
      const expId = expRef.id;
      const splits = calculateEqualSplit(item.amount, memberIds);

      const expData: Expense = cleanForFirestore({
        expenseId: expId,
        groupId,
        amount: item.amount,
        currency: 'INR',
        paidBy: item.paidBy,
        description: item.description,
        merchant: item.merchant,
        splitType: 'equal',
        source: 'manual',
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
        splits,
      });

      expBatch.set(expRef, expData);

      Object.values(splits).forEach((split) => {
        const splitRef = expRef.collection('splits').doc(split.userId);
        expBatch.set(splitRef, cleanForFirestore(split));
      });
    });

    // 5. Add a settlement in September
    const setRef = groupRef.collection('settlements').doc();
    const settlementData: Settlement = cleanForFirestore({
      settlementId: setRef.id,
      groupId,
      fromUserId: member4.uid,
      toUserId: currentUser.uid,
      amount: 2000,
      createdAt: sep29,
      notes: 'GPay Settlement for September Groceries',
    });
    expBatch.set(setRef, settlementData);

    await expBatch.commit();

    return groupData;
  },
};
