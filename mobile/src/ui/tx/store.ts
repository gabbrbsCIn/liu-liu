import type { CategoryOption, TxView } from '@/lib/types';

// Hands the tapped transaction (and the category catalog) from the list to the `transacao` modal route,
// without squeezing a whole object into the URL.
type Open = { tx: TxView | null; options: CategoryOption[]; today: string };

let current: Open | null = null;

export const txStore = {
  open(v: Open) {
    current = v;
  },
  get: () => current,
  /** A category created inside the modal goes to the front of the list. */
  addOption(o: CategoryOption) {
    if (current) current = { ...current, options: [o, ...current.options] };
  },
};
