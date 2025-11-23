import React from 'react';

interface ScanControlsProps {
  skipNested: boolean;
  onSkipNestedChange: (skip: boolean) => void;
  onScan: () => void;
  isScanning: boolean;
  disabled?: boolean;
}

const ScanControls: React.FC<ScanControlsProps> = ({
  skipNested,
  onSkipNestedChange,
  onScan,
  isScanning,
  disabled,
}) => {
  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <input
            id="skip-nested"
            type="checkbox"
            checked={skipNested}
            onChange={(e) => onSkipNestedChange(e.target.checked)}
            disabled={disabled}
            className="w-[18px] h-[18px] cursor-pointer disabled:cursor-not-allowed"
          />
          <label htmlFor="skip-nested" className="cursor-pointer select-none text-sm font-medium text-gray-800">
            Skip nested matches (don't scan inside matched folders)
          </label>
        </div>
      </div>
      <div className="mb-0">
        <button
          onClick={onScan}
          disabled={disabled || isScanning}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium transition-colors hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isScanning ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin-custom"></span>
              Scanning...
            </span>
          ) : (
            'Scan for Folders'
          )}
        </button>
      </div>
    </div>
  );
};

export default ScanControls;
