import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { NativeBarSpecItem, toNativeBarItems } from '@/utils/nativeBar';

export interface NativeBarSlice {
  order: number;
  items: NativeBarSpecItem[];
}

interface NativeBarState {
  slices: Record<string, NativeBarSlice>;
  setSlice: (key: string, order: number, items: NativeBarSpecItem[]) => void;
  clearSlice: (key: string) => void;
}

/**
 * The reader's native bar items, registered by the component that owns each
 * button (keyed `${bookKey}:${name}`) and composed into one bar by
 * ReaderNativeBar. Registering is inert off the Duo: only the composer talks to
 * the bridge.
 */
export const useNativeBarStore = create<NativeBarState>((set) => ({
  slices: {},
  setSlice: (key, order, items) =>
    set((state) => ({ slices: { ...state.slices, [key]: { order, items } } })),
  clearSlice: (key) =>
    set((state) => {
      if (!(key in state.slices)) return state;
      const { [key]: _removed, ...slices } = state.slices;
      return { slices };
    }),
}));

/**
 * Keep `items` registered under `key` while mounted. Renders rebuild the items
 * and their handlers every time, so the slice is only rewritten when the items
 * change by value; a tap goes to the handler of the latest render.
 */
export const useNativeBarSlice = (
  key: string | null,
  order: number,
  items: NativeBarSpecItem[] | null,
): void => {
  const latest = useRef(items);
  latest.current = items;
  const signature = items ? JSON.stringify(toNativeBarItems({ items })) : null;

  useEffect(() => {
    const { setSlice, clearSlice } = useNativeBarStore.getState();
    const current = latest.current;
    if (!key || !current) {
      if (key) clearSlice(key);
      return;
    }
    setSlice(
      key,
      order,
      current.map((item) => ({
        ...item,
        onTap: () => latest.current?.find((i) => i.id === item.id)?.onTap(),
      })),
    );
  }, [key, order, signature]);

  useEffect(() => {
    if (!key) return;
    return () => useNativeBarStore.getState().clearSlice(key);
  }, [key]);
};
