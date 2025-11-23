import React, { useState } from 'react';

interface PatternInputProps {
  patterns: string[];
  onPatternsChange: (patterns: string[]) => void;
  disabled?: boolean;
}

const PatternInput: React.FC<PatternInputProps> = ({ patterns, onPatternsChange, disabled }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const newPattern = inputValue.trim();
      if (!patterns.includes(newPattern)) {
        onPatternsChange([...patterns, newPattern]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && patterns.length > 0) {
      // Remove last pattern if input is empty and backspace is pressed
      onPatternsChange(patterns.slice(0, -1));
    }
  };

  const removePattern = (pattern: string) => {
    onPatternsChange(patterns.filter(p => p !== pattern));
  };

  return (
    <div className="mb-4">
      <label htmlFor="patterns" className="block mb-1.5 text-sm font-medium text-gray-800">
        Folder Patterns
      </label>
      <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded focus-within:border-blue-600 bg-white min-h-[42px]">
        {patterns.map((pattern) => (
          <span
            key={pattern}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-mono"
          >
            {pattern}
            <button
              type="button"
              onClick={() => removePattern(pattern)}
              disabled={disabled}
              className="ml-1 text-blue-600 hover:text-blue-800 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Remove ${pattern}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id="patterns"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={patterns.length === 0 ? "Type a pattern and press Enter..." : ""}
          disabled={disabled}
          className="flex-1 min-w-[200px] px-1 py-1 text-sm font-mono focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Press Enter to add a pattern. Press Backspace to remove the last one.
      </p>
    </div>
  );
};

export default PatternInput;
