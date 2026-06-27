import Button from '../../ui/Button';
import { VideoAction } from '../../types/ipc';

interface VideoActionButtonsProps {
  action: VideoAction | null;
  onAction: (action: VideoAction | null) => void;
  includeSkip?: boolean;
  buttonClassName?: string;
}

const actionClassNames: Record<VideoAction, { active: string; inactive: string }> = {
  keep: { active: 'bg-green-500 text-white', inactive: 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-800/60' },
  skip: { active: 'bg-gray-500 text-white', inactive: 'bg-surface text-muted hover:bg-surface-hover' },
  delete: { active: 'bg-red-500 text-white', inactive: 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-800/60' },
};

export default function VideoActionButtons({ action, onAction, includeSkip = false, buttonClassName = 'flex-1 py-2 text-sm font-semibold rounded-lg' }: VideoActionButtonsProps) {
  const actions: VideoAction[] = includeSkip ? ['keep', 'skip', 'delete'] : ['keep', 'delete'];

  return (
    <div className="flex gap-2">
      {actions.map((nextAction) => (
        <Button
          variant="unstyled"
          key={nextAction}
          className={`${buttonClassName} ${action === nextAction ? actionClassNames[nextAction].active : actionClassNames[nextAction].inactive}`}
          onClick={() => onAction(action === nextAction ? null : nextAction)}
          title={`${nextAction[0].toUpperCase()}${nextAction.slice(1)} (${nextAction[0].toUpperCase()})`}
        >
          {nextAction[0].toUpperCase()}{nextAction.slice(1)}
        </Button>
      ))}
    </div>
  );
}
