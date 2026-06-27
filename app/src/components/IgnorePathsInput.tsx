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
      placeholder="Type a directory and press Enter…"
      helpText="Press Enter to add. These directories will be skipped during scanning."
      disabled={disabled}
      tagClassName="bg-btn text-btn-text"
      removeClassName="text-muted hover:text-foreground"
    />
  );
}
