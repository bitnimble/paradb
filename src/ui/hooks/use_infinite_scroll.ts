import { RefObject, useEffect, useEffectEvent, useRef } from 'react';

/**
 * The space in pixels from the bottom of the container to trigger the callback.
 */
const DEFAULT_THRESHOLD = 100;

/**
 * Default debounce delay in milliseconds.
 */
const DEFAULT_DEBOUNCE_MS = 150;

type ScrollContainerRef = RefObject<HTMLElement | null> | (() => HTMLElement | null);

export interface UseInfiniteScrollOptions {
  /** The distance from the bottom of the container to trigger the callback. */
  threshold?: number;
  /** Debounce delay in milliseconds. */
  debounceMs?: number;
}

/**
 * Hook to handle infinite scrolling on a scrollable container.
 * It calls the provided callback when the user scrolls near the bottom of the container.
 * @param scrollContainerRef - A ref or getter function for the scrollable container element.
 * @param callback - The function to call when the user scrolls near the bottom.
 * @param options - Optional configuration (threshold).
 */
export const useInfiniteScroll = (
  scrollContainerRef: ScrollContainerRef,
  callback: () => void,
  options: UseInfiniteScrollOptions = {}
) => {
  const { threshold = DEFAULT_THRESHOLD, debounceMs = DEFAULT_DEBOUNCE_MS } = options;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScrollCallback = useEffectEvent(callback);

  useEffect(() => {
    const target =
      typeof scrollContainerRef === 'function' ? scrollContainerRef() : scrollContainerRef.current;

    if (!target) {
      return;
    }

    const handleScroll = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        const scrollTop = target.scrollTop;
        const scrollHeight = target.scrollHeight;
        const clientHeight = target.clientHeight;

        if (scrollHeight - scrollTop <= clientHeight + threshold) {
          handleScrollCallback();
        }
      }, debounceMs);
    };

    target.addEventListener('scroll', handleScroll);

    return () => {
      target.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [scrollContainerRef, threshold, debounceMs]);
};
