import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LibraryHeader from '@/app/library/components/LibraryHeader';
import { DropdownProvider } from '@/context/DropdownContext';

const h = vi.hoisted(() => ({
  setItems: vi.fn(),
  subscribe: vi.fn(),
  appService: {} as Record<string, boolean>,
  theme: {} as Record<string, unknown>,
}));

vi.mock('@/context/EnvContext', () => ({ useEnv: () => ({ appService: h.appService }) }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (key: string) => key }));
vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector?: (s: typeof h.theme) => unknown) =>
    selector ? selector(h.theme) : h.theme,
}));
vi.mock('@/store/libraryStore', () => ({ useLibraryStore: () => ({ currentBookshelf: [] }) }));
vi.mock('@/hooks/useTrafficLight', () => ({
  useTrafficLight: () => ({ isTrafficLightVisible: true }),
}));
vi.mock('@/hooks/useResponsiveSize', () => ({ useResponsiveSize: (size: number) => size }));
vi.mock('@/hooks/useShortcuts', () => ({ default: () => {} }));
vi.mock('@/services/environment', () => ({
  isTauriAppPlatform: () => false,
  needsPointerWindowControls: () => false,
}));
vi.mock('@/utils/bridge', () => ({
  setNativeBarItems: h.setItems,
  subscribeNativeBarItemTaps: h.subscribe,
}));
vi.mock('@/app/library/components/SettingsMenu', () => ({ default: () => null }));
vi.mock('@/app/library/components/ImportMenu', () => ({ default: () => null }));
vi.mock('@/app/library/components/LibrarySearchOptionsMenu', () => ({ default: () => null }));
vi.mock('@/app/library/components/ViewMenu', () => ({ default: () => null }));

const noInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const base = { systemUIVisible: true, systemUIAlwaysHidden: false, statusBarHeight: 0 };

// Every input from docs/safe-area-insets.md's parity list that reaches this header.
const scenarios = [
  {
    name: 'iPhone, top inset 59',
    app: { isIOSApp: true, isMobile: true, hasWindowBar: false },
    theme: { ...base, isIPhoneDuo: false, safeAreaInsets: { ...noInsets, top: 59 } },
  },
  {
    name: 'iPhone landscape, 62/62',
    app: { isIOSApp: true, isMobile: true, hasWindowBar: false },
    theme: {
      ...base,
      isIPhoneDuo: false,
      safeAreaInsets: { top: 0, right: 62, bottom: 21, left: 62 },
    },
  },
  {
    name: 'iPad',
    app: { isIOSApp: true, isMobile: false, hasWindowBar: false },
    theme: { ...base, isIPhoneDuo: false, safeAreaInsets: { ...noInsets, top: 24 } },
  },
  {
    name: 'desktop',
    app: { isIOSApp: false, isMobile: false, hasWindowBar: true },
    theme: { ...base, isIPhoneDuo: false, safeAreaInsets: noInsets },
  },
  {
    name: 'Duo with the status bar hidden',
    app: { isIOSApp: true, isMobile: true, hasWindowBar: false },
    theme: {
      ...base,
      isIPhoneDuo: true,
      systemUIVisible: false,
      safeAreaInsets: { top: 0, right: 84, bottom: 0, left: 0 },
    },
  },
  {
    name: 'Duo with the status bar always hidden',
    app: { isIOSApp: true, isMobile: true, hasWindowBar: false },
    theme: {
      ...base,
      isIPhoneDuo: true,
      systemUIAlwaysHidden: true,
      safeAreaInsets: noInsets,
    },
  },
];

const renderHeader = (isSelectMode = false) =>
  render(
    <DropdownProvider>
      <LibraryHeader
        isSelectMode={isSelectMode}
        isSelectAll={false}
        onPullLibrary={vi.fn()}
        onImportBooksFromFiles={vi.fn()}
        onOpenCatalogManager={vi.fn()}
        onOpenFeeds={vi.fn()}
        onToggleSelectMode={vi.fn()}
        onSelectAll={vi.fn()}
        onDeselectAll={vi.fn()}
        searchQuery=''
        searchTarget='books'
        searchConfig={{} as never}
        onSearchConfigChange={vi.fn()}
        onSearchQueryChange={vi.fn()}
        onSearchTargetChange={vi.fn()}
      />
    </DropdownProvider>,
  );

beforeEach(() => {
  h.setItems.mockReset();
  h.setItems.mockResolvedValue({ success: true });
  h.subscribe.mockReset();
  h.subscribe.mockResolvedValue(() => {});
});

afterEach(() => cleanup());

describe.each(scenarios)('LibraryHeader parity: $name', ({ app, theme }) => {
  beforeEach(() => {
    h.appService = app;
    h.theme = theme;
  });

  it('never touches the native bar', () => {
    const { rerender, unmount } = renderHeader();
    rerender(<></>);
    unmount();
    expect(h.setItems).not.toHaveBeenCalled();
    expect(h.subscribe).not.toHaveBeenCalled();
  });

  it('keeps the HTML toggles, their classes and the divider', () => {
    const { getByLabelText, container } = renderHeader();
    for (const label of ['Import Books', 'View Menu', 'Settings Menu']) {
      const toggle = getByLabelText(label);
      expect(toggle.className).not.toContain('invisible');
      expect(toggle.className).not.toContain('h-0');
    }
    expect(getByLabelText('Import Books').className).toContain('h-6 min-h-6 w-6');
    expect(getByLabelText('View Menu').className).toContain('h-8 min-h-8 w-8');
    expect(getByLabelText('Settings Menu').className).toContain('h-8 min-h-8 w-8');
    expect(container.querySelector('.w-\\[0\\.5px\\]')).not.toBeNull();
  });

  it('keeps the Select All text button in select mode', () => {
    const { getByLabelText } = renderHeader(true);
    expect(getByLabelText('Select All').tagName).toBe('BUTTON');
    expect(h.setItems).not.toHaveBeenCalled();
  });
});
