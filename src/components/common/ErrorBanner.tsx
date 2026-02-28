import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => (
  <div className="flex items-center justify-between p-3 mb-4 border border-red-200 bg-red-50 text-red-800 rounded-lg">
    <div className="flex items-center space-x-2">
      <AlertTriangle className="w-4 h-4" />
      <span className="text-sm">{message}</span>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-sm font-medium underline underline-offset-2 hover:text-red-700"
      >
        Opnieuw
      </button>
    )}
  </div>
);

export default ErrorBanner;
