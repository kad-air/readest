import { describe, expect, it } from 'vitest';
import {
  NATIVE_BAR_SYMBOLS,
  NativeBarSpec,
  isNativeBarsActive,
  nativeBarItemsEqual,
  toNativeBarItems,
} from '@/utils/nativeBar';
import type { NativeBarItem } from '@/utils/bridge';

const on = {
  isIPhoneDuo: true,
  nativeBarsSupported: true,
  systemUIVisible: true,
  systemUIAlwaysHidden: false,
};

describe('isNativeBarsActive', () => {
  it('is true on the iOS Duo app with the status bar shown', () => {
    expect(isNativeBarsActive(on, true)).toBe(true);
  });

  it('is false when the status bar is always hidden', () => {
    expect(isNativeBarsActive({ ...on, systemUIAlwaysHidden: true }, true)).toBe(false);
  });

  it('is false while the status bar is hidden', () => {
    expect(isNativeBarsActive({ ...on, systemUIVisible: false }, true)).toBe(false);
  });

  it('is false off the Duo', () => {
    expect(isNativeBarsActive({ ...on, isIPhoneDuo: false }, true)).toBe(false);
  });

  it('is false until the bridge reports native bar support, so the HTML buttons stay', () => {
    expect(isNativeBarsActive({ ...on, nativeBarsSupported: false }, true)).toBe(false);
  });

  it('is false outside the iOS app', () => {
    expect(isNativeBarsActive(on, false)).toBe(false);
  });
});

describe('toNativeBarItems', () => {
  it('strips onTap and omits undefined optional keys', () => {
    const spec: NativeBarSpec = {
      items: [
        {
          id: 'back',
          title: 'Back',
          symbol: 'chevron.left',
          placement: 'leading',
          selected: undefined,
          priority: 'high',
          onTap: () => {},
        },
        {
          id: 'tts',
          title: 'Read Aloud',
          symbol: 'headphones',
          placement: 'bottom',
          selected: true,
          onTap: () => {},
        },
      ],
    };
    const items = toNativeBarItems(spec);
    expect(items).toStrictEqual([
      { id: 'back', title: 'Back', symbol: 'chevron.left', placement: 'leading', priority: 'high' },
      {
        id: 'tts',
        title: 'Read Aloud',
        symbol: 'headphones',
        placement: 'bottom',
        selected: true,
      },
    ]);
    expect(Object.keys(items[0]!)).not.toContain('onTap');
    expect(Object.keys(items[0]!)).not.toContain('selected');
  });
});

describe('nativeBarItemsEqual', () => {
  const a: NativeBarItem = { id: 'a', title: 'A', symbol: 'plus', placement: 'trailing' };
  const b: NativeBarItem = { id: 'b', title: 'B', symbol: 'bookmark', placement: 'bottom' };

  it('is true for equal lists, including empty ones', () => {
    expect(nativeBarItemsEqual([], [])).toBe(true);
    expect(nativeBarItemsEqual([a, b], [{ ...a }, { ...b }])).toBe(true);
  });

  it('is order sensitive', () => {
    expect(nativeBarItemsEqual([a, b], [b, a])).toBe(false);
  });

  it('differs on length', () => {
    expect(nativeBarItemsEqual([a], [a, b])).toBe(false);
  });

  it('differs on any field, optional ones included', () => {
    expect(nativeBarItemsEqual([a], [{ ...a, symbol: 'minus' }])).toBe(false);
    expect(nativeBarItemsEqual([a], [{ ...a, selected: true }])).toBe(false);
    expect(nativeBarItemsEqual([{ ...a, selected: true }], [{ ...a, selected: false }])).toBe(
      false,
    );
    expect(nativeBarItemsEqual([a], [{ ...a, priority: 'high' }])).toBe(false);
  });
});

describe('NATIVE_BAR_SYMBOLS', () => {
  const expected: Record<string, string> = {
    import: 'plus',
    select: 'checkmark.circle',
    viewMenu: 'square.grid.2x2',
    settingsMenu: 'line.3.horizontal',
    library: 'chevron.left',
    bookmark: 'bookmark',
    bookmarkFilled: 'bookmark.fill',
    translation: 'character.book.closed',
    quickAction: 'highlighter',
    notebook: 'note.text',
    viewOptions: 'line.3.horizontal',
    toc: 'list.bullet',
    color: 'sun.max',
    progress: 'slider.horizontal.3',
    font: 'textformat',
    tts: 'headphones',
  };

  it.each(Object.entries(expected))('maps %s to %s', (id, symbol) => {
    expect(NATIVE_BAR_SYMBOLS[id]).toBe(symbol);
  });
});
