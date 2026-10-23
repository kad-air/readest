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
vi.mock('@/components/WindowButtons', () => ({ default: () => null }));
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
        onCloseBook={vi.fn()}
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
    expect(sliceNames()).toEqual(['book-1:library', 'book-1:quickAction', 'book-1:viewOptions']);

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
          symbol: 'ellipsis.circle',
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
    expect(sliceNames()).toEqual(['book-1:library', 'book-1:viewOptions']);
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

  it('opens the View Options and Quick Action menus from their native items', () => {
    const { getByLabelText, queryByTestId } = renderHeader();
    expect(queryByTestId('view-menu')).toBeNull();
    act(() => slice('viewOptions')!.items[0]!.onTap());
    expect(getByLabelText('View Options').getAttribute('aria-expanded')).toBe('true');
    expect(queryByTestId('view-menu')).not.toBeNull();

    act(() => slice('quickAction')!.items[0]!.onTap());
    expect(queryByTestId('quick-action-menu')).not.toBeNull();
    expect(queryByTestId('view-menu')).toBeNull();
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
