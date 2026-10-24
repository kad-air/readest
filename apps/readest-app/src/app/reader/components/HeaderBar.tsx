import clsx from 'clsx';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { VscLibrary } from 'react-icons/vsc';
import { MdOutlineMenu } from 'react-icons/md';

import { Insets } from '@/types/misc';
import { useEnv } from '@/context/EnvContext';
import { useThemeStore } from '@/store/themeStore';
import { useReaderStore } from '@/store/readerStore';
import { useBookDataStore } from '@/store/bookDataStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/store/settingsStore';
import { useTrafficLightStore } from '@/store/trafficLightStore';
import { useTrafficLight } from '@/hooks/useTrafficLight';
import { useResponsiveSize } from '@/hooks/useResponsiveSize';
import { useSpatialNavigation } from '@/app/reader/hooks/useSpatialNavigation';
import { useWindowFocusRestore } from '@/app/reader/hooks/useWindowFocusRestore';
import { getHighlightColorHex } from '../utils/annotatorUtil';
import { annotationToolQuickActions } from './annotator/AnnotationTools';
import { AnnotationToolType } from '@/types/annotator';
import { saveViewSettings } from '@/helpers/settings';
import { getHeaderTriggerHeight, getHorizontalInsetStyle } from '@/utils/insets';
import { getBookDataAttributes } from '@/utils/book';
import { isForcedMobileLayout } from '../utils/mobileLayout';
import { HighlighterIcon } from '@/components/HighlighterIcon';
import Dropdown, { DropdownHandle } from '@/components/Dropdown';
import { useNativeBarsActive } from '@/hooks/useNativeBar';
import { useNativeBarSlice } from '@/store/nativeBarStore';
import { NATIVE_BAR_SYMBOLS } from '@/utils/nativeBar';
import ModalPortal from '@/components/ModalPortal';
import WindowButtons from '@/components/WindowButtons';
import QuickActionMenu from './annotator/QuickActionMenu';
import SidebarToggler from './SidebarToggler';
import BookmarkToggler from './BookmarkToggler';
import NotebookToggler from './NotebookToggler';
import TranslationToggler from './TranslationToggler';
import ViewMenu from './ViewMenu';
import SyncInfoDialog from './SyncInfoDialog';

// The HTML toggle of a dropdown whose button lives in the Duo's native bar: the
// dropdown stays mounted so its menu opens in place, but the toggle takes no room.
const NATIVE_BAR_HIDDEN_TOGGLE = 'invisible absolute h-0 w-0 min-h-0 overflow-hidden p-0';

interface HeaderBarProps {
  bookKey: string;
  bookTitle: string;
  isTopLeft: boolean;
  isHoveredAnim: boolean;
  gridInsets: Insets;
  screenInsets: Insets;
  onCloseBook: (bookKey: string) => void;
  onGoToLibrary: () => void;
  onDropdownOpenChange?: (isOpen: boolean) => void;
}

const HeaderBar: React.FC<HeaderBarProps> = ({
  bookKey,
  bookTitle,
  isTopLeft,
  isHoveredAnim,
  gridInsets,
  screenInsets,
  onCloseBook,
  onGoToLibrary,
  onDropdownOpenChange,
}) => {
  const _ = useTranslation();
  const { envConfig, appService } = useEnv();
  const { settings } = useSettingsStore();
  const headerRef = useRef<HTMLDivElement>(null);
  const { isTrafficLightVisible } = useTrafficLight(headerRef);
  const { trafficLightInFullscreen, setTrafficLightVisibility } = useTrafficLightStore();
  const { bookKeys, hoveredBookKey } = useReaderStore();
  const { isDarkMode, systemUIVisible, statusBarHeight, isIPhoneDuo } = useThemeStore();
  const { isSideBarVisible, getIsSideBarVisible } = useSidebarStore();
  const { getView, getViewSettings, setHoveredBookKey } = useReaderStore();
  const { getBookData, getConfig } = useBookDataStore();
  const viewSettings = getViewSettings(bookKey);
  const bookData = getBookData(bookKey);
  const bookConfig = getConfig(bookKey);
  // Readest Cloud's per-book stamps. Includes the PUSH stamps so this agrees
  // with the View menu's sync row, which has always counted them — otherwise
  // the row could read "Synced 2 minutes ago" while this dialog said "Never
  // synced" for the same book.
  const nativeLastSyncedAt =
    Math.max(
      bookConfig?.lastSyncedAtConfig || 0,
      bookConfig?.lastSyncedAtNotes || 0,
      bookConfig?.lastPushedAtConfig || 0,
      bookConfig?.lastPushedAtNotes || 0,
    ) || undefined;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMetaHashDialogOpen, setIsMetaHashDialogOpen] = useState(false);
  const [headerWidth, setHeaderWidth] = useState(0);
  const view = getView(bookKey);
  const iconSize18 = useResponsiveSize(18);

  const docs = view?.renderer.getContents() ?? [];
  const pointerInDoc = docs.some(({ doc }) => doc?.body?.style.cursor === 'pointer');
  const isWindowFocusRestore = useWindowFocusRestore();

  const enableAnnotationQuickActions = viewSettings?.enableAnnotationQuickActions;
  const annotationQuickActionButton =
    annotationToolQuickActions.find(
      (button) => button.type === viewSettings?.annotationQuickAction,
    ) || annotationToolQuickActions[0]!;
  const annotationQuickAction = viewSettings?.annotationQuickAction;
  const AnnotationToolQuickActionIcon = annotationQuickActionButton.Icon;
  const highlightStyle = settings.globalReadSettings.highlightStyle;
  const highlightColor = settings.globalReadSettings.highlightStyles[highlightStyle];
  const highlightHexColor = getHighlightColorHex(settings, highlightColor);

  // On the Duo these buttons live in the native bar; the dropdowns stay mounted
  // so a native tap opens the same menu.
  const nativeBarsActive = useNativeBarsActive();
  const quickActionRef = useRef<DropdownHandle>(null);
  const viewOptionsRef = useRef<DropdownHandle>(null);
  const quickActionLabel = annotationQuickAction
    ? _('Disable Quick Action')
    : _('Enable Quick Action on Selection');
  useNativeBarSlice(`${bookKey}:closeBook`, -1, [
    {
      id: 'closeBook',
      title: _('Close Book'),
      symbol: NATIVE_BAR_SYMBOLS['closeBook']!,
      placement: 'leading',
      priority: 'high',
      onTap: () => {
        setHoveredBookKey(null);
        onCloseBook(bookKey);
      },
    },
  ]);
  useNativeBarSlice(`${bookKey}:library`, 0, [
    {
      id: 'library',
      title: _('Go to Library'),
      symbol: NATIVE_BAR_SYMBOLS['library']!,
      placement: 'leading',
      priority: 'high',
      onTap: onGoToLibrary,
    },
  ]);
  useNativeBarSlice(
    `${bookKey}:quickAction`,
    4,
    enableAnnotationQuickActions
      ? [
          {
            id: 'quickAction',
            title: quickActionLabel,
            symbol: NATIVE_BAR_SYMBOLS['quickAction']!,
            placement: 'leading',
            selected: !!annotationQuickAction,
            onTap: () => quickActionRef.current?.open(),
          },
        ]
      : null,
  );
  useNativeBarSlice(`${bookKey}:viewOptions`, 11, [
    {
      id: 'viewOptions',
      title: _('View Options'),
      symbol: NATIVE_BAR_SYMBOLS['viewOptions']!,
      placement: 'trailing',
      onTap: () => viewOptionsRef.current?.open(),
    },
  ]);

  const handleToggleDropdown = (isOpen: boolean) => {
    setIsDropdownOpen(isOpen);
    onDropdownOpenChange?.(isOpen);
    if (!isOpen) setHoveredBookKey('');
  };

  const handleAnnotationQuickActionSelect = (action: AnnotationToolType | null) => {
    if (viewSettings?.annotationQuickAction === action) action = null;
    saveViewSettings(envConfig, bookKey, 'annotationQuickAction', action, false, true);
  };

  useEffect(() => {
    if (!appService?.hasTrafficLight) return;

    if (hoveredBookKey === bookKey && isTopLeft) {
      setTrafficLightVisibility(true);
      return;
    }
    if (hoveredBookKey) return;
    // The hide is deferred so a pointer crossing from one hover target to the
    // next doesn't flash the buttons off. Cancel it on unmount: closing the
    // last book writes `hoveredBookKey = null` and then routes to the library,
    // so an uncancelled timer comes due after the library header has already
    // asked for the buttons and hides them there (#6222). `getIsSideBarVisible`
    // is why an open sidebar masked this — it short-circuits the same hide.
    const timeout = setTimeout(() => {
      if (!getIsSideBarVisible()) {
        setTrafficLightVisibility(false);
      }
    }, 100);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appService, hoveredBookKey]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setHeaderWidth(entry.contentRect.width);
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  // Check if mouse is outside header area to avoid false positive event of MouseLeave when clicking inside header on Windows
  const isMouseOutsideHeader = useCallback((clientX: number, clientY: number) => {
    if (!headerRef.current) return true;

    const rect = headerRef.current.getBoundingClientRect();
    return (
      clientX <= rect.left || clientX >= rect.right || clientY <= rect.top || clientY >= rect.bottom
    );
  }, []);

  const isHeaderCompact = headerWidth > 0 && headerWidth < 350;
  const insets = window.innerWidth < 640 ? screenInsets : gridInsets;
  const isHeaderVisible = hoveredBookKey === bookKey || isDropdownOpen;
  const isMobile = appService?.isMobile || window.innerWidth < 640;
  const forceMobileLayout = isForcedMobileLayout(appService?.isMobile, isIPhoneDuo);
  const triggerHeight = viewSettings ? getHeaderTriggerHeight(gridInsets.top, viewSettings) : 0;

  useSpatialNavigation(headerRef, isHeaderVisible);
  const trafficLightInHeader =
    appService?.hasTrafficLight && !trafficLightInFullscreen && !isSideBarVisible && isTopLeft;
  const windowButtonVisible =
    appService?.hasWindowBar && !isTrafficLightVisible && !trafficLightInHeader;

  // On the Duo the Quick Action item sits in the native bar, so its menu is
  // mounted in the end cluster and opens beside the strip, like View Options.
  const quickActionDropdown = enableAnnotationQuickActions ? (
    <Dropdown
      ref={quickActionRef}
      label={quickActionLabel}
      className={clsx(
        'exclude-title-bar-mousedown dropdown-bottom',
        nativeBarsActive ? 'dropdown-end' : 'dropdown-center',
      )}
      menuClassName={nativeBarsActive ? undefined : 'relative!'}
      buttonClassName={
        nativeBarsActive
          ? NATIVE_BAR_HIDDEN_TOGGLE
          : clsx(
              'btn btn-ghost h-8 min-h-8 w-8 p-0',
              viewSettings?.annotationQuickAction && 'bg-base-300/50',
            )
      }
      toggleButton={
        annotationQuickAction === 'highlight' || annotationQuickAction === null ? (
          <HighlighterIcon
            size={iconSize18}
            tipColor={annotationQuickAction === null ? '#8F8F8F' : highlightHexColor}
            tipStyle={{
              opacity: annotationQuickAction === null ? 0.5 : 0.8,
              mixBlendMode: isDarkMode ? 'screen' : 'multiply',
            }}
          />
        ) : (
          <AnnotationToolQuickActionIcon size={iconSize18} />
        )
      }
      onToggle={handleToggleDropdown}
    >
      <QuickActionMenu
        bookKey={bookKey}
        selectedAction={viewSettings.annotationQuickAction}
        onActionSelect={handleAnnotationQuickActionSelect}
      />
    </Dropdown>
  ) : null;

  return (
    <div
      className={clsx(
        // pointer-events-none: the wrapper is as tall as its safe-area
        // padding, so on notch devices its box covers the top inset strip and
        // swallowed long presses on text rendered there (#5429) — children
        // that take input restore pointer-events themselves.
        'pointer-events-none left-0 top-0 w-full',
        isHeaderVisible && 'bg-base-100',
        window.innerWidth < 640 ? 'fixed z-20' : 'absolute',
      )}
      style={{
        paddingTop: appService?.hasSafeAreaInset ? `${insets.top}px` : '0px',
      }}
    >
      {/*
        Hover trigger area. Mobile has no hover and toggles the bars by tapping
        the page (usePagination), so this must not take pointer events there —
        it used to be a fixed 44px tall, the same as the default page-header
        margin, so with the page header off (compact 16px margin) it covered the
        first line of text and swallowed long presses on it (#5429). Mirrors the
        footer's trigger. Its height now tracks the content top on every
        platform, so the strip can never reach past where the text starts and
        block a selection (#4977).
      */}
      <div
        role='none'
        tabIndex={-1}
        className={clsx(
          'absolute top-0 z-10 w-full',
          isMobile || pointerInDoc ? 'pointer-events-none' : 'pointer-events-auto',
        )}
        style={{ height: `${triggerHeight}px` }}
        onClick={() => setHoveredBookKey(bookKey)}
        onMouseEnter={() => !appService?.isMobile && setHoveredBookKey(bookKey)}
        onTouchStart={() => !appService?.isMobile && setHoveredBookKey(bookKey)}
      />
      <div
        className={clsx(
          'bg-base-100 absolute left-0 right-0 top-0 z-10',
          appService?.hasRoundedWindow && 'rounded-window-top-right',
          isHeaderVisible ? 'visible' : 'hidden',
        )}
        style={{
          height: systemUIVisible ? `${Math.max(insets.top, statusBarHeight)}px` : '0px',
        }}
      />
      <div
        ref={headerRef}
        role='banner'
        aria-label={_('Header Bar')}
        className={clsx(
          `header-bar bg-base-100 absolute top-0 z-10 flex h-11 w-full items-center pr-4`,
          `shadow-xs transition-[opacity,margin-top] duration-300`,
          trafficLightInHeader ? 'pl-20' : isSideBarVisible ? 'ps-4' : 'ps-4 sm:ps-1.5',
          appService?.hasRoundedWindow && 'rounded-window-top-right',
          !isSideBarVisible && appService?.hasRoundedWindow && 'rounded-window-top-left',
          isHoveredAnim && 'hover-bar-anim',
          isHeaderVisible ? 'pointer-events-auto visible' : 'pointer-events-none opacity-0',
          isDropdownOpen && 'header-bar-pinned',
        )}
        style={{
          marginTop: systemUIVisible
            ? `${Math.max(insets.top, statusBarHeight)}px`
            : `${insets.top}px`,
          // iPhone Duo's status-bar strip reports as a large left/right inset
          // (#6307); clear it without losing the header's own ps-4/pr-4 padding.
          ...getHorizontalInsetStyle(insets, isIPhoneDuo, 16),
        }}
        onFocus={() =>
          !appService?.isMobile && !isWindowFocusRestore() && setHoveredBookKey(bookKey)
        }
        onMouseLeave={(e) => {
          if (!appService?.isMobile && isMouseOutsideHeader(e.clientX, e.clientY)) {
            setHoveredBookKey('');
          }
        }}
      >
        <div className='header-tools-start bg-base-100 sidebar-bookmark-toggler z-20 flex h-full min-w-0 items-center gap-x-4 pe-2 max-[350px]:gap-x-2'>
          {/* h-full so this scroller spans the whole bar: `overflow-x-auto`
              also clips vertically, and shrink-wrapped to the 32px icons it
              cut the buttons' touch halos back down to 32px (#5401). */}
          {/* no-scrollbar: the overlay scrollbar of `overflow-x-auto` owns a
              hit-test strip at the scroller's bottom edge on Android, which
              cut the touch halos short of the 44px target (#5401) —
              `scrollbar-width: none` alone does not remove that strip.
              px-1.5 reserves the 6px each 44px halo extends past its 32px
              button, so the halos do not create a draggable scroll range. */}
          <div className='no-scrollbar flex h-full min-w-0 items-center gap-x-4 overflow-x-auto px-1.5 max-[350px]:gap-x-2'>
            {/* Tablet portrait runs the mobile footer bar, whose TOC tab opens
                this same sidebar — showing the toggle here too gave one action
                two buttons (#5634). Phones are already covered by `sm:`. */}
            {!isSideBarVisible && !forceMobileLayout && (
              <div className='hidden sm:flex'>
                <SidebarToggler bookKey={bookKey} />
              </div>
            )}
            {!nativeBarsActive && (
              <button
                title={_('Go to Library')}
                className='btn btn-ghost hidden h-8 min-h-8 w-8 p-0 sm:flex'
                onClick={onGoToLibrary}
              >
                <VscLibrary size={iconSize18} className='fill-base-content' />
              </button>
            )}
            <BookmarkToggler bookKey={bookKey} />
            <TranslationToggler bookKey={bookKey} />
          </div>
          {!nativeBarsActive && quickActionDropdown}
        </div>

        <div
          role='contentinfo'
          aria-label={_('Title') + ' - ' + bookTitle}
          className={clsx(
            'header-title z-15 bg-base-100 pointer-events-none hidden flex-1 items-center justify-center sm:flex',
            !windowButtonVisible && 'absolute inset-0',
            isHeaderCompact && 'hidden!',
          )}
          {...getBookDataAttributes(bookTitle, bookData?.book?.metadata)}
        >
          <div
            aria-hidden='true'
            className={clsx(
              'line-clamp-1 text-center text-xs font-semibold',
              !windowButtonVisible && 'max-w-[50%]',
            )}
          >
            {bookTitle}
          </div>
        </div>

        <div className='header-tools-end bg-base-100 z-20 ms-auto flex h-full min-w-max items-center gap-x-4 ps-2 max-[350px]:gap-x-2'>
          {nativeBarsActive && quickActionDropdown}
          <NotebookToggler bookKey={bookKey} />
          <Dropdown
            ref={viewOptionsRef}
            label={_('View Options')}
            containerClassName='h-8'
            className='exclude-title-bar-mousedown dropdown-bottom dropdown-end'
            buttonClassName={
              nativeBarsActive ? NATIVE_BAR_HIDDEN_TOGGLE : 'btn btn-ghost h-8 min-h-8 w-8 p-0 mt-0'
            }
            toggleButton={<MdOutlineMenu />}
            onToggle={handleToggleDropdown}
          >
            <ViewMenu
              bookKey={bookKey}
              onShowMetaHashDialog={() => setIsMetaHashDialogOpen(true)}
            />
          </Dropdown>
          {isMetaHashDialogOpen && (
            <ModalPortal showOverlay={false}>
              <SyncInfoDialog
                isOpen={isMetaHashDialogOpen}
                bookKey={bookKey}
                metadata={bookData?.bookDoc?.metadata ?? bookData?.book?.metadata}
                storedMetaHash={bookData?.book?.metaHash}
                nativeLastSyncedAt={nativeLastSyncedAt}
                onClose={() => setIsMetaHashDialogOpen(false)}
              />
            </ModalPortal>
          )}
          <WindowButtons
            className='window-buttons flex items-center'
            headerRef={headerRef}
            showMinimize={bookKeys.length == 1 && windowButtonVisible}
            showMaximize={bookKeys.length == 1 && windowButtonVisible}
            showClose={!nativeBarsActive}
            closeButtonLabel={_('Close Book')}
            onClose={() => {
              setHoveredBookKey(null);
              onCloseBook(bookKey);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default HeaderBar;
