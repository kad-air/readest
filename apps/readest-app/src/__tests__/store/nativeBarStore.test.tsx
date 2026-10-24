import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ active: true }));
vi.mock('@/hooks/useNativeBar', () => ({ useNativeBarsActive: () => h.active }));

import { useNativeBarSlice, useNativeBarStore } from '@/store/nativeBarStore';
import type { NativeBarSpecItem } from '@/utils/nativeBar';

const item = (id: string, selected?: boolean, onTap = vi.fn()): NativeBarSpecItem => ({
  id,
  title: id,
  symbol: 'circle',
  placement: 'leading',
  selected,
  onTap,
});

const slices = () => useNativeBarStore.getState().slices;

beforeEach(() => {
  h.active = true;
  useNativeBarStore.setState({ slices: {} });
});
afterEach(() => cleanup());

describe('nativeBarStore', () => {
  it('sets and replaces a slice', () => {
    const { setSlice } = useNativeBarStore.getState();
    setSlice('a:library', 0, [item('library')]);
    expect(slices()['a:library']).toMatchObject({ order: 0, items: [{ id: 'library' }] });
    setSlice('a:library', 3, [item('library2')]);
    expect(slices()['a:library']).toMatchObject({ order: 3, items: [{ id: 'library2' }] });
  });

  it('clears one slice and leaves the others', () => {
    const { setSlice, clearSlice } = useNativeBarStore.getState();
    setSlice('a:library', 0, [item('library')]);
    setSlice('a:footer', 20, [item('toc')]);
    clearSlice('a:library');
    expect(Object.keys(slices())).toEqual(['a:footer']);
  });

  it('clearing an unknown slice is a no-op', () => {
    const before = slices();
    useNativeBarStore.getState().clearSlice('nope');
    expect(slices()).toBe(before);
  });
});

describe('useNativeBarSlice', () => {
  it('registers the slice and clears it on unmount', () => {
    const { unmount } = renderHook(() => useNativeBarSlice('a:bookmark', 2, [item('bookmark')]));
    expect(slices()['a:bookmark']).toMatchObject({ order: 2, items: [{ id: 'bookmark' }] });
    unmount();
    expect(slices()['a:bookmark']).toBeUndefined();
  });

  it('updates the slice when the items change', () => {
    let selected = false;
    const { rerender } = renderHook(() =>
      useNativeBarSlice('a:bookmark', 2, [item('bookmark', selected)]),
    );
    expect(slices()['a:bookmark']!.items[0]!.selected).toBe(false);
    selected = true;
    rerender();
    expect(slices()['a:bookmark']!.items[0]!.selected).toBe(true);
  });

  it('clears the slice when the items go null, and sets it again', () => {
    let items: NativeBarSpecItem[] | null = [item('translation')];
    const { rerender } = renderHook(() => useNativeBarSlice('a:translation', 3, items));
    expect(slices()['a:translation']).toBeDefined();
    items = null;
    rerender();
    expect(slices()['a:translation']).toBeUndefined();
    items = [item('translation')];
    rerender();
    expect(slices()['a:translation']).toBeDefined();
  });

  it('registers nothing for a null key', () => {
    renderHook(() => useNativeBarSlice(null, 0, [item('library')]));
    expect(slices()).toEqual({});
  });

  it('moves the slice when the key changes', () => {
    let key = 'a:footer';
    const { rerender } = renderHook(() => useNativeBarSlice(key, 20, [item('toc')]));
    key = 'b:footer';
    rerender();
    expect(Object.keys(slices())).toEqual(['b:footer']);
  });

  it('does not touch the store while the items are unchanged by value', () => {
    const { rerender } = renderHook(() => useNativeBarSlice('a:bookmark', 2, [item('bookmark')]));
    const first = slices()['a:bookmark'];
    rerender();
    rerender();
    expect(slices()['a:bookmark']).toBe(first);
  });

  it('routes a tap to the latest handler without re-registering', () => {
    const first = vi.fn();
    const second = vi.fn();
    let onTap = first;
    const { rerender } = renderHook(() =>
      useNativeBarSlice('a:bookmark', 2, [item('bookmark', false, onTap)]),
    );
    onTap = second;
    rerender();
    act(() => slices()['a:bookmark']!.items[0]!.onTap());
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('useNativeBarSlice while the native bars are inactive', () => {
  it('registers nothing, so other platforms never touch the store', () => {
    h.active = false;
    renderHook(() => useNativeBarSlice('a:library', 0, [item('library')]));
    expect(slices()).toEqual({});
  });

  it('registers the slice once the bars become active, and drops it again when they go', () => {
    h.active = false;
    const { rerender } = renderHook(() => useNativeBarSlice('a:library', 0, [item('library')]));
    expect(slices()).toEqual({});
    h.active = true;
    rerender();
    expect(Object.keys(slices())).toEqual(['a:library']);
    h.active = false;
    rerender();
    expect(slices()).toEqual({});
  });
});
