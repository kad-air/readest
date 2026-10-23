import { useMemo } from 'react';
import { useReaderStore } from '@/store/readerStore';
import { useNativeBarStore } from '@/store/nativeBarStore';
import { useNativeBar } from '@/hooks/useNativeBar';
import { composeReaderBarSpec } from '../nativeBar';

/**
 * Puts the hovered book's header and footer buttons in the iPhone Duo's native
 * bar. The bars show for the hovered book only, so the native items belong to
 * it too and go with them. Mounted once for the whole grid: two books on screen
 * must not both own the bar.
 */
const ReaderNativeBar: React.FC = () => {
  const hoveredBookKey = useReaderStore((s) => s.hoveredBookKey);
  const slices = useNativeBarStore((s) => s.slices);
  const spec = useMemo(
    () => (hoveredBookKey ? composeReaderBarSpec(slices, hoveredBookKey) : null),
    [slices, hoveredBookKey],
  );
  useNativeBar(spec);
  return null;
};

export default ReaderNativeBar;
