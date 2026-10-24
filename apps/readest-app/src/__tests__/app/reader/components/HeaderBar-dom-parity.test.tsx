import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// DOM identity with main for the reader header off the Duo. The snapshots were
// written with the component files of the branch's merge base (5273f82fc) in
// place and must pass unchanged on the branch: any markup change off the Duo
// fails here. Regenerate them from the new base after a rebase, never from the
// branch itself. The file imports nothing that exists only on the branch.

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const h = vi.hoisted(() => ({
  appService: {} as Record<string, boolean>,
  theme: {} as Record<string, unknown>,
  viewSettings: {
    enableAnnotationQuickActions: true,
    annotationQuickAction: null as string | null,
  },
}));

vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({ envConfig: {}, appService: h.appService }),
}));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (key: string) => key }));
vi.mock('@/hooks/useResponsiveSize', () => ({ useResponsiveSize: (n: number) => n }));
vi.mock('@/hooks/useTrafficLight', () => ({
  useTrafficLight: () => ({ isTrafficLightVisible: false }),
}));
vi.mock('@/store/trafficLightStore', () => ({
  useTrafficLightStore: () => ({
    trafficLightInFullscreen: false,
    setTrafficLightVisibility: vi.fn(),
  }),
}));
vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: () => ({
    settings: { globalReadSettings: { highlightStyle: 'highlight', highlightStyles: {} } },
  }),
}));
vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector?: (s: typeof h.theme) => unknown) =>
    selector ? selector(h.theme) : h.theme,
}));
vi.mock('@/store/sidebarStore', () => ({
  useSidebarStore: () => ({ isSideBarVisible: false, getIsSideBarVisible: () => false }),
}));
// Real view settings, so the header's own inset helpers run unmocked.
vi.mock('@/store/readerStore', async () => {
  const { DEFAULT_BOOK_LAYOUT } = await import('@/services/constants');
  return {
    useReaderStore: () => ({
      bookKeys: ['book-1'],
      hoveredBookKey: 'book-1',
      getView: () => null,
      getViewSettings: () => ({ ...DEFAULT_BOOK_LAYOUT, ...h.viewSettings }),
      setHoveredBookKey: vi.fn(),
    }),
  };
});
vi.mock('@/store/bookDataStore', () => ({
  useBookDataStore: () => ({ getBookData: () => null, getConfig: () => null }),
}));
vi.mock('@/app/reader/hooks/useSpatialNavigation', () => ({ useSpatialNavigation: () => {} }));
vi.mock('@/app/reader/hooks/useWindowFocusRestore', () => ({
  useWindowFocusRestore: () => () => false,
}));
vi.mock('@/helpers/settings', () => ({ saveViewSettings: vi.fn() }));
vi.mock('@/services/environment', () => ({
  isTauriAppPlatform: () => false,
  needsPointerWindowControls: () => false,
}));
vi.mock('@/utils/bridge', () => ({
  setNativeBarItems: vi.fn(),
  subscribeNativeBarItemTaps: vi.fn(),
}));
// The togglers have DOM parity files of their own; here they render nothing so
// this snapshot is the header's own markup.
vi.mock('@/app/reader/components/SidebarToggler', () => ({ default: () => null }));
vi.mock('@/app/reader/components/BookmarkToggler', () => ({ default: () => null }));
vi.mock('@/app/reader/components/NotebookToggler', () => ({ default: () => null }));
vi.mock('@/app/reader/components/TranslationToggler', () => ({ default: () => null }));
vi.mock('@/app/reader/components/ViewMenu', () => ({ default: () => null }));
vi.mock('@/app/reader/components/annotator/QuickActionMenu', () => ({ default: () => null }));
vi.mock('@/app/reader/components/SyncInfoDialog', () => ({ default: () => null }));
vi.mock('@/components/ModalPortal', () => ({ default: () => null }));

import HeaderBar from '@/app/reader/components/HeaderBar';
import { DropdownProvider } from '@/context/DropdownContext';

type Insets = { top: number; right: number; bottom: number; left: number };
const noInsets: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
const base = {
  isDarkMode: false,
  systemUIVisible: true,
  systemUIAlwaysHidden: false,
  statusBarHeight: 0,
  isIPhoneDuo: false,
  nativeBarsSupported: false,
};
const ios = { isIOSApp: true, isMobile: true, hasSafeAreaInset: true };

// docs/safe-area-insets.md's parity list, plus the Duo with its bars inactive.
const scenarios: Array<{
  name: string;
  app: Record<string, boolean>;
  theme: Record<string, unknown>;
  width: number;
  insets: Insets;
}> = [
  {
    name: 'iPhone, top inset 59',
    app: ios,
    theme: base,
    width: 402,
    insets: { ...noInsets, top: 59 },
  },
  {
    name: 'iPhone landscape, 62/62',
    app: ios,
    theme: base,
    width: 874,
    insets: { top: 0, right: 62, bottom: 21, left: 62 },
  },
  { name: 'iPad', app: ios, theme: base, width: 1024, insets: { ...noInsets, top: 24 } },
  {
    name: 'Android with a cutout',
    app: { isAndroidApp: true, isMobile: true, hasSafeAreaInset: true },
    theme: base,
    width: 412,
    insets: { ...noInsets, top: 32 },
  },
  {
    name: '960x640',
    app: { isAndroidApp: true, isMobile: true, hasSafeAreaInset: true },
    theme: base,
    width: 960,
    insets: noInsets,
  },
  { name: '1024x680', app: ios, theme: base, width: 1024, insets: noInsets },
  {
    name: 'desktop',
    app: { isMobile: false, hasSafeAreaInset: false },
    theme: base,
    width: 1280,
    insets: noInsets,
  },
  {
    name: 'Duo, status bar hidden',
    app: ios,
    theme: { ...base, isIPhoneDuo: true, nativeBarsSupported: true, systemUIVisible: false },
    width: 951,
    insets: noInsets,
  },
  {
    name: 'Duo, status bar always hidden',
    app: ios,
    theme: { ...base, isIPhoneDuo: true, nativeBarsSupported: true, systemUIAlwaysHidden: true },
    width: 466,
    insets: noInsets,
  },
];

const renderHeader = (insets: Insets) =>
  render(
    <DropdownProvider>
      <HeaderBar
        bookKey='book-1'
        bookTitle='A Title'
        isTopLeft={true}
        isHoveredAnim={false}
        gridInsets={insets}
        screenInsets={insets}
        onCloseBook={vi.fn()}
        onGoToLibrary={vi.fn()}
      />
    </DropdownProvider>,
  );

beforeEach(() => vi.stubGlobal('ResizeObserver', MockResizeObserver));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe.each(scenarios)('HeaderBar DOM parity with main: $name', ({
  app,
  theme,
  width,
  insets,
}) => {
  beforeEach(() => {
    h.appService = { hasTrafficLight: false, hasWindowBar: false, ...app };
    h.theme = theme;
    vi.stubGlobal('innerWidth', width);
  });

  it('renders the same markup as main', () => {
    h.viewSettings = { enableAnnotationQuickActions: true, annotationQuickAction: null };
    expect(renderHeader(insets).container.innerHTML).toMatchSnapshot();
  });

  it('renders the same markup as main with a quick action set', () => {
    h.viewSettings = { enableAnnotationQuickActions: true, annotationQuickAction: 'highlight' };
    expect(renderHeader(insets).container.innerHTML).toMatchSnapshot();
  });
});
