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
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="text-sm mb-2 font-medium text-gray-800">
        Deleting {completed} / {total} folders
      </div>
      <div className="w-full h-2.5 bg-gray-200 rounded overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300 ease-in-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {currentPath && (
        <div className="mt-2 text-xs text-gray-500 font-mono">
          Current: {currentPath}
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
