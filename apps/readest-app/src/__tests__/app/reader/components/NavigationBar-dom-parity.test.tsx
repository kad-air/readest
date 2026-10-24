import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// DOM identity with main off the Duo: snapshots written with the merge base's
// (5273f82fc) component files in place; must pass unchanged on the branch.
// Regenerate from the new base after a rebase, never from the branch.

const h = vi.hoisted(() => ({
  appService: {} as Record<string, boolean>,
  theme: {} as Record<string, unknown>,
  sidebar: { isSideBarVisible: false, isSideBarPinned: false },
  ttsEnabled: false,
}));

vi.mock('@/context/EnvContext', () => ({ useEnv: () => ({ appService: h.appService }) }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (key: string) => key }));
vi.mock('@/hooks/useResponsiveSize', () => ({ useResponsiveSize: (n: number) => n }));
vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector?: (s: typeof h.theme) => unknown) =>
    selector ? selector(h.theme) : h.theme,
}));
vi.mock('@/store/sidebarStore', () => ({ useSidebarStore: () => h.sidebar }));
vi.mock('@/store/readerStore', () => ({
  useReaderStore: () => ({ getViewState: () => ({ ttsEnabled: h.ttsEnabled }) }),
}));
vi.mock('@/utils/bridge', () => ({
  setNativeBarItems: vi.fn(),
  subscribeNativeBarItemTaps: vi.fn(),
}));

import { NavigationBar } from '@/app/reader/components/footerbar/NavigationBar';

const base = {
  isIPhoneDuo: false,
  nativeBarsSupported: false,
  systemUIVisible: true,
  systemUIAlwaysHidden: false,
};
const scenarios = [
  { name: 'iOS', app: { isIOSApp: true, isMobile: true, isAndroidApp: false }, bottom: 34 },
  { name: 'Android', app: { isIOSApp: false, isMobile: true, isAndroidApp: true }, bottom: 24 },
  {
    name: 'tablet (no bottom inset)',
    app: { isIOSApp: true, isMobile: true, isAndroidApp: false },
    bottom: 0,
  },
];

const renderBar = (actionTab: string, bottom: number) =>
  render(
    <NavigationBar
      bookKey='book-1'
      actionTab={actionTab}
      gridInsets={{ top: 0, right: 0, bottom, left: 0 }}
      forceMobileLayout={true}
      onSetActionTab={vi.fn()}
    />,
  );

afterEach(() => cleanup());

describe.each(scenarios)('NavigationBar DOM parity with main: $name', ({ app, bottom }) => {
  beforeEach(() => {
    h.appService = app;
    h.theme = base;
    h.sidebar = { isSideBarVisible: false, isSideBarPinned: false };
    h.ttsEnabled = false;
  });

  it.each(['', 'font', 'progress'])('renders the same markup as main (tab "%s")', (tab) => {
    expect(renderBar(tab, bottom).container.innerHTML).toMatchSnapshot();
  });

  it('renders the same markup as main while read aloud runs', () => {
    h.ttsEnabled = true;
    expect(renderBar('', bottom).container.innerHTML).toMatchSnapshot();
  });

  it('renders the same markup as main with the sidebar pinned', () => {
    h.sidebar = { isSideBarVisible: true, isSideBarPinned: true };
    expect(renderBar('', bottom).container.innerHTML).toMatchSnapshot();
  });
});

describe('NavigationBar DOM parity with main: Duo, status bar hidden', () => {
  it('renders the same markup as main', () => {
    h.appService = { isIOSApp: true, isMobile: true, isAndroidApp: false };
    h.theme = { ...base, isIPhoneDuo: true, nativeBarsSupported: true, systemUIVisible: false };
    expect(renderBar('', 34).container.innerHTML).toMatchSnapshot();
  });
});
