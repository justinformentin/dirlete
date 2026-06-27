import TagInput from '../ui/TagInput';

interface PatternInputProps {
  patterns: string[];
  onPatternsChange: (patterns: string[]) => void;
  disabled?: boolean;
}

export default function PatternInput({ patterns, onPatternsChange, disabled }: PatternInputProps) {
  return (
    <TagInput
      id="patterns"
      values={patterns}
      onValuesChange={onPatternsChange}
      placeholder="Enter text or pattern"
      helpText="Press Enter to add. Backspace removes the last one."
      disabled={disabled}
      tagClassName="bg-sky-500/20 text-sky-600 dark:text-sky-300"
      removeClassName="text-sky-500 hover:text-sky-700 dark:hover:text-sky-100"
    />
  );
}
