import { useEffect } from 'react';

/**
 * The space in pixels from the bottom of the page to trigger the callback.
 */
export const DEFAULT_THRESHOLD = 100;

/**
 * Hook to handle infinite scrolling.
 * It calls the provided callback when the user scrolls near the bottom of the page.
 * @param callback - The function to call when the user scrolls near the bottom.
 * @param threshold - The distance from the bottom of the page to trigger the callback.
 */
const useInfiniteScroll = (callback: () => void, threshold: number = DEFAULT_THRESHOLD) => {
  useEffect(() => {
    const target = document.getElementById('skeleton');

    if (!target) {
      return () => {};
    }

    const handleScroll = () => {
      const scrollTop = target.scrollTop;
      const scrollHeight = target.scrollHeight;
      const clientHeight = target.clientHeight;

      if (scrollHeight - scrollTop <= clientHeight + threshold) {
        callback();
      }
    };

    target.addEventListener('scroll', handleScroll);

    return () => {
      target.removeEventListener('scroll', handleScroll);
    };
  }, [callback, threshold]);
};

export default useInfiniteScroll;
