import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// DOM identity with main off the Duo: snapshots written with the merge base's
// (5273f82fc) component files in place; must pass unchanged on the branch.
// Regenerate from the new base after a rebase, never from the branch.

import ProgressBar from '@/app/reader/components/ProgressBar';
import { useThemeStore } from '@/store/themeStore';
import { DEFAULT_VIEW_CONFIG } from '@/services/constants';
import type { ViewSettings } from '@/types/book';

const viewSettings = {
  ...DEFAULT_VIEW_CONFIG,
  marginBottomPx: 16,
  headerFooterFontSize: 12,
} as ViewSettings;

const h = vi.hoisted(() => ({ appService: {} as Record<string, boolean> }));

vi.mock('@/hooks/useMedianPageDurationSecs', () => ({ useMedianPageDurationSecs: () => null }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (s: string) => s }));
vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({ envConfig: {}, appService: h.appService }),
}));
vi.mock('@/store/readerStore', () => {
  const state = {
    getProgress: () => null,
    getViewSettings: () => viewSettings,
    getView: () => ({
      renderer: { page: 0, pages: 0 },
      getSectionFractions: () => [],
      resolveNavigation: () => null,
    }),
  };
  return {
    useReaderStore: <R,>(selector?: (s: typeof state) => R) => (selector ? selector(state) : state),
  };
});
vi.mock('@/store/readerProgressStore', () => ({
  useBookProgress: () => null,
  getBookProgress: () => null,
}));
vi.mock('@/store/bookDataStore', () => {
  const state = { getBookData: () => ({ isFixedLayout: false }) };
  return {
    useBookDataStore: <R,>(selector?: (s: typeof state) => R) =>
      selector ? selector(state) : state,
  };
});
vi.mock('@/helpers/settings', () => ({ saveViewSettings: vi.fn() }));
vi.mock('@/utils/event', () => ({ eventDispatcher: { dispatchSync: () => false } }));
vi.mock('@/app/reader/components/StatusInfo.tsx', () => ({ default: () => null }));
vi.mock('@/utils/bridge', () => ({
  setNativeBarItems: vi.fn(),
  subscribeNativeBarItemTaps: vi.fn(),
}));

type Insets = { top: number; right: number; bottom: number; left: number };
const scenarios: Array<{
  name: string;
  app: Record<string, boolean>;
  duo: boolean;
  grid: Insets;
  content: Insets;
  corners: { left: number; right: number };
}> = [
  {
    name: 'iPhone, bottom inset 34',
    app: { isMobile: true, isIOSApp: true, hasSafeAreaInset: true },
    duo: false,
    grid: { top: 59, right: 0, bottom: 34, left: 0 },
    content: { top: 103, right: 16, bottom: 50, left: 16 },
    corners: { left: 55, right: 55 },
  },
  {
    name: 'iPhone landscape, 62/62',
    app: { isMobile: true, isIOSApp: true, hasSafeAreaInset: true },
    duo: false,
    grid: { top: 0, right: 62, bottom: 21, left: 62 },
    content: { top: 44, right: 78, bottom: 37, left: 78 },
    corners: { left: 55, right: 55 },
  },
  {
    name: 'iPad',
    app: { isMobile: false, isIOSApp: true, hasSafeAreaInset: true },
    duo: false,
    grid: { top: 24, right: 0, bottom: 20, left: 0 },
    content: { top: 68, right: 16, bottom: 36, left: 16 },
    corners: { left: 18, right: 18 },
  },
  {
    name: 'Android',
    app: { isMobile: true, isAndroidApp: true, hasSafeAreaInset: true },
    duo: false,
    grid: { top: 32, right: 0, bottom: 24, left: 0 },
    content: { top: 76, right: 16, bottom: 40, left: 16 },
    corners: { left: 0, right: 0 },
  },
  {
    name: 'desktop',
    app: { isMobile: false, hasSafeAreaInset: false },
    duo: false,
    grid: { top: 0, right: 0, bottom: 0, left: 0 },
    content: { top: 44, right: 16, bottom: 16, left: 16 },
    corners: { left: 0, right: 0 },
  },
  {
    name: 'Duo, status bar hidden',
    app: { isMobile: true, isIOSApp: true, hasSafeAreaInset: true },
    duo: true,
    grid: { top: 0, right: 0, bottom: 34, left: 40 },
    content: { top: 44, right: 16, bottom: 50, left: 56 },
    corners: { left: 0, right: 0 },
  },
];

const renderFooter = (
  grid: Insets,
  content: Insets,
  corners: { left: number; right: number },
  columnGap = 0,
) =>
  render(
    <ProgressBar
      bookKey='book-1'
      horizontalGap={5}
      contentInsets={content}
      gridInsets={grid}
      columnGap={columnGap}
      cornerRadii={corners}
    />,
  );

afterEach(() => cleanup());

describe.each(scenarios)('ProgressBar DOM parity with main: $name', ({
  app,
  duo,
  grid,
  content,
  corners,
}) => {
  beforeEach(() => {
    h.appService = app;
    useThemeStore.setState({
      isIPhoneDuo: duo,
      nativeBarsSupported: duo,
      systemUIVisible: false,
      systemUIAlwaysHidden: false,
    });
  });

  it('renders the same markup as main', () => {
    expect(renderFooter(grid, content, corners).container.innerHTML).toMatchSnapshot();
  });

  it('renders the same markup as main with a column gap', () => {
    expect(renderFooter(grid, content, corners, 24).container.innerHTML).toMatchSnapshot();
  });
});
