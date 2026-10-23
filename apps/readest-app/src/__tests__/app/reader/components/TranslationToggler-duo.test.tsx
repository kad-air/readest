import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  appService: { isIOSApp: true, isMobile: true, isMobileApp: true },
  theme: { isIPhoneDuo: true, systemUIVisible: true, systemUIAlwaysHidden: false },
  viewSettings: { translationEnabled: false, translateTargetLang: 'en' },
  available: true,
  saveViewSettings: vi.fn(),
}));

vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({ envConfig: {}, appService: h.appService }),
}));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (key: string) => key }));
vi.mock('@/hooks/useResponsiveSize', () => ({ useResponsiveSize: (n: number) => n }));
vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector: (s: typeof h.theme) => unknown) => selector(h.theme),
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
vi.mock('@/helpers/settings', () => ({ saveViewSettings: h.saveViewSettings }));
vi.mock('@/services/translators/utils', () => ({ isTranslationAvailable: () => h.available }));

import TranslationToggler from '@/app/reader/components/TranslationToggler';
import { useNativeBarStore } from '@/store/nativeBarStore';

const slice = () => useNativeBarStore.getState().slices['book-1:translation'];

beforeEach(() => {
  h.theme = { isIPhoneDuo: true, systemUIVisible: true, systemUIAlwaysHidden: false };
  h.viewSettings = { translationEnabled: false, translateTargetLang: 'en' };
  h.available = true;
  h.saveViewSettings.mockReset();
  useNativeBarStore.setState({ slices: {} });
});

afterEach(() => cleanup());

describe('TranslationToggler with the Duo native bars active', () => {
  it('registers the translation item and renders no button', () => {
    const { container } = render(<TranslationToggler bookKey='book-1' />);
    expect(container.firstChild).toBeNull();
    expect(slice()).toMatchObject({
      order: 3,
      items: [
        {
          id: 'translation',
          title: 'Toggle Translation',
          symbol: 'character.book.closed',
          placement: 'leading',
          selected: false,
        },
      ],
    });
  });

  it('is selected while translation is on', () => {
    h.viewSettings = { translationEnabled: true, translateTargetLang: 'en' };
    render(<TranslationToggler bookKey='book-1' />);
    expect(slice()!.items[0]!.selected).toBe(true);
  });

  it('turns translation on from the native item', () => {
    render(<TranslationToggler bookKey='book-1' />);
    act(() => slice()!.items[0]!.onTap());
    expect(h.saveViewSettings).toHaveBeenCalledWith(
      {},
      'book-1',
      'translationEnabled',
      true,
      true,
      false,
    );
    expect(slice()!.items[0]!.selected).toBe(true);
  });

  it('leaves the item out where the button would be disabled', () => {
    h.available = false;
    render(<TranslationToggler bookKey='book-1' />);
    expect(slice()).toBeUndefined();
  });

  it('keeps the item while translation is on even if it is unavailable', () => {
    h.available = false;
    h.viewSettings = { translationEnabled: true, translateTargetLang: 'en' };
    render(<TranslationToggler bookKey='book-1' />);
    expect(slice()).toBeDefined();
  });
});

describe('TranslationToggler with the native bars inactive', () => {
  it('renders the button as before off the Duo', () => {
    h.theme = { ...h.theme, isIPhoneDuo: false };
    const { getByLabelText } = render(<TranslationToggler bookKey='book-1' />);
    expect(getByLabelText('Enable Translation')).toBeTruthy();
  });
});
