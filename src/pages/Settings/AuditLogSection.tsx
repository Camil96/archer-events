import React from 'react';
import { User as UserType } from '@/types';
import AuditSection from '@/components/settings/AuditSection';

interface AuditLogSectionProps {
  user: UserType;
}

const AuditLogSection: React.FC<AuditLogSectionProps> = ({ user }) => {
  return <AuditSection user={user} />;
};

export default AuditLogSection;
