import { firestore } from './firebase';
import { Group, GroupMember } from '../types/group';
import { UserProfile } from '../types/auth';

/**
 * Generates an uppercase 6-character random alphanumeric invite code (e.g. GOA7K2)
 */
export const generateInviteCode = (groupName?: string): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes ambiguous 0, O, 1, I
  let prefix = '';
  if (groupName) {
    const cleaned = groupName.replace(/[^A-Za-z]/g, '').toUpperCase();
    if (cleaned.length >= 3) {
      prefix = cleaned.substring(0, 3);
    }
  }

  let code = prefix;
  while (code.length < 6) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const groupService = {
  /**
   * Create a new group, set creator as owner/admin, add to members subcollection
   */
  async createGroup(name: string, user: UserProfile): Promise<Group> {
    const groupRef = firestore().collection('groups').doc();
    const groupId = groupRef.id;
    const now = Date.now();
    const inviteCode = generateInviteCode(name);

    const groupData: Group = {
      groupId,
      name: name.trim(),
      inviteCode,
      createdBy: user.uid,
      createdAt: now,
      updatedAt: now,
      memberCount: 1,
    };

    const batch = firestore().batch();

    // 1. Set group document
    batch.set(groupRef, groupData);

    // 2. Set creator as owner in groups/{groupId}/members/{uid}
    const memberRef = groupRef.collection('members').doc(user.uid);
    const memberData: GroupMember = {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      role: 'owner',
      joinedAt: now,
    };
    batch.set(memberRef, memberData);

    // 3. If user has no default group, set this group as default
    if (!user.defaultGroupId) {
      const userRef = firestore().collection('users').doc(user.uid);
      batch.update(userRef, { defaultGroupId: groupId, updatedAt: now });
    }

    await batch.commit();
    return groupData;
  },

  /**
   * Join a group using a 6-character invite code
   */
  async joinGroupByInviteCode(inviteCode: string, user: UserProfile): Promise<Group> {
    const cleanCode = inviteCode.trim().toUpperCase();
    const querySnap = await firestore()
      .collection('groups')
      .where('inviteCode', '==', cleanCode)
      .limit(1)
      .get();

    if (querySnap.empty) {
      throw new Error(`No group found with invite code "${cleanCode}". Please verify and try again.`);
    }

    const groupDoc = querySnap.docs[0];
    const group = groupDoc.data() as Group;
    const groupId = group.groupId;

    // Check if already a member
    const memberRef = firestore()
      .collection('groups')
      .doc(groupId)
      .collection('members')
      .doc(user.uid);
    
    const memberDoc = await memberRef.get();
    if (memberDoc.exists) {
      return group;
    }

    const now = Date.now();
    const newMember: GroupMember = {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      role: 'member',
      joinedAt: now,
    };

    const batch = firestore().batch();
    batch.set(memberRef, newMember);
    batch.update(groupDoc.ref, {
      memberCount: firestore.FieldValue.increment(1),
      updatedAt: now,
    });

    // If user has no default group, set this group as default
    if (!user.defaultGroupId) {
      const userRef = firestore().collection('users').doc(user.uid);
      batch.update(userRef, { defaultGroupId: groupId, updatedAt: now });
    }

    await batch.commit();
    return group;
  },

  /**
   * Fetch all groups the current user is a member of
   */
  async getUserGroups(userId: string): Promise<Group[]> {
    // Query groups where members subcollection contains the user
    // Free & safe: fetch user member documents using collectionGroup
    const memberSnap = await firestore()
      .collectionGroup('members')
      .where('uid', '==', userId)
      .get();

    if (memberSnap.empty) {
      return [];
    }

    const groupPromises = memberSnap.docs.map(async (doc) => {
      const groupRef = doc.ref.parent.parent;
      if (!groupRef) return null;
      const gDoc = await groupRef.get();
      if (!gDoc.exists) return null;
      return gDoc.data() as Group;
    });

    const groups = await Promise.all(groupPromises);
    return groups.filter((g): g is Group => g !== null);
  },

  /**
   * Get single group by ID
   */
  async getGroupById(groupId: string): Promise<Group | null> {
    const doc = await firestore().collection('groups').doc(groupId).get();
    if (!doc.exists) return null;
    return doc.data() as Group;
  },

  /**
   * Fetch all members for a group
   */
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const snap = await firestore()
      .collection('groups')
      .doc(groupId)
      .collection('members')
      .orderBy('joinedAt', 'asc')
      .get();

    return snap.docs.map((doc) => doc.data() as GroupMember);
  },

  /**
   * Update group name
   */
  async updateGroupName(groupId: string, name: string): Promise<void> {
    await firestore().collection('groups').doc(groupId).update({
      name: name.trim(),
      updatedAt: Date.now(),
    });
  },

  /**
   * Remove a member from a group (Owner/Admin only)
   */
  async removeMember(groupId: string, memberUid: string): Promise<void> {
    const batch = firestore().batch();
    const memberRef = firestore()
      .collection('groups')
      .doc(groupId)
      .collection('members')
      .doc(memberUid);
    const groupRef = firestore().collection('groups').doc(groupId);

    batch.delete(memberRef);
    batch.update(groupRef, {
      memberCount: firestore.FieldValue.increment(-1),
      updatedAt: Date.now(),
    });

    await batch.commit();
  },

  /**
   * Delete group (Owner only)
   */
  async deleteGroup(groupId: string): Promise<void> {
    await firestore().collection('groups').doc(groupId).delete();
  },
};
