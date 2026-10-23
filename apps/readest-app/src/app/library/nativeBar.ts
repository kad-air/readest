import type { LibrarySearchTarget } from '@/types/book';
import { NATIVE_BAR_SYMBOLS, NativeBarSpec, NativeBarSpecItem } from '@/utils/nativeBar';

export interface LibraryBarState {
  searchTarget: LibrarySearchTarget;
  isSelectMode: boolean;
  isSelectAll: boolean;
}

export interface LibraryBarHandlers {
  openImportMenu: () => void;
  openViewMenu: () => void;
  openSettingsMenu: () => void;
  exitSelectMode: () => void;
  selectAll: () => void;
  deselectAll: () => void;
}

/**
 * The library header's icon buttons as native bar items. The mobile HTML header
 * has no Select Books button, so outside select mode the bar has none either.
 */
export const buildLibraryBarSpec = (
  state: LibraryBarState,
  handlers: LibraryBarHandlers,
  t: (key: string) => string,
): NativeBarSpec => {
  if (state.isSelectMode) {
    return {
      items: [
        {
          id: 'select',
          title: t('Select Books'),
          symbol: NATIVE_BAR_SYMBOLS['select']!,
          placement: 'leading',
          selected: true,
          priority: 'high',
          onTap: handlers.exitSelectMode,
        },
        {
          id: 'selectAll',
          title: t(state.isSelectAll ? 'Deselect' : 'Select All'),
          symbol: NATIVE_BAR_SYMBOLS['selectAll']!,
          placement: 'trailing',
          selected: state.isSelectAll,
          onTap: state.isSelectAll ? handlers.deselectAll : handlers.selectAll,
        },
      ],
    };
  }

  const items: NativeBarSpecItem[] = [];
  if (state.searchTarget !== 'text') {
    items.push({
      id: 'import',
      title: t('Import Books'),
      symbol: NATIVE_BAR_SYMBOLS['import']!,
      placement: 'trailing',
      onTap: handlers.openImportMenu,
    });
  }
  items.push(
    {
      id: 'viewMenu',
      title: t('View Menu'),
      symbol: NATIVE_BAR_SYMBOLS['viewMenu']!,
      placement: 'trailing',
      onTap: handlers.openViewMenu,
    },
    {
      id: 'settingsMenu',
      title: t('Settings Menu'),
      symbol: NATIVE_BAR_SYMBOLS['settingsMenu']!,
      placement: 'trailing',
      onTap: handlers.openSettingsMenu,
    },
  );
  return { items };
};
