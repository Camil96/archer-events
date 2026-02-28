import React from 'react';
import { User } from '@/types';
import CateringSettings from '@/pages/Finance/CateringSettings';

const CateringSection: React.FC<{ user: User }> = ({ user }) => {
  return <CateringSettings user={user} />;
};

export default CateringSection;

