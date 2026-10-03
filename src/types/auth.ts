export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  defaultGroupId?: string | null;
  createdAt: number;
  updatedAt?: number;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}
