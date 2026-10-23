import type { NativeBarItem } from '@/utils/bridge';

export interface NativeBarFlags {
  isIPhoneDuo: boolean;
  systemUIVisible: boolean;
  systemUIAlwaysHidden: boolean;
}

/**
 * The Duo's side strip exists only while the status bar is shown, so the
 * native bar items follow it.
 */
export const isNativeBarsActive = (flags: NativeBarFlags, isIOSApp: boolean): boolean =>
  isIOSApp && flags.isIPhoneDuo && flags.systemUIVisible && !flags.systemUIAlwaysHidden;

export type NativeBarSpecItem = NativeBarItem & { onTap: () => void };
export interface NativeBarSpec {
  items: NativeBarSpecItem[];
}

/** Drops the handlers and any undefined optional keys, leaving the JSON for the bridge. */
export const toNativeBarItems = (spec: NativeBarSpec): NativeBarItem[] =>
  spec.items.map(({ onTap: _onTap, ...item }) => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item)) {
      if (value !== undefined) out[key] = value;
    }
    return out as unknown as NativeBarItem;
  });

export const nativeBarItemsEqual = (a: NativeBarItem[], b: NativeBarItem[]): boolean =>
  a.length === b.length &&
  a.every((x, i) => {
    const y = b[i]!;
    return (
      x.id === y.id &&
      x.title === y.title &&
      x.symbol === y.symbol &&
      x.placement === y.placement &&
      x.selected === y.selected &&
      x.priority === y.priority &&
      x.badge === y.badge
    );
  });

/** SF Symbol for each HTML bar button that moves to the native bar on the Duo. */
export const NATIVE_BAR_SYMBOLS: Record<string, string> = {
  // library header
  import: 'plus',
  select: 'checkmark.circle',
  viewMenu: 'ellipsis.circle',
  settingsMenu: 'line.3.horizontal',
  back: 'chevron.left',
  // reader header
  library: 'chevron.left',
  sidebar: 'sidebar.left',
  bookmark: 'bookmark',
  bookmarkFilled: 'bookmark.fill',
  translation: 'character.book.closed',
  quickAction: 'highlighter',
  notebook: 'note.text',
  viewOptions: 'ellipsis.circle',
  // reader footer
  toc: 'list.bullet',
  color: 'sun.max',
  progress: 'slider.horizontal.3',
  font: 'textformat',
  tts: 'headphones',
};
