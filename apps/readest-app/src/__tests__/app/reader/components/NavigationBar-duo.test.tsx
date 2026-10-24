import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  appService: { isIOSApp: true, isMobile: true, isAndroidApp: false },
  theme: {
    isIPhoneDuo: true,
    nativeBarsSupported: true,
    systemUIVisible: true,
    systemUIAlwaysHidden: false,
  },
  sidebar: { isSideBarVisible: false, isSideBarPinned: false },
  ttsEnabled: false,
}));

vi.mock('@/context/EnvContext', () => ({ useEnv: () => ({ appService: h.appService }) }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (key: string) => key }));
vi.mock('@/hooks/useResponsiveSize', () => ({ useResponsiveSize: (n: number) => n }));
vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector: (s: typeof h.theme) => unknown) => selector(h.theme),
}));
vi.mock('@/store/sidebarStore', () => ({ useSidebarStore: () => h.sidebar }));
vi.mock('@/store/readerStore', () => ({
  useReaderStore: () => ({ getViewState: () => ({ ttsEnabled: h.ttsEnabled }) }),
}));

import { NavigationBar } from '@/app/reader/components/footerbar/NavigationBar';
import { useNativeBarStore } from '@/store/nativeBarStore';

const insets = { top: 0, right: 0, bottom: 34, left: 0 };

const renderBar = (actionTab = '') => {
  const onSetActionTab = vi.fn();
  const view = render(
    <NavigationBar
      bookKey='book-1'
      actionTab={actionTab}
      gridInsets={insets}
      forceMobileLayout={true}
      onSetActionTab={onSetActionTab}
    />,
  );
  return {
    ...view,
    onSetActionTab,
    rerenderWith: (tab: string) =>
      view.rerender(
        <NavigationBar
          bookKey='book-1'
          actionTab={tab}
          gridInsets={insets}
          forceMobileLayout={true}
          onSetActionTab={onSetActionTab}
        />,
      ),
  };
};

const footer = () => useNativeBarStore.getState().slices['book-1:footer'];

beforeEach(() => {
  h.theme = {
    isIPhoneDuo: true,
    nativeBarsSupported: true,
    systemUIVisible: true,
    systemUIAlwaysHidden: false,
  };
  h.sidebar = { isSideBarVisible: false, isSideBarPinned: false };
  h.ttsEnabled = false;
  useNativeBarStore.setState({ slices: {} });
});

afterEach(() => cleanup());

describe('NavigationBar with the Duo native bars active', () => {
  it('registers the five footer items as the bottom slice at order 20', () => {
    renderBar();
    expect(footer()!.order).toBe(20);
    expect(
      footer()!.items.map(({ id, title, symbol, placement }) => ({ id, title, symbol, placement })),
    ).toEqual([
      { id: 'toc', title: 'Table of Contents', symbol: 'list.bullet', placement: 'bottom' },
      { id: 'color', title: 'Color', symbol: 'sun.max', placement: 'bottom' },
      {
        id: 'progress',
        title: 'Reading Progress',
        symbol: 'slider.horizontal.3',
        placement: 'bottom',
      },
      { id: 'font', title: 'Font & Layout', symbol: 'textformat', placement: 'bottom' },
      { id: 'tts', title: 'Speak', symbol: 'headphones', placement: 'bottom' },
    ]);
  });

  it('keeps Reading Progress and Speak visible longest when the strip overflows', () => {
    renderBar();
    expect(footer()!.items.map((i) => [i.id, i.priority])).toEqual([
      ['toc', undefined],
      ['color', undefined],
      ['progress', 'high'],
      ['font', undefined],
      ['tts', 'high'],
    ]);
  });

  it('renders no HTML bar at all', () => {
    const { container } = renderBar();
    expect(container.firstChild).toBeNull();
  });

  it('leaves out the table of contents while the sidebar is shown and pinned', () => {
    h.sidebar = { isSideBarVisible: true, isSideBarPinned: true };
    renderBar();
    expect(footer()!.items.map((i) => i.id)).toEqual(['color', 'progress', 'font', 'tts']);
  });

  it('keeps the table of contents when the sidebar is only visible', () => {
    h.sidebar = { isSideBarVisible: true, isSideBarPinned: false };
    renderBar();
    expect(footer()!.items.map((i) => i.id)).toContain('toc');
  });

  it('marks the open tab as selected', () => {
    renderBar('font');
    expect(footer()!.items.map((i) => [i.id, i.selected])).toEqual([
      ['toc', false],
      ['color', false],
      ['progress', false],
      ['font', true],
      ['tts', false],
    ]);
  });

  it('follows the open tab', () => {
    const { rerenderWith } = renderBar('color');
    rerenderWith('progress');
    expect(
      footer()!
        .items.filter((i) => i.selected)
        .map((i) => i.id),
    ).toEqual(['progress']);
  });

  it('marks Speak selected while text-to-speech runs', () => {
    h.ttsEnabled = true;
    renderBar();
    expect(footer()!.items.find((i) => i.id === 'tts')!.selected).toBe(true);
  });

  it('routes each native tap to onSetActionTab with the item id', () => {
    const { onSetActionTab } = renderBar();
    for (const id of ['toc', 'color', 'progress', 'font', 'tts']) {
      act(() =>
        footer()!
          .items.find((i) => i.id === id)!
          .onTap(),
      );
      expect(onSetActionTab).toHaveBeenLastCalledWith(id);
    }
  });

  it('clears the slice on unmount', () => {
    const { unmount } = renderBar();
    unmount();
    expect(footer()).toBeUndefined();
  });
});

describe('NavigationBar with the native bars inactive', () => {
  it.each([
    [
      'off the Duo',
      {
        isIPhoneDuo: false,
        nativeBarsSupported: true,
        systemUIVisible: true,
        systemUIAlwaysHidden: false,
      },
    ],
    [
      'status bar hidden',
      {
        isIPhoneDuo: true,
        nativeBarsSupported: true,
        systemUIVisible: false,
        systemUIAlwaysHidden: false,
      },
    ],
    [
      'status bar always hidden',
      {
        isIPhoneDuo: true,
        nativeBarsSupported: true,
        systemUIVisible: true,
        systemUIAlwaysHidden: true,
      },
    ],
  ])('renders the five buttons as before (%s)', (_name, theme) => {
    h.theme = theme;
    const { getByLabelText, onSetActionTab } = renderBar();
    for (const label of [
      'Table of Contents',
      'Color',
      'Reading Progress',
      'Font & Layout',
      'Speak',
    ]) {
      expect(getByLabelText(label)).toBeTruthy();
    }
    getByLabelText('Color').click();
    expect(onSetActionTab).toHaveBeenCalledWith('color');
  });

  it('renders no TOC button when the sidebar is shown and pinned', () => {
    h.theme = {
      isIPhoneDuo: false,
      nativeBarsSupported: true,
      systemUIVisible: true,
      systemUIAlwaysHidden: false,
    };
    h.sidebar = { isSideBarVisible: true, isSideBarPinned: true };
    const { queryByLabelText } = renderBar();
    expect(queryByLabelText('Table of Contents')).toBeNull();
  });
});
