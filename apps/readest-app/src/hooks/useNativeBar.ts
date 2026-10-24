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

// A failed send withdraws support, so the HTML buttons come back instead of a
// Duo with no toolbar at all (iOS 27.0, no window, an older SDK).
const sendItems = (items: NativeBarItem[], onSent: () => void) => {
  const fail = (why: unknown) => {
    console.error('native bar: set_bar_items failed, keeping the HTML buttons', why);
    useThemeStore.getState().setNativeBarsSupported(false);
  };
  setNativeBarItems(items)
    .then((result) => (result.success ? onSent() : fail(result)))
    .catch(fail);
};

/**
 * Whether the native bars own the toolbar buttons right now: the bridge reported
 * support (iPhone Duo, iOS 27.1, 27.1 SDK), the iOS app, status bar shown.
 */
export const useNativeBarsActive = (): boolean => {
  const { appService } = useEnv();
  const isIPhoneDuo = useThemeStore((s) => s.isIPhoneDuo);
  const nativeBarsSupported = useThemeStore((s) => s.nativeBarsSupported);
  const systemUIVisible = useThemeStore((s) => s.systemUIVisible);
  const systemUIAlwaysHidden = useThemeStore((s) => s.systemUIAlwaysHidden);
  return isNativeBarsActive(
    { isIPhoneDuo, nativeBarsSupported, systemUIVisible, systemUIAlwaysHidden },
    !!appService?.isIOSApp,
  );
};

/**
 * Put `spec` in the iPhone Duo's native bars and route taps back to the items'
 * `onTap`. Pass null to show nothing. While the bars are inactive (see
 * `useNativeBarsActive`) the bridge is never called with items.
 *
 * One owner at a time: a page, or the reader's active book. Two simultaneous
 * owners would overwrite each other's items and thrash; the reader composes
 * its books' slices into one spec (`ReaderNativeBar`) for that reason.
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
