import React from 'react';
import { User as UserType } from '@/types';
import BrandSection from '@/components/settings/BrandSection';

interface BrandManagementSectionProps {
  user: UserType;
}

const BrandManagementSection: React.FC<BrandManagementSectionProps> = ({ user }) => {
  return <BrandSection user={user} />;
};

export default BrandManagementSection;
