import { firestore } from './firebase';
import { Settlement } from '../types/expense';

export const settlementService = {
  /**
   * Record a settlement between two members (Arun pays Ashok)
   */
  async recordSettlement(
    groupId: string,
    fromUserId: string,
    toUserId: string,
    amount: number,
    notes?: string
  ): Promise<Settlement> {
    const settlementRef = firestore()
      .collection('groups')
      .doc(groupId)
      .collection('settlements')
      .doc();

    const settlementId = settlementRef.id;
    const now = Date.now();

    const settlement: Settlement = {
      settlementId,
      groupId,
      fromUserId,
      toUserId,
      amount,
      createdAt: now,
      notes: notes?.trim(),
    };

    await settlementRef.set(settlement);
    return settlement;
  },

  /**
   * Get all settlements for a group
   */
  async getGroupSettlements(groupId: string): Promise<Settlement[]> {
    const snap = await firestore()
      .collection('groups')
      .doc(groupId)
      .collection('settlements')
      .orderBy('createdAt', 'desc')
      .get();

    return snap.docs.map((doc) => doc.data() as Settlement);
  },
};
