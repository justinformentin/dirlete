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
      <div className="control-row">
        <div className="checkbox-row">
          <input
            id="skip-nested"
            type="checkbox"
            checked={skipNested}
            onChange={(e) => onSkipNestedChange(e.target.checked)}
            disabled={disabled}
          />
          <label htmlFor="skip-nested">
            Skip nested matches (don't scan inside matched folders)
          </label>
        </div>
      </div>
      <div className="control-row">
        <button onClick={onScan} disabled={disabled || isScanning}>
          {isScanning ? (
            <>
              <span className="spinner"></span>
              Scanning...
            </>
          ) : (
            'Scan for Folders'
          )}
        </button>
      </div>
    </div>
  );
};

export default ScanControls;
