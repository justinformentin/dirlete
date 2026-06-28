import React from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import Button from '../ui/Button';
import FieldLabel from '../ui/FieldLabel';
import TextInput from '../ui/TextInput';

interface RootPickerProps {
  root: string;
  onRootChange: (root: string) => void;
  disabled?: boolean;
}

const RootPicker: React.FC<RootPickerProps> = ({ root, onRootChange, disabled }) => {
  const handleChooseFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Root Directory',
      });

      if (selected) {
        // In Tauri 2, open() returns the path directly as a string or null
        onRootChange(selected);
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      alert(`Error opening folder dialog: ${error}`);
    }
  };

  return (
    <div className="mb-5">
      <FieldLabel htmlFor="root-path">Root Directory</FieldLabel>
      <div className="flex gap-3">
        <TextInput
          id="root-path"
          type="text"
          value={root}
          onChange={(e) => onRootChange(e.target.value)}
          placeholder="Select a root directory to scan..."
          disabled={disabled}
          className="flex-1 px-4 py-3 border border-border rounded-lg font-mono focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200"
        />
        <Button
          onClick={handleChooseFolder}
          disabled={disabled}
          className="px-5 py-3 bg-sky-600 text-white hover:bg-sky-700 shadow-md hover:shadow-lg transition-all duration-200 disabled:bg-gray-300 disabled:shadow-none"
        >
          Browse...
        </Button>
      </div>
    </div>
  );
};

export default RootPicker;
