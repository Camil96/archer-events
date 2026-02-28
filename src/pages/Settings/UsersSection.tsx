import React from 'react';
import { User as UserType } from '@/types';
import UserManagement from '@/pages/Users/UserManagement';

interface UsersSectionProps {
  user: UserType;
}

const UsersSection: React.FC<UsersSectionProps> = ({ user }) => {
  return <UserManagement user={user} />;
};

export default UsersSection;
