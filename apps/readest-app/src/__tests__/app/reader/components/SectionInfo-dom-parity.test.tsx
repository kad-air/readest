import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// DOM identity with main off the Duo: snapshots written with the merge base's
// (5273f82fc) component files in place; must pass unchanged on the branch.
// Regenerate from the new base after a rebase, never from the branch.

const h = vi.hoisted(() => ({
  appService: {} as Record<string, boolean>,
  theme: {} as Record<string, unknown>,
}));

vi.mock('@/context/EnvContext', () => ({ useEnv: () => ({ appService: h.appService }) }));
vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector?: (s: typeof h.theme) => unknown) =>
    selector ? selector(h.theme) : h.theme,
}));
vi.mock('@/store/readerStore', () => ({
  useReaderStore: () => ({
    hoveredBookKey: '',
    getView: () => null,
    getViewSettings: () => ({ marginTopPx: 44 }),
    setHoveredBookKey: vi.fn(),
  }),
}));
vi.mock('@/store/bookDataStore', () => {
  const state = { getBookData: () => undefined };
  return {
    useBookDataStore: <R,>(selector?: (s: typeof state) => R) =>
      selector ? selector(state) : state,
  };
});
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (key: string) => key }));
vi.mock('@/utils/bridge', () => ({
  setNativeBarItems: vi.fn(),
  subscribeNativeBarItemTaps: vi.fn(),
}));

import SectionInfo from '@/app/reader/components/SectionInfo';

type Insets = { top: number; right: number; bottom: number; left: number };
const base = {
  systemUIVisible: false,
  systemUIAlwaysHidden: false,
  statusBarHeight: 0,
  isIPhoneDuo: false,
  nativeBarsSupported: false,
};
const ios = { isAndroidApp: false, isIOSApp: true, isMobile: true };
const scenarios: Array<{
  name: string;
  app: Record<string, boolean>;
  theme: Record<string, unknown>;
  grid: Insets;
  content: Insets;
}> = [
  {
    name: 'iPhone, top inset 59',
    app: ios,
    theme: base,
    grid: { top: 59, right: 0, bottom: 34, left: 0 },
    content: { top: 103, right: 16, bottom: 50, left: 16 },
  },
  {
    name: 'iPhone landscape, 62/62',
    app: ios,
    theme: base,
    grid: { top: 0, right: 62, bottom: 21, left: 62 },
    content: { top: 44, right: 78, bottom: 37, left: 78 },
  },
  {
    name: 'iPad',
    app: { ...ios, isMobile: false },
    theme: base,
    grid: { top: 24, right: 0, bottom: 20, left: 0 },
    content: { top: 68, right: 16, bottom: 36, left: 16 },
  },
  {
    name: 'Android with a cutout, status bar shown',
    app: { isAndroidApp: true, isMobile: true },
    theme: { ...base, systemUIVisible: true, statusBarHeight: 32 },
    grid: { top: 32, right: 0, bottom: 0, left: 0 },
    content: { top: 76, right: 16, bottom: 16, left: 16 },
  },
  {
    name: 'desktop',
    app: { isMobile: false },
    theme: base,
    grid: { top: 0, right: 0, bottom: 0, left: 0 },
    content: { top: 44, right: 16, bottom: 16, left: 16 },
  },
  {
    name: 'Duo, status bar hidden',
    app: ios,
    theme: { ...base, isIPhoneDuo: true, nativeBarsSupported: true },
    grid: { top: 0, right: 0, bottom: 34, left: 0 },
    content: { top: 44, right: 16, bottom: 50, left: 16 },
  },
];

const renderInfo = (grid: Insets, content: Insets, isVertical: boolean, columnGap = 0) =>
  render(
    <SectionInfo
      bookKey='book-1'
      section='Chapter 1'
      showDoubleBorder={false}
      isScrolled={false}
      isVertical={isVertical}
      isEink={false}
      horizontalGap={5}
      contentInsets={content}
      gridInsets={grid}
      columnGap={columnGap}
    />,
  );

afterEach(() => cleanup());

describe.each(scenarios)('SectionInfo DOM parity with main: $name', ({
  app,
  theme,
  grid,
  content,
}) => {
  beforeEach(() => {
    h.appService = app;
    h.theme = theme;
  });

  it('renders the same markup as main', () => {
    expect(renderInfo(grid, content, false).container.innerHTML).toMatchSnapshot();
  });

  it('renders the same markup as main with a column gap', () => {
    expect(renderInfo(grid, content, false, 24).container.innerHTML).toMatchSnapshot();
  });

  it('renders the same markup as main in vertical writing', () => {
    expect(renderInfo(grid, content, true).container.innerHTML).toMatchSnapshot();
  });
});
