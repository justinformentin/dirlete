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
    <div className="mb-5">
      <label htmlFor="root-path" className="block mb-2 text-sm font-semibold text-gray-800">
        Root Directory
      </label>
      <div className="flex gap-3">
        <input
          id="root-path"
          type="text"
          value={root}
          onChange={(e) => onRootChange(e.target.value)}
          placeholder="Select a root directory to scan..."
          disabled={disabled}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleChooseFolder}
          disabled={disabled}
          className="px-5 py-3 bg-sky-600 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg hover:bg-sky-700 transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
        >
          Browse...
        </button>
      </div>
    </div>
  );
};

export default RootPicker;
