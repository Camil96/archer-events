import React from 'react';
import { User as UserType } from '@/types';
import ProfileSection from '@/components/settings/ProfileSection';

interface AccountSectionProps {
  user: UserType;
}

const AccountSection: React.FC<AccountSectionProps> = ({ user }) => {
  return <ProfileSection user={user} />;
};

export default AccountSection;
