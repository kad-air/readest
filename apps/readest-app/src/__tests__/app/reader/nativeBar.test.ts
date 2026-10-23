import { describe, expect, it, vi } from 'vitest';

import { composeReaderBarSpec } from '@/app/reader/nativeBar';
import type { NativeBarSlice } from '@/store/nativeBarStore';
import type { NativeBarSpecItem } from '@/utils/nativeBar';

const item = (id: string, placement: NativeBarSpecItem['placement']): NativeBarSpecItem => ({
  id,
  title: id,
  symbol: 'circle',
  placement,
  onTap: vi.fn(),
});

const slice = (order: number, ...items: NativeBarSpecItem[]): NativeBarSlice => ({ order, items });

const ids = (slices: Record<string, NativeBarSlice>, bookKey: string) =>
  composeReaderBarSpec(slices, bookKey).items.map((i) => i.id);

describe('composeReaderBarSpec', () => {
  it('orders slices by their order, whatever the insertion order', () => {
    const slices = {
      'a:footer': slice(20, item('toc', 'bottom'), item('color', 'bottom')),
      'a:viewOptions': slice(11, item('viewOptions', 'trailing')),
      'a:library': slice(0, item('library', 'leading')),
      'a:bookmark': slice(2, item('bookmark', 'leading')),
    };
    expect(ids(slices, 'a')).toEqual(['library', 'bookmark', 'viewOptions', 'toc', 'color']);
  });

  it('keeps insertion order between slices of the same order', () => {
    const slices = {
      'a:one': slice(5, item('one', 'leading')),
      'a:two': slice(5, item('two', 'leading')),
      'a:three': slice(5, item('three', 'leading')),
    };
    expect(ids(slices, 'a')).toEqual(['one', 'two', 'three']);
  });

  it('takes only the slices of the given book', () => {
    const slices = {
      'a:library': slice(0, item('libraryA', 'leading')),
      'b:library': slice(0, item('libraryB', 'leading')),
      'a:footer': slice(20, item('tocA', 'bottom')),
    };
    expect(ids(slices, 'a')).toEqual(['libraryA', 'tocA']);
    expect(ids(slices, 'b')).toEqual(['libraryB']);
  });

  it('does not match a book key that is a prefix of another', () => {
    const slices = {
      'book-1:library': slice(0, item('one', 'leading')),
      'book-12:library': slice(0, item('twelve', 'leading')),
    };
    expect(ids(slices, 'book-1')).toEqual(['one']);
  });

  it('is empty for an unknown book or no slices', () => {
    expect(ids({}, 'a')).toEqual([]);
    expect(ids({ 'a:library': slice(0, item('library', 'leading')) }, 'z')).toEqual([]);
  });

  it('keeps the handlers so a tap reaches the owning component', () => {
    const library = item('library', 'leading');
    const spec = composeReaderBarSpec({ 'a:library': slice(0, library) }, 'a');
    spec.items[0]!.onTap();
    expect(library.onTap).toHaveBeenCalledTimes(1);
  });
});
