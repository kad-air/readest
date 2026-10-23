import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  appService: { isIOSApp: true, isMobile: true },
  theme: {
    isIPhoneDuo: true,
    systemUIVisible: true,
    systemUIAlwaysHidden: false,
    contentInsets: { top: 82, bottom: 82 } as { top: number; bottom: number } | null,
  },
  panels: {} as Record<string, string>,
}));

vi.mock('@/context/EnvContext', () => ({ useEnv: () => ({ appService: h.appService }) }));
vi.mock('@/hooks/useResponsiveSize', () => ({ useResponsiveSize: (n: number) => n }));
vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector?: (s: typeof h.theme) => unknown) =>
    selector ? selector(h.theme) : h.theme,
}));
vi.mock('@/app/reader/components/footerbar/ColorPanel', () => ({
  ColorPanel: ({ bottomOffset }: { bottomOffset: string }) => {
    h.panels['color'] = bottomOffset;
    return null;
  },
}));
vi.mock('@/app/reader/components/footerbar/NavigationPanel', () => ({
  NavigationPanel: ({ bottomOffset }: { bottomOffset: string }) => {
    h.panels['navigation'] = bottomOffset;
    return null;
  },
}));
vi.mock('@/app/reader/components/footerbar/FontLayoutPanel', () => ({
  FontLayoutPanel: ({ bottomOffset }: { bottomOffset: string }) => {
    h.panels['font'] = bottomOffset;
    return null;
  },
}));
vi.mock('@/app/reader/components/footerbar/NavigationBar', () => ({ NavigationBar: () => null }));

import MobileFooterBar from '@/app/reader/components/footerbar/MobileFooterBar';

const navigationHandlers = {
  onPrevPage: vi.fn(),
  onNextPage: vi.fn(),
  onPrevSection: vi.fn(),
  onNextSection: vi.fn(),
  onGoBack: vi.fn(),
  onGoForward: vi.fn(),
  onProgressChange: vi.fn(),
};

const renderBar = (bottom = 34) =>
  render(
    <MobileFooterBar
      bookKey='book-1'
      gridInsets={{ top: 0, right: 0, bottom, left: 0 }}
      actionTab='color'
      progressValid={true}
      progressFraction={0.5}
      navigationHandlers={navigationHandlers}
      forceMobileLayout={true}
      onSetActionTab={vi.fn()}
      onSpeakText={vi.fn()}
    />,
  );

beforeEach(() => {
  h.theme = {
    isIPhoneDuo: true,
    systemUIVisible: true,
    systemUIAlwaysHidden: false,
    contentInsets: { top: 82, bottom: 82 },
  };
  h.panels = {};
});

afterEach(() => cleanup());

describe('MobileFooterBar panel offset', () => {
  it('sits the panels directly above the native toolbar when the bars are active', () => {
    renderBar();
    expect(h.panels).toEqual({ color: '82px', navigation: '82px', font: '82px' });
  });

  it('falls back to the grid bottom inset when the content insets are unknown', () => {
    h.theme = { ...h.theme, contentInsets: null };
    renderBar(34);
    expect(h.panels['color']).toBe('34px');
  });

  it('follows a content inset of 0 (strip poses without a home indicator)', () => {
    h.theme = { ...h.theme, contentInsets: { top: 0, bottom: 0 } };
    renderBar();
    expect(h.panels['font']).toBe('0px');
  });

  it.each([
    ['off the Duo', { isIPhoneDuo: false }],
    ['status bar hidden', { systemUIVisible: false }],
    ['status bar always hidden', { systemUIAlwaysHidden: true }],
  ])('keeps the nav-bar-height formula (%s)', (_name, patch) => {
    h.theme = { ...h.theme, ...patch };
    renderBar(34);
    expect(h.panels).toEqual({
      color: `${34 * 0.33 + 64}px`,
      navigation: `${34 * 0.33 + 64}px`,
      font: `${34 * 0.33 + 64}px`,
    });
  });
});
