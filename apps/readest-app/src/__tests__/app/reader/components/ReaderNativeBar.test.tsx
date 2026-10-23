import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  hoveredBookKey: '' as string | null,
  setItems: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  tap: undefined as ((id: string) => void) | undefined,
  requestInsetsRefresh: vi.fn(),
  theme: {
    isIPhoneDuo: true,
    systemUIVisible: true,
    systemUIAlwaysHidden: false,
  } as Record<string, unknown>,
}));

vi.mock('@/context/EnvContext', () => ({ useEnv: () => ({ appService: { isIOSApp: true } }) }));
vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ ...h.theme, requestInsetsRefresh: h.requestInsetsRefresh }),
}));
vi.mock('@/store/readerStore', () => ({
  useReaderStore: (selector: (s: { hoveredBookKey: string | null }) => unknown) =>
    selector({ hoveredBookKey: h.hoveredBookKey }),
}));
vi.mock('@/utils/bridge', () => ({
  setNativeBarItems: h.setItems,
  subscribeNativeBarItemTaps: h.subscribe,
}));

import ReaderNativeBar from '@/app/reader/components/ReaderNativeBar';
import { useNativeBarStore } from '@/store/nativeBarStore';
import type { NativeBarSpecItem } from '@/utils/nativeBar';

const item = (
  id: string,
  placement: NativeBarSpecItem['placement'],
  onTap = vi.fn(),
): NativeBarSpecItem => ({ id, title: id, symbol: 'circle', placement, onTap });

const register = (key: string, order: number, ...items: NativeBarSpecItem[]) =>
  act(() => useNativeBarStore.getState().setSlice(key, order, items));

const sent = () => h.setItems.mock.calls.at(-1)![0] as Array<{ id: string }>;

beforeEach(() => {
  h.hoveredBookKey = '';
  h.theme = { isIPhoneDuo: true, systemUIVisible: true, systemUIAlwaysHidden: false };
  h.setItems.mockReset();
  h.setItems.mockResolvedValue({ success: true });
  h.subscribe.mockReset();
  h.subscribe.mockImplementation((onTap: (id: string) => void) => {
    h.tap = onTap;
    return Promise.resolve(h.unsubscribe);
  });
  h.unsubscribe.mockReset();
  h.requestInsetsRefresh.mockReset();
  h.tap = undefined;
  useNativeBarStore.setState({ slices: {} });
});

afterEach(() => cleanup());

describe('ReaderNativeBar on the iPhone Duo', () => {
  it("sends only the hovered book's items, in slice order", () => {
    register('a:footer', 20, item('toc', 'bottom'), item('color', 'bottom'));
    register('b:library', 0, item('libraryB', 'leading'));
    register('a:viewOptions', 11, item('viewOptions', 'trailing'));
    register('a:library', 0, item('library', 'leading'));
    h.hoveredBookKey = 'a';
    render(<ReaderNativeBar />);
    expect(sent().map((i) => i.id)).toEqual(['library', 'viewOptions', 'toc', 'color']);
  });

  it('follows the hovered book and clears when none is hovered', () => {
    register('a:library', 0, item('libraryA', 'leading'));
    register('b:library', 0, item('libraryB', 'leading'));
    h.hoveredBookKey = 'a';
    const { rerender } = render(<ReaderNativeBar />);
    expect(sent().map((i) => i.id)).toEqual(['libraryA']);

    h.hoveredBookKey = 'b';
    rerender(<ReaderNativeBar />);
    expect(sent().map((i) => i.id)).toEqual(['libraryB']);

    h.hoveredBookKey = '';
    rerender(<ReaderNativeBar />);
    expect(h.setItems).toHaveBeenLastCalledWith([]);
  });

  it('treats a null hovered key as nothing hovered', () => {
    register('a:library', 0, item('library', 'leading'));
    h.hoveredBookKey = 'a';
    const { rerender } = render(<ReaderNativeBar />);
    h.hoveredBookKey = null;
    rerender(<ReaderNativeBar />);
    expect(h.setItems).toHaveBeenLastCalledWith([]);
  });

  it('sends the items again when a slice changes', () => {
    register('a:bookmark', 2, item('bookmark', 'leading'));
    h.hoveredBookKey = 'a';
    render(<ReaderNativeBar />);
    register('a:translation', 3, item('translation', 'leading'));
    expect(sent().map((i) => i.id)).toEqual(['bookmark', 'translation']);
  });

  it('routes a tap to the handler of the slice that owns the item', async () => {
    const onTap = vi.fn();
    register('a:footer', 20, item('toc', 'bottom', onTap));
    h.hoveredBookKey = 'a';
    render(<ReaderNativeBar />);
    await vi.waitFor(() => expect(h.tap).toBeDefined());
    h.tap!('toc');
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('asks for an insets refresh once the bridge accepted the items', async () => {
    register('a:library', 0, item('library', 'leading'));
    h.hoveredBookKey = 'a';
    render(<ReaderNativeBar />);
    await vi.waitFor(() => expect(h.requestInsetsRefresh).toHaveBeenCalledTimes(1));
  });
});

describe('ReaderNativeBar off the Duo', () => {
  it('never calls the bridge', () => {
    h.theme = { ...h.theme, isIPhoneDuo: false };
    register('a:library', 0, item('library', 'leading'));
    h.hoveredBookKey = 'a';
    const { rerender, unmount } = render(<ReaderNativeBar />);
    h.hoveredBookKey = '';
    rerender(<ReaderNativeBar />);
    unmount();
    expect(h.setItems).not.toHaveBeenCalled();
    expect(h.subscribe).not.toHaveBeenCalled();
    expect(h.requestInsetsRefresh).not.toHaveBeenCalled();
  });
});
