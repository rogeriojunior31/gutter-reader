import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  /** Ação opcional, ex.: "Desfazer". */
  action?: { label: string; run: () => void | Promise<void> };
}

interface ToastState {
  toasts: Toast[];
  show: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

const DURATION_MS = 6000;
let nextId = 1;

/** Avisos curtos no rodapé. Um por vez: o novo substitui o anterior. */
export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  show: (t) => {
    const id = nextId++;
    set({ toasts: [{ ...t, id }] });
    setTimeout(() => get().dismiss(id), DURATION_MS);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (t: Omit<Toast, 'id'>) => useToasts.getState().show(t);
