import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ProgressBar from '@/app/reader/components/ProgressBar';
import { useThemeStore } from '@/store/themeStore';
import { DEFAULT_VIEW_CONFIG } from '@/services/constants';
import type { ViewSettings } from '@/types/book';
import type { Insets } from '@/types/misc';

const viewSettings = {
  ...DEFAULT_VIEW_CONFIG,
  marginBottomPx: 16,
  headerFooterFontSize: 12,
} as ViewSettings;

vi.mock('@/hooks/useMedianPageDurationSecs', () => ({ useMedianPageDurationSecs: () => null }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (s: string) => s }));
vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({
    envConfig: {},
    appService: { isMobile: true, isIOSApp: true, hasSafeAreaInset: true },
  }),
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

const footerStyle = (isIPhoneDuo: boolean, chromeGridInsets?: Insets) => {
  useThemeStore.setState({ isIPhoneDuo, nativeBarsSupported: isIPhoneDuo });
  // A 40px left side strip on top of a 16px page margin.
  const { container } = render(
    <ProgressBar
      bookKey='book-1'
      horizontalGap={5}
      contentInsets={{ top: 0, right: 16, bottom: 0, left: 56 }}
      gridInsets={{ top: 0, right: 0, bottom: 0, left: 40 }}
      chromeGridInsets={chromeGridInsets}
      cornerRadii={{ left: 0, right: 0 }}
    />,
  );
  return (container.querySelector('.progressinfo') as HTMLElement).style;
};

beforeEach(() =>
  useThemeStore.setState({
    isIPhoneDuo: false,
    nativeBarsSupported: false,
    systemUIVisible: false,
    systemUIAlwaysHidden: false,
  }),
);
afterEach(cleanup);

describe('ProgressBar footer padding', () => {
  it('on the Duo adds the safe-area inset in full per physical side (#6307)', () => {
    const style = footerStyle(true);
    expect(style.paddingLeft).toBe('calc(2.5% + 48px)');
    expect(style.paddingRight).toBe('calc(2.5% + 8px)');
  });

  it('clears the strip from the chrome insets while the Duo native bars are up', () => {
    // The page keeps a 0 right inset with the status bar hidden; the chrome
    // insets carry the 84px strip once the bars are up (BUG: the page number
    // sat under the strip's overflow button).
    const chrome = { top: 0, right: 84, bottom: 0, left: 40 };
    useThemeStore.setState({ systemUIVisible: true });
    const up = footerStyle(true, chrome);
    expect(up.paddingLeft).toBe('calc(2.5% + 48px)');
    expect(up.paddingRight).toBe('calc(2.5% + 92px)');
    cleanup();
    useThemeStore.setState({ systemUIVisible: false });
    const down = footerStyle(true, chrome);
    expect(down.paddingRight).toBe('calc(2.5% + 8px)');
  });

  it('off the Duo keeps main: logical inline padding from the content insets alone', () => {
    const style = footerStyle(false);
    expect(style.paddingInlineStart).toBe('calc(2.5% + 28px)');
    expect(style.paddingInlineEnd).toBe('calc(2.5% + 8px)');
    expect(style.paddingLeft).toBe('');
    expect(style.paddingRight).toBe('');
  });
});
