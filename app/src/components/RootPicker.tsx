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
    <div className="control-row">
      <label htmlFor="root-path">Root Directory</label>
      <div className="input-with-button">
        <input
          id="root-path"
          type="text"
          value={root}
          onChange={(e) => onRootChange(e.target.value)}
          placeholder="Select a root directory to scan..."
          disabled={disabled}
        />
        <button onClick={handleChooseFolder} disabled={disabled}>
          Browse...
        </button>
      </div>
    </div>
  );
};

export default RootPicker;
