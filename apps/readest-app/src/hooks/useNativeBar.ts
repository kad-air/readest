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

const sendItems = (items: NativeBarItem[], onSent: () => void) => {
  setNativeBarItems(items)
    .then((result) => {
      if (!result.success) console.error('native bar: set_bar_items failed', result);
      else onSent();
    })
    .catch((error) => console.error('native bar: set_bar_items threw', error));
};

/** Whether the Duo's native bars exist right now: Duo, iOS app, status bar shown. */
export const useNativeBarsActive = (): boolean => {
  const { appService } = useEnv();
  const isIPhoneDuo = useThemeStore((s) => s.isIPhoneDuo);
  const systemUIVisible = useThemeStore((s) => s.systemUIVisible);
  const systemUIAlwaysHidden = useThemeStore((s) => s.systemUIAlwaysHidden);
  return isNativeBarsActive(
    { isIPhoneDuo, systemUIVisible, systemUIAlwaysHidden },
    !!appService?.isIOSApp,
  );
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
  const active = useNativeBarsActive();
  // The bridge lays the bars out before it resolves, so the insets are final by
  // then; a native bar appearing or going moves the window's and content view's.
  const requestInsetsRefresh = useThemeStore((s) => s.requestInsetsRefresh);

  const specRef = useRef<NativeBarSpec | null>(spec);
  const sentRef = useRef<NativeBarItem[]>([]);

  // Runs after every render: specs are rebuilt each render, so diff the items.
  useEffect(() => {
    specRef.current = spec;
    const next = active && spec ? toNativeBarItems(spec) : [];
    if (nativeBarItemsEqual(next, sentRef.current)) return;
    sentRef.current = next;
    sendItems(next, requestInsetsRefresh);
  });

  useEffect(() => {
    return () => {
      if (sentRef.current.length === 0) return;
      sentRef.current = [];
      sendItems([], requestInsetsRefresh);
    };
  }, [requestInsetsRefresh]);

  useEffect(() => {
    if (!active) return;
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
  }, [active]);
};
