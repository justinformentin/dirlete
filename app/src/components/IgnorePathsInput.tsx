import TagInput from '../ui/TagInput';

interface IgnorePathsInputProps {
  ignorePaths: string[];
  onIgnorePathsChange: (paths: string[]) => void;
  disabled?: boolean;
}

export default function IgnorePathsInput({ ignorePaths, onIgnorePathsChange, disabled }: IgnorePathsInputProps) {
  return (
    <TagInput
      id="ignore-paths"
      values={ignorePaths}
      onValuesChange={onIgnorePathsChange}
      placeholder="Enter text or pattern"
      helpText="Press Enter to add. These directories will be skipped during scanning."
      disabled={disabled}
      tagClassName="bg-amber-500/20 text-amber-600 dark:text-amber-300"
      removeClassName="text-amber-500 hover:text-amber-700 dark:hover:text-amber-100"
    />
  );
}
