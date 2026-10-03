import { NavigatorScreenParams } from '@react-navigation/native';
import { Group } from '../types/group';
import { Expense } from '../types/expense';
import { ParsedTransaction } from '../types/sms';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  GroupsTab: undefined;
  NotificationsTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  CreateGroup: undefined;
  JoinGroup: undefined;
  GroupDetails: { groupId: string; groupName?: string };
  Members: { groupId: string };
  AddExpense: {
    groupId?: string;
    detectedTransaction?: ParsedTransaction;
  };
  EditExpense: {
    groupId: string;
    expenseId: string;
  };
  ExpenseDetails: {
    groupId: string;
    expenseId: string;
  };
  Settlement: {
    groupId: string;
    toUserId?: string;
    suggestedAmount?: number;
  };
  Settings: undefined;
};
