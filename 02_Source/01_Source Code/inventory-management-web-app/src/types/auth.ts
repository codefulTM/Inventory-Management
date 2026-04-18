export type UserRole = 'Manager' | 'Operator' | 'Quality Control Technician' | 'IT Administrator';

export interface User {
  _id: string;
  user_id?: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  last_login?: string;
  created_date?: string;
  modified_date?: string;
}