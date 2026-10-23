import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  appService: { isIOSApp: true, isMobile: true, isMobileApp: true },
  theme: { isIPhoneDuo: true, systemUIVisible: true, systemUIAlwaysHidden: false },
  sideBarBookKey: 'book-1' as string | null,
  isNotebookVisible: false,
  toggleNotebook: vi.fn(),
  setSideBarBookKey: vi.fn(),
  setHoveredBookKey: vi.fn(),
}));

vi.mock('@/context/EnvContext', () => ({ useEnv: () => ({ appService: h.appService }) }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (key: string) => key }));
vi.mock('@/hooks/useResponsiveSize', () => ({ useResponsiveSize: (n: number) => n }));
vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector: (s: typeof h.theme) => unknown) => selector(h.theme),
}));
vi.mock('@/store/readerStore', () => ({
  useReaderStore: () => ({ setHoveredBookKey: h.setHoveredBookKey }),
}));
vi.mock('@/store/sidebarStore', () => ({
  useSidebarStore: () => ({
    sideBarBookKey: h.sideBarBookKey,
    setSideBarBookKey: h.setSideBarBookKey,
  }),
}));
vi.mock('@/store/notebookStore', () => ({
  useNotebookStore: () => ({
    isNotebookVisible: h.isNotebookVisible,
    toggleNotebook: h.toggleNotebook,
  }),
}));

import NotebookToggler from '@/app/reader/components/NotebookToggler';
import { useNativeBarStore } from '@/store/nativeBarStore';

const slice = () => useNativeBarStore.getState().slices['book-1:notebook'];

beforeEach(() => {
  h.theme = { isIPhoneDuo: true, systemUIVisible: true, systemUIAlwaysHidden: false };
  h.sideBarBookKey = 'book-1';
  h.isNotebookVisible = false;
  h.toggleNotebook.mockReset();
  h.setSideBarBookKey.mockReset();
  h.setHoveredBookKey.mockReset();
  useNativeBarStore.setState({ slices: {} });
});

afterEach(() => cleanup());

describe('NotebookToggler with the Duo native bars active', () => {
  it('registers a trailing notebook item and renders no button', () => {
    const { container } = render(<NotebookToggler bookKey='book-1' />);
    expect(container.firstChild).toBeNull();
    expect(slice()).toMatchObject({
      order: 10,
      items: [
        {
          id: 'notebook',
          title: 'Notebook',
          symbol: 'note.text',
          placement: 'trailing',
          selected: false,
        },
      ],
    });
  });

  it('is selected while the notebook is open for this book only', () => {
    h.isNotebookVisible = true;
    const { unmount } = render(<NotebookToggler bookKey='book-1' />);
    expect(slice()!.items[0]!.selected).toBe(true);
    unmount();
    h.sideBarBookKey = 'book-2';
    render(<NotebookToggler bookKey='book-1' />);
    expect(slice()!.items[0]!.selected).toBe(false);
  });

  it('toggles the notebook from the native item', () => {
    render(<NotebookToggler bookKey='book-1' />);
    act(() => slice()!.items[0]!.onTap());
    expect(h.toggleNotebook).toHaveBeenCalledTimes(1);
    expect(h.setHoveredBookKey).toHaveBeenCalledWith('');
  });
});

describe('NotebookToggler with the native bars inactive', () => {
  it('renders the button as before off the Duo', () => {
    h.theme = { ...h.theme, isIPhoneDuo: false };
    const { getByLabelText } = render(<NotebookToggler bookKey='book-1' />);
    expect(getByLabelText('Notebook')).toBeTruthy();
  });
});
