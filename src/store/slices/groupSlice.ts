import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Group, GroupMember } from '../../types/group';

interface GroupState {
  groups: Group[];
  activeGroup: Group | null;
  members: Record<string, GroupMember[]>; // groupId -> members
  loading: boolean;
  error: string | null;
}

const initialState: GroupState = {
  groups: [],
  activeGroup: null,
  members: {},
  loading: false,
  error: null,
};

const groupSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    setGroups: (state, action: PayloadAction<Group[]>) => {
      state.groups = action.payload;
      state.loading = false;
    },
    setActiveGroup: (state, action: PayloadAction<Group | null>) => {
      state.activeGroup = action.payload;
    },
    addGroup: (state, action: PayloadAction<Group>) => {
      const exists = state.groups.some((g) => g.groupId === action.payload.groupId);
      if (!exists) {
        state.groups.unshift(action.payload);
      }
      state.activeGroup = action.payload;
    },
    setGroupMembers: (
      state,
      action: PayloadAction<{ groupId: string; members: GroupMember[] }>
    ) => {
      state.members[action.payload.groupId] = action.payload.members;
    },
    removeMemberFromState: (
      state,
      action: PayloadAction<{ groupId: string; memberUid: string }>
    ) => {
      const { groupId, memberUid } = action.payload;
      if (state.members[groupId]) {
        state.members[groupId] = state.members[groupId].filter((m) => m.uid !== memberUid);
      }
    },
    setGroupLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setGroupError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setGroups,
  setActiveGroup,
  addGroup,
  setGroupMembers,
  removeMemberFromState,
  setGroupLoading,
  setGroupError,
} = groupSlice.actions;
export default groupSlice.reducer;
