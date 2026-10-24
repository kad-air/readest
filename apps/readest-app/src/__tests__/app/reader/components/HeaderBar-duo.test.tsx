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
  },
  theme: {
    isDarkMode: false,
    systemUIVisible: true,
    systemUIAlwaysHidden: false,
    statusBarHeight: 0,
    isIPhoneDuo: true,
  },
  viewSettings: {
    enableAnnotationQuickActions: true,
    annotationQuickAction: null as string | null,
  },
  hoveredBookKey: 'book-1' as string | null,
  setItems: vi.fn(),
  subscribe: vi.fn(),
  onGoToLibrary: vi.fn(),
  onCloseBook: vi.fn(),
  setHoveredBookKey: vi.fn(),
  windowButtonsProps: null as Record<string, unknown> | null,
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
    setHoveredBookKey: h.setHoveredBookKey,
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
  default: ({ menuClassName }: { menuClassName?: string }) => (
    <div data-testid='quick-action-menu' className={menuClassName} />
  ),
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

const insets = { top: 0, right: 0, bottom: 0, left: 0 };

const renderHeader = () =>
  render(
    <DropdownProvider>
      <HeaderBar
        bookKey='book-1'
        bookTitle='A Title'
        isTopLeft={true}
        isHoveredAnim={false}
        gridInsets={insets}
        screenInsets={insets}
        onCloseBook={h.onCloseBook}
        onGoToLibrary={h.onGoToLibrary}
      />
    </DropdownProvider>,
  );

const slice = (name: string) => useNativeBarStore.getState().slices[`book-1:${name}`];
const sliceNames = () => Object.keys(useNativeBarStore.getState().slices).sort();

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  h.theme = {
    isDarkMode: false,
    systemUIVisible: true,
    systemUIAlwaysHidden: false,
    statusBarHeight: 0,
    isIPhoneDuo: true,
  };
  h.viewSettings = { enableAnnotationQuickActions: true, annotationQuickAction: null };
  h.hoveredBookKey = 'book-1';
  h.onGoToLibrary.mockReset();
  h.onCloseBook.mockReset();
  h.setHoveredBookKey.mockReset();
  h.windowButtonsProps = null;
  h.setItems.mockReset();
  h.subscribe.mockReset();
  useNativeBarStore.setState({ slices: {} });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('HeaderBar with the Duo native bars active', () => {
  it('registers the library, quick action and view options slices', () => {
    renderHeader();
    expect(sliceNames()).toEqual([
      'book-1:closeBook',
      'book-1:library',
      'book-1:quickAction',
      'book-1:viewOptions',
    ]);

    expect(slice('library')).toMatchObject({
      order: 0,
      items: [
        {
          id: 'library',
          title: 'Go to Library',
          symbol: 'chevron.left',
          placement: 'leading',
          priority: 'high',
        },
      ],
    });
    expect(slice('quickAction')).toMatchObject({
      order: 4,
      items: [
        {
          id: 'quickAction',
          title: 'Enable Quick Action on Selection',
          symbol: 'highlighter',
          placement: 'leading',
          selected: false,
        },
      ],
    });
    expect(slice('viewOptions')).toMatchObject({
      order: 11,
      items: [
        {
          id: 'viewOptions',
          title: 'View Options',
          symbol: 'line.3.horizontal',
          placement: 'trailing',
        },
      ],
    });
  });

  it('marks the quick action selected and retitles it once an action is set', () => {
    h.viewSettings = { enableAnnotationQuickActions: true, annotationQuickAction: 'highlight' };
    renderHeader();
    expect(slice('quickAction')!.items[0]).toMatchObject({
      title: 'Disable Quick Action',
      selected: true,
    });
  });

  it('registers no quick action slice when quick actions are off', () => {
    h.viewSettings = { enableAnnotationQuickActions: false, annotationQuickAction: null };
    const { queryByLabelText } = renderHeader();
    expect(sliceNames()).toEqual(['book-1:closeBook', 'book-1:library', 'book-1:viewOptions']);
    expect(queryByLabelText('Enable Quick Action on Selection')).toBeNull();
  });

  it('drops the Go to Library button', () => {
    const { queryByTitle } = renderHeader();
    expect(queryByTitle('Go to Library')).toBeNull();
  });

  it('goes to the library from the native item', () => {
    renderHeader();
    act(() => slice('library')!.items[0]!.onTap());
    expect(h.onGoToLibrary).toHaveBeenCalledTimes(1);
  });

  it('keeps both dropdown toggles mounted but zero-size', () => {
    const { getByLabelText } = renderHeader();
    for (const label of ['Enable Quick Action on Selection', 'View Options']) {
      const toggle = getByLabelText(label);
      expect(toggle.className).toContain('invisible');
      expect(toggle.className).toContain('h-0');
      expect(toggle.className).toContain('w-0');
      expect(toggle.className).not.toContain('btn-ghost');
    }
  });

  it('closes View Options on a second tap of its native item', () => {
    const { queryByTestId } = renderHeader();
    act(() => slice('viewOptions')!.items[0]!.onTap());
    expect(queryByTestId('view-menu')).not.toBeNull();
    act(() => slice('viewOptions')!.items[0]!.onTap());
    expect(queryByTestId('view-menu')).toBeNull();
  });

  it('opens the View Options and Quick Action menus from their native items', () => {
    const { getByLabelText, queryByTestId } = renderHeader();
    expect(queryByTestId('view-menu')).toBeNull();
    act(() => slice('viewOptions')!.items[0]!.onTap());
    expect(getByLabelText('View Options').getAttribute('aria-expanded')).toBe('true');
    expect(queryByTestId('view-menu')).not.toBeNull();

    act(() => slice('quickAction')!.items[0]!.onTap());
    expect(queryByTestId('quick-action-menu')).not.toBeNull();
    expect(queryByTestId('view-menu')).toBeNull();
    // Positioned like the other menus: a relative, centred menu on a zero-size
    // toggle at the top of the screen opens half off-screen.
    expect(queryByTestId('quick-action-menu')?.className ?? '').not.toContain('relative');
  });

  it('registers Close Book ahead of Go to Library in the leading group', () => {
    renderHeader();
    expect(sliceNames()).toContain('book-1:closeBook');
    expect(slice('closeBook')!.order).toBeLessThan(slice('library')!.order);
    expect(slice('closeBook')!.items[0]).toMatchObject({
      id: 'closeBook',
      title: 'Close Book',
      symbol: 'xmark',
      placement: 'leading',
      priority: 'high',
    });
    act(() => slice('closeBook')!.items[0]!.onTap());
    expect(h.setHoveredBookKey).toHaveBeenCalledWith(null);
    expect(h.onCloseBook).toHaveBeenCalledWith('book-1');
  });

  it('hides the HTML Close Book button', () => {
    renderHeader();
    expect(h.windowButtonsProps?.['showClose']).toBe(false);
  });

  it('moves the Quick Action menu to the end cluster so it opens beside the strip', () => {
    const { getByLabelText } = renderHeader();
    const toggle = getByLabelText('Enable Quick Action on Selection');
    expect(toggle.closest('.header-tools-end')).not.toBeNull();
    const details = toggle.parentElement?.querySelector('details');
    expect(details?.className).toContain('dropdown-end');
    expect(details?.className).not.toContain('dropdown-center');
  });

  it('mirrors the HTML header: Go to Library only on windows 640 and wider', () => {
    // The HTML button is `hidden sm:flex`, so the cover display (466 wide) shows
    // Close Book alone and never both ways back to the library.
    vi.stubGlobal('innerWidth', 466);
    const narrow = renderHeader();
    expect(sliceNames()).not.toContain('book-1:library');
    expect(sliceNames()).toContain('book-1:closeBook');
    narrow.unmount();
    vi.stubGlobal('innerWidth', 669);
    renderHeader();
    expect(sliceNames()).toContain('book-1:library');
  });

  it('collapses the empty header band on the cover display, keeps it on the inner display', () => {
    // Under 640 the title is `hidden sm:flex` and every button is native, so
    // the band has nothing to show; the dropdowns inside it stay mounted.
    vi.stubGlobal('innerWidth', 466);
    const narrow = renderHeader();
    const narrowBanner = narrow.getByRole('banner');
    expect(narrowBanner.className).toContain('h-0');
    expect(narrowBanner.className).not.toContain('h-11');
    expect(narrowBanner.className).not.toContain('shadow-xs');
    expect(narrow.getByLabelText('View Options')).toBeTruthy();
    narrow.unmount();
    vi.stubGlobal('innerWidth', 669);
    const wide = renderHeader();
    expect(wide.getByRole('banner').className).toContain('h-11');
    expect(wide.getByRole('banner').className).toContain('shadow-xs');
  });

  it('keeps the book title in the header', () => {
    const { getByRole } = renderHeader();
    expect(getByRole('contentinfo').textContent).toBe('A Title');
  });

  it('clears its slices on unmount', () => {
    const { unmount } = renderHeader();
    unmount();
    expect(sliceNames()).toEqual([]);
  });
});

describe('HeaderBar with the native bars inactive on the Duo', () => {
  it.each([
    ['status bar hidden', { systemUIVisible: false }],
    ['status bar always hidden', { systemUIAlwaysHidden: true }],
  ])('renders the Go to Library button and normal toggles (%s)', (_name, patch) => {
    h.theme = { ...h.theme, ...patch };
    const { getByTitle, getByLabelText } = renderHeader();
    expect(getByTitle('Go to Library')).toBeTruthy();
    expect(getByLabelText('View Options').className).toContain('btn-ghost');
    expect(getByLabelText('View Options').className).not.toContain('invisible');
    expect(h.setItems).not.toHaveBeenCalled();
  });
});
