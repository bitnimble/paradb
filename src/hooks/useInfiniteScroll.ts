import { useEffect } from "react";

/**
 * The space in pixels from the bottom of the page to trigger the callback.
 */
export const DEFAULT_THRESHOLD = 100;

/**
 * Hook to handle infinite scrolling.
 * It calls the provided callback when the user scrolls near the bottom of the page.
 * @param callback - The function to call when the user scrolls near the bottom.
 */
const useInfiniteScroll = (callback: () => void) => {
    useEffect(() => {
        const target = document.getElementById('skeleton');

        if (!target) {
            return () => {};
        }

        const handleScroll = () => {
            const scrollTop = target.scrollTop;
            const scrollHeight = target.scrollHeight;
            const clientHeight = target.clientHeight;

            if (scrollHeight - scrollTop <= clientHeight + DEFAULT_THRESHOLD) {
                callback();
            }
        };

        target.addEventListener('scroll', handleScroll);

        return () => {
            target.removeEventListener('scroll', handleScroll);
        };
    }, [callback]);
};

export default useInfiniteScroll;