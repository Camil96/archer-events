// Settings View Component - Main Settings Container
import React from 'react';
import { cn } from '@/lib/utils';

interface SettingsViewProps {
  accentColor?: string | null;
  children: React.ReactNode;
}

const SettingsView: React.FC<SettingsViewProps> = ({ accentColor, children }) => {
  const style = accentColor ? {
    '--archer-blue': accentColor,
    '--archer-dark': accentColor,
  } as React.CSSProperties : {};

  return (
    <div 
      className="settings-view min-h-screen bg-neutral-50"
      style={style}
    >
      {children}
    </div>
  );
};

export default SettingsView;
