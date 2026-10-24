import { describe, expect, it, vi } from 'vitest';
import { buildLibraryBarSpec } from '@/app/library/nativeBar';
import { NATIVE_BAR_SYMBOLS } from '@/utils/nativeBar';

const t = (key: string) => key;

const makeHandlers = () => ({
  openImportMenu: vi.fn(),
  openViewMenu: vi.fn(),
  openSettingsMenu: vi.fn(),
  exitSelectMode: vi.fn(),
  selectAll: vi.fn(),
  deselectAll: vi.fn(),
});

const browsing = { searchTarget: 'books', isSelectMode: false, isSelectAll: false } as const;

describe('buildLibraryBarSpec outside select mode', () => {
  it('lists Import, View Menu and Settings Menu as trailing items, in that order', () => {
    const { items } = buildLibraryBarSpec(browsing, makeHandlers(), t);
    expect(items.map(({ onTap: _onTap, ...item }) => item)).toEqual([
      {
        id: 'import',
        title: 'Import Books',
        symbol: NATIVE_BAR_SYMBOLS['import'],
        placement: 'trailing',
      },
      {
        id: 'viewMenu',
        title: 'View Menu',
        symbol: NATIVE_BAR_SYMBOLS['viewMenu'],
        placement: 'trailing',
      },
      {
        id: 'settingsMenu',
        title: 'Settings Menu',
        symbol: NATIVE_BAR_SYMBOLS['settingsMenu'],
        placement: 'trailing',
      },
    ]);
  });

  it('has no Select Books item: the mobile header has none', () => {
    const { items } = buildLibraryBarSpec(browsing, makeHandlers(), t);
    expect(items.some((item) => item.id === 'select')).toBe(false);
  });

  it('drops Import for a full-text search, like the HTML header', () => {
    const { items } = buildLibraryBarSpec({ ...browsing, searchTarget: 'text' }, makeHandlers(), t);
    expect(items.map((item) => item.id)).toEqual(['viewMenu', 'settingsMenu']);
  });

  it('routes each item to its own handler', () => {
    const handlers = makeHandlers();
    const { items } = buildLibraryBarSpec(browsing, handlers, t);
    const tap = (id: string) => items.find((item) => item.id === id)!.onTap();

    tap('import');
    expect(handlers.openImportMenu).toHaveBeenCalledTimes(1);
    tap('viewMenu');
    expect(handlers.openViewMenu).toHaveBeenCalledTimes(1);
    tap('settingsMenu');
    expect(handlers.openSettingsMenu).toHaveBeenCalledTimes(1);
    expect(handlers.exitSelectMode).not.toHaveBeenCalled();
    expect(handlers.selectAll).not.toHaveBeenCalled();
    expect(handlers.deselectAll).not.toHaveBeenCalled();
  });

  it('translates titles through t', () => {
    const { items } = buildLibraryBarSpec(browsing, makeHandlers(), (key) => `T:${key}`);
    expect(items.map((item) => item.title)).toEqual([
      'T:Import Books',
      'T:View Menu',
      'T:Settings Menu',
    ]);
  });
});

describe('buildLibraryBarSpec in select mode', () => {
  const selecting = { searchTarget: 'books', isSelectMode: true, isSelectAll: false } as const;

  it('shows the selected Select Books item first, then Import and Select All', () => {
    const { items } = buildLibraryBarSpec(selecting, makeHandlers(), t);
    expect(items.map(({ onTap: _onTap, ...item }) => item)).toEqual([
      {
        id: 'select',
        title: 'Select Books',
        symbol: NATIVE_BAR_SYMBOLS['select'],
        placement: 'leading',
        selected: true,
        priority: 'high',
      },
      {
        id: 'import',
        title: 'Import Books',
        symbol: NATIVE_BAR_SYMBOLS['import'],
        placement: 'trailing',
      },
      {
        id: 'selectAll',
        title: 'Select All',
        symbol: 'checklist',
        placement: 'trailing',
        selected: false,
      },
    ]);
  });

  it('turns Select All into a selected Deselect once everything is selected', () => {
    const { items } = buildLibraryBarSpec({ ...selecting, isSelectAll: true }, makeHandlers(), t);
    const selectAll = items.find((item) => item.id === 'selectAll')!;
    expect(selectAll.title).toBe('Deselect');
    expect(selectAll.selected).toBe(true);
  });

  it('exits select mode from Select Books, and selects all from Select All', () => {
    const handlers = makeHandlers();
    const { items } = buildLibraryBarSpec(selecting, handlers, t);
    items.find((item) => item.id === 'select')!.onTap();
    expect(handlers.exitSelectMode).toHaveBeenCalledTimes(1);
    items.find((item) => item.id === 'selectAll')!.onTap();
    expect(handlers.selectAll).toHaveBeenCalledTimes(1);
    expect(handlers.deselectAll).not.toHaveBeenCalled();
  });

  it('deselects all from Deselect', () => {
    const handlers = makeHandlers();
    const { items } = buildLibraryBarSpec({ ...selecting, isSelectAll: true }, handlers, t);
    items.find((item) => item.id === 'selectAll')!.onTap();
    expect(handlers.deselectAll).toHaveBeenCalledTimes(1);
    expect(handlers.selectAll).not.toHaveBeenCalled();
  });

  it('keeps Import through select mode, like the HTML header', () => {
    const handlers = makeHandlers();
    const { items } = buildLibraryBarSpec(selecting, handlers, t);
    items.find((item) => item.id === 'import')!.onTap();
    expect(handlers.openImportMenu).toHaveBeenCalledTimes(1);
  });

  it('keeps the select items for a full-text search too', () => {
    const { items } = buildLibraryBarSpec(
      { ...selecting, searchTarget: 'text' },
      makeHandlers(),
      t,
    );
    expect(items.map((item) => item.id)).toEqual(['select', 'selectAll']);
  });
});
