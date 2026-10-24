import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  appService: { isIOSApp: true, isMobile: true, isMobileApp: true },
  theme: {
    isIPhoneDuo: true,
    nativeBarsSupported: true,
    systemUIVisible: true,
    systemUIAlwaysHidden: false,
  },
  booknotes: [] as Array<Record<string, unknown>>,
  ribbonVisible: false,
  setRibbon: vi.fn(),
  saveConfig: vi.fn(),
  updateBooknotes: vi.fn(),
}));

vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({ envConfig: {}, appService: h.appService }),
}));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (key: string) => key }));
vi.mock('@/hooks/useResponsiveSize', () => ({ useResponsiveSize: (n: number) => n }));
vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector: (s: typeof h.theme) => unknown) => selector(h.theme),
}));
vi.mock('@/store/settingsStore', () => ({ useSettingsStore: () => ({ settings: {} }) }));
vi.mock('@/store/bookDataStore', () => ({
  useBookDataStore: () => ({
    getConfig: () => ({ booknotes: h.booknotes }),
    getBookData: () => ({ book: { format: 'EPUB' } }),
    saveConfig: h.saveConfig,
    updateBooknotes: h.updateBooknotes,
  }),
}));
// A stable progress object: the toggler re-reads it in an effect dependency.
const progress = { location: 'cfi-1', page: 1, range: null };
vi.mock('@/store/readerStore', () => ({
  useReaderStore: () => ({
    getProgress: () => progress,
    getViewState: () => ({ ribbonVisible: h.ribbonVisible }),
    setBookmarkRibbonVisibility: h.setRibbon,
  }),
}));
vi.mock('@/utils/cfi', () => ({ isCfiInLocation: (a: string, b: string) => a === b }));
vi.mock('@/utils/book', () => ({ getCurrentPage: () => 1 }));

import BookmarkToggler from '@/app/reader/components/BookmarkToggler';
import { useNativeBarStore } from '@/store/nativeBarStore';

const bookmark = (cfi: string) => ({ type: 'bookmark', cfi, deletedAt: null });
const slice = () => useNativeBarStore.getState().slices['book-1:bookmark'];

beforeEach(() => {
  h.theme = {
    isIPhoneDuo: true,
    nativeBarsSupported: true,
    systemUIVisible: true,
    systemUIAlwaysHidden: false,
  };
  h.booknotes = [];
  h.ribbonVisible = false;
  h.setRibbon.mockReset();
  h.saveConfig.mockReset();
  h.updateBooknotes.mockReset();
  useNativeBarStore.setState({ slices: {} });
});

afterEach(() => cleanup());

describe('BookmarkToggler with the Duo native bars active', () => {
  it('registers the unselected bookmark item for an unbookmarked page', () => {
    render(<BookmarkToggler bookKey='book-1' />);
    expect(slice()).toMatchObject({
      order: 2,
      items: [
        {
          id: 'bookmark',
          title: 'Add Bookmark',
          symbol: 'bookmark',
          placement: 'leading',
          selected: false,
        },
      ],
    });
  });

  it('registers the filled, selected item once the page is bookmarked', () => {
    h.booknotes = [bookmark('cfi-1')];
    render(<BookmarkToggler bookKey='book-1' />);
    expect(slice()!.items[0]).toMatchObject({
      title: 'Remove Bookmark',
      symbol: 'bookmark.fill',
      selected: true,
    });
  });

  it('renders no HTML button', () => {
    const { container } = render(<BookmarkToggler bookKey='book-1' />);
    expect(container.firstChild).toBeNull();
  });

  it('keeps driving the ribbon', () => {
    h.booknotes = [bookmark('cfi-1')];
    render(<BookmarkToggler bookKey='book-1' />);
    expect(h.setRibbon).toHaveBeenLastCalledWith('book-1', true);
  });

  it('toggles the bookmark from the native item', () => {
    h.updateBooknotes.mockReturnValue({});
    render(<BookmarkToggler bookKey='book-1' />);
    act(() => slice()!.items[0]!.onTap());
    expect(h.updateBooknotes).toHaveBeenCalledTimes(1);
    expect(h.updateBooknotes.mock.calls[0]![1]).toHaveLength(1);
  });

  it('clears the slice on unmount', () => {
    const { unmount } = render(<BookmarkToggler bookKey='book-1' />);
    unmount();
    expect(slice()).toBeUndefined();
  });
});

describe('BookmarkToggler with the native bars inactive', () => {
  it.each([
    ['off the Duo', { isIPhoneDuo: false }],
    ['status bar hidden', { systemUIVisible: false }],
  ])('renders the button as before (%s)', (_name, patch) => {
    h.theme = { ...h.theme, ...patch };
    const { getByLabelText } = render(<BookmarkToggler bookKey='book-1' />);
    expect(getByLabelText('Add Bookmark')).toBeTruthy();
  });

  it('shows the filled button label for a bookmarked page', () => {
    h.theme = { ...h.theme, isIPhoneDuo: false };
    h.booknotes = [bookmark('cfi-1')];
    const { getByLabelText } = render(<BookmarkToggler bookKey='book-1' />);
    expect(getByLabelText('Remove Bookmark')).toBeTruthy();
  });
});
