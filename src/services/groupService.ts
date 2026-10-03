import { firestore } from './firebase';
import { Group, GroupMember } from '../types/group';
import { UserProfile } from '../types/auth';
import { notificationService } from './notificationService';

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
      memberIds: [user.uid],
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

    const currentMemberIds = Array.isArray(group.memberIds) ? group.memberIds : [];
    const updatedMemberIds = currentMemberIds.includes(user.uid)
      ? currentMemberIds
      : [...currentMemberIds, user.uid];
    const updatedMemberCount = updatedMemberIds.length;

    const batch = firestore().batch();
    batch.set(memberRef, newMember);
    batch.update(groupDoc.ref, {
      memberCount: updatedMemberCount,
      memberIds: updatedMemberIds,
      updatedAt: now,
    });

    // If user has no default group, set this group as default
    if (!user.defaultGroupId) {
      const userRef = firestore().collection('users').doc(user.uid);
      batch.update(userRef, { defaultGroupId: groupId, updatedAt: now });
    }

    await batch.commit();

    // Send member joined notification to other group members
    try {
      const targetUserIds = currentMemberIds.filter((id) => id !== user.uid);
      if (targetUserIds.length > 0) {
        await notificationService.sendMemberJoinedNotification({
          groupId,
          groupName: group.name,
          memberId: user.uid,
          memberName: user.displayName || 'A new member',
          targetUserIds,
        });
      }
    } catch (notifErr) {
      console.warn('Member joined notification note:', notifErr);
    }

    return {
      ...group,
      memberCount: updatedMemberCount,
      memberIds: updatedMemberIds,
    };
  },

  /**
   * Fetch all groups the current user is a member of
   */
  async getUserGroups(userId: string): Promise<Group[]> {
    try {
      const groupMap = new Map<string, Group>();

      // 1. Fetch groups where user is in memberIds array
      try {
        const snap = await firestore()
          .collection('groups')
          .where('memberIds', 'array-contains', userId)
          .get();
        snap.docs.forEach((doc) => {
          groupMap.set(doc.id, doc.data() as Group);
        });
      } catch (e) {
        console.warn('Query by memberIds failed:', e);
      }

      // 2. Fetch groups created by user (handles legacy groups without memberIds)
      try {
        const createdSnap = await firestore()
          .collection('groups')
          .where('createdBy', '==', userId)
          .get();
        createdSnap.docs.forEach((doc) => {
          groupMap.set(doc.id, doc.data() as Group);
        });
      } catch (e) {
        console.warn('Query by createdBy failed:', e);
      }

      const allGroups = Array.from(groupMap.values());
      return allGroups.filter(
        (g) =>
          g.name !== 'Apartment 402 Flatmates' &&
          !g.inviteCode?.startsWith('FLAT') &&
          !(Array.isArray(g.memberIds) && g.memberIds.some((id: string) => id.startsWith('demo_user_')))
      );
    } catch (err) {
      console.warn('Error fetching user groups:', err);
      return [];
    }
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
    const groupRef = firestore().collection('groups').doc(groupId);
    const groupDoc = await groupRef.get();
    const groupData = groupDoc.data() as Group | undefined;

    const currentMemberIds = Array.isArray(groupData?.memberIds) ? groupData!.memberIds : [];
    const updatedMemberIds = currentMemberIds.filter((id) => id !== memberUid);
    const updatedCount = Math.max(0, updatedMemberIds.length);

    const batch = firestore().batch();
    const memberRef = groupRef.collection('members').doc(memberUid);
    batch.delete(memberRef);
    batch.update(groupRef, {
      memberCount: updatedCount,
      memberIds: updatedMemberIds,
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

  /**
   * Purge demo data/group if present so account starts 100% clean in production
   */
  async purgeDemoGroups(userId: string): Promise<boolean> {
    try {
      const snap = await firestore()
        .collection('groups')
        .where('createdBy', '==', userId)
        .get();

      let purged = false;
      for (const doc of snap.docs) {
        const data = doc.data();
        if (
          data.name === 'Apartment 402 Flatmates' ||
          (data.inviteCode && typeof data.inviteCode === 'string' && data.inviteCode.startsWith('FLAT')) ||
          (Array.isArray(data.memberIds) && data.memberIds.some((id: string) => id.startsWith('demo_user_')))
        ) {
          const expSnap = await doc.ref.collection('expenses').get();
          for (const exp of expSnap.docs) {
            await exp.ref.delete();
          }
          const setSnap = await doc.ref.collection('settlements').get();
          for (const s of setSnap.docs) {
            await s.ref.delete();
          }
          const memSnap = await doc.ref.collection('members').get();
          for (const m of memSnap.docs) {
            await m.ref.delete();
          }
          await doc.ref.delete();
          purged = true;
        }
      }

      if (purged) {
        try {
          await firestore().collection('users').doc(userId).update({
            defaultGroupId: null,
            updatedAt: Date.now(),
          });
        } catch {
          // ignore user update error if doc doesn't exist
        }
      }
      return purged;
    } catch (err) {
      console.warn('Error purging demo groups:', err);
      return false;
    }
  },
};

