import IgnorePathsInput from '../../components/IgnorePathsInput';
import PatternInput from '../../components/PatternInput';
import Button from '../../ui/Button';
import SidebarSection from '../../ui/SidebarSection';
import Spinner from '../../ui/Spinner';
import Checkbox from '../../ui/Checkbox';

interface FilesSidebarProps {
  root: string;
  patterns: string[];
  ignorePaths: string[];
  skipNested: boolean;
  useGlobPatterns: boolean;
  isScanning: boolean;
  isDeleting: boolean;
  onPickFolder: () => void;
  onScan: () => void;
  onCancelScan: () => void;
  onPatternsChange: (patterns: string[]) => void;
  onIgnorePathsChange: (ignorePaths: string[]) => void;
  onSkipNestedChange: (skipNested: boolean) => void;
  onUseGlobPatternsChange: (useGlobPatterns: boolean) => void;
}

export default function FilesSidebar(props: FilesSidebarProps) {
  return (
    <div className="p-4 space-y-5 text-sm">
      <SidebarSection title="Current Folder" withDivider={false}>
        <p className="text-xs text-muted font-mono truncate mb-2.5 leading-relaxed" title={props.root}>
          {props.root || 'None selected'}
        </p>
        <Button onClick={props.onPickFolder} disabled={props.isDeleting} fullWidth size="xs">
          Change Folder
        </Button>
      </SidebarSection>

      <SidebarSection title="Folder Patterns">
        <PatternInput patterns={props.patterns} onPatternsChange={props.onPatternsChange} disabled={props.isDeleting} />
      </SidebarSection>

      <SidebarSection title="Ignore Directories">
        <IgnorePathsInput ignorePaths={props.ignorePaths} onIgnorePathsChange={props.onIgnorePathsChange} disabled={props.isDeleting} />
      </SidebarSection>

      <SidebarSection title="Options">
        <Checkbox
          checked={props.skipNested}
          onChange={(e) => props.onSkipNestedChange(e.target.checked)}
          disabled={props.isDeleting}
          className="w-3.5 h-3.5 accent-purple-500"
          labelClassName="text-xs text-muted mb-2"
          label="Skip nested matches"
        />
        <Checkbox
          checked={props.useGlobPatterns}
          onChange={(e) => props.onUseGlobPatternsChange(e.target.checked)}
          disabled={props.isDeleting}
          className="w-3.5 h-3.5 accent-purple-500"
          labelClassName="text-xs text-muted"
          label="Use wildcard patterns"
        />
      </SidebarSection>

      <SidebarSection>
        <div className="flex gap-2">
          <Button onClick={props.onScan} disabled={props.isScanning || props.isDeleting || !props.root} variant="primary" size="sm" className="flex-1">
            {props.isScanning ? <span className="flex items-center justify-center gap-1.5"><Spinner />Scanning…</span> : 'Scan for Folders'}
          </Button>
          {props.isScanning && <Button onClick={props.onCancelScan} size="sm">Stop</Button>}
        </div>
      </SidebarSection>
    </div>
  );
}
