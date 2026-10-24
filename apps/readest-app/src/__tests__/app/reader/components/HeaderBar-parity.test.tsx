import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const h = vi.hoisted(() => ({
  appService: {
    isIOSApp: true,
    isMobile: true,
    hasTrafficLight: false,
    hasWindowBar: false,
    hasSafeAreaInset: true,
  } as Record<string, boolean>,
  theme: {
    isDarkMode: false,
    systemUIVisible: true,
    systemUIAlwaysHidden: false,
    statusBarHeight: 0,
    isIPhoneDuo: false,
  },
  viewSettings: {
    enableAnnotationQuickActions: true,
    annotationQuickAction: null as string | null,
  },
  hoveredBookKey: 'book-1' as string | null,
  setItems: vi.fn(),
  subscribe: vi.fn(),
  windowButtonsProps: null as Record<string, unknown> | null,
  onGoToLibrary: vi.fn(),
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
vi.mock('@/store/readerStore', () => ({
  useReaderStore: () => ({
    bookKeys: ['book-1'],
    hoveredBookKey: h.hoveredBookKey,
    getView: () => null,
    getViewSettings: () => h.viewSettings,
    setHoveredBookKey: vi.fn(),
  }),
}));
vi.mock('@/store/bookDataStore', () => ({
  useBookDataStore: () => ({ getBookData: () => null, getConfig: () => null }),
}));
vi.mock('@/app/reader/hooks/useSpatialNavigation', () => ({ useSpatialNavigation: () => {} }));
vi.mock('@/app/reader/hooks/useWindowFocusRestore', () => ({
  useWindowFocusRestore: () => () => false,
}));
vi.mock('@/utils/insets', () => ({
  getHeaderTriggerHeight: () => 0,
  getHorizontalInsetStyle: () => ({}),
}));
vi.mock('@/helpers/settings', () => ({ saveViewSettings: vi.fn() }));
vi.mock('@/utils/bridge', () => ({
  setNativeBarItems: h.setItems,
  subscribeNativeBarItemTaps: h.subscribe,
}));
vi.mock('@/app/reader/components/SidebarToggler', () => ({ default: () => null }));
vi.mock('@/app/reader/components/BookmarkToggler', () => ({ default: () => null }));
vi.mock('@/app/reader/components/NotebookToggler', () => ({ default: () => null }));
vi.mock('@/app/reader/components/TranslationToggler', () => ({ default: () => null }));
vi.mock('@/app/reader/components/ViewMenu', () => ({
  default: () => <div data-testid='view-menu' />,
}));
vi.mock('@/app/reader/components/annotator/QuickActionMenu', () => ({
  default: () => <div data-testid='quick-action-menu' />,
}));
vi.mock('@/app/reader/components/SyncInfoDialog', () => ({ default: () => null }));
vi.mock('@/components/WindowButtons', () => ({
  default: (props: Record<string, unknown>) => {
    h.windowButtonsProps = props;
    return null;
  },
}));
vi.mock('@/components/ModalPortal', () => ({ default: () => null }));

import HeaderBar from '@/app/reader/components/HeaderBar';
import { DropdownProvider } from '@/context/DropdownContext';
import { useNativeBarStore } from '@/store/nativeBarStore';

const renderHeader = (insets = { top: 0, right: 0, bottom: 0, left: 0 }) =>
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
        onGoToLibrary={h.onGoToLibrary}
      />
    </DropdownProvider>,
  );

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  h.viewSettings = { enableAnnotationQuickActions: true, annotationQuickAction: null };
  h.hoveredBookKey = 'book-1';
  h.onGoToLibrary.mockReset();
  h.setItems.mockReset();
  h.subscribe.mockReset();
  useNativeBarStore.setState({ slices: {} });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// Off the Duo the bar renders what it did before the native bars: an iPhone with
// a 59 top inset, an iPhone held landscape, an iPad, an Android phone, desktop,
// and the Duo's own flag false everywhere.
const scenarios: Array<[string, Record<string, boolean>, number, number]> = [
  [
    'iPhone with a 59 top inset',
    { isIOSApp: true, isMobile: true, hasSafeAreaInset: true },
    59,
    59,
  ],
  ['iPad', { isIOSApp: true, isMobile: true, hasSafeAreaInset: true }, 24, 24],
  ['Android with a cutout', { isAndroidApp: true, isMobile: true, hasSafeAreaInset: true }, 32, 32],
  ['desktop', { isMobile: false, hasSafeAreaInset: false }, 0, 0],
];

describe.each(scenarios)('HeaderBar parity on %s', (_name, appService, top, marginTop) => {
  const insets = { top, right: 0, bottom: 0, left: 0 };
  beforeEach(() => {
    h.appService = { hasTrafficLight: false, hasWindowBar: false, ...appService };
    h.theme = { ...h.theme, isIPhoneDuo: false };
  });

  it('renders the Go to Library button as before', () => {
    const { getByTitle } = renderHeader(insets);
    const button = getByTitle('Go to Library');
    expect(button.className).toBe('btn btn-ghost hidden h-8 min-h-8 w-8 p-0 sm:flex');
    act(() => button.click());
    expect(h.onGoToLibrary).toHaveBeenCalledTimes(1);
  });

  it('renders the dropdown toggles with their normal classes', () => {
    const { getByLabelText } = renderHeader(insets);
    const viewOptions = getByLabelText('View Options').className;
    expect(viewOptions).toContain('btn btn-ghost h-8 min-h-8 w-8 p-0 mt-0');
    expect(viewOptions).not.toContain('invisible');
    const quickAction = getByLabelText('Enable Quick Action on Selection').className;
    expect(quickAction).toContain('btn btn-ghost h-8 min-h-8 w-8 p-0');
    expect(quickAction).not.toContain('invisible');
  });

  it('keeps the header where it was', () => {
    const { getByRole } = renderHeader(insets);
    expect((getByRole('banner') as HTMLElement).style.marginTop).toBe(`${marginTop}px`);
  });

  it('keeps the Close Book button and the Quick Action menu in the start cluster', () => {
    const { getByLabelText } = renderHeader(insets);
    expect(h.windowButtonsProps?.['showClose']).not.toBe(false);
    const toggle = getByLabelText('Enable Quick Action on Selection');
    expect(toggle.closest('.header-tools-end')).toBeNull();
    expect(toggle.parentElement?.querySelector('details')?.className).toContain('dropdown-center');
  });

  it('keeps the title', () => {
    const { getByRole } = renderHeader(insets);
    expect(getByRole('contentinfo').textContent).toBe('A Title');
  });

  it('never talks to the native bar bridge', () => {
    const { rerender, unmount } = renderHeader(insets);
    h.hoveredBookKey = '';
    rerender(<div />);
    unmount();
    expect(h.setItems).not.toHaveBeenCalled();
    expect(h.subscribe).not.toHaveBeenCalled();
  });
});

describe('HeaderBar parity with the Duo flag set but not on iOS', () => {
  it('keeps the Go to Library button outside the iOS app', () => {
    h.appService = {
      isIOSApp: false,
      isMobile: false,
      hasTrafficLight: false,
      hasWindowBar: false,
    };
    h.theme = { ...h.theme, isIPhoneDuo: true };
    const { getByTitle } = renderHeader();
    expect(getByTitle('Go to Library')).toBeTruthy();
    expect(h.setItems).not.toHaveBeenCalled();
  });
});
