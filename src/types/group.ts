export type MemberRole = 'owner' | 'admin' | 'member';

export interface GroupMember {
  uid: string;
  displayName: string;
  email?: string;
  role: MemberRole;
  joinedAt: number;
}

export interface Group {
  groupId: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  memberCount?: number;
  memberIds?: string[];
}
