import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// DOM identity with main off the Duo: snapshots written with the merge base's
// (5273f82fc) component files in place; must pass unchanged on the branch.
// Regenerate from the new base after a rebase, never from the branch.

const h = vi.hoisted(() => ({
  appService: {} as Record<string, boolean>,
  theme: {} as Record<string, unknown>,
  viewSettings: { translationEnabled: false, translateTargetLang: 'en' },
  available: true,
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
vi.mock('@/store/bookDataStore', () => ({
  useBookDataStore: () => ({ getBookData: () => ({ book: {} }) }),
}));
vi.mock('@/store/readerStore', () => ({
  useReaderStore: () => ({
    getViewSettings: () => h.viewSettings,
    setViewSettings: vi.fn(),
    setHoveredBookKey: vi.fn(),
  }),
}));
vi.mock('@/helpers/settings', () => ({ saveViewSettings: vi.fn() }));
vi.mock('@/services/translators/utils', () => ({ isTranslationAvailable: () => h.available }));
vi.mock('@/utils/bridge', () => ({
  setNativeBarItems: vi.fn(),
  subscribeNativeBarItemTaps: vi.fn(),
}));

import TranslationToggler from '@/app/reader/components/TranslationToggler';

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

describe.each(scenarios)('TranslationToggler DOM parity with main: $name', ({ app, theme }) => {
  beforeEach(() => {
    h.appService = app;
    h.theme = theme;
  });

  it.each([
    ['available, off', true, false],
    ['available, on', true, true],
    ['unavailable', false, false],
  ])('renders the same markup as main (%s)', (_name, available, enabled) => {
    h.available = available;
    h.viewSettings = { translationEnabled: enabled, translateTargetLang: 'en' };
    expect(render(<TranslationToggler bookKey='book-1' />).container.innerHTML).toMatchSnapshot();
  });
});
