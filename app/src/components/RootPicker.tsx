import React from 'react';
import { open } from '@tauri-apps/plugin-dialog';

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
    <div className="mb-4">
      <label htmlFor="root-path" className="block mb-1.5 text-sm font-medium text-gray-800">
        Root Directory
      </label>
      <div className="flex gap-2">
        <input
          id="root-path"
          type="text"
          value={root}
          onChange={(e) => onRootChange(e.target.value)}
          placeholder="Select a root directory to scan..."
          disabled={disabled}
          className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm font-mono focus:outline-none focus:border-blue-600 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleChooseFolder}
          disabled={disabled}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium transition-colors hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Browse...
        </button>
      </div>
    </div>
  );
};

export default RootPicker;
