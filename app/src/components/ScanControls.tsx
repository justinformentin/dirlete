import React from 'react';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';

interface ScanControlsProps {
  skipNested: boolean;
  onSkipNestedChange: (skip: boolean) => void;
  useGlobPatterns: boolean;
  onUseGlobPatternsChange: (use: boolean) => void;
  onScan: () => void;
  onCancelScan: () => void;
  isScanning: boolean;
  disabled?: boolean;
}

const ScanControls: React.FC<ScanControlsProps> = ({
  skipNested,
  onSkipNestedChange,
  useGlobPatterns,
  onUseGlobPatternsChange,
  onScan,
  onCancelScan,
  isScanning,
  disabled,
}) => {
  return (
    <div>
      <div className="mb-5 space-y-3">
        <Checkbox
          id="skip-nested"
          checked={skipNested}
          onChange={(e) => onSkipNestedChange(e.target.checked)}
          disabled={disabled}
          className="w-5 h-5 text-sky-600 rounded focus:ring-2 focus:ring-sky-500/20"
          label="Skip nested matches (don't scan inside matched folders)"
          labelClassName="gap-3 text-sm font-medium text-foreground"
        />
        <Checkbox
          id="use-glob-patterns"
          checked={useGlobPatterns}
          onChange={(e) => onUseGlobPatternsChange(e.target.checked)}
          disabled={disabled}
          className="w-5 h-5 text-sky-600 rounded focus:ring-2 focus:ring-sky-500/20"
          label="Use wildcard patterns (* and ?)"
          labelClassName="gap-3 text-sm font-medium text-foreground"
        />
        <p className="ml-8 text-xs text-gray-500 leading-relaxed">
          Examples: <code className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">node_*</code> matches <code className="bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-mono">node_modules</code>, <code className="bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-mono">node_env</code> | <code className="bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-mono">*cache</code> matches <code className="bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-mono">.cache</code>, <code className="bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-mono">npm-cache</code>
        </p>
      </div>
      <div className="mb-0 flex gap-3">
        <Button
          onClick={onScan}
          disabled={disabled || isScanning}
          className="px-6 py-3 bg-sky-600 text-white hover:bg-sky-800 shadow-md hover:shadow-lg transition-all duration-200 disabled:bg-gray-300 disabled:shadow-none"
        >
          {isScanning ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin-custom"></span>
              Scanning...
            </span>
          ) : (
            'Scan for Folders'
          )}
        </Button>
        {isScanning && (
          <Button
            variant="danger"
            onClick={onCancelScan}
            className="px-6 py-3 shadow-md hover:shadow-lg transition-all duration-200"
          >
            Stop Scan
          </Button>
        )}
      </div>
    </div>
  );
};

export default ScanControls;
