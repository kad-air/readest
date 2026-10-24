import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import SectionInfo from '@/app/reader/components/SectionInfo';
import type { Insets } from '@/types/misc';

const h = vi.hoisted(() => ({ isIPhoneDuo: false, systemUIVisible: false }));

vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({ appService: { isAndroidApp: false, isIOSApp: true, isMobile: true } }),
}));
vi.mock('@/store/themeStore', () => ({
  useThemeStore: <R,>(selector?: (s: Record<string, unknown>) => R) => {
    const state = {
      systemUIVisible: h.systemUIVisible,
      systemUIAlwaysHidden: false,
      statusBarHeight: 0,
      isIPhoneDuo: h.isIPhoneDuo,
    };
    return selector ? selector(state) : state;
  },
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

afterEach(cleanup);

const bandStyle = (isIPhoneDuo: boolean, chromeGridInsets?: Insets) => {
  h.isIPhoneDuo = isIPhoneDuo;
  const { container } = render(
    <SectionInfo
      bookKey='book-1'
      section='Chapter 1'
      showDoubleBorder={false}
      isScrolled={false}
      isVertical={false}
      isEink={false}
      horizontalGap={5}
      contentInsets={{ top: 45, right: 100, bottom: 0, left: 16 }}
      gridInsets={{ top: 45, right: 84, bottom: 0, left: 0 }}
      chromeGridInsets={chromeGridInsets}
    />,
  );
  return (container.querySelector('.sectioninfo') as HTMLElement).style;
};

afterEach(() => {
  h.systemUIVisible = false;
});

describe('SectionInfo horizontal padding', () => {
  it('on the Duo pads each physical side from its own inset (#6307)', () => {
    const style = bandStyle(true);
    expect(style.paddingLeft).toBe('calc(2.5% + 8px)');
    expect(style.paddingRight).toBe('calc(2.5% + 92px)');
  });

  it('clears the strip from the chrome insets while the Duo native bars are up', () => {
    // Here the page already keeps an 84px right inset; the bars add a 40px
    // strip on the left that the page does not know about.
    const chrome = { top: 45, right: 84, bottom: 0, left: 40 };
    h.systemUIVisible = true;
    const up = bandStyle(true, chrome);
    expect(up.paddingLeft).toBe('calc(2.5% + 48px)');
    expect(up.paddingRight).toBe('calc(2.5% + 92px)');
    cleanup();
    h.systemUIVisible = false;
    expect(bandStyle(true, chrome).paddingLeft).toBe('calc(2.5% + 8px)');
  });

  it('off the Duo keeps main: one inline padding from the left content inset on both sides', () => {
    const style = bandStyle(false);
    // jsdom cannot read the logical `padding-inline` shorthand back, so assert
    // that none of the Duo's physical per-side paddings is set.
    expect(style.paddingLeft).toBe('');
    expect(style.paddingRight).toBe('');
  });
});
