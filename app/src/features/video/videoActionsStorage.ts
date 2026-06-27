import { VideoAction } from '../../types/ipc';

const STORAGE_KEY = 'video-culler-actions';

export function loadSavedActions(): Record<string, VideoAction> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function persistActions(actions: Record<string, VideoAction>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
  } catch {
    // ignore storage errors
  }
}
