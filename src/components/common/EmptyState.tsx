import React from 'react';
import { FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Geen resultaten',
  description = 'Pas je filters aan of maak een nieuw item aan.',
  action,
}) => (
  <div className="text-center py-12 bg-white border border-neutral-200 rounded-xl shadow-sm">
    <FileQuestion className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-neutral-900 mb-1">{title}</h3>
    <p className="text-sm text-neutral-600 mb-4">{description}</p>
    {action}
  </div>
);

export default EmptyState;
