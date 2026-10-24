import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// DOM identity with main off the Duo: snapshots written with the merge base's
// (5273f82fc) component files in place; must pass unchanged on the branch.
// Regenerate from the new base after a rebase, never from the branch.

const h = vi.hoisted(() => ({
  appService: {} as Record<string, boolean>,
  theme: {} as Record<string, unknown>,
  booknotes: [] as Array<Record<string, unknown>>,
  ribbonVisible: false,
}));

vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({ envConfig: {}, appService: h.appService }),
}));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (key: string) => key }));
vi.mock('@/hooks/useResponsiveSize', () => ({ useResponsiveSize: (n: number) => n }));
vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector?: (s: typeof h.theme) => unknown) =>
    selector ? selector(h.theme) : h.theme,
}));
vi.mock('@/store/settingsStore', () => ({ useSettingsStore: () => ({ settings: {} }) }));
vi.mock('@/store/bookDataStore', () => ({
  useBookDataStore: () => ({
    getConfig: () => ({ booknotes: h.booknotes }),
    getBookData: () => ({ book: { format: 'EPUB' } }),
    saveConfig: vi.fn(),
    updateBooknotes: vi.fn(),
  }),
}));
const progress = { location: 'cfi-1', page: 1, range: null };
vi.mock('@/store/readerStore', () => ({
  useReaderStore: () => ({
    getProgress: () => progress,
    getViewState: () => ({ ribbonVisible: h.ribbonVisible }),
    setBookmarkRibbonVisibility: vi.fn(),
  }),
}));
vi.mock('@/utils/cfi', () => ({ isCfiInLocation: (a: string, b: string) => a === b }));
vi.mock('@/utils/book', () => ({ getCurrentPage: () => 1 }));
vi.mock('@/utils/bridge', () => ({
  setNativeBarItems: vi.fn(),
  subscribeNativeBarItemTaps: vi.fn(),
}));

import BookmarkToggler from '@/app/reader/components/BookmarkToggler';

const base = {
  isIPhoneDuo: false,
  nativeBarsSupported: false,
  systemUIVisible: true,
  systemUIAlwaysHidden: false,
};
const scenarios: Array<{
  name: string;
  app: Record<string, boolean>;
  theme: Record<string, unknown>;
}> = [
  { name: 'iOS', app: { isIOSApp: true, isMobile: true, isMobileApp: true }, theme: base },
  { name: 'Android', app: { isAndroidApp: true, isMobile: true, isMobileApp: true }, theme: base },
  { name: 'desktop', app: { isMobile: false, isMobileApp: false }, theme: base },
  {
    name: 'Duo, status bar hidden',
    app: { isIOSApp: true, isMobile: true, isMobileApp: true },
    theme: { ...base, isIPhoneDuo: true, nativeBarsSupported: true, systemUIVisible: false },
  },
];

const bookmark = (cfi: string) => ({
  id: cfi,
  type: 'bookmark',
  cfi,
  text: '',
  note: '',
  createdAt: 1,
  updatedAt: 1,
});

afterEach(() => cleanup());

describe.each(scenarios)('BookmarkToggler DOM parity with main: $name', ({ app, theme }) => {
  beforeEach(() => {
    h.appService = app;
    h.theme = theme;
  });

  it('renders the same markup as main on an unbookmarked page', () => {
    h.booknotes = [];
    expect(render(<BookmarkToggler bookKey='book-1' />).container.innerHTML).toMatchSnapshot();
  });

  it('renders the same markup as main on a bookmarked page', () => {
    h.booknotes = [bookmark('cfi-1')];
    expect(render(<BookmarkToggler bookKey='book-1' />).container.innerHTML).toMatchSnapshot();
  });
});
