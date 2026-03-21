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
      // Remove last path if input is empty and backspace is pressed
      onIgnorePathsChange(ignorePaths.slice(0, -1));
    }
  };

  const removePath = (path: string) => {
    onIgnorePathsChange(ignorePaths.filter(p => p !== path));
  };

  return (
    <div className="mb-5">
      <label htmlFor="ignore-paths" className="block mb-2 text-sm font-semibold text-gray-800">
        Ignore Directories
      </label>
      <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 bg-white min-h-[50px] transition-all duration-200">
        {ignorePaths.map((path) => (
          <span
            key={path}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-mono font-medium shadow-sm"
          >
            {path}
            <button
              type="button"
              onClick={() => removePath(path)}
              disabled={disabled}
              className="ml-0.5 text-gray-600 hover:text-gray-800 font-bold transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
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
          placeholder={ignorePaths.length === 0 ? "Type a directory and press Enter..." : ""}
          disabled={disabled}
          className="flex-1 min-w-[200px] px-2 py-1.5 text-sm font-mono focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Press Enter to add. These directories will be skipped during scanning.
      </p>
    </div>
  );
};

export default IgnorePathsInput;
