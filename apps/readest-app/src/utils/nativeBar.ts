import type { NativeBarItem } from '@/utils/bridge';

export interface NativeBarFlags {
  isIPhoneDuo: boolean;
  /** The bridge can place items in the system's bars (and has not failed to). */
  nativeBarsSupported: boolean;
  systemUIVisible: boolean;
  systemUIAlwaysHidden: boolean;
}

/**
 * Whether the native bars own the toolbar buttons right now. The HTML buttons
 * hide only under this flag, so it requires the bridge to have reported support
 * (iPhone Duo, iOS 27.1, 27.1 SDK) and the Duo's strip to exist, which it does
 * only while the status bar is shown.
 */
export const isNativeBarsActive = (flags: NativeBarFlags, isIOSApp: boolean): boolean =>
  isIOSApp &&
  flags.isIPhoneDuo &&
  flags.nativeBarsSupported &&
  flags.systemUIVisible &&
  !flags.systemUIAlwaysHidden;

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
      x.priority === y.priority
    );
  });

/** SF Symbol for each HTML bar button that moves to the native bar on the Duo. */
export const NATIVE_BAR_SYMBOLS: Record<string, string> = {
  // library header
  import: 'plus',
  select: 'checkmark.circle',
  selectAll: 'checklist',
  // Not the ellipsis: Apple reserves it for the system overflow menu.
  viewMenu: 'square.grid.2x2',
  settingsMenu: 'line.3.horizontal',
  // reader header
  closeBook: 'xmark',
  library: 'chevron.left',
  bookmark: 'bookmark',
  bookmarkFilled: 'bookmark.fill',
  translation: 'character.book.closed',
  quickAction: 'highlighter',
  notebook: 'note.text',
  viewOptions: 'line.3.horizontal',
  // reader footer
  toc: 'list.bullet',
  color: 'sun.max',
  progress: 'slider.horizontal.3',
  font: 'textformat',
  tts: 'headphones',
};
