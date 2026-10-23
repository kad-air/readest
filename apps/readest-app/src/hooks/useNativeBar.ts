import { useEffect, useRef } from 'react';
import { useEnv } from '@/context/EnvContext';
import { useThemeStore } from '@/store/themeStore';
import { NativeBarItem, setNativeBarItems, subscribeNativeBarItemTaps } from '@/utils/bridge';
import {
  NativeBarSpec,
  isNativeBarsActive,
  nativeBarItemsEqual,
  toNativeBarItems,
} from '@/utils/nativeBar';

const sendItems = (items: NativeBarItem[]) => {
  setNativeBarItems(items)
    .then((result) => {
      if (!result.success) console.error('native bar: set_bar_items failed', result);
    })
    .catch((error) => console.error('native bar: set_bar_items threw', error));
};

/**
 * Put `spec` in the iPhone Duo's native bars and route taps back to the items'
 * `onTap`. Pass null to show nothing. Off the Duo, outside the iOS app, or while
 * the status bar is hidden (the side strip only exists with it) the bridge is
 * never called with items.
 *
 * One owner at a time: a page, or the reader's active book. Two simultaneous
 * owners would overwrite each other's items and thrash; M2/M3 compose a single
 * spec instead.
 */
export const useNativeBar = (spec: NativeBarSpec | null): void => {
  const { appService } = useEnv();
  const isIPhoneDuo = useThemeStore((s) => s.isIPhoneDuo);
  const systemUIVisible = useThemeStore((s) => s.systemUIVisible);
  const systemUIAlwaysHidden = useThemeStore((s) => s.systemUIAlwaysHidden);
  const isIOSApp = !!appService?.isIOSApp;
  const active = isNativeBarsActive(
    { isIPhoneDuo, systemUIVisible, systemUIAlwaysHidden },
    isIOSApp,
  );

  const specRef = useRef<NativeBarSpec | null>(spec);
  const sentRef = useRef<NativeBarItem[]>([]);

  // Runs after every render: specs are rebuilt each render, so diff the items.
  useEffect(() => {
    specRef.current = spec;
    const next = active && spec ? toNativeBarItems(spec) : [];
    if (nativeBarItemsEqual(next, sentRef.current)) return;
    sentRef.current = next;
    sendItems(next);
  });

  useEffect(() => {
    return () => {
      if (sentRef.current.length === 0) return;
      sentRef.current = [];
      sendItems([]);
    };
  }, []);

  useEffect(() => {
    if (!isIPhoneDuo || !isIOSApp) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    subscribeNativeBarItemTaps((id) => {
      specRef.current?.items.find((item) => item.id === id)?.onTap();
    })
      .then((fn) => {
        if (cancelled) fn();
        else unsubscribe = fn;
      })
      .catch((error) => console.error('native bar: tap subscription failed', error));
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [isIPhoneDuo, isIOSApp]);
};
