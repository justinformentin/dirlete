import React from 'react';

interface PatternInputProps {
  patterns: string[];
  onPatternsChange: (patterns: string[]) => void;
  disabled?: boolean;
}

const PatternInput: React.FC<PatternInputProps> = ({ patterns, onPatternsChange, disabled }) => {
  const patternsStr = patterns.join(', ');

  const handleChange = (value: string) => {
    const newPatterns = value
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    onPatternsChange(newPatterns);
  };

  return (
    <div className="control-row">
      <label htmlFor="patterns">Folder Patterns (comma-separated)</label>
      <input
        id="patterns"
        type="text"
        value={patternsStr}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="e.g., node_modules, .next, dist"
        disabled={disabled}
      />
    </div>
  );
};

export default PatternInput;
