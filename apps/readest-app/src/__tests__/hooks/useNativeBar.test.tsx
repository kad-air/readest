import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NativeBarSpec } from '@/utils/nativeBar';

const h = vi.hoisted(() => ({
  appService: { isIOSApp: true } as { isIOSApp: boolean } | null,
  theme: { isIPhoneDuo: true, systemUIVisible: true, systemUIAlwaysHidden: false },
  setItems: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  tap: undefined as ((id: string) => void) | undefined,
}));

vi.mock('@/context/EnvContext', () => ({ useEnv: () => ({ appService: h.appService }) }));
vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector: (s: typeof h.theme) => unknown) => selector(h.theme),
}));
vi.mock('@/utils/bridge', () => ({
  setNativeBarItems: h.setItems,
  subscribeNativeBarItemTaps: h.subscribe,
}));

import { useNativeBar } from '@/hooks/useNativeBar';

beforeEach(() => {
  h.appService = { isIOSApp: true };
  h.theme = { isIPhoneDuo: true, systemUIVisible: true, systemUIAlwaysHidden: false };
  h.setItems.mockReset();
  h.setItems.mockResolvedValue({ success: true });
  h.subscribe.mockReset();
  h.subscribe.mockImplementation((onTap: (id: string) => void) => {
    h.tap = onTap;
    return Promise.resolve(h.unsubscribe);
  });
  h.unsubscribe.mockReset();
  h.tap = undefined;
});

afterEach(() => cleanup());

const makeSpec = (onTapBack = vi.fn(), onTapToc = vi.fn()): NativeBarSpec => ({
  items: [
    {
      id: 'back',
      title: 'Back',
      symbol: 'chevron.left',
      placement: 'leading',
      priority: 'high',
      onTap: onTapBack,
    },
    { id: 'toc', title: 'Contents', symbol: 'list.bullet', placement: 'bottom', onTap: onTapToc },
  ],
});

const stripped = [
  { id: 'back', title: 'Back', symbol: 'chevron.left', placement: 'leading', priority: 'high' },
  { id: 'toc', title: 'Contents', symbol: 'list.bullet', placement: 'bottom' },
];

describe('useNativeBar on the iPhone Duo', () => {
  it('sends the items without their handlers', () => {
    renderHook(() => useNativeBar(makeSpec()));
    expect(h.setItems).toHaveBeenCalledTimes(1);
    expect(h.setItems).toHaveBeenLastCalledWith(stripped);
  });

  it('does not send again for an equal spec on re-render', () => {
    const { rerender } = renderHook(() => useNativeBar(makeSpec()));
    rerender();
    rerender();
    expect(h.setItems).toHaveBeenCalledTimes(1);
  });

  it('sends again when an item changes', () => {
    let selected = false;
    const build = (): NativeBarSpec => {
      const spec = makeSpec();
      return { items: spec.items.map((i) => (i.id === 'toc' ? { ...i, selected } : i)) };
    };
    const { rerender } = renderHook(() => useNativeBar(build()));
    selected = true;
    rerender();
    expect(h.setItems).toHaveBeenCalledTimes(2);
    expect(h.setItems.mock.calls[1]![0][1]).toMatchObject({ id: 'toc', selected: true });
  });

  it('routes a tap to the matching item', async () => {
    const onTapBack = vi.fn();
    const onTapToc = vi.fn();
    renderHook(() => useNativeBar(makeSpec(onTapBack, onTapToc)));
    await waitFor(() => expect(h.tap).toBeDefined());
    h.tap!('toc');
    expect(onTapToc).toHaveBeenCalledTimes(1);
    expect(onTapBack).not.toHaveBeenCalled();
    h.tap!('unknown');
    expect(onTapToc).toHaveBeenCalledTimes(1);
  });

  it('routes a tap to the latest spec without resubscribing', async () => {
    const first = vi.fn();
    const second = vi.fn();
    let current = first;
    const { rerender } = renderHook(() => useNativeBar(makeSpec(current)));
    await waitFor(() => expect(h.tap).toBeDefined());
    current = second;
    rerender();
    h.tap!('back');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(h.subscribe).toHaveBeenCalledTimes(1);
  });

  it('clears the bars when the status bar is hidden, and sends them again when it returns', () => {
    const { rerender } = renderHook(() => useNativeBar(makeSpec()));
    expect(h.setItems).toHaveBeenLastCalledWith(stripped);

    h.theme = { ...h.theme, systemUIVisible: false };
    rerender();
    expect(h.setItems).toHaveBeenCalledTimes(2);
    expect(h.setItems).toHaveBeenLastCalledWith([]);

    rerender();
    expect(h.setItems).toHaveBeenCalledTimes(2);

    h.theme = { ...h.theme, systemUIVisible: true };
    rerender();
    expect(h.setItems).toHaveBeenCalledTimes(3);
    expect(h.setItems).toHaveBeenLastCalledWith(stripped);
  });

  it('clears the bars when the spec becomes null', () => {
    let spec: NativeBarSpec | null = makeSpec();
    const { rerender } = renderHook(() => useNativeBar(spec));
    spec = null;
    rerender();
    expect(h.setItems).toHaveBeenLastCalledWith([]);
    expect(h.setItems).toHaveBeenCalledTimes(2);
  });

  it('clears the bars and unsubscribes on unmount', async () => {
    const { unmount } = renderHook(() => useNativeBar(makeSpec()));
    await waitFor(() => expect(h.tap).toBeDefined());
    unmount();
    expect(h.setItems).toHaveBeenCalledTimes(2);
    expect(h.setItems).toHaveBeenLastCalledWith([]);
    await waitFor(() => expect(h.unsubscribe).toHaveBeenCalledTimes(1));
  });

  it('does not clear on unmount when nothing was sent', () => {
    h.theme = { ...h.theme, systemUIVisible: false };
    const { unmount } = renderHook(() => useNativeBar(makeSpec()));
    unmount();
    expect(h.setItems).not.toHaveBeenCalled();
  });

  it('logs a failed send and does not throw', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.setItems.mockRejectedValue(new Error('boom'));
    renderHook(() => useNativeBar(makeSpec()));
    await waitFor(() => expect(error).toHaveBeenCalled());
    error.mockRestore();
  });
});

describe('useNativeBar parity off the Duo', () => {
  it('never calls the bridge when isIPhoneDuo is false', () => {
    h.theme = { ...h.theme, isIPhoneDuo: false };
    const { rerender, unmount } = renderHook(() => useNativeBar(makeSpec()));
    rerender();
    unmount();
    expect(h.setItems).not.toHaveBeenCalled();
    expect(h.subscribe).not.toHaveBeenCalled();
  });

  it('never calls the bridge outside the iOS app', () => {
    h.appService = { isIOSApp: false };
    const { rerender, unmount } = renderHook(() => useNativeBar(makeSpec()));
    rerender();
    unmount();
    expect(h.setItems).not.toHaveBeenCalled();
    expect(h.subscribe).not.toHaveBeenCalled();
  });

  it('never calls the bridge before the app service exists', () => {
    h.appService = null;
    const { unmount } = renderHook(() => useNativeBar(makeSpec()));
    unmount();
    expect(h.setItems).not.toHaveBeenCalled();
    expect(h.subscribe).not.toHaveBeenCalled();
  });
});
