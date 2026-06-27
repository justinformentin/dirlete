import { KeyboardEvent, useState } from 'react';
import TextInput from './TextInput';

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
    <div className="mb-5">
      <div className="flex flex-wrap gap-2 p-3 border border-border rounded-lg focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 bg-surface min-h-[50px] transition-all duration-200">
        {values.map((value) => (
          <span key={value} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-medium ${tagClassName}`}>
            {value}
            <button
              type="button"
              onClick={() => onValuesChange(values.filter((item) => item !== value))}
              disabled={disabled}
              className={`ml-0.5 font-bold transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${removeClassName}`}
              aria-label={`Remove ${value}`}
            >
              ×
            </button>
          </span>
        ))}
        <TextInput
          id={id}
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={values.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="flex-1 min-w-[120px] font-mono bg-transparent"
        />
      </div>
      <p className="mt-2 text-xs text-subtle">{helpText}</p>
    </div>
  );
}
