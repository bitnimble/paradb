import { makeAutoObservable } from 'mobx';

export type ToastIntent = 'default' | 'success' | 'error';

export type Toast = {
  id: string;
  message: string;
  intent: ToastIntent;
};

const DEFAULT_DURATION_MS = 5000;

class ToastStore {
  toasts: Toast[] = [];
  private timeouts = new Map<string, ReturnType<typeof setTimeout>>();

  constructor() {
    makeAutoObservable(this);
  }

  show(message: string, intent: ToastIntent = 'default', durationMs: number = DEFAULT_DURATION_MS) {
    const id = crypto.randomUUID();
    this.toasts.push({ id, message, intent });

    if (durationMs > 0) {
      const timeout = setTimeout(() => this.remove(id), durationMs);
      this.timeouts.set(id, timeout);
    }

    return id;
  }

  remove(id: string) {
    const timeout = this.timeouts.get(id);
    if (timeout != null) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }
}

export const toastStore = new ToastStore();

export function showToast(
  message: string,
  intent: ToastIntent = 'default',
  durationMs: number = DEFAULT_DURATION_MS
) {
  return toastStore.show(message, intent, durationMs);
}

export function removeToast(id: string) {
  toastStore.remove(id);
}
