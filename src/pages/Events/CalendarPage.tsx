import React from 'react';
import AppShell from '@/components/layout/AppShell';
import { User } from '@/types';
import EmptyState from '@/components/common/EmptyState';

const CalendarPage: React.FC<{ user: User }> = ({ user }) => {
  return (
    <AppShell user={user}>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-neutral-500">Planning</p>
          <h1 className="text-2xl font-bold text-neutral-900">Kalender</h1>
        </div>
        <EmptyState title="Kalender komt eraan" description="Deze view wordt nog uitgewerkt." />
      </div>
    </AppShell>
  );
};

export default CalendarPage;
