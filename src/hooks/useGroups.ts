import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  setGroups,
  setActiveGroup,
  addGroup,
  setGroupMembers,
  setGroupLoading,
  setGroupError,
} from '../store/slices/groupSlice';
import { groupService } from '../services/groupService';
import { Group } from '../types/group';

export const useGroups = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { groups, activeGroup, members, loading, error } = useSelector(
    (state: RootState) => state.groups
  );

  const fetchUserGroups = useCallback(async () => {
    if (!user) return;
    try {
      dispatch(setGroupLoading(true));
      const userGroups = await groupService.getUserGroups(user.uid);
      dispatch(setGroups(userGroups));
    } catch (err: any) {
      dispatch(setGroupError(err.message || 'Failed to load groups'));
    }
  }, [user, dispatch]);

  const createNewGroup = async (name: string): Promise<Group> => {
    if (!user) throw new Error('You must be logged in to create a group');
    try {
      dispatch(setGroupLoading(true));
      const group = await groupService.createGroup(name, user);
      dispatch(addGroup(group));
      return group;
    } catch (err: any) {
      dispatch(setGroupError(err.message));
      throw err;
    }
  };

  const joinGroup = async (inviteCode: string): Promise<Group> => {
    if (!user) throw new Error('You must be logged in to join a group');
    try {
      dispatch(setGroupLoading(true));
      const group = await groupService.joinGroupByInviteCode(inviteCode, user);
      dispatch(addGroup(group));
      return group;
    } catch (err: any) {
      dispatch(setGroupError(err.message));
      throw err;
    }
  };

  const fetchMembers = useCallback(
    async (groupId: string) => {
      try {
        const memberList = await groupService.getGroupMembers(groupId);
        dispatch(setGroupMembers({ groupId, members: memberList }));
        return memberList;
      } catch (err: any) {
        console.warn('Failed to load group members:', err);
        return [];
      }
    },
    [dispatch]
  );

  const deleteGroup = async (groupId: string): Promise<void> => {
    try {
      dispatch(setGroupLoading(true));
      await groupService.deleteGroup(groupId);
      const updated = groups.filter((g) => g.groupId !== groupId);
      dispatch(setGroups(updated));
    } catch (err: any) {
      dispatch(setGroupError(err.message));
      throw err;
    }
  };

  const selectGroup = (group: Group | null) => {
    dispatch(setActiveGroup(group));
  };

  return {
    groups,
    activeGroup,
    members,
    loading,
    error,
    fetchUserGroups,
    createNewGroup,
    joinGroup,
    fetchMembers,
    selectGroup,
    deleteGroup,
  };
};
