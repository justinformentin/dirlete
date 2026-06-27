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
      onPatternsChange(patterns.slice(0, -1));
    }
  };

  const removePattern = (pattern: string) => {
    onPatternsChange(patterns.filter(p => p !== pattern));
  };

  return (
    <div className="mb-5">
      <div className="flex flex-wrap gap-2 p-3 border border-border rounded-lg focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 bg-surface min-h-[50px] transition-all duration-200">
        {patterns.map((pattern) => (
          <span
            key={pattern}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/20 text-sky-600 dark:text-sky-300 rounded-lg text-sm font-mono font-medium"
          >
            {pattern}
            <button
              type="button"
              onClick={() => removePattern(pattern)}
              disabled={disabled}
              className="ml-0.5 text-sky-500 hover:text-sky-700 dark:hover:text-sky-100 font-bold transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
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
          placeholder={patterns.length === 0 ? 'Type a pattern and press Enter…' : ''}
          disabled={disabled}
          className="flex-1 min-w-[120px] px-2 py-1.5 text-sm font-mono bg-transparent text-foreground placeholder:text-subtle focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
      <p className="mt-2 text-xs text-subtle">
        Press Enter to add. Backspace removes the last one.
      </p>
    </div>
  );
};

export default PatternInput;
