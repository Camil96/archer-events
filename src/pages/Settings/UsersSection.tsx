import React from 'react';
import { User as UserType } from '@/types';
import TeamSection from '@/components/settings/TeamSection';

interface UsersSectionProps {
  user: UserType;
}

const UsersSection: React.FC<UsersSectionProps> = ({ user }) => {
  return <TeamSection user={user} />;
};

export default UsersSection;
