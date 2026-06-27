import { KeyboardEvent, useState } from 'react';
import TextInput from './TextInput';
import { X } from 'lucide-react';

interface TagInputProps {
  id: string;
  values: string[];
  onValuesChange: (values: string[]) => void;
  placeholder: string;
  helpText: string;
  disabled?: boolean;
  tagClassName?: string;
  removeClassName?: string;
}

export default function TagInput({
  id,
  values,
  onValuesChange,
  placeholder,
  helpText,
  disabled,
  tagClassName = 'bg-btn text-btn-text',
  removeClassName = 'text-muted hover:text-foreground',
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addValue = (value: string) => {
    const nextValue = value.trim();
    if (!nextValue) return;
    if (!values.includes(nextValue)) onValuesChange([...values, nextValue]);
    setInputValue('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addValue(inputValue);
    } else if (event.key === 'Backspace' && !inputValue && values.length > 0) {
      onValuesChange(values.slice(0, -1));
    }
  };

  return (
    <div className="mb-5 space-y-2">
      <div className="flex flex-wrap gap-2 p-3 rounded-lg focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 bg-surface min-h-[50px] transition-all duration-200">
        {values.map((value) => (
          <span
            key={value}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono font-medium ${tagClassName}`}
          >
            {value}
            <button
              type="button"
              onClick={() =>
                onValuesChange(values.filter((item) => item !== value))
              }
              disabled={disabled}
              className={`ml-0.5 font-bold transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${removeClassName}`}
              aria-label={`Remove ${value}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <TextInput
        id={id}
        type="text"
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 w-full font-mono border border-border rounded-lg text-xs"
      />
      <p className="text-xs text-subtle">{helpText}</p>
    </div>
  );
}
