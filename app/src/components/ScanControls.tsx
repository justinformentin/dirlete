import React from 'react';

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
        <div className="flex items-center gap-3">
          <input
            id="skip-nested"
            type="checkbox"
            checked={skipNested}
            onChange={(e) => onSkipNestedChange(e.target.checked)}
            disabled={disabled}
            className="w-5 h-5 text-sky-600 rounded cursor-pointer focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed"
          />
          <label htmlFor="skip-nested" className="cursor-pointer select-none text-sm font-medium text-gray-800">
            Skip nested matches (don't scan inside matched folders)
          </label>
        </div>
        <div className="flex items-center gap-3">
          <input
            id="use-glob-patterns"
            type="checkbox"
            checked={useGlobPatterns}
            onChange={(e) => onUseGlobPatternsChange(e.target.checked)}
            disabled={disabled}
            className="w-5 h-5 text-sky-600 rounded cursor-pointer focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed"
          />
          <label htmlFor="use-glob-patterns" className="cursor-pointer select-none text-sm font-medium text-gray-800">
            Use wildcard patterns (* and ?)
          </label>
        </div>
        <p className="ml-8 text-xs text-gray-500 leading-relaxed">
          Examples: <code className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">node_*</code> matches <code className="bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-mono">node_modules</code>, <code className="bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-mono">node_env</code> | <code className="bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-mono">*cache</code> matches <code className="bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-mono">.cache</code>, <code className="bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-mono">npm-cache</code>
        </p>
      </div>
      <div className="mb-0 flex gap-3">
        <button
          onClick={onScan}
          disabled={disabled || isScanning}
          className="px-6 py-3 bg-sky-600 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg hover:bg-sky-800 transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isScanning ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin-custom"></span>
              Scanning...
            </span>
          ) : (
            'Scan for Folders'
          )}
        </button>
        {isScanning && (
          <button
            onClick={onCancelScan}
            className="px-6 py-3 bg-red-600 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg hover:bg-red-700 transition-all duration-200"
          >
            Stop Scan
          </button>
        )}
      </div>
    </div>
  );
};

export default ScanControls;
