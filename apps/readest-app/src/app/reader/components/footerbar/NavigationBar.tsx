import clsx from 'clsx';
import React from 'react';
import { IoIosList as TOCIcon } from 'react-icons/io';
import { RxSlider as SliderIcon } from 'react-icons/rx';
import { RiFontFamily as FontIcon } from 'react-icons/ri';
import { PiSun as ColorIcon } from 'react-icons/pi';
import { MdOutlineHeadphones as TTSIcon } from 'react-icons/md';
import { useEnv } from '@/context/EnvContext';
import { useReaderStore } from '@/store/readerStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useSidebarStore } from '@/store/sidebarStore';
import { useResponsiveSize } from '@/hooks/useResponsiveSize';
import { useNativeBarsActive } from '@/hooks/useNativeBar';
import { useNativeBarSlice } from '@/store/nativeBarStore';
import { NATIVE_BAR_SYMBOLS, NativeBarSpecItem } from '@/utils/nativeBar';
import Button from '@/components/Button';
import { Insets } from '@/types/misc';

interface NavigationBarProps {
  bookKey: string;
  actionTab: string;
  gridInsets: Insets;
  forceMobileLayout: boolean;
  // Keeps the row clear of iPhone Duo's side status strip (#6307).
  insetStyle?: React.CSSProperties;
  onSetActionTab: (tab: string) => void;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  bookKey,
  actionTab,
  gridInsets,
  forceMobileLayout,
  insetStyle,
  onSetActionTab,
}) => {
  const isMobile = forceMobileLayout || window.innerWidth < 640 || window.innerHeight < 640;
  const _ = useTranslation();
  const { appService } = useEnv();
  const { getViewState } = useReaderStore();
  const { isSideBarVisible, isSideBarPinned } = useSidebarStore();

  const viewState = getViewState(bookKey);
  const tocIconSize = useResponsiveSize(23);
  const fontIconSize = useResponsiveSize(18);
  const navPadding = isMobile ? `${gridInsets.bottom * 0.33 + 16}px` : '0px';

  // On the Duo the five tab buttons live in the native bar; the HTML row is gone.
  const nativeBarsActive = useNativeBarsActive();
  const showToc = !(isSideBarVisible && isSideBarPinned);
  const tab = (id: string, title: string, selected: boolean): NativeBarSpecItem => ({
    id,
    title,
    symbol: NATIVE_BAR_SYMBOLS[id]!,
    placement: 'bottom',
    selected,
    onTap: () => onSetActionTab(id),
  });
  useNativeBarSlice(`${bookKey}:footer`, 20, [
    ...(showToc ? [tab('toc', _('Table of Contents'), actionTab === 'toc')] : []),
    tab('color', _('Color'), actionTab === 'color'),
    tab('progress', _('Reading Progress'), actionTab === 'progress'),
    tab('font', _('Font & Layout'), actionTab === 'font'),
    tab('tts', _('Speak'), !!viewState?.ttsEnabled),
  ]);

  if (nativeBarsActive) return null;

  return (
    <div
      className={clsx(
        'not-eink:bg-base-200 eink:bg-base-100 z-30 mt-auto flex w-full justify-between px-8 py-4',
        'eink:border-base-content eink:border-t',
        !forceMobileLayout && 'sm:hidden',
      )}
      style={{
        paddingBottom: appService?.isAndroidApp
          ? `calc(env(safe-area-inset-bottom) + 16px)`
          : navPadding,
        ...insetStyle,
      }}
    >
      {isSideBarVisible && isSideBarPinned ? null : (
        <Button
          label={_('Table of Contents')}
          icon={<TOCIcon size={tocIconSize} />}
          onClick={() => onSetActionTab('toc')}
        />
      )}
      <Button
        label={_('Color')}
        icon={<ColorIcon className={clsx(actionTab === 'color' && 'text-blue-500')} />}
        onClick={() => onSetActionTab('color')}
      />
      <Button
        label={_('Reading Progress')}
        icon={<SliderIcon className={clsx(actionTab === 'progress' && 'text-blue-500')} />}
        onClick={() => onSetActionTab('progress')}
      />
      <Button
        label={_('Font & Layout')}
        icon={
          <FontIcon size={fontIconSize} className={clsx(actionTab === 'font' && 'text-blue-500')} />
        }
        onClick={() => onSetActionTab('font')}
      />
      <Button
        label={_('Speak')}
        icon={<TTSIcon className={viewState?.ttsEnabled ? 'text-blue-500' : ''} />}
        onClick={() => onSetActionTab('tts')}
      />
    </div>
  );
};
