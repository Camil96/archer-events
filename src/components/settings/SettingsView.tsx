// Settings View Component - Main Settings Container
import React from 'react';

interface SettingsViewProps {
  accentColor?: string | null;
  children: React.ReactNode;
}

const SettingsView: React.FC<SettingsViewProps> = ({ accentColor, children }) => {
  const style = accentColor ? {
    '--brand-accent': accentColor,
    '--brand-accent-hover': accentColor,
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
