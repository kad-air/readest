import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// DOM identity with main for the library header off the Duo. The snapshots were
// written with the component files of the branch's merge base (5273f82fc) in
// place and must pass unchanged on the branch. Regenerate them from the new
// base after a rebase, never from the branch itself. The file imports nothing
// that exists only on the branch.

import LibraryHeader from '@/app/library/components/LibraryHeader';
import { DropdownProvider } from '@/context/DropdownContext';

const h = vi.hoisted(() => ({
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
  setNativeBarItems: vi.fn(),
  subscribeNativeBarItemTaps: vi.fn(),
}));
vi.mock('@/app/library/components/SettingsMenu', () => ({ default: () => null }));
vi.mock('@/app/library/components/ImportMenu', () => ({ default: () => null }));
vi.mock('@/app/library/components/LibrarySearchOptionsMenu', () => ({ default: () => null }));
vi.mock('@/app/library/components/ViewMenu', () => ({ default: () => null }));

const noInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const base = {
  systemUIVisible: true,
  systemUIAlwaysHidden: false,
  statusBarHeight: 0,
  isIPhoneDuo: false,
  nativeBarsSupported: false,
};
const phone = { isIOSApp: true, isMobile: true, hasWindowBar: false };

// docs/safe-area-insets.md's parity list, plus the Duo with its bars inactive.
const scenarios = [
  {
    name: 'iPhone, top inset 59',
    app: phone,
    width: 402,
    theme: { ...base, safeAreaInsets: { ...noInsets, top: 59 } },
  },
  {
    name: 'iPhone landscape, 62/62',
    app: phone,
    width: 874,
    theme: { ...base, safeAreaInsets: { top: 0, right: 62, bottom: 21, left: 62 } },
  },
  {
    name: 'iPad',
    app: { isIOSApp: true, isMobile: false, hasWindowBar: false },
    width: 1024,
    theme: { ...base, safeAreaInsets: { ...noInsets, top: 24 } },
  },
  {
    name: 'Android with a cutout',
    app: { isAndroidApp: true, isMobile: true, hasWindowBar: false },
    width: 412,
    theme: { ...base, safeAreaInsets: { ...noInsets, top: 32 } },
  },
  {
    name: '960x640',
    app: { isAndroidApp: true, isMobile: true, hasWindowBar: false },
    width: 960,
    theme: { ...base, safeAreaInsets: noInsets },
  },
  {
    name: '1024x680',
    app: { isIOSApp: true, isMobile: false, hasWindowBar: false },
    width: 1024,
    theme: { ...base, safeAreaInsets: noInsets },
  },
  {
    name: 'desktop',
    app: { isIOSApp: false, isMobile: false, hasWindowBar: true },
    width: 1280,
    theme: { ...base, safeAreaInsets: noInsets },
  },
  {
    name: 'Duo, status bar hidden',
    app: phone,
    width: 951,
    theme: {
      ...base,
      isIPhoneDuo: true,
      nativeBarsSupported: true,
      systemUIVisible: false,
      safeAreaInsets: { top: 0, right: 84, bottom: 0, left: 0 },
    },
  },
  {
    name: 'Duo, status bar always hidden',
    app: phone,
    width: 466,
    theme: {
      ...base,
      isIPhoneDuo: true,
      nativeBarsSupported: true,
      systemUIAlwaysHidden: true,
      safeAreaInsets: noInsets,
    },
  },
];

const renderHeader = (isSelectMode: boolean, searchTarget: 'books' | 'text') =>
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
        searchTarget={searchTarget}
        searchConfig={{} as never}
        onSearchConfigChange={vi.fn()}
        onSearchQueryChange={vi.fn()}
        onSearchTargetChange={vi.fn()}
      />
    </DropdownProvider>,
  );

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe.each(scenarios)('LibraryHeader DOM parity with main: $name', ({ app, theme, width }) => {
  beforeEach(() => {
    h.appService = app;
    h.theme = theme;
    vi.stubGlobal('innerWidth', width);
  });

  it('renders the same markup as main while browsing', () => {
    expect(renderHeader(false, 'books').container.innerHTML).toMatchSnapshot();
  });

  it('renders the same markup as main in select mode', () => {
    expect(renderHeader(true, 'books').container.innerHTML).toMatchSnapshot();
  });

  it('renders the same markup as main for a full-text search', () => {
    expect(renderHeader(false, 'text').container.innerHTML).toMatchSnapshot();
  });
});
