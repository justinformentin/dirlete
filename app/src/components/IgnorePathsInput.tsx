import React, { useState } from 'react';

interface IgnorePathsInputProps {
  ignorePaths: string[];
  onIgnorePathsChange: (paths: string[]) => void;
  disabled?: boolean;
}

const IgnorePathsInput: React.FC<IgnorePathsInputProps> = ({ ignorePaths, onIgnorePathsChange, disabled }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const newPath = inputValue.trim();
      if (!ignorePaths.includes(newPath)) {
        onIgnorePathsChange([...ignorePaths, newPath]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && ignorePaths.length > 0) {
      onIgnorePathsChange(ignorePaths.slice(0, -1));
    }
  };

  const removePath = (path: string) => {
    onIgnorePathsChange(ignorePaths.filter(p => p !== path));
  };

  return (
    <div className="mb-5">
      <div className="flex flex-wrap gap-2 p-3 border border-border rounded-lg focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 bg-surface min-h-[50px] transition-all duration-200">
        {ignorePaths.map((path) => (
          <span
            key={path}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-btn text-btn-text rounded-lg text-sm font-mono font-medium"
          >
            {path}
            <button
              type="button"
              onClick={() => removePath(path)}
              disabled={disabled}
              className="ml-0.5 text-muted hover:text-foreground font-bold transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Remove ${path}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id="ignore-paths"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={ignorePaths.length === 0 ? 'Type a directory and press Enter…' : ''}
          disabled={disabled}
          className="flex-1 min-w-[120px] px-2 py-1.5 text-sm font-mono bg-transparent text-foreground placeholder:text-subtle focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
      <p className="mt-2 text-xs text-subtle">
        Press Enter to add. These directories will be skipped during scanning.
      </p>
    </div>
  );
};

export default IgnorePathsInput;
