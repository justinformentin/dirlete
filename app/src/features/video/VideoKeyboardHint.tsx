interface VideoKeyboardHintProps {
  className?: string;
  kbdClassName?: string;
  modal?: boolean;
}

export default function VideoKeyboardHint({ className = 'mb-4 text-xs text-subtle', kbdClassName = 'bg-surface text-muted px-1 rounded', modal = false }: VideoKeyboardHintProps) {
  return (
    <p className={className}>
      {modal ? 'Keyboard shortcuts — ' : 'Keyboard shortcuts when a video is focused — '}
      <kbd className={kbdClassName}>K</kbd> Keep &nbsp;
      <kbd className={kbdClassName}>D</kbd> Delete &nbsp;
      <kbd className={kbdClassName}>S</kbd> Skip &nbsp;
      <kbd className={kbdClassName}>Space</kbd> Play/Pause &nbsp;
      <kbd className={kbdClassName}>[</kbd><kbd className={kbdClassName}>]</kbd> Seek ±5s &nbsp;
      <kbd className={kbdClassName}>←→</kbd> Navigate
      {modal && <> &nbsp;<kbd className={kbdClassName}>Esc</kbd> Close</>}
    </p>
  );
}
