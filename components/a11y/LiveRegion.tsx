/**
 * Debounced summary live region for streaming content.
 *
 * Announces a debounced summary (e.g. "3 findings so far") instead of
 * per-token chatter, making the app usable with screen readers.
 * See DESIGN.md §7.2.
 */
'use client';

import { useEffect, useRef, useState } from 'react';

interface LiveRegionProps {
  /** The current summary text to announce. */
  message: string;
  /** Debounce interval in ms. Defaults to 1000ms. */
  debounceMs?: number;
}

export function LiveRegion({ message, debounceMs = 1000 }: LiveRegionProps) {
  const [announced, setAnnounced] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setAnnounced(message);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, debounceMs]);

  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      aria-atomic="true"
      className="sr-only"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {announced}
    </div>
  );
}
