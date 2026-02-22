import React, { ReactNode } from 'react';

const DEFAULT_ACCENT = '#4d73ff';

interface SettingsViewProps {
  children: ReactNode;
  accentColor?: string | null;
}

const SettingsView: React.FC<SettingsViewProps> = ({ children, accentColor }) => {
  const accent = accentColor || DEFAULT_ACCENT;
  return (
    <div
      className="max-w-6xl mx-auto"
      style={{ '--settings-accent': accent } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

export default SettingsView;
