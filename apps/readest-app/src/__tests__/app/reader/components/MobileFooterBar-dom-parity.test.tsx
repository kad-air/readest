import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// DOM identity with main off the Duo: snapshots written with the merge base's
// (5273f82fc) component files in place; must pass unchanged on the branch.
// Regenerate from the new base after a rebase, never from the branch. The
// panels and the navigation row have parity files of their own, so they render
// as markers carrying the props this bar hands them.

const h = vi.hoisted(() => ({
  appService: {} as Record<string, boolean>,
  theme: {} as Record<string, unknown>,
}));

vi.mock('@/context/EnvContext', () => ({ useEnv: () => ({ appService: h.appService }) }));
vi.mock('@/hooks/useResponsiveSize', () => ({ useResponsiveSize: (n: number) => n }));
vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector?: (s: typeof h.theme) => unknown) =>
    selector ? selector(h.theme) : h.theme,
}));
vi.mock('@/app/reader/components/footerbar/ColorPanel', () => ({
  ColorPanel: ({ bottomOffset }: { bottomOffset: string }) => (
    <div data-panel='color' data-bottom={bottomOffset} />
  ),
}));
vi.mock('@/app/reader/components/footerbar/NavigationPanel', () => ({
  NavigationPanel: ({ bottomOffset }: { bottomOffset: string }) => (
    <div data-panel='navigation' data-bottom={bottomOffset} />
  ),
}));
vi.mock('@/app/reader/components/footerbar/FontLayoutPanel', () => ({
  FontLayoutPanel: ({ bottomOffset }: { bottomOffset: string }) => (
    <div data-panel='font' data-bottom={bottomOffset} />
  ),
}));
vi.mock('@/app/reader/components/footerbar/NavigationBar', () => ({
  NavigationBar: ({ actionTab }: { actionTab: string }) => <div data-nav={actionTab} />,
}));
vi.mock('@/utils/bridge', () => ({
  setNativeBarItems: vi.fn(),
  subscribeNativeBarItemTaps: vi.fn(),
}));

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

const renderBar = (actionTab: string, bottom: number) =>
  render(
    <MobileFooterBar
      bookKey='book-1'
      gridInsets={{ top: 0, right: 0, bottom, left: 0 }}
      actionTab={actionTab}
      progressValid={true}
      progressFraction={0.5}
      navigationHandlers={navigationHandlers}
      forceMobileLayout={true}
      onSetActionTab={vi.fn()}
      onSpeakText={vi.fn()}
    />,
  );

const base = {
  isIPhoneDuo: false,
  nativeBarsSupported: false,
  systemUIVisible: true,
  systemUIAlwaysHidden: false,
  contentViewInsets: null,
  contentInsets: null,
};
const scenarios: Array<{
  name: string;
  app: Record<string, boolean>;
  theme: Record<string, unknown>;
  bottom: number;
}> = [
  { name: 'iPhone', app: { isIOSApp: true, isMobile: true }, theme: base, bottom: 34 },
  { name: 'Android', app: { isAndroidApp: true, isMobile: true }, theme: base, bottom: 24 },
  {
    name: 'tablet (no bottom inset)',
    app: { isIOSApp: true, isMobile: true },
    theme: base,
    bottom: 0,
  },
  {
    name: 'Duo, status bar hidden',
    app: { isIOSApp: true, isMobile: true },
    theme: {
      ...base,
      isIPhoneDuo: true,
      nativeBarsSupported: true,
      systemUIVisible: false,
      contentViewInsets: { top: 0, bottom: 34 },
      contentInsets: { top: 0, bottom: 34 },
    },
    bottom: 34,
  },
];

afterEach(() => cleanup());

describe.each(scenarios)('MobileFooterBar DOM parity with main: $name', ({
  app,
  theme,
  bottom,
}) => {
  beforeEach(() => {
    h.appService = app;
    h.theme = theme;
  });

  it.each([
    '',
    'color',
    'progress',
    'font',
  ])('renders the same markup as main (tab "%s")', (tab) => {
    expect(renderBar(tab, bottom).container.innerHTML).toMatchSnapshot();
  });
});
