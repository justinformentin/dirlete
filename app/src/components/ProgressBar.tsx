import React from 'react';

interface ProgressBarProps {
  total: number;
  completed: number;
  currentPath: string | null;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ total, completed, currentPath }) => {
  if (!total) return null;

  const percentage = Math.min(100, (completed / total) * 100);

  return (
    <div className="mt-6 pt-6 border-t-2 border-border">
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm font-semibold text-foreground">
          Deleting {completed} / {total} folders
        </div>
        <div className="text-sm font-bold text-primary">
          {percentage.toFixed(0)}%
        </div>
      </div>
      <div className="w-full h-3 bg-surface rounded-full overflow-hidden shadow-inner">
        <div
          className="h-full bg-primary transition-all duration-300 ease-in-out shadow-sm"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {currentPath && (
        <div className="mt-3 text-xs text-muted font-mono bg-surface px-3 py-2 rounded-lg">
          <span className="font-semibold text-foreground">Current:</span> {currentPath}
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
