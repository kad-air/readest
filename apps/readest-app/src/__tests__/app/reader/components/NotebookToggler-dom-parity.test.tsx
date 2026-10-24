import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// DOM identity with main off the Duo: snapshots written with the merge base's
// (5273f82fc) component files in place; must pass unchanged on the branch.
// Regenerate from the new base after a rebase, never from the branch.

const h = vi.hoisted(() => ({
  appService: {} as Record<string, boolean>,
  theme: {} as Record<string, unknown>,
  isNotebookVisible: false,
}));

vi.mock('@/context/EnvContext', () => ({ useEnv: () => ({ appService: h.appService }) }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (key: string) => key }));
vi.mock('@/hooks/useResponsiveSize', () => ({ useResponsiveSize: (n: number) => n }));
vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector?: (s: typeof h.theme) => unknown) =>
    selector ? selector(h.theme) : h.theme,
}));
vi.mock('@/store/readerStore', () => ({
  useReaderStore: () => ({ setHoveredBookKey: vi.fn() }),
}));
vi.mock('@/store/sidebarStore', () => ({
  useSidebarStore: () => ({ sideBarBookKey: 'book-1', setSideBarBookKey: vi.fn() }),
}));
vi.mock('@/store/notebookStore', () => ({
  useNotebookStore: () => ({ isNotebookVisible: h.isNotebookVisible, toggleNotebook: vi.fn() }),
}));
vi.mock('@/utils/bridge', () => ({
  setNativeBarItems: vi.fn(),
  subscribeNativeBarItemTaps: vi.fn(),
}));

import NotebookToggler from '@/app/reader/components/NotebookToggler';

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

afterEach(() => cleanup());

describe.each(scenarios)('NotebookToggler DOM parity with main: $name', ({ app, theme }) => {
  beforeEach(() => {
    h.appService = app;
    h.theme = theme;
  });

  it.each([
    ['notebook closed', false],
    ['notebook open', true],
  ])('renders the same markup as main (%s)', (_name, visible) => {
    h.isNotebookVisible = visible;
    expect(render(<NotebookToggler bookKey='book-1' />).container.innerHTML).toMatchSnapshot();
  });
});
