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
    <div className="progress-section">
      <div style={{ fontSize: 14, marginBottom: 8, fontWeight: 500 }}>
        Deleting {completed} / {total} folders
      </div>
      <div
        style={{
          width: '100%',
          height: 10,
          background: '#e9ecef',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: '#2c67e2',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      {currentPath && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#6c757d', fontFamily: 'Courier New, monospace' }}>
          Current: {currentPath}
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
