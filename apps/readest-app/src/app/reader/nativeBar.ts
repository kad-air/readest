import type { NativeBarSlice } from '@/store/nativeBarStore';
import type { NativeBarSpec } from '@/utils/nativeBar';

/**
 * One book's native bar: every slice registered under `${bookKey}:`, by order
 * and then by registration. The colon keeps `book-1` from matching `book-12`.
 */
export const composeReaderBarSpec = (
  slices: Record<string, NativeBarSlice>,
  bookKey: string,
): NativeBarSpec => {
  const prefix = `${bookKey}:`;
  const own = Object.entries(slices)
    .filter(([key]) => key.startsWith(prefix))
    .map(([, slice]) => slice);
  // Array.prototype.sort is stable, so equal orders keep their registration order.
  own.sort((a, b) => a.order - b.order);
  return { items: own.flatMap((slice) => slice.items) };
};
