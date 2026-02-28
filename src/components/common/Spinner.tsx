import React from 'react';

const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ size = 'md', className = '' }) => {
  const dims = size === 'sm' ? 'h-4 w-4 border-2' : size === 'lg' ? 'h-10 w-10 border-4' : 'h-6 w-6 border-2';
  return (
    <div
      className={`animate-spin rounded-full border-b-2 border-archer-blue ${dims} ${className}`}
      aria-label="Laden..."
    />
  );
};

export default Spinner;
