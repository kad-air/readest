import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LibraryHeader from '@/app/library/components/LibraryHeader';
import { DropdownProvider } from '@/context/DropdownContext';
import type { LibrarySearchTarget } from '@/types/book';

const h = vi.hoisted(() => ({
  setItems: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  tap: undefined as ((id: string) => void) | undefined,
}));

vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({ appService: { isIOSApp: true, isMobile: true, hasWindowBar: false } }),
}));

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => (key: string) => key,
}));

const theme = {
  systemUIVisible: true,
  systemUIAlwaysHidden: false,
  statusBarHeight: 0,
  safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
  isIPhoneDuo: true,
  requestInsetsRefresh: vi.fn(),
};
vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector?: (s: typeof theme) => unknown) => (selector ? selector(theme) : theme),
}));

vi.mock('@/store/libraryStore', () => ({
  useLibraryStore: () => ({ currentBookshelf: [] }),
}));

vi.mock('@/hooks/useTrafficLight', () => ({
  useTrafficLight: () => ({ isTrafficLightVisible: false }),
}));

vi.mock('@/hooks/useResponsiveSize', () => ({
  useResponsiveSize: (size: number) => size,
}));

vi.mock('@/hooks/useShortcuts', () => ({ default: () => {} }));

vi.mock('@/utils/bridge', () => ({
  setNativeBarItems: h.setItems,
  subscribeNativeBarItemTaps: h.subscribe,
}));

vi.mock('@/app/library/components/SettingsMenu', () => ({
  default: () => <div data-testid='settings-menu' />,
}));
vi.mock('@/app/library/components/ImportMenu', () => ({
  default: () => <div data-testid='import-menu' />,
}));
vi.mock('@/app/library/components/LibrarySearchOptionsMenu', () => ({ default: () => null }));
vi.mock('@/app/library/components/ViewMenu', () => ({
  default: () => <div data-testid='view-menu' />,
}));

const onToggleSelectMode = vi.fn();
const onSelectAll = vi.fn();
const onDeselectAll = vi.fn();

const renderHeader = (
  props: { isSelectMode?: boolean; isSelectAll?: boolean; searchTarget?: LibrarySearchTarget } = {},
) =>
  render(
    <DropdownProvider>
      <LibraryHeader
        isSelectMode={props.isSelectMode ?? false}
        isSelectAll={props.isSelectAll ?? false}
        onPullLibrary={vi.fn()}
        onImportBooksFromFiles={vi.fn()}
        onOpenCatalogManager={vi.fn()}
        onOpenFeeds={vi.fn()}
        onToggleSelectMode={onToggleSelectMode}
        onSelectAll={onSelectAll}
        onDeselectAll={onDeselectAll}
        searchQuery=''
        searchTarget={props.searchTarget ?? 'books'}
        searchConfig={{} as never}
        onSearchConfigChange={vi.fn()}
        onSearchQueryChange={vi.fn()}
        onSearchTargetChange={vi.fn()}
      />
    </DropdownProvider>,
  );

const sentItems = () => h.setItems.mock.calls.at(-1)![0] as Array<Record<string, unknown>>;

beforeEach(() => {
  h.setItems.mockReset();
  h.setItems.mockResolvedValue({ success: true });
  h.subscribe.mockReset();
  h.subscribe.mockImplementation((onTap: (id: string) => void) => {
    h.tap = onTap;
    return Promise.resolve(h.unsubscribe);
  });
  h.unsubscribe.mockReset();
  h.tap = undefined;
  onToggleSelectMode.mockReset();
  onSelectAll.mockReset();
  onDeselectAll.mockReset();
});

afterEach(() => cleanup());

describe('LibraryHeader on the iPhone Duo with native bars active', () => {
  it('sends Import, View Menu and Settings Menu to the native bar', () => {
    renderHeader();
    expect(h.setItems).toHaveBeenCalledTimes(1);
    expect(sentItems()).toEqual([
      { id: 'import', title: 'Import Books', symbol: 'plus', placement: 'trailing' },
      { id: 'viewMenu', title: 'View Menu', symbol: 'ellipsis.circle', placement: 'trailing' },
      {
        id: 'settingsMenu',
        title: 'Settings Menu',
        symbol: 'line.3.horizontal',
        placement: 'trailing',
      },
    ]);
  });

  it('renders the HTML toggles zero-size and invisible but still mounted', () => {
    const { getByLabelText } = renderHeader();
    for (const label of ['Import Books', 'View Menu', 'Settings Menu']) {
      const toggle = getByLabelText(label);
      expect(toggle.className).toContain('invisible');
      expect(toggle.className).toContain('h-0');
      expect(toggle.className).toContain('w-0');
    }
  });

  it('drops the divider before the Import dropdown', () => {
    const { container } = renderHeader();
    expect(container.querySelector('.w-\\[0\\.5px\\]')).toBeNull();
  });

  it('opens the View Menu when its native item is tapped', () => {
    const { getByLabelText, queryByTestId } = renderHeader();
    expect(queryByTestId('view-menu')).toBeNull();
    act(() => h.tap!('viewMenu'));
    expect(getByLabelText('View Menu').getAttribute('aria-expanded')).toBe('true');
    expect(queryByTestId('view-menu')).not.toBeNull();
  });

  it('opens the Settings and Import menus from their native items', () => {
    const { queryByTestId } = renderHeader();
    act(() => h.tap!('settingsMenu'));
    expect(queryByTestId('settings-menu')).not.toBeNull();
    act(() => h.tap!('import'));
    expect(queryByTestId('import-menu')).not.toBeNull();
    expect(queryByTestId('settings-menu')).toBeNull();
  });

  it('sends Select Books and Select All in select mode and hides the text button', () => {
    const { queryByLabelText } = renderHeader({ isSelectMode: true });
    expect(sentItems()).toEqual([
      {
        id: 'select',
        title: 'Select Books',
        symbol: 'checkmark.circle',
        placement: 'leading',
        selected: true,
        priority: 'high',
      },
      {
        id: 'selectAll',
        title: 'Select All',
        symbol: 'checklist',
        placement: 'trailing',
        selected: false,
      },
    ]);
    expect(queryByLabelText('Select All')).toBeNull();
  });

  it('routes the select items to the select-mode handlers', () => {
    renderHeader({ isSelectMode: true });
    act(() => h.tap!('select'));
    expect(onToggleSelectMode).toHaveBeenCalledTimes(1);
    act(() => h.tap!('selectAll'));
    expect(onSelectAll).toHaveBeenCalledTimes(1);
  });

  it('offers Deselect when everything is selected', () => {
    renderHeader({ isSelectMode: true, isSelectAll: true });
    expect(sentItems()[1]).toMatchObject({ id: 'selectAll', title: 'Deselect', selected: true });
    act(() => h.tap!('selectAll'));
    expect(onDeselectAll).toHaveBeenCalledTimes(1);
  });

  it('drops Import for a full-text search', () => {
    renderHeader({ searchTarget: 'text' });
    expect(sentItems().map((item) => item['id'])).toEqual(['viewMenu', 'settingsMenu']);
  });

  it('clears the bar when the header unmounts', () => {
    const { unmount } = renderHeader();
    unmount();
    expect(h.setItems).toHaveBeenLastCalledWith([]);
  });
});
